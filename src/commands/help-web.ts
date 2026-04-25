import { spawn } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import type { ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'
import { basename, extname } from 'node:path'
import ansis from 'ansis'
import fs from 'fs-extra'
import { getCcgDir } from '../utils/config'
import type { HelpRootId } from '../utils/help-web'
import { buildHelpTree, getHelpRootDefinition, getHelpRootDefinitions, resolveHelpFilePath } from '../utils/help-web'

type HelpWebOptions = {
  openBrowser?: boolean
  rootId?: HelpRootId
}

type HelpPayload = {
  roots: Array<{ id: string, label: string, path: string }>
  defaultRootId: string
}

type HelpWebState = {
  pid: number
  url: string
  rootId: HelpRootId
  startedAt: string
}

type HelpWebLaunchResult =
  | { status: 'reused', url: string }
  | { status: 'spawned' }

const DEFAULT_ROOT_ID: HelpRootId = 'agents'
let ownedHelpWebPid: number | null = null
let cleanupRegistered = false

export async function launchHelpWebDetached(rootId: HelpRootId = DEFAULT_ROOT_ID): Promise<HelpWebLaunchResult> {
  const targetRootId = rootId || DEFAULT_ROOT_ID
  const existingState = await getActiveHelpWebState()
  if (existingState) {
    await openUrl(existingState.url)
    return { status: 'reused', url: existingState.url }
  }

  const scriptPath = process.argv[1]
  if (!scriptPath) {
    throw new Error('未找到当前 CLI 入口，无法启动帮助页')
  }

  const isTypeScriptEntry = scriptPath.endsWith('.ts')
  const command = isTypeScriptEntry ? getPnpmCommand() : process.execPath
  const args = isTypeScriptEntry
    ? ['exec', 'tsx', 'src/cli.ts', 'config', 'skills-web']
    : [scriptPath, 'config', 'skills-web']

  const child = spawn(command, args, {
    cwd: process.cwd(),
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
    env: {
      ...process.env,
      YQ_SKILLS_WEB_OWNER_PID: String(process.pid),
      YQ_SKILLS_WEB_ROOT_ID: targetRootId,
    },
  })

  child.unref()
  registerOwnedHelpWebProcess(child.pid)
  return { status: 'spawned' }
}

export async function startHelpWebServer(options: HelpWebOptions = {}): Promise<void> {
  const resolvedRootId = options.rootId || getRootIdFromEnv() || DEFAULT_ROOT_ID
  const ownerPid = getOwnerPidFromEnv()
  const currentState = await getActiveHelpWebState()
  if (currentState) {
    console.log(ansis.yellow(`本地网页版 Skills 已在运行：${currentState.url}`))
    if (options.openBrowser !== false) {
      await openUrl(currentState.url)
    }
    return
  }

  const payload: HelpPayload = {
    roots: getHelpRootDefinitions().map(root => ({
      id: root.id,
      label: root.label,
      path: root.path,
    })),
    defaultRootId: resolvedRootId,
  }

  const server = createServer(async (req, res) => {
    const requestUrl = new URL(req.url || '/', 'http://127.0.0.1')
    try {
      if (requestUrl.pathname === '/api/roots') {
        sendJson(res, payload)
        return
      }

      if (requestUrl.pathname === '/api/tree') {
        const root = getRootOrFallback(requestUrl.searchParams.get('root'))
        const tree = await buildHelpTree(root.path)
        sendJson(res, { root, tree })
        return
      }

      if (requestUrl.pathname === '/api/file') {
        const root = getRootOrFallback(requestUrl.searchParams.get('root'))
        const relativePath = requestUrl.searchParams.get('path') || ''
        const filePath = resolveHelpFilePath(root.path, relativePath)
        if (!filePath || !(await fs.pathExists(filePath))) {
          sendJson(res, { error: '文件不存在' }, 404)
          return
        }

        const stat = await fs.stat(filePath)
        if (!stat.isFile()) {
          sendJson(res, { error: '目标不是文件' }, 400)
          return
        }

        const content = await readFile(filePath, 'utf-8')
        sendJson(res, {
          root,
          file: {
            name: basename(filePath),
            relativePath,
            path: filePath,
            extension: extname(filePath),
            size: stat.size,
            content,
            rendered: renderPreview(relativePath, content),
          },
        })
        return
      }

      if (requestUrl.pathname === '/api/close' && req.method === 'POST') {
        sendJson(res, { ok: true })
        setTimeout(() => {
          server.close(() => {
            process.exit(0)
          })
        }, 100)
        return
      }

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(renderAppHtml())
    }
    catch (error) {
      const message = error instanceof Error ? error.message : '未知错误'
      sendJson(res, { error: message }, 500)
    }
  })

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve)
  })

  const address = server.address() as AddressInfo
  const url = `http://127.0.0.1:${address.port}`
  await writeHelpWebState({
    pid: process.pid,
    url,
    rootId: resolvedRootId,
    startedAt: new Date().toISOString(),
  })

  const cleanup = async () => {
    await clearHelpWebState(process.pid)
  }

  server.on('close', () => {
    void cleanup()
  })

  process.on('SIGTERM', () => {
    server.close(() => {
      process.exit(0)
    })
  })

  process.on('SIGINT', () => {
    server.close(() => {
      process.exit(0)
    })
  })

  if (ownerPid) {
    const lifecycleCheck = setInterval(() => {
      if (!isProcessAlive(ownerPid)) {
        server.close(() => {
          process.exit(0)
        })
      }
    }, 1000)
    lifecycleCheck.unref()
  }

  console.log(ansis.cyan(`本地网页版 Skills 已启动：${url}`))

  if (options.openBrowser !== false) {
    const opened = await openUrl(url)
    if (!opened) {
      console.log(ansis.yellow(`未能自动打开浏览器，请手动访问 ${url}`))
    }
  }
}

export async function closeHelpWebServer(): Promise<boolean> {
  const state = await readHelpWebState()
  if (!state) {
    return false
  }

  if (isProcessAlive(state.pid)) {
    try {
      process.kill(state.pid, 'SIGTERM')
    }
    catch {
      await clearHelpWebState()
      return false
    }

    await waitForProcessExit(state.pid, 3000)
  }

  await clearHelpWebState()
  return true
}

export async function getActiveHelpWebState(): Promise<HelpWebState | null> {
  const state = await readHelpWebState()
  if (!state) {
    return null
  }

  if (!isProcessAlive(state.pid)) {
    await clearHelpWebState()
    return null
  }

  try {
    const response = await fetch(`${state.url}/api/roots`)
    if (!response.ok) {
      throw new Error('healthcheck failed')
    }
    return state
  }
  catch {
    await clearHelpWebState()
    return null
  }
}

function getRootOrFallback(rootId: string | null) {
  return getHelpRootDefinition((rootId as HelpRootId) || DEFAULT_ROOT_ID)
}

function getRootIdFromEnv(): HelpRootId | null {
  const rootId = process.env.YQ_SKILLS_WEB_ROOT_ID
  if (rootId === 'agents' || rootId === 'claude' || rootId === 'codex' || rootId === 'gemini') {
    return rootId
  }
  return null
}

function getOwnerPidFromEnv(): number | null {
  const rawPid = process.env.YQ_SKILLS_WEB_OWNER_PID
  if (!rawPid) {
    return null
  }

  const ownerPid = Number(rawPid)
  if (!Number.isInteger(ownerPid) || ownerPid <= 0) {
    return null
  }

  return ownerPid
}

function getPnpmCommand(): string {
  return process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
}

function registerOwnedHelpWebProcess(pid: number | undefined): void {
  if (!pid) {
    return
  }

  ownedHelpWebPid = pid
  if (cleanupRegistered) {
    return
  }

  const cleanup = () => {
    if (!ownedHelpWebPid) {
      return
    }

    try {
      process.kill(ownedHelpWebPid, 'SIGTERM')
    }
    catch {
      // Ignore cleanup failures on exit.
    }
  }

  process.on('exit', cleanup)
  process.on('SIGINT', () => {
    cleanup()
    process.exit(0)
  })
  process.on('SIGTERM', () => {
    cleanup()
    process.exit(0)
  })
  cleanupRegistered = true
}

async function openUrl(url: string): Promise<boolean> {
  try {
    if (process.platform === 'win32') {
      spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore', windowsHide: true }).unref()
    }
    else if (process.platform === 'darwin') {
      spawn('open', [url], { detached: true, stdio: 'ignore' }).unref()
    }
    else {
      spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref()
    }
    return true
  }
  catch {
    return false
  }
}

function getHelpWebStatePath(): string {
  return `${getCcgDir()}/skills-web.json`
}

async function readHelpWebState(): Promise<HelpWebState | null> {
  try {
    const filePath = getHelpWebStatePath()
    if (!(await fs.pathExists(filePath))) {
      return null
    }
    return await fs.readJson(filePath) as HelpWebState
  }
  catch {
    return null
  }
}

async function writeHelpWebState(state: HelpWebState): Promise<void> {
  await fs.ensureDir(getCcgDir())
  await fs.writeJson(getHelpWebStatePath(), state, { spaces: 2 })
}

async function clearHelpWebState(expectedPid?: number): Promise<void> {
  const filePath = getHelpWebStatePath()
  if (!(await fs.pathExists(filePath))) {
    return
  }

  if (typeof expectedPid === 'number') {
    const current = await readHelpWebState()
    if (current && current.pid !== expectedPid) {
      return
    }
  }

  await fs.remove(filePath)
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  }
  catch (error) {
    return (error as NodeJS.ErrnoException).code === 'EPERM'
  }
}

async function waitForProcessExit(pid: number, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (!isProcessAlive(pid)) {
      return
    }
    await new Promise(resolve => setTimeout(resolve, 120))
  }
}

function sendJson(res: ServerResponse, data: unknown, status = 200): void {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(data))
}

function renderPreview(relativePath: string, content: string): string {
  if (/\.(md|markdown)$/i.test(relativePath)) {
    return renderMarkdown(content)
  }

  return `<pre>${escapeHtml(content)}</pre>`
}

function renderMarkdown(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const html: string[] = []
  let inCode = false
  let inList = false

  const closeList = () => {
    if (inList) {
      html.push('</ul>')
      inList = false
    }
  }

  for (const line of lines) {
    if (line.startsWith('```')) {
      closeList()
      html.push(inCode ? '</code></pre>' : '<pre><code>')
      inCode = !inCode
      continue
    }

    if (inCode) {
      html.push(`${escapeHtml(line)}\n`)
      continue
    }

    if (!line.trim()) {
      closeList()
      continue
    }

    const heading = line.match(/^(#{1,3})\s+(.*)$/)
    if (heading) {
      closeList()
      const level = Math.min(heading[1].length, 3)
      html.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`)
      continue
    }

    const listItem = line.match(/^[-*]\s+(.*)$/)
    if (listItem) {
      if (!inList) {
        html.push('<ul>')
        inList = true
      }
      html.push(`<li>${inlineMarkdown(listItem[1])}</li>`)
      continue
    }

    closeList()
    html.push(`<p>${inlineMarkdown(line)}</p>`)
  }

  closeList()
  if (inCode) {
    html.push('</code></pre>')
  }
  return html.join('')
}

function inlineMarkdown(text: string): string {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function renderAppHtml(): string {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>YQ Skills Help</title>
  <style>
    :root { color-scheme: light; --bg:#f6f7fb; --panel:#fff; --border:#e4e8f0; --text:#1f2937; --muted:#667085; --accent:#2563eb; --hover:#eef4ff; }
    * { box-sizing:border-box; }
    body { margin:0; font-family:"Segoe UI",system-ui,sans-serif; background:var(--bg); color:var(--text); }
    .page { max-width: 1680px; margin: 0 auto; padding: 32px 28px; }
    .topbar { display:flex; gap:16px; align-items:center; justify-content:space-between; margin-bottom:20px; flex-wrap:wrap; }
    .title h1 { margin:0; font-size:56px; line-height:1; }
    .title p { margin:14px 0 0; color:var(--muted); font-size:18px; }
    .controls { display:flex; gap:12px; align-items:center; flex-wrap:wrap; }
    input, select, button { height:52px; border:1px solid var(--border); background:#fff; border-radius:16px; padding:0 16px; font-size:16px; color:var(--text); }
    input { min-width:360px; }
    button { cursor:pointer; font-weight:600; }
    .meta { display:flex; gap:12px; flex-wrap:wrap; margin-bottom:20px; }
    .pill { border:1px solid var(--border); border-radius:999px; background:#fff; padding:12px 16px; color:var(--muted); }
    .layout { display:grid; grid-template-columns: 38% 1fr; gap:16px; min-height: calc(100vh - 210px); }
    .panel { background:var(--panel); border:1px solid var(--border); border-radius:24px; overflow:hidden; }
    .panel-header { padding:20px 24px; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center; gap:12px; }
    .panel-header h2 { margin:0; font-size:18px; }
    .panel-body { padding:20px 24px; height:100%; overflow:auto; }
    .tree-root { color:#98a2b3; margin-bottom:18px; font-family:Consolas,monospace; }
    .tree { list-style:none; padding:0; margin:0; }
    .tree ul { list-style:none; margin:0; padding-left:18px; border-left:1px solid #edf1f7; }
    .tree-item { display:flex; align-items:center; gap:8px; min-height:36px; padding:6px 10px; border-radius:12px; cursor:pointer; }
    .tree-item:hover { background:var(--hover); }
    .tree-item.active { background:#eaf1ff; color:#0f4ad5; }
    .tree-item .kind { color:#98a2b3; width:20px; text-align:center; }
    .empty { color:var(--muted); padding:32px 8px; }
    .file-meta { display:flex; gap:10px; flex-wrap:wrap; margin:8px 0 24px; color:var(--muted); }
    .badge { display:inline-flex; align-items:center; border:1px solid var(--border); border-radius:999px; padding:6px 12px; background:#fff; }
    .preview { line-height:1.75; font-size:18px; }
    .preview h1, .preview h2, .preview h3 { color:#355ca8; margin:28px 0 14px; line-height:1.25; }
    .preview p { margin:14px 0; }
    .preview ul { padding-left:22px; }
    .preview pre { background:#f8fafc; border:1px solid var(--border); border-radius:16px; padding:16px; overflow:auto; font-size:14px; }
    .preview code { background:#eef2ff; border-radius:6px; padding:2px 6px; font-size:.92em; }
    @media (max-width: 1080px) {
      .layout { grid-template-columns:1fr; min-height:auto; }
      .title h1 { font-size:42px; }
      input { min-width:240px; width:100%; }
      .controls { width:100%; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="topbar">
      <div class="title">
        <h1>Skills</h1>
        <p>浏览当前工作区可用的技能目录与文件预览。</p>
      </div>
      <div class="controls">
        <input id="search" type="search" placeholder="搜索技能名称、描述或路径..." />
        <span>目录</span>
        <select id="rootSelect"></select>
        <button id="refreshBtn" type="button">刷新</button>
        <button id="closeBtn" type="button">关闭服务</button>
      </div>
    </div>
    <div class="meta">
      <div class="pill">全局目录：.claude/skills · .codex/skills · .gemini/skills · .agents/skills</div>
      <div class="pill" id="currentRootLabel">当前目录：</div>
      <div class="pill" id="treeCount">显示 0 项</div>
    </div>
    <div class="layout">
      <section class="panel">
        <div class="panel-header"><h2>文件树</h2></div>
        <div class="panel-body">
          <div id="treeRootPath" class="tree-root"></div>
          <div id="treeContainer"></div>
        </div>
      </section>
      <section class="panel">
        <div class="panel-header"><h2>预览</h2></div>
        <div class="panel-body">
          <div id="previewContainer" class="empty">请选择左侧文件进行预览。</div>
        </div>
      </section>
    </div>
  </div>
  <script>
    const state = { roots: [], currentRootId: 'agents', tree: [], filteredTree: [], selectedPath: '' };
    const rootSelect = document.getElementById('rootSelect');
    const searchInput = document.getElementById('search');
    const refreshBtn = document.getElementById('refreshBtn');
    const closeBtn = document.getElementById('closeBtn');
    const treeContainer = document.getElementById('treeContainer');
    const previewContainer = document.getElementById('previewContainer');
    const treeRootPath = document.getElementById('treeRootPath');
    const currentRootLabel = document.getElementById('currentRootLabel');
    const treeCount = document.getElementById('treeCount');

    init();

    async function init() {
      const payload = await fetchJson('/api/roots');
      state.roots = payload.roots;
      state.currentRootId = payload.defaultRootId || 'agents';
      rootSelect.innerHTML = state.roots.map(root => '<option value="' + root.id + '">' + root.label + '</option>').join('');
      rootSelect.value = state.currentRootId;
      rootSelect.addEventListener('change', async () => {
        state.currentRootId = rootSelect.value;
        state.selectedPath = '';
        await loadTree();
      });
      searchInput.addEventListener('input', () => applySearch());
      refreshBtn.addEventListener('click', loadTree);
      closeBtn.addEventListener('click', closeService);
      await loadTree();
    }

    async function loadTree() {
      const payload = await fetchJson('/api/tree?root=' + encodeURIComponent(state.currentRootId));
      state.tree = payload.tree || [];
      const activeRoot = payload.root;
      treeRootPath.textContent = activeRoot.path;
      currentRootLabel.textContent = '当前目录：' + activeRoot.path;
      applySearch();
    }

    function applySearch() {
      const keyword = searchInput.value.trim().toLowerCase();
      state.filteredTree = keyword ? filterTree(state.tree, keyword) : state.tree;
      treeCount.textContent = '显示 ' + countNodes(state.filteredTree) + ' 项';
      renderTree();
      autoSelectFirstFile();
    }

    function filterTree(nodes, keyword) {
      return nodes.flatMap(node => {
        const matched = node.name.toLowerCase().includes(keyword) || node.relativePath.toLowerCase().includes(keyword);
        if (node.type === 'directory') {
          const children = filterTree(node.children || [], keyword);
          if (matched || children.length) {
            return [{ ...node, children }];
          }
          return [];
        }
        return matched ? [node] : [];
      });
    }

    function countNodes(nodes) {
      return nodes.reduce((sum, node) => sum + 1 + (node.children ? countNodes(node.children) : 0), 0);
    }

    function renderTree() {
      if (!state.filteredTree.length) {
        treeContainer.innerHTML = '<div class="empty">当前目录暂无文件，或搜索结果为空。</div>';
        return;
      }
      treeContainer.innerHTML = renderTreeNodes(state.filteredTree);
      treeContainer.querySelectorAll('[data-file-path]').forEach(element => {
        element.addEventListener('click', async () => {
          state.selectedPath = element.getAttribute('data-file-path');
          renderTree();
          await loadFile(state.selectedPath);
        });
      });
    }

    function renderTreeNodes(nodes) {
      return '<ul class="tree">' + nodes.map(node => {
        if (node.type === 'directory') {
          return '<li><div class="tree-item"><span class="kind">▾</span><span>' + escapeHtml(node.name) + '</span></div>' + renderTreeNodes(node.children || []) + '</li>';
        }
        const activeClass = state.selectedPath === node.relativePath ? ' active' : '';
        return '<li><div class="tree-item' + activeClass + '" data-file-path="' + escapeAttr(node.relativePath) + '"><span class="kind">📄</span><span>' + escapeHtml(node.name) + '</span></div></li>';
      }).join('') + '</ul>';
    }

    function autoSelectFirstFile() {
      if (state.selectedPath && findFile(state.filteredTree, state.selectedPath)) {
        return;
      }
      const firstFile = pickFirstFile(state.filteredTree);
      if (!firstFile) {
        previewContainer.innerHTML = '<div class="empty">请选择左侧文件进行预览。</div>';
        state.selectedPath = '';
        return;
      }
      state.selectedPath = firstFile.relativePath;
      renderTree();
      loadFile(firstFile.relativePath);
    }

    function pickFirstFile(nodes) {
      for (const node of nodes) {
        if (node.type === 'file') return node;
        const child = pickFirstFile(node.children || []);
        if (child) return child;
      }
      return null;
    }

    function findFile(nodes, relativePath) {
      for (const node of nodes) {
        if (node.type === 'file' && node.relativePath === relativePath) return node;
        if (node.children && findFile(node.children, relativePath)) return true;
      }
      return false;
    }

    async function loadFile(relativePath) {
      const payload = await fetchJson('/api/file?root=' + encodeURIComponent(state.currentRootId) + '&path=' + encodeURIComponent(relativePath));
      const file = payload.file;
      previewContainer.innerHTML =
        '<h1 style="margin:0;">' + escapeHtml(file.name) + '</h1>' +
        '<div class="file-meta">' +
          '<span class="badge">类型：文件</span>' +
          '<span class="badge">扩展名：' + escapeHtml(file.extension || '无') + '</span>' +
          '<span class="badge">大小：' + file.size + ' B</span>' +
        '</div>' +
        '<div class="file-meta"><span>' + escapeHtml(file.path) + '</span></div>' +
        '<div class="preview">' + file.rendered + '</div>';
    }

    async function fetchJson(url) {
      const response = await fetch(url);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || '请求失败');
      }
      return payload;
    }

    async function closeService() {
      const confirmed = window.confirm('确认关闭本地网页版 Skills 服务？');
      if (!confirmed) {
        return;
      }

      closeBtn.disabled = true;
      closeBtn.textContent = '正在关闭...';
      try {
        const response = await fetch('/api/close', { method: 'POST' });
        if (!response.ok) {
          throw new Error('关闭失败');
        }
        document.body.innerHTML = '<div style="display:flex;min-height:100vh;align-items:center;justify-content:center;font:16px/1.6 Segoe UI,system-ui,sans-serif;color:#475467;background:#f6f7fb;">本地网页版 Skills 已关闭，现在可以关闭这个页面了。</div>';
        setTimeout(() => {
          window.close();
        }, 300);
      }
      catch (error) {
        closeBtn.disabled = false;
        closeBtn.textContent = '关闭服务';
        window.alert(error instanceof Error ? error.message : '关闭失败');
      }
    }

    function escapeHtml(value) {
      return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
    }

    function escapeAttr(value) {
      return escapeHtml(value).replaceAll('"', '&quot;');
    }
  </script>
</body>
</html>`
}
