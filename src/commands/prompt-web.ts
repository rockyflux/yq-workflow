import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import type { ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'
import { basename } from 'node:path'
import ansis from 'ansis'
import fs from 'fs-extra'
import { getCcgDir } from '../utils/config'
import type { PromptProfileId } from '../utils/prompt-files'
import {
  getPromptProfileDefinition,
  getPromptProfileDefinitions,
  listPromptBackupEntries,
  readPromptFile,
  restorePromptFileFromBackup,
  writePromptFileWithBackup,
} from '../utils/prompt-files'
import { getSpawnCommand } from '../utils/platform'

type PromptWebOptions = {
  openBrowser?: boolean
  profileId?: PromptProfileId
}

type PromptWebState = {
  pid: number
  url: string
  profileId: PromptProfileId
  startedAt: string
}

type PromptWebLaunchResult =
  | { status: 'reused', url: string }
  | { status: 'spawned' }

const DEFAULT_PROFILE_ID: PromptProfileId = 'claude'
const HOT_CLAUDE_PROMPT = {
  label: '热门 Claude.md',
  url: 'https://raw.githubusercontent.com/forrestchang/andrej-karpathy-skills/main/CLAUDE.md',
} as const
let ownedPromptWebPid: number | null = null
let cleanupRegistered = false

export async function launchPromptWebDetached(profileId: PromptProfileId = DEFAULT_PROFILE_ID): Promise<PromptWebLaunchResult> {
  const targetProfileId = profileId || DEFAULT_PROFILE_ID
  const existingState = await getActivePromptWebState()
  if (existingState) {
    await openUrl(existingState.url)
    return { status: 'reused', url: existingState.url }
  }

  const scriptPath = process.argv[1]
  if (!scriptPath) {
    throw new Error('未找到当前 CLI 入口，无法启动提示词配置页')
  }

  const isTypeScriptEntry = scriptPath.endsWith('.ts')
  const launchCommand = isTypeScriptEntry
    ? getSpawnCommand('pnpm', ['exec', 'tsx', 'src/cli.ts', 'config', 'prompt-web'])
    : { command: process.execPath, args: [scriptPath, 'config', 'prompt-web'] }

  const child = spawn(launchCommand.command, launchCommand.args, {
    cwd: process.cwd(),
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
    env: {
      ...process.env,
      YQ_PROMPT_WEB_OWNER_PID: String(process.pid),
      YQ_PROMPT_WEB_PROFILE_ID: targetProfileId,
    },
  })

  child.unref()
  registerOwnedPromptWebProcess(child.pid)
  return { status: 'spawned' }
}

export async function startPromptWebServer(options: PromptWebOptions = {}): Promise<void> {
  const resolvedProfileId = options.profileId || getProfileIdFromEnv() || DEFAULT_PROFILE_ID
  const ownerPid = getOwnerPidFromEnv()
  const currentState = await getActivePromptWebState()
  if (currentState) {
    console.log(ansis.yellow(`本地提示词配置页已在运行：${currentState.url}`))
    if (options.openBrowser !== false) {
      await openUrl(currentState.url)
    }
    return
  }

  const profiles = getPromptProfileDefinitions()
  const payload = {
    profiles: profiles.map(profile => ({
      id: profile.id,
      label: profile.label,
      description: profile.description,
      path: profile.path,
    })),
    defaultProfileId: resolvedProfileId,
  }

  const server = createServer(async (req, res) => {
    const requestUrl = new URL(req.url || '/', 'http://127.0.0.1')
    try {
      if (requestUrl.pathname === '/api/profiles') {
        sendJson(res, payload)
        return
      }

      if (requestUrl.pathname === '/api/document' && req.method === 'GET') {
        const profile = getProfileOrFallback(requestUrl.searchParams.get('profile'))
        const stat = await fs.stat(profile.path).catch(() => null)
        const backups = await listPromptBackupEntries(profile.path)
        sendJson(res, {
          profile,
          document: {
            name: basename(profile.path),
            path: profile.path,
            content: await readPromptFile(profile.path),
            exists: Boolean(stat?.isFile()),
            modifiedAt: stat?.mtime.toISOString() || null,
            size: stat?.size || 0,
            backups,
          },
        })
        return
      }

      if (requestUrl.pathname === '/api/document' && req.method === 'POST') {
        const body = await readRequestBody(req)
        const profile = getProfileOrFallback(typeof body.profileId === 'string' ? body.profileId : null)
        if (typeof body.content !== 'string') {
          sendJson(res, { error: '内容不能为空' }, 400)
          return
        }

        const backupPath = await writePromptFileWithBackup(profile.path, body.content)
        const stat = await fs.stat(profile.path)
        sendJson(res, {
          ok: true,
          profile,
          backupPath,
          document: {
            name: basename(profile.path),
            path: profile.path,
            content: body.content,
            exists: true,
            modifiedAt: stat.mtime.toISOString(),
            size: stat.size,
            backups: await listPromptBackupEntries(profile.path),
          },
        })
        return
      }

      if (requestUrl.pathname === '/api/restore' && req.method === 'POST') {
        const body = await readRequestBody(req)
        const profile = getProfileOrFallback(typeof body.profileId === 'string' ? body.profileId : null)
        if (typeof body.backupFileName !== 'string' || !body.backupFileName.trim()) {
          sendJson(res, { error: '缺少备份文件名' }, 400)
          return
        }

        const backupPath = await restorePromptFileFromBackup(profile.path, body.backupFileName.trim())
        const stat = await fs.stat(profile.path)
        sendJson(res, {
          ok: true,
          profile,
          backupPath,
          restoredFrom: body.backupFileName.trim(),
          document: {
            name: basename(profile.path),
            path: profile.path,
            content: await readPromptFile(profile.path),
            exists: true,
            modifiedAt: stat.mtime.toISOString(),
            size: stat.size,
            backups: await listPromptBackupEntries(profile.path),
          },
        })
        return
      }

      if (requestUrl.pathname === '/api/import-hot' && req.method === 'POST') {
        const body = await readRequestBody(req)
        const profile = getProfileOrFallback(typeof body.profileId === 'string' ? body.profileId : null)
        const imported = await fetchHotPromptContent(profile.id)
        sendJson(res, {
          ok: true,
          profile,
          sourceLabel: imported.label,
          sourceUrl: imported.url,
          content: imported.content,
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
      res.end(renderPromptAppHtml())
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
  await writePromptWebState({
    pid: process.pid,
    url,
    profileId: resolvedProfileId,
    startedAt: new Date().toISOString(),
  })

  const cleanup = async () => {
    await clearPromptWebState(process.pid)
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

  console.log(ansis.cyan(`本地提示词配置页已启动：${url}`))

  if (options.openBrowser !== false) {
    const opened = await openUrl(url)
    if (!opened) {
      console.log(ansis.yellow(`未能自动打开浏览器，请手动访问 ${url}`))
    }
  }
}

export async function closePromptWebServer(): Promise<boolean> {
  const state = await readPromptWebState()
  if (!state) {
    return false
  }

  if (isProcessAlive(state.pid)) {
    try {
      process.kill(state.pid, 'SIGTERM')
    }
    catch {
      await clearPromptWebState()
      return false
    }

    await waitForProcessExit(state.pid, 3000)
  }

  await clearPromptWebState()
  return true
}

export async function getActivePromptWebState(): Promise<PromptWebState | null> {
  const state = await readPromptWebState()
  if (!state) {
    return null
  }

  if (!isProcessAlive(state.pid)) {
    await clearPromptWebState()
    return null
  }

  try {
    const response = await fetch(`${state.url}/api/profiles`)
    if (!response.ok) {
      throw new Error('healthcheck failed')
    }
    return state
  }
  catch {
    await clearPromptWebState()
    return null
  }
}

function getProfileOrFallback(profileId: string | null): ReturnType<typeof getPromptProfileDefinition> {
  return getPromptProfileDefinition((profileId as PromptProfileId) || DEFAULT_PROFILE_ID)
}

export function getHotPromptImportSource(profileId: PromptProfileId): { label: string, url: string } | null {
  if (profileId === 'claude') {
    return HOT_CLAUDE_PROMPT
  }
  return null
}

function getProfileIdFromEnv(): PromptProfileId | null {
  const profileId = process.env.YQ_PROMPT_WEB_PROFILE_ID
  if (profileId === 'claude' || profileId === 'codex' || profileId === 'gemini' || profileId === 'cursor' || profileId === 'kiro') {
    return profileId
  }
  return null
}

function getOwnerPidFromEnv(): number | null {
  const rawPid = process.env.YQ_PROMPT_WEB_OWNER_PID
  if (!rawPid) {
    return null
  }

  const ownerPid = Number(rawPid)
  if (!Number.isInteger(ownerPid) || ownerPid <= 0) {
    return null
  }

  return ownerPid
}

function registerOwnedPromptWebProcess(pid: number | undefined): void {
  if (!pid) {
    return
  }

  ownedPromptWebPid = pid
  if (cleanupRegistered) {
    return
  }

  const cleanup = () => {
    if (!ownedPromptWebPid) {
      return
    }

    try {
      process.kill(ownedPromptWebPid, 'SIGTERM')
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

async function readRequestBody(req: NodeJS.ReadableStream): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)))
  }

  if (chunks.length === 0) {
    return {}
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf-8')) as Record<string, unknown>
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

function getPromptWebStatePath(): string {
  return `${getCcgDir()}/prompt-web.json`
}

async function readPromptWebState(): Promise<PromptWebState | null> {
  try {
    const filePath = getPromptWebStatePath()
    if (!(await fs.pathExists(filePath))) {
      return null
    }
    return await fs.readJson(filePath) as PromptWebState
  }
  catch {
    return null
  }
}

async function writePromptWebState(state: PromptWebState): Promise<void> {
  await fs.ensureDir(getCcgDir())
  await fs.writeJson(getPromptWebStatePath(), state, { spaces: 2 })
}

async function clearPromptWebState(expectedPid?: number): Promise<void> {
  const filePath = getPromptWebStatePath()
  if (!(await fs.pathExists(filePath))) {
    return
  }

  if (typeof expectedPid === 'number') {
    const current = await readPromptWebState()
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

async function fetchHotPromptContent(profileId: PromptProfileId): Promise<{ label: string, url: string, content: string }> {
  const source = getHotPromptImportSource(profileId)
  if (!source) {
    throw new Error('当前提示词暂不支持导入热门模板')
  }

  const response = await fetch(source.url, {
    signal: AbortSignal.timeout(10000),
  })
  if (!response.ok) {
    throw new Error(`读取热门模板失败（${response.status}）`)
  }

  const content = await response.text()
  if (!content.trim()) {
    throw new Error('读取到的热门模板内容为空')
  }

  return {
    ...source,
    content,
  }
}

function renderPromptAppHtml(): string {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>YQ Prompt Config</title>
  <style>
    :root { color-scheme: light; --bg:#f5f7fb; --panel:#ffffff; --panel-soft:#fbfcff; --border:#e3e8f3; --text:#182230; --muted:#667085; --accent:#2563eb; --accent-soft:#e9f0ff; --hover:#eef4ff; --danger:#c52828; --shadow:0 18px 44px rgba(15, 23, 42, .08); }
    * { box-sizing:border-box; }
    body { margin:0; font-family:"Segoe UI",system-ui,sans-serif; background:linear-gradient(180deg, #f8faff 0%, #f4f6fb 100%); color:var(--text); }
    button, textarea { font:inherit; }
    .page { max-width:1680px; margin:0 auto; padding:24px; }
    .layout { display:grid; grid-template-columns:320px minmax(0, 1fr); gap:18px; min-height:calc(100vh - 48px); }
    .sidebar, .main { background:var(--panel); border:1px solid var(--border); border-radius:18px; box-shadow:var(--shadow); }
    .sidebar { display:flex; flex-direction:column; padding:18px; gap:18px; }
    .brand h1 { margin:0; font-size:28px; line-height:1.1; }
    .brand p { margin:10px 0 0; color:var(--muted); line-height:1.6; }
    .tip { padding:14px 16px; border:1px solid var(--border); border-radius:14px; background:var(--panel-soft); color:var(--muted); line-height:1.6; }
    .nav { display:grid; gap:10px; }
    .nav-item { width:100%; border:1px solid var(--border); background:#fff; border-radius:16px; padding:14px 16px; text-align:left; cursor:pointer; transition:all .18s ease; }
    .nav-item:hover { background:var(--hover); border-color:#d8e3ff; }
    .nav-item.active { background:var(--accent-soft); border-color:#bfd3ff; }
    .nav-item strong { display:block; font-size:18px; margin-bottom:6px; }
    .nav-item span { display:block; color:var(--muted); line-height:1.4; }
    .meta-list { display:grid; gap:10px; }
    .meta-item { border:1px solid var(--border); border-radius:14px; padding:12px 14px; background:#fff; }
    .meta-item b { display:block; margin-bottom:6px; font-size:13px; color:var(--muted); }
    .meta-item code { font-family:Consolas,monospace; font-size:12px; white-space:pre-wrap; word-break:break-all; }
    .main { display:flex; flex-direction:column; overflow:hidden; }
    .main-header { padding:22px 24px 18px; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; gap:16px; align-items:flex-start; flex-wrap:wrap; }
    .title-row { display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
    .title-wrap h2 { margin:0; font-size:32px; }
    .title-wrap p { margin:10px 0 0; color:var(--muted); }
    .toolbar { display:flex; gap:10px; flex-wrap:wrap; }
    .toolbar button, .history-select { height:44px; border:1px solid var(--border); background:#fff; border-radius:14px; padding:0 16px; }
    .toolbar button { cursor:pointer; font-weight:600; }
    .toolbar button.primary { background:var(--accent); color:#fff; border-color:var(--accent); }
    .toolbar button.hidden, .title-row button.hidden { display:none; }
    .toolbar button.warn { color:var(--danger); }
    .title-row button { height:36px; padding:0 12px; border:1px solid var(--border); background:#fff; border-radius:12px; cursor:pointer; font-size:13px; font-weight:500; }
    .history-select { min-width:260px; color:var(--text); }
    .editor-wrap { display:grid; grid-template-columns:minmax(0, 1fr) 320px; gap:0; min-height:0; flex:1; }
    .editor-panel { display:flex; flex-direction:column; min-height:0; }
    .editor-meta { padding:14px 24px; display:flex; gap:10px; flex-wrap:wrap; border-bottom:1px solid var(--border); color:var(--muted); background:var(--panel-soft); }
    .badge { display:inline-flex; align-items:center; min-height:32px; padding:6px 12px; border:1px solid var(--border); border-radius:999px; background:#fff; }
    .editor { flex:1; width:100%; min-height:520px; border:0; padding:24px; resize:none; outline:none; line-height:1.75; font-size:15px; font-family:Consolas,"Courier New",monospace; background:#fff; color:var(--text); }
    .history-panel { border-left:1px solid var(--border); background:var(--panel-soft); display:flex; flex-direction:column; min-height:0; }
    .history-panel h3 { margin:0; font-size:18px; }
    .history-head { padding:18px 18px 14px; border-bottom:1px solid var(--border); }
    .history-head p { margin:10px 0 0; color:var(--muted); line-height:1.5; }
    .history-list { padding:14px; overflow:auto; display:grid; gap:10px; }
    .history-item { border:1px solid var(--border); background:#fff; border-radius:14px; padding:12px; display:grid; gap:10px; }
    .history-item strong { font-size:14px; }
    .history-item span { color:var(--muted); font-size:12px; line-height:1.5; word-break:break-all; }
    .history-item button { height:36px; border:1px solid var(--border); background:#fff; border-radius:10px; cursor:pointer; }
    .status { padding:0 24px 22px; color:var(--muted); }
    .empty { padding:18px; color:var(--muted); }
    @media (max-width: 1200px) {
      .layout { grid-template-columns:1fr; }
      .editor-wrap { grid-template-columns:1fr; }
      .history-panel { border-left:0; border-top:1px solid var(--border); max-height:360px; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="layout">
      <aside class="sidebar">
        <div class="brand">
          <h1>提示词配置</h1>
          <p>集中管理 Claude、Codex、Gemini、Cursor、Kiro 的全局提示词文件。每次保存都会先生成对应的备份目录，例如 <code>CLAUDE-backup</code>、<code>AGENTS-backup</code>、<code>guidelines-backup</code>、<code>kiro-backup</code>，历史版本可以随时恢复，每种提示词最多保留最新 10 份。</p>
        </div>
        <div id="nav" class="nav"></div>
        <div class="tip">右侧保存会先弹出确认，再自动把当前版本备份到对应目录，例如 <code>CLAUDE-backup</code>、<code>AGENTS-backup</code>、<code>guidelines-backup</code>、<code>kiro-backup</code>。恢复历史时，也会先备份当前版本；每种提示词最多保留最新 10 份备份。</div>
        <div class="meta-list">
          <div class="meta-item"><b>当前文件</b><code id="currentFilePath">-</code></div>
          <div class="meta-item"><b>最近保存</b><code id="currentModifiedAt">-</code></div>
        </div>
      </aside>
      <main class="main">
        <div class="main-header">
          <div class="title-wrap">
            <div class="title-row">
              <h2 id="title">加载中...</h2>
              <button id="importHotBtn" type="button" class="hidden">导入热门 Claude.md</button>
            </div>
            <p id="subtitle">正在读取提示词配置。</p>
          </div>
          <div class="toolbar">
            <select id="historySelect" class="history-select">
              <option value="">选择历史版本后可恢复</option>
            </select>
            <button id="restoreBtn" type="button">恢复所选历史</button>
            <button id="reloadBtn" type="button">重新加载</button>
            <button id="closeBtn" type="button" class="warn">关闭服务</button>
            <button id="saveBtn" type="button" class="primary">保存</button>
          </div>
        </div>
        <div class="editor-wrap">
          <section class="editor-panel">
            <div class="editor-meta">
              <span class="badge" id="fileNameBadge">文件：-</span>
              <span class="badge" id="sizeBadge">大小：0 B</span>
              <span class="badge" id="backupBadge">备份：0 个</span>
            </div>
            <textarea id="editor" class="editor" spellcheck="false" placeholder="这里会显示当前提示词内容。"></textarea>
            <div id="status" class="status">准备就绪。</div>
          </section>
          <aside class="history-panel">
            <div class="history-head">
              <h3>备份历史</h3>
              <p>按时间倒序显示。恢复任意版本时，系统会先备份当前内容，再写回所选历史，并仅保留最新 10 份。</p>
            </div>
            <div id="historyList" class="history-list">
              <div class="empty">暂无备份记录。</div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  </div>
  <script>
    const state = {
      profiles: [],
      currentProfileId: 'claude',
      document: null,
      dirty: false,
      loading: false,
    };

    const nav = document.getElementById('nav');
    const title = document.getElementById('title');
    const subtitle = document.getElementById('subtitle');
    const currentFilePath = document.getElementById('currentFilePath');
    const currentModifiedAt = document.getElementById('currentModifiedAt');
    const historySelect = document.getElementById('historySelect');
    const importHotBtn = document.getElementById('importHotBtn');
    const restoreBtn = document.getElementById('restoreBtn');
    const reloadBtn = document.getElementById('reloadBtn');
    const closeBtn = document.getElementById('closeBtn');
    const saveBtn = document.getElementById('saveBtn');
    const editor = document.getElementById('editor');
    const status = document.getElementById('status');
    const fileNameBadge = document.getElementById('fileNameBadge');
    const sizeBadge = document.getElementById('sizeBadge');
    const backupBadge = document.getElementById('backupBadge');
    const historyList = document.getElementById('historyList');

    init();

    async function init() {
      const payload = await fetchJson('/api/profiles');
      state.profiles = payload.profiles || [];
      state.currentProfileId = payload.defaultProfileId || 'claude';
      renderNav();
      bindEvents();
      await loadDocument(state.currentProfileId);
    }

    function bindEvents() {
      editor.addEventListener('input', () => {
        state.dirty = true;
        syncStatus('内容已修改，尚未保存。');
      });
      saveBtn.addEventListener('click', saveDocument);
      importHotBtn.addEventListener('click', importHotPrompt);
      reloadBtn.addEventListener('click', async () => {
        await loadDocument(state.currentProfileId, true);
      });
      restoreBtn.addEventListener('click', restoreSelectedBackup);
      closeBtn.addEventListener('click', closeService);
      window.addEventListener('beforeunload', (event) => {
        if (!state.dirty) return;
        event.preventDefault();
        event.returnValue = '';
      });
    }

    function renderNav() {
      nav.innerHTML = state.profiles.map(profile => {
        const active = profile.id === state.currentProfileId ? ' active' : '';
        return '<button class="nav-item' + active + '" type="button" data-profile-id="' + escapeAttr(profile.id) + '">' +
          '<strong>' + escapeHtml(profile.label) + '</strong>' +
          '<span>' + escapeHtml(profile.description) + '</span>' +
        '</button>';
      }).join('');

      nav.querySelectorAll('[data-profile-id]').forEach(element => {
        element.addEventListener('click', async () => {
          const nextProfileId = element.getAttribute('data-profile-id');
          if (!nextProfileId || nextProfileId === state.currentProfileId) {
            return;
          }
          if (state.dirty && !window.confirm('当前内容尚未保存，确认切换到其他提示词吗？')) {
            return;
          }
          state.currentProfileId = nextProfileId;
          renderNav();
          await loadDocument(nextProfileId);
        });
      });
    }

    async function loadDocument(profileId, forceNotice = false) {
      state.loading = true;
      setToolbarDisabled(true);
      syncStatus('正在读取文件...');
      try {
        const payload = await fetchJson('/api/document?profile=' + encodeURIComponent(profileId));
        state.document = payload.document;
        state.currentProfileId = payload.profile.id;
        state.dirty = false;
        renderDocument(payload.profile, payload.document);
        if (forceNotice) {
          syncStatus('已重新加载磁盘内容。');
        }
        else {
          syncStatus(payload.document.exists ? '已读取当前提示词。' : '文件尚不存在，保存后会自动创建。');
        }
      }
      catch (error) {
        syncStatus(error instanceof Error ? error.message : '读取失败');
      }
      finally {
        state.loading = false;
        setToolbarDisabled(false);
      }
    }

    function renderDocument(profile, document) {
      title.textContent = profile.description;
      subtitle.textContent = document.name + ' · ' + document.path;
      currentFilePath.textContent = document.path;
      currentModifiedAt.textContent = document.modifiedAt ? formatDateTime(document.modifiedAt) : '尚未创建';
      fileNameBadge.textContent = '文件：' + document.name;
      sizeBadge.textContent = '大小：' + formatFileSize(document.size);
      backupBadge.textContent = '备份：' + document.backups.length + ' 个';
      editor.value = document.content || '';
      syncImportButton(profile.id);
      renderHistory(document.backups || []);
    }

    function syncImportButton(profileId) {
      const isClaude = profileId === 'claude';
      importHotBtn.disabled = !isClaude;
      importHotBtn.classList.toggle('hidden', !isClaude);
      importHotBtn.title = isClaude ? '从热门 Claude.md 模板导入内容到编辑器' : '';
    }

    function renderHistory(backups) {
      historySelect.innerHTML = '<option value="">选择历史版本后可恢复</option>' + backups.map(item => {
        return '<option value="' + escapeAttr(item.fileName) + '">' + escapeHtml(item.fileName) + ' · ' + formatDateTime(item.modifiedAt) + '</option>';
      }).join('');

      if (!backups.length) {
        historyList.innerHTML = '<div class="empty">暂无备份记录。</div>';
        return;
      }

      historyList.innerHTML = backups.map(item => {
        return '<div class="history-item">' +
          '<strong>' + escapeHtml(item.fileName) + '</strong>' +
          '<span>时间：' + formatDateTime(item.modifiedAt) + '</span>' +
          '<span>大小：' + formatFileSize(item.size) + '</span>' +
          '<span>' + escapeHtml(item.path) + '</span>' +
          '<button type="button" data-restore-name="' + escapeAttr(item.fileName) + '">恢复这个版本</button>' +
        '</div>';
      }).join('');

      historyList.querySelectorAll('[data-restore-name]').forEach(element => {
        element.addEventListener('click', async () => {
          const backupFileName = element.getAttribute('data-restore-name');
          if (!backupFileName) return;
          historySelect.value = backupFileName;
          await restoreSelectedBackup();
        });
      });
    }

    async function saveDocument() {
      if (state.loading) return;
      if (!window.confirm('确认保存当前提示词吗？保存前会先写入对应的 *-backup 目录备份。')) {
        syncStatus('已取消保存。');
        return;
      }
      setToolbarDisabled(true);
      syncStatus('正在保存...');
      try {
        const payload = await fetchJson('/api/document', {
          method: 'POST',
          body: JSON.stringify({
            profileId: state.currentProfileId,
            content: editor.value,
          }),
        });
        state.document = payload.document;
        state.dirty = false;
        renderDocument(payload.profile, payload.document);
        syncStatus(payload.backupPath ? '保存完成，已生成备份：' + payload.backupPath : '保存完成。');
      }
      catch (error) {
        syncStatus(error instanceof Error ? error.message : '保存失败');
      }
      finally {
        setToolbarDisabled(false);
      }
    }

    async function importHotPrompt() {
      if (state.loading) return;
      if (state.currentProfileId !== 'claude') {
        window.alert('当前只有 Claude 提示词支持导入热门模板。');
        return;
      }

      if ((state.dirty || editor.value.trim()) && !window.confirm('导入会覆盖编辑器中的当前内容，但不会自动保存到磁盘，确认继续吗？')) {
        return;
      }

      setToolbarDisabled(true);
      syncStatus('正在导入热门 Claude.md...');
      try {
        const payload = await fetchJson('/api/import-hot', {
          method: 'POST',
          body: JSON.stringify({
            profileId: state.currentProfileId,
          }),
        });
        editor.value = payload.content || '';
        state.dirty = true;
        editor.focus();
        syncStatus('已导入 ' + payload.sourceLabel + '，请确认内容后再保存。');
      }
      catch (error) {
        syncStatus(error instanceof Error ? error.message : '导入失败');
      }
      finally {
        setToolbarDisabled(false);
      }
    }

    async function restoreSelectedBackup() {
      const backupFileName = historySelect.value;
      if (!backupFileName) {
        window.alert('请先选择一个历史版本。');
        return;
      }
      if (!window.confirm('恢复后会覆盖当前内容，并先为当前内容创建一个新备份，确认继续吗？')) {
        return;
      }

      setToolbarDisabled(true);
      syncStatus('正在恢复历史版本...');
      try {
        const payload = await fetchJson('/api/restore', {
          method: 'POST',
          body: JSON.stringify({
            profileId: state.currentProfileId,
            backupFileName,
          }),
        });
        state.document = payload.document;
        state.dirty = false;
        renderDocument(payload.profile, payload.document);
        syncStatus('已恢复历史版本：' + payload.restoredFrom);
      }
      catch (error) {
        syncStatus(error instanceof Error ? error.message : '恢复失败');
      }
      finally {
        setToolbarDisabled(false);
      }
    }

    async function closeService() {
      const confirmed = window.confirm('确认关闭本地提示词配置页服务？');
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
        document.body.innerHTML = '<div style="display:flex;min-height:100vh;align-items:center;justify-content:center;font:16px/1.6 Segoe UI,system-ui,sans-serif;color:#475467;background:#f6f7fb;">本地提示词配置页已关闭，现在可以关闭这个页面了。</div>';
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

    function setToolbarDisabled(disabled) {
      saveBtn.disabled = disabled;
      importHotBtn.disabled = disabled || state.currentProfileId !== 'claude';
      reloadBtn.disabled = disabled;
      restoreBtn.disabled = disabled;
      historySelect.disabled = disabled;
      editor.disabled = disabled;
    }

    async function fetchJson(url, options) {
      const response = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || '请求失败');
      }
      return payload;
    }

    function syncStatus(message) {
      status.textContent = message;
    }

    function formatDateTime(value) {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        return value;
      }
      return date.toLocaleString('zh-CN', { hour12: false });
    }

    function formatFileSize(size) {
      const value = Number(size) || 0;
      if (value < 1024) {
        return value + ' B';
      }

      const units = ['KB', 'MB', 'GB', 'TB'];
      let nextValue = value / 1024;
      let unitIndex = 0;
      while (nextValue >= 1024 && unitIndex < units.length - 1) {
        nextValue = nextValue / 1024;
        unitIndex += 1;
      }

      const digits = nextValue >= 100 ? 0 : nextValue >= 10 ? 1 : 2;
      return nextValue.toFixed(digits).replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1') + ' ' + units[unitIndex];
    }

    function escapeHtml(value) {
      return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
    }

    function escapeAttr(value) {
      return escapeHtml(value).replaceAll('"', '&quot;');
    }
  </script>
</body>
</html>`
}
