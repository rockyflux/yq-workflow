import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'
import ansis from 'ansis'
import fs from 'fs-extra'
import { getCcgDir } from '../utils/config'
import type { McpClientId, McpServerConfig } from '../utils/mcp'
import { getSpawnCommand } from '../utils/platform'
import {
  backupMcpClientConfig,
  getMcpClientDefinition,
  getMcpClientDefinitions,
  listConfiguredMcpServers,
  removeMcpServerFromClient,
  upsertMcpServer,
} from '../utils/mcp'
import {
  addSmitheryServer,
  getSmitheryCliStatus,
  installSmitheryCliGlobal,
  searchSmitheryServers,
} from '../utils/smithery'

type McpWebOptions = {
  openBrowser?: boolean
  clientId?: McpClientId
}

type McpWebState = {
  pid: number
  url: string
  clientId: McpClientId
  startedAt: string
}

type McpServerView = {
  id: string
  enabled: boolean
  config: McpServerConfig
}

type McpManagerState = {
  disabled?: Partial<Record<McpClientId, Record<string, McpServerConfig>>>
}

type McpPreset = {
  id: string
  name: string
  category: string
  description: string
  template: McpServerConfig
}

const DEFAULT_CLIENT_ID: McpClientId = 'claude'
const SMITHERY_SERVERS_URL = 'https://smithery.ai/servers'
const SMITHERY_QUICK_TERMS = ['brave', 'context7', 'playwright', 'filesystem', 'memory', 'postgres', 'github', 'fetch']
const PRESETS: McpPreset[] = [
  { id: 'context7', name: 'Context7', category: '必装工具', description: '获取最新库文档', template: { type: 'stdio', command: 'npx', args: ['-y', '@upstash/context7-mcp@latest'] } },
  { id: 'playwright', name: 'Playwright', category: '必装工具', description: '浏览器自动化 / 测试', template: { type: 'stdio', command: 'npx', args: ['-y', '@playwright/mcp@latest'] } },
  { id: 'mcp-deepwiki', name: 'DeepWiki', category: '必装工具', description: '知识库查询 / 仓库百科', template: { type: 'stdio', command: 'npx', args: ['-y', 'mcp-deepwiki@latest'] } },
  { id: 'postgres', name: 'PostgreSQL', category: '数据库操作', description: '按需填入连接串', template: { type: 'stdio', command: 'npx', args: ['-y', '@modelcontextprotocol/server-postgres', 'postgresql://user:password@localhost:5432/mydb'] } },
  { id: 'sqlite', name: 'SQLite', category: '数据库操作', description: '本地 SQLite 查询', template: { type: 'stdio', command: 'npx', args: ['-y', '@mvd/sqlite-mcp@latest'] } },
  { id: 'github', name: 'GitHub', category: 'Git / 版本控制', description: '请在 env 中填入 Token', template: { type: 'stdio', command: 'npx', args: ['-y', '@modelcontextprotocol/server-github'], env: { GITHUB_PERSONAL_ACCESS_TOKEN: 'your-token' } } },
  { id: 'git', name: 'Git', category: 'Git / 版本控制', description: '本地仓库读取', template: { type: 'stdio', command: 'uvx', args: ['--from', 'mcp-server-git', 'mcp-server-git', '--repository', process.cwd()] } },
  { id: 'filesystem', name: 'Filesystem', category: '文件 / 资源操作', description: '本地目录读写', template: { type: 'stdio', command: 'npx', args: ['-y', '@modelcontextprotocol/server-filesystem', process.cwd()] } },
  { id: 'memory', name: 'Memory', category: '文件 / 资源操作', description: '本地持久化记忆', template: { type: 'stdio', command: 'npx', args: ['-y', '@modelcontextprotocol/server-memory'] } },
]

let ownedMcpWebPid: number | null = null
let cleanupRegistered = false

export async function launchMcpWebDetached(clientId: McpClientId = DEFAULT_CLIENT_ID): Promise<{ status: 'reused', url: string } | { status: 'spawned' }> {
  const currentState = await getActiveMcpWebState()
  if (currentState) {
    await openUrl(currentState.url)
    return { status: 'reused', url: currentState.url }
  }

  const scriptPath = process.argv[1]
  if (!scriptPath) {
    throw new Error('未找到当前 CLI 入口，无法启动 MCP 配置页')
  }

  const isTypeScriptEntry = scriptPath.endsWith('.ts')
  const launchCommand = isTypeScriptEntry
    ? getSpawnCommand('pnpm', ['exec', 'tsx', 'src/cli.ts', 'config', 'mcp-web'])
    : { command: process.execPath, args: [scriptPath, 'config', 'mcp-web'] }
  const child = spawn(launchCommand.command, launchCommand.args, {
    cwd: process.cwd(),
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
    env: { ...process.env, YQ_MCP_WEB_OWNER_PID: String(process.pid), YQ_MCP_WEB_CLIENT_ID: clientId },
  })

  child.unref()
  registerOwnedMcpWebProcess(child.pid)
  return { status: 'spawned' }
}

export async function startMcpWebServer(options: McpWebOptions = {}): Promise<void> {
  const resolvedClientId = options.clientId || getClientIdFromEnv() || DEFAULT_CLIENT_ID
  const ownerPid = getOwnerPidFromEnv()
  const currentState = await getActiveMcpWebState()
  if (currentState) {
    console.log(ansis.yellow(`本地 MCP 配置页已在运行：${currentState.url}`))
    if (options.openBrowser !== false) {
      await openUrl(currentState.url)
    }
    return
  }

  const server = createServer(async (req, res) => {
    const requestUrl = new URL(req.url || '/', 'http://127.0.0.1')
    try {
      if (requestUrl.pathname === '/api/bootstrap') {
        sendJson(res, {
          clients: getMcpClientDefinitions(),
          defaultClientId: resolvedClientId,
          presets: PRESETS,
          smitheryQuickTerms: SMITHERY_QUICK_TERMS,
        })
        return
      }

      if (requestUrl.pathname === '/api/servers') {
        const clientId = getClientOrFallback(requestUrl.searchParams.get('client'))
        sendJson(res, {
          client: getMcpClientDefinition(clientId),
          servers: await listAllServers(clientId),
        })
        return
      }

      if (requestUrl.pathname === '/api/server' && req.method === 'POST') {
        const body = await readJsonBody(req)
        const clientId = getClientOrFallback(typeof body.clientId === 'string' ? body.clientId : null)
        const serverId = normalizeServerId(body.serverId)
        const config = normalizeServerConfig(body.config)
        const enabled = body.enabled !== false
        await backupMcpClientConfig(clientId)
        await saveServer(clientId, serverId, config, enabled)
        sendJson(res, { ok: true })
        return
      }

      if (requestUrl.pathname === '/api/toggle' && req.method === 'POST') {
        const body = await readJsonBody(req)
        const clientId = getClientOrFallback(typeof body.clientId === 'string' ? body.clientId : null)
        const serverId = normalizeServerId(body.serverId)
        await backupMcpClientConfig(clientId)
        await toggleServer(clientId, serverId, Boolean(body.enabled))
        sendJson(res, { ok: true })
        return
      }

      if (requestUrl.pathname === '/api/server' && req.method === 'DELETE') {
        const clientId = getClientOrFallback(requestUrl.searchParams.get('client'))
        const serverId = normalizeServerId(requestUrl.searchParams.get('id'))
        await backupMcpClientConfig(clientId)
        await deleteServer(clientId, serverId)
        sendJson(res, { ok: true })
        return
      }

      if (requestUrl.pathname === '/api/smithery/status') {
        sendJson(res, {
          catalogUrl: SMITHERY_SERVERS_URL,
          status: await getSmitheryCliStatus(),
        })
        return
      }

      if (requestUrl.pathname === '/api/smithery/install' && req.method === 'POST') {
        const status = await installSmitheryCliGlobal()
        sendJson(res, {
          ok: true,
          status,
        })
        return
      }

      if (requestUrl.pathname === '/api/smithery/search') {
        const query = String(requestUrl.searchParams.get('query') || '').trim()
        sendJson(res, {
          servers: await searchSmitheryServers(query),
        })
        return
      }

      if (requestUrl.pathname === '/api/close' && req.method === 'POST') {
        sendJson(res, { ok: true })
        setTimeout(() => server.close(() => process.exit(0)), 100)
        return
      }

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(renderMcpAppHtml())
    }
    catch (error) {
      sendJson(res, { error: error instanceof Error ? error.message : '未知错误' }, 500)
    }
  })

  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = server.address() as AddressInfo
  const url = `http://127.0.0.1:${address.port}`
  await writeMcpWebState({ pid: process.pid, url, clientId: resolvedClientId, startedAt: new Date().toISOString() })

  server.on('close', () => void clearMcpWebState(process.pid))
  process.on('SIGTERM', () => server.close(() => process.exit(0)))
  process.on('SIGINT', () => server.close(() => process.exit(0)))

  if (ownerPid) {
    const timer = setInterval(() => {
      if (!isProcessAlive(ownerPid)) {
        server.close(() => process.exit(0))
      }
    }, 1000)
    timer.unref()
  }

  console.log(ansis.cyan(`本地 MCP 配置页已启动：${url}`))
  if (options.openBrowser !== false && !await openUrl(url)) {
    console.log(ansis.yellow(`未能自动打开浏览器，请手动访问 ${url}`))
  }
}

export async function closeMcpWebServer(): Promise<boolean> {
  const state = await readMcpWebState()
  if (!state) {
    return false
  }

  if (isProcessAlive(state.pid)) {
    try {
      process.kill(state.pid, 'SIGTERM')
    }
    catch {
      await clearMcpWebState()
      return false
    }
    await waitForProcessExit(state.pid, 3000)
  }

  await clearMcpWebState()
  return true
}

export async function getActiveMcpWebState(): Promise<McpWebState | null> {
  const state = await readMcpWebState()
  if (!state) return null
  if (!isProcessAlive(state.pid)) {
    await clearMcpWebState()
    return null
  }

  try {
    const response = await fetch(`${state.url}/api/bootstrap`)
    if (!response.ok) throw new Error('healthcheck failed')
    return state
  }
  catch {
    await clearMcpWebState()
    return null
  }
}

function getClientOrFallback(clientId: string | null): McpClientId {
  return getMcpClientDefinition((clientId as McpClientId) || DEFAULT_CLIENT_ID).id
}

function getClientIdFromEnv(): McpClientId | null {
  const clientId = process.env.YQ_MCP_WEB_CLIENT_ID
  return clientId === 'claude' || clientId === 'codex' || clientId === 'gemini' ? clientId : null
}

function getOwnerPidFromEnv(): number | null {
  const value = Number(process.env.YQ_MCP_WEB_OWNER_PID || '')
  return Number.isInteger(value) && value > 0 ? value : null
}

async function listAllServers(clientId: McpClientId): Promise<McpServerView[]> {
  const activeServers = await listConfiguredMcpServers(clientId)
  const disabledServers = (await readManagerState()).disabled?.[clientId] || {}
  const ids = Array.from(new Set([...Object.keys(activeServers), ...Object.keys(disabledServers)])).sort()
  return ids.map(id => ({ id, enabled: Boolean(activeServers[id]), config: activeServers[id] || disabledServers[id] }))
}

async function saveServer(clientId: McpClientId, serverId: string, config: McpServerConfig, enabled: boolean): Promise<void> {
  if (enabled) {
    await upsertMcpServer(clientId, serverId, config)
    await updateDisabledState(clientId, serverId, null)
    return
  }

  await removeMcpServerFromClient(clientId, serverId)
  await updateDisabledState(clientId, serverId, config)
}

async function toggleServer(clientId: McpClientId, serverId: string, enabled: boolean): Promise<void> {
  const activeServers = await listConfiguredMcpServers(clientId)
  const disabledServers = (await readManagerState()).disabled?.[clientId] || {}
  const config = activeServers[serverId] || disabledServers[serverId]
  if (!config) {
    throw new Error(`未找到 MCP 服务：${serverId}`)
  }
  await saveServer(clientId, serverId, config, enabled)
}

async function deleteServer(clientId: McpClientId, serverId: string): Promise<void> {
  await removeMcpServerFromClient(clientId, serverId)
  await updateDisabledState(clientId, serverId, null)
}

function normalizeServerId(value: unknown): string {
  const serverId = typeof value === 'string' ? value.trim() : ''
  if (!serverId) throw new Error('服务器 ID 不能为空')
  return serverId
}

function normalizeServerConfig(value: unknown): McpServerConfig {
  if (!value || typeof value !== 'object') throw new Error('服务器配置不能为空')
  const config = value as McpServerConfig
  if (config.type !== 'stdio' && config.type !== 'sse') throw new Error('type 仅支持 stdio 或 sse')
  if (config.type === 'stdio' && !config.command) throw new Error('stdio 模式必须提供 command')
  if (config.type === 'sse' && !config.url) throw new Error('sse 模式必须提供 url')
  return config
}

function getMcpWebStatePath(): string {
  return `${getCcgDir()}/mcp-web.json`
}

function getMcpManagerStatePath(): string {
  return `${getCcgDir()}/mcp-manager.json`
}

async function readMcpWebState(): Promise<McpWebState | null> {
  try {
    return await fs.readJson(getMcpWebStatePath()) as McpWebState
  }
  catch {
    return null
  }
}

async function writeMcpWebState(state: McpWebState): Promise<void> {
  await fs.ensureDir(getCcgDir())
  await fs.writeJson(getMcpWebStatePath(), state, { spaces: 2 })
}

async function clearMcpWebState(expectedPid?: number): Promise<void> {
  if (!(await fs.pathExists(getMcpWebStatePath()))) return
  if (typeof expectedPid === 'number') {
    const current = await readMcpWebState()
    if (current && current.pid !== expectedPid) return
  }
  await fs.remove(getMcpWebStatePath())
}

async function readManagerState(): Promise<McpManagerState> {
  try {
    return await fs.readJson(getMcpManagerStatePath()) as McpManagerState
  }
  catch {
    return {}
  }
}

async function updateDisabledState(clientId: McpClientId, serverId: string, config: McpServerConfig | null): Promise<void> {
  const state = await readManagerState()
  const disabled = state.disabled || {}
  const bucket = { ...(disabled[clientId] || {}) }
  if (config) bucket[serverId] = config
  else delete bucket[serverId]
  disabled[clientId] = bucket
  await fs.ensureDir(getCcgDir())
  await fs.writeJson(getMcpManagerStatePath(), { disabled }, { spaces: 2 })
}

async function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)))
  }
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf-8')) as Record<string, unknown> : {}
}

function registerOwnedMcpWebProcess(pid: number | undefined): void {
  if (!pid) return
  ownedMcpWebPid = pid
  if (cleanupRegistered) return
  const cleanup = () => {
    if (ownedMcpWebPid) {
      try { process.kill(ownedMcpWebPid, 'SIGTERM') }
      catch {}
    }
  }
  process.on('exit', cleanup)
  process.on('SIGINT', () => { cleanup(); process.exit(0) })
  process.on('SIGTERM', () => { cleanup(); process.exit(0) })
  cleanupRegistered = true
}

async function openUrl(url: string): Promise<boolean> {
  try {
    if (process.platform === 'win32') spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore', windowsHide: true }).unref()
    else if (process.platform === 'darwin') spawn('open', [url], { detached: true, stdio: 'ignore' }).unref()
    else spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref()
    return true
  }
  catch {
    return false
  }
}

function isProcessAlive(pid: number): boolean {
  try { process.kill(pid, 0); return true }
  catch (error) { return (error as NodeJS.ErrnoException).code === 'EPERM' }
}

async function waitForProcessExit(pid: number, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (!isProcessAlive(pid)) return
    await new Promise(resolve => setTimeout(resolve, 120))
  }
}

function sendJson(res: ServerResponse, data: unknown, status = 200): void {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(data))
}

function renderMcpAppHtml(): string {
  return `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MCP 配置</title><style>
  :root{color-scheme:light;font-family:"Segoe UI",system-ui,sans-serif;--bg:#f5f7fb;--surface:#fff;--surface-muted:#f8fafc;--line:#d0d5dd;--line-strong:#bfc8d7;--text:#0f172a;--muted:#667085;--muted-2:#475467;--accent:#2563eb;--accent-soft:#dbeafe;--ok:#067647;--ok-soft:#ecfdf3;--danger:#b42318;--danger-soft:#fef3f2;--shadow:0 18px 48px rgba(15,23,42,.08)}
  *{box-sizing:border-box}html,body{height:100%}body{margin:0;background:radial-gradient(circle at top,#eef4ff 0,#f5f7fb 22%,#f5f7fb 100%);color:var(--text)}
  button,input,textarea{font:inherit}button{letter-spacing:0}
  .page{max-width:1360px;margin:0 auto;padding:24px 24px 64px}
  .hero{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;margin-bottom:18px}
  .hero h1{margin:0;font-size:36px;line-height:1.1}
  .hero p{margin:10px 0 0;color:var(--muted-2);font-size:16px;max-width:860px;line-height:1.6}
  .hero-actions{display:flex;gap:10px;flex-wrap:wrap}
  .segmented{display:inline-flex;gap:8px;padding:6px;border:1px solid rgba(15,23,42,.08);background:rgba(255,255,255,.78);border-radius:999px;box-shadow:0 10px 30px rgba(15,23,42,.06);backdrop-filter:blur(10px)}
  .tab{display:inline-flex;align-items:center;gap:10px;border:0;background:transparent;padding:11px 16px;border-radius:999px;font-size:15px;font-weight:600;color:var(--muted-2);cursor:pointer;transition:.2s ease}
  .tab:hover{background:rgba(37,99,235,.06);color:var(--text)}.tab.active{background:#fff;color:var(--text);box-shadow:0 4px 18px rgba(15,23,42,.08)}
  .tab-badge{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:999px;background:#eff3f8;color:var(--muted-2);font-size:12px;font-weight:700}
  .workspace{margin-top:16px;border:1px solid rgba(15,23,42,.08);background:rgba(255,255,255,.94);border-radius:28px;box-shadow:var(--shadow);overflow:hidden}
  .workspace + .workspace{margin-top:18px}
  .toolbar{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;padding:22px 24px 18px;border-bottom:1px solid rgba(15,23,42,.06)}
  .title-stack{display:grid;gap:10px;min-width:0}.client-line{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
  .client-name{font-size:28px;font-weight:700}.meta-line{display:flex;gap:10px;flex-wrap:wrap}
  .pill{display:inline-flex;align-items:center;gap:8px;height:32px;padding:0 12px;border:1px solid var(--line);border-radius:999px;background:#fff;color:#344054;font-size:13px;white-space:nowrap}
  .pill.ok{color:var(--ok);border-color:#abefc6;background:var(--ok-soft)}.pill.blue{color:var(--accent);border-color:#bfdbfe;background:var(--accent-soft)}
  .path{color:var(--muted);font-size:13px;word-break:break-all}
  .toolbar-actions{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
  .btn{height:40px;padding:0 14px;border:1px solid var(--line);background:#fff;border-radius:14px;color:var(--text);cursor:pointer;transition:.18s ease}
  .btn:hover{border-color:var(--line-strong);transform:translateY(-1px)}
  .btn.primary{background:var(--text);color:#fff;border-color:var(--text)}.btn.primary:hover{background:#1f2937}
  .btn.danger{color:var(--danger);background:var(--danger-soft);border-color:#fecdca}
  .controls{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;padding:16px 24px;border-bottom:1px solid rgba(15,23,42,.06);background:linear-gradient(180deg,rgba(255,255,255,.8),rgba(248,250,252,.95))}
  .search{height:42px;padding:0 14px;border:1px solid var(--line);border-radius:14px;background:#fff;color:var(--text)}
  .search:focus,input:focus,textarea:focus{outline:none;border-color:#93c5fd;box-shadow:0 0 0 4px rgba(59,130,246,.12)}
  .hintbar{display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end}
  .status{padding:12px 24px 0;color:var(--muted-2);font-size:14px}
  .grid{display:grid;gap:12px;padding:16px 24px 24px}
  .card{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:18px;padding:18px 18px 16px;border:1px solid rgba(15,23,42,.08);border-radius:22px;background:linear-gradient(180deg,#fff,#fbfcfe)}
  .card-main{min-width:0}.card-top{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}
  .server-name{font-size:20px;font-weight:700;line-height:1.2;word-break:break-word}
  .server-meta{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
  .command{margin-top:12px;font-size:13px;line-height:1.6;color:var(--muted);word-break:break-all;font-family:ui-monospace,SFMono-Regular,Consolas,monospace}
  .aux{display:grid;gap:6px;margin-top:12px;color:var(--muted);font-size:13px}
  .ops{display:flex;flex-direction:column;align-items:flex-end;justify-content:space-between;gap:14px}
  .ops-row{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
  .switch{position:relative;display:inline-flex;align-items:center;gap:10px;font-size:13px;color:var(--muted-2)}
  .switch input{position:absolute;opacity:0;pointer-events:none}
  .slider{position:relative;width:42px;height:24px;border-radius:999px;background:#d0d5dd;transition:.2s ease}
  .slider::after{content:"";position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(15,23,42,.22);transition:.2s ease}
  .switch input:checked + .slider{background:var(--accent)}.switch input:checked + .slider::after{transform:translateX(18px)}
  .empty{padding:42px 16px;color:var(--muted);text-align:center;border:1px dashed rgba(15,23,42,.14);border-radius:22px;background:#fbfcfe}
  .section-copy{padding:0 24px 18px;color:var(--muted-2);font-size:14px;line-height:1.6}
  .smithery-layout{display:grid;grid-template-columns:minmax(0,1fr);gap:16px;padding:0 24px 24px}
  .smithery-results{display:grid;gap:12px}
  .smithery-grid{display:grid;gap:12px}
  .smithery-card{display:grid;gap:10px;padding:16px;border:1px solid rgba(15,23,42,.08);border-radius:20px;background:linear-gradient(180deg,#fff,#fbfcfe)}
  .smithery-card-top{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}
  .smithery-head{display:flex;align-items:flex-start;gap:8px;min-width:0}
  .icon-btn{display:inline-flex;align-items:center;justify-content:center;width:32px;min-width:32px;height:32px;padding:0;border:1px solid var(--line);border-radius:999px;background:#fff;color:var(--muted-2);cursor:pointer;transition:.18s ease}
  .icon-btn:hover{border-color:#bfdbfe;background:#f8fbff;color:var(--text);transform:translateY(-1px)}
  .smithery-name{font-size:18px;font-weight:700;line-height:1.3}
  .smithery-sub{color:var(--muted);font-size:13px;word-break:break-all}
  .smithery-desc{color:var(--muted-2);font-size:14px;line-height:1.6}
  .smithery-meta{display:flex;gap:8px;flex-wrap:wrap}
  .status-row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
  .status-text{color:var(--muted-2);font-size:14px}
  .textarea-sm{min-height:140px}
  .quick-row{display:flex;gap:8px;flex-wrap:wrap;padding:10px 24px 16px}
  .quick-chip{display:inline-flex;align-items:center;height:32px;padding:0 12px;border:1px solid var(--line);border-radius:999px;background:#fff;color:var(--muted-2);font-size:13px;cursor:pointer;transition:.18s ease}
  .quick-chip:hover{border-color:#bfdbfe;background:#f8fbff;color:var(--text)}
  .overlay{position:fixed;inset:0;background:rgba(15,23,42,.42);display:none;align-items:center;justify-content:center;padding:18px}
  .overlay.open{display:flex}
  .modal{width:min(1040px,100%);max-height:94vh;overflow:auto;background:#fff;border-radius:28px;box-shadow:0 24px 72px rgba(15,23,42,.18)}
  .modal-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;padding:22px 24px 16px;border-bottom:1px solid rgba(15,23,42,.06)}
  .modal-head h2{margin:0;font-size:26px;line-height:1.2}.modal-head p{margin:8px 0 0;color:var(--muted);font-size:14px}
  .modal-body{padding:20px 24px 24px}
  .form-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(320px,400px);gap:18px;align-items:start}
  .stack{display:grid;gap:16px}.field{display:grid;gap:8px}.field label{font-size:14px;font-weight:600;color:#344054}
  input,textarea{width:100%;padding:12px 14px;border:1px solid var(--line);border-radius:16px;background:#fff;color:var(--text)}
  textarea{min-height:420px;resize:vertical;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:13px;line-height:1.6}
  .panel-soft{padding:14px;border:1px solid rgba(15,23,42,.08);border-radius:20px;background:var(--surface-muted)}
  .preset-groups{display:grid;gap:10px}.preset-group{display:grid;gap:6px}.preset-title{font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase}
  .preset-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}.preset{display:grid;gap:3px;padding:10px 11px;border:1px solid var(--line);border-radius:14px;background:#fff;cursor:pointer;text-align:left;transition:.18s ease}
  .preset:hover{border-color:#bfdbfe;background:#f8fbff}.preset strong{font-size:14px;line-height:1.25}.preset span{font-size:11px;line-height:1.35;color:var(--muted)}
  .helper{font-size:13px;color:var(--muted);line-height:1.6}
  .footer{display:flex;justify-content:flex-end;gap:10px;margin-top:20px}
  .mono{font-family:ui-monospace,SFMono-Regular,Consolas,monospace}
  @media (max-width:960px){.hero{flex-direction:column}.toolbar,.controls,.card,.form-grid,.smithery-layout{grid-template-columns:1fr;display:grid}.toolbar-actions,.hintbar,.ops-row{justify-content:flex-start}.ops{align-items:flex-start}.preset-grid{grid-template-columns:1fr}.hero h1{font-size:30px}}
  </style></head><body><div class="page"><header class="hero"><div><h1>服务器 · 多引擎独立管理</h1><p>把 Claude、Codex、Gemini 的 MCP 放在一个页面里统一维护。编辑时保留模板与 JSON 直编，也支持从 Smithery 服务器库检索并跳转到对应详情页。</p></div><div class="hero-actions"><button class="btn" id="closeBtn">关闭服务</button></div></header><div class="segmented" id="tabs"></div><section class="workspace"><div class="toolbar"><div class="title-stack"><div class="client-line"><div class="client-name" id="clientName"></div><span class="pill blue" id="activeCount">已启用 0</span><span class="pill" id="totalCount">共 0 个</span></div><div class="path" id="clientPath"></div></div><div class="toolbar-actions"><button class="btn" id="refreshBtn">刷新</button><button class="btn primary" id="addBtn">添加工具</button></div></div><div class="controls"><input id="searchInput" class="search" type="search" placeholder="搜索服务名、命令、URL 或参数"><div class="hintbar"><span class="pill">支持启用 / 停用</span><span class="pill">保存前自动备份</span><span class="pill">JSON 直编</span></div></div><div class="status" id="status">正在加载...</div><div class="grid" id="list"></div></section><section class="workspace"><div class="toolbar"><div class="title-stack"><div class="client-line"><div class="client-name">Smithery 服务器库</div><span class="pill" id="smitheryVersionPill">CLI 未检测</span></div><div class="path">支持执行 <span class="mono">npm install -g @smithery/cli@latest</span>，也支持直接用 <span class="mono">npx -y @smithery/cli@latest</span> 搜索服务器后打开对应详情页。</div></div><div class="toolbar-actions"><button class="btn" id="smitheryOpenBtn">打开官网</button><button class="btn" id="smitheryInstallBtn">安装 / 更新 CLI</button><button class="btn" id="smitheryReloadBtn">刷新状态</button></div></div><div class="section-copy"><div class="status-row"><span class="status-text" id="smitheryStatusText">正在检测 Smithery CLI...</span></div></div><div class="controls"><input id="smitherySearchInput" class="search" type="search" placeholder="搜索 Smithery 服务器，例如 brave、context7、filesystem"><div class="hintbar"><button class="btn" id="smitherySearchBtn">搜索</button><span class="pill">搜索来自 smithery mcp search</span><span class="pill">结果可直接打开对应详情页</span></div></div><div class="quick-row" id="smitheryQuickRow"></div><div class="smithery-layout"><div class="smithery-results"><div class="status" id="smitherySearchStatus">输入关键字后开始搜索</div><div class="smithery-grid" id="smitheryResults"></div></div></div></section></div><div class="overlay" id="overlay"><div class="modal"><div class="modal-head"><div><h2 id="modalTitle">添加 MCP 服务</h2><p id="modalSub">选择模板后可直接微调 JSON；保存前会先备份目标配置文件。</p></div><button class="btn" id="cancelXBtn">关闭</button></div><div class="modal-body"><div class="form-grid"><div class="stack"><div class="field"><label>服务器 ID</label><input id="serverId" placeholder="my-mcp-server"><div class="helper">作为唯一标识使用，编辑已有服务时保持只读。</div></div><div class="field"><label>服务器配置 JSON</label><textarea id="configJson"></textarea><div class="helper">支持 <span class="mono">stdio</span> / <span class="mono">sse</span>。列表页会自动展示命令摘要、环境变量数量与 URL。</div></div></div><aside class="stack"><div class="panel-soft"><div class="field"><label>快速模板</label><div class="preset-groups" id="presetGrid"></div></div><div class="helper">仍然保留四类 MCP 预置：必装工具、数据库操作、Git / 版本控制、文件 / 资源操作。</div></div></aside></div><div class="footer"><button class="btn" id="cancelBtn">取消</button><button class="btn primary" id="saveBtn">保存</button></div></div></div></div><script>
  const state={clients:[],clientId:null,servers:[],editingId:null,presets:[],search:'',smithery:{status:null,results:[],query:'',quickTerms:[]}};const tabs=document.getElementById('tabs');const list=document.getElementById('list');const clientName=document.getElementById('clientName');const clientPath=document.getElementById('clientPath');const statusEl=document.getElementById('status');const overlay=document.getElementById('overlay');const serverIdInput=document.getElementById('serverId');const configJson=document.getElementById('configJson');const modalTitle=document.getElementById('modalTitle');const modalSub=document.getElementById('modalSub');const presetGrid=document.getElementById('presetGrid');const activeCount=document.getElementById('activeCount');const totalCount=document.getElementById('totalCount');const searchInput=document.getElementById('searchInput');const smitheryVersionPill=document.getElementById('smitheryVersionPill');const smitheryStatusText=document.getElementById('smitheryStatusText');const smitherySearchInput=document.getElementById('smitherySearchInput');const smitherySearchStatus=document.getElementById('smitherySearchStatus');const smitheryResults=document.getElementById('smitheryResults');const smitheryQuickRow=document.getElementById('smitheryQuickRow');
  document.getElementById('refreshBtn').onclick=()=>loadServers();document.getElementById('addBtn').onclick=()=>openModal();document.getElementById('cancelBtn').onclick=closeModal;document.getElementById('cancelXBtn').onclick=closeModal;document.getElementById('saveBtn').onclick=saveServer;document.getElementById('closeBtn').onclick=closeService;document.getElementById('smitheryReloadBtn').onclick=()=>loadSmitheryStatus();document.getElementById('smitheryInstallBtn').onclick=()=>installSmitheryCli();document.getElementById('smitheryOpenBtn').onclick=()=>window.open('https://smithery.ai/servers','_blank','noopener');document.getElementById('smitherySearchBtn').onclick=()=>searchSmithery();searchInput.oninput=event=>{state.search=String(event.target.value||'').trim().toLowerCase();renderList();};smitherySearchInput.onkeydown=event=>{if(event.key==='Enter'){event.preventDefault();searchSmithery();}};
  init();
  async function init(){const boot=await fetchJson('/api/bootstrap');state.clients=boot.clients;state.presets=boot.presets;state.clientId=boot.defaultClientId;state.smithery.quickTerms=Array.isArray(boot.smitheryQuickTerms)?boot.smitheryQuickTerms:[];renderTabs();renderPresets();renderSmitheryQuickTerms();await Promise.all([loadServers(),loadSmitheryStatus()]);}
  function renderTabs(){tabs.innerHTML=state.clients.map(client=>'<button class="tab'+(client.id===state.clientId?' active':'')+'" data-client="'+escapeAttr(client.id)+'"><span class="tab-badge">'+escapeHtml(client.label.slice(0,1))+'</span><span>'+escapeHtml(client.label)+'</span></button>').join('');tabs.querySelectorAll('[data-client]').forEach(el=>el.onclick=async()=>{state.clientId=el.getAttribute('data-client');renderTabs();await loadServers();});}
  function renderPresets(){const groups={};state.presets.forEach(item=>{(groups[item.category]||(groups[item.category]=[])).push(item);});presetGrid.innerHTML=Object.entries(groups).map(([category,items])=>'<section class="preset-group"><div class="preset-title">'+escapeHtml(category)+'</div><div class="preset-grid">'+items.map(item=>'<button type="button" class="preset" data-preset="'+escapeAttr(item.id)+'"><strong>'+escapeHtml(item.name)+'</strong><span>'+escapeHtml(item.description)+'</span></button>').join('')+'</div></section>').join('');presetGrid.querySelectorAll('[data-preset]').forEach(el=>el.onclick=()=>applyPreset(el.getAttribute('data-preset')));}
  function renderSmitheryQuickTerms(){if(!state.smithery.quickTerms.length){smitheryQuickRow.innerHTML='';return;}smitheryQuickRow.innerHTML=state.smithery.quickTerms.map(term=>'<button type="button" class="quick-chip" data-term="'+escapeAttr(term)+'">'+escapeHtml(term)+'</button>').join('');smitheryQuickRow.querySelectorAll('[data-term]').forEach(el=>el.onclick=()=>triggerSmitheryQuickSearch(el.getAttribute('data-term')));}
  function triggerSmitheryQuickSearch(term){if(!term)return;smitherySearchInput.value=term;state.smithery.query=term;searchSmithery();}
  function applyPreset(presetId){const preset=state.presets.find(item=>item.id===presetId);if(!preset)return;if(!state.editingId)serverIdInput.value=preset.id;configJson.value=JSON.stringify(preset.template,null,2);}
  async function loadServers(){statusEl.textContent='正在读取 '+state.clientId+' 配置...';const payload=await fetchJson('/api/servers?client='+encodeURIComponent(state.clientId));state.servers=payload.servers;clientName.textContent=payload.client.label;clientPath.textContent=payload.client.configPath;searchInput.value='';state.search='';renderList();updateSummary();statusEl.textContent='配置已同步';}
  function updateSummary(){const enabledCount=state.servers.filter(item=>item.enabled).length;activeCount.textContent='已启用 '+enabledCount;totalCount.textContent='共 '+state.servers.length+' 个';}
  function renderList(){const filtered=state.servers.filter(item=>matchesSearch(item));if(!filtered.length){list.innerHTML='<div class="empty">'+(state.servers.length?'没有匹配的 MCP 服务。':'当前还没有 MCP 服务，点右上角“添加工具”开始配置。')+'</div>';return;}list.innerHTML=filtered.map(item=>'<article class="card"><div class="card-main"><div class="card-top"><div><div class="server-name">'+escapeHtml(item.id)+'</div><div class="server-meta"><span class="pill">'+escapeHtml(getTransportLabel(item.config))+'</span><span class="pill '+(item.enabled?'ok':'')+'">'+(item.enabled?'已启用':'已停用')+'</span>'+renderExtraMeta(item.config)+'</div></div></div><div class="command">'+escapeHtml(describeConfig(item.config))+'</div><div class="aux">'+renderAux(item.config)+'</div></div><div class="ops"><label class="switch">启用<input type="checkbox" '+(item.enabled?'checked':'')+' data-toggle="'+escapeAttr(item.id)+'"><span class="slider"></span></label><div class="ops-row"><button class="btn" data-edit="'+escapeAttr(item.id)+'">编辑</button><button class="btn danger" data-delete="'+escapeAttr(item.id)+'">删除</button></div></div></article>').join('');list.querySelectorAll('[data-toggle]').forEach(el=>el.onchange=()=>toggleServer(el.getAttribute('data-toggle'),el.checked));list.querySelectorAll('[data-edit]').forEach(el=>el.onclick=()=>openModal(el.getAttribute('data-edit')));list.querySelectorAll('[data-delete]').forEach(el=>el.onclick=()=>removeServer(el.getAttribute('data-delete')));statusEl.textContent=state.search?'筛选后显示 '+filtered.length+' / '+state.servers.length+' 个 MCP 服务':'配置已同步';}
  function matchesSearch(item){if(!state.search)return true;const haystack=[item.id,getTransportLabel(item.config),describeConfig(item.config),item.config.url||'',JSON.stringify(item.config.env||{})].join(' ').toLowerCase();return haystack.includes(state.search);}
  function getTransportLabel(config){if(config.type)return config.type;return config.url?'sse':'stdio';}
  function renderExtraMeta(config){const bits=[];if(config.command)bits.push('<span class="pill">'+escapeHtml(config.command)+'</span>');if(config.env&&Object.keys(config.env).length)bits.push('<span class="pill">env '+Object.keys(config.env).length+'</span>');return bits.join('');}
  function renderAux(config){const rows=[];if(config.args&&config.args.length)rows.push('<div>参数数量：'+String(config.args.length)+'</div>');if(config.url)rows.push('<div>端点：'+escapeHtml(config.url)+'</div>');if(config.env&&Object.keys(config.env).length)rows.push('<div>环境变量：'+escapeHtml(Object.keys(config.env).join(', '))+'</div>');return rows.join('')||'<div>无附加字段</div>';}
  function describeConfig(config){if(config.url)return config.url;const command=config.command||'未配置 command';return command+(config.args&&config.args.length?' '+config.args.join(' '):'');}
  function openModal(serverId){state.editingId=serverId||null;const server=state.servers.find(item=>item.id===serverId);modalTitle.textContent=server?'编辑 MCP 服务 · '+server.id:'添加 MCP 服务 · '+state.clientId.toUpperCase();modalSub.textContent=server?'继续微调 JSON，保存前会先创建配置备份。':'先选模板再改 JSON 会更快。';serverIdInput.value=server?server.id:'';serverIdInput.disabled=Boolean(server);configJson.value=JSON.stringify(server?server.config:{type:'stdio',command:'npx',args:['-y','your-package']},null,2);overlay.classList.add('open');}
  function closeModal(){overlay.classList.remove('open');state.editingId=null;serverIdInput.disabled=false;}
  async function saveServer(){try{const payload={clientId:state.clientId,serverId:serverIdInput.value.trim(),config:JSON.parse(configJson.value),enabled:true};await fetchJson('/api/server',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});closeModal();await loadServers();statusEl.textContent='保存完成';}catch(error){window.alert(error instanceof Error?error.message:'保存失败');}}
  async function toggleServer(serverId,enabled){try{await fetchJson('/api/toggle',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({clientId:state.clientId,serverId,enabled})});await loadServers();}catch(error){window.alert(error instanceof Error?error.message:'切换失败');await loadServers();}}
  async function removeServer(serverId){if(!window.confirm('确认删除 '+serverId+' 吗？'))return;try{await fetchJson('/api/server?client='+encodeURIComponent(state.clientId)+'&id='+encodeURIComponent(serverId),{method:'DELETE'});await loadServers();statusEl.textContent='已删除 '+serverId;}catch(error){window.alert(error instanceof Error?error.message:'删除失败');}}
  async function loadSmitheryStatus(){smitheryStatusText.textContent='正在检测 Smithery CLI...';try{const payload=await fetchJson('/api/smithery/status');state.smithery.status=payload.status;smitheryVersionPill.textContent=payload.status.installed&&payload.status.version?'CLI v'+payload.status.version:'CLI 未安装';smitheryVersionPill.className='pill'+(payload.status.installed?' ok':'');smitheryStatusText.textContent=payload.status.installed?'已检测到全局 Smithery CLI，可直接在命令行使用 smithery。':'尚未检测到全局 Smithery CLI；页面仍可直接通过 npx 搜索和添加。';}catch(error){smitheryVersionPill.textContent='CLI 检测失败';smitheryVersionPill.className='pill';smitheryStatusText.textContent=error instanceof Error?error.message:'Smithery 状态检测失败';}}
  async function installSmitheryCli(){const confirmed=window.confirm('将执行 npm install -g @smithery/cli@latest，是否继续？');if(!confirmed)return;smitheryStatusText.textContent='正在安装 / 更新 Smithery CLI，请稍候...';try{const payload=await fetchJson('/api/smithery/install',{method:'POST'});state.smithery.status=payload.status;smitheryVersionPill.textContent=payload.status.installed&&payload.status.version?'CLI v'+payload.status.version:payload.status.installed?'CLI 已安装':'CLI 未安装';smitheryVersionPill.className='pill'+(payload.status.installed?' ok':'');smitheryStatusText.textContent=payload.status.installed?'Smithery CLI 已安装，可直接使用 smithery --help 或下方搜索。':'Smithery CLI 安装命令已执行，但当前仍未检测到 smithery，请检查 PATH 或重新打开终端。';}catch(error){smitheryStatusText.textContent=error instanceof Error?error.message:'Smithery CLI 安装失败';window.alert(error instanceof Error?error.message:'Smithery CLI 安装失败');}}
  async function searchSmithery(){const query=String(smitherySearchInput.value||'').trim();state.smithery.query=query;if(!query){state.smithery.results=[];renderSmitheryResults();smitherySearchStatus.textContent='输入关键字后开始搜索';return;}smitherySearchStatus.textContent='正在通过 smithery mcp search 检索...';try{const payload=await fetchJson('/api/smithery/search?query='+encodeURIComponent(query));state.smithery.results=Array.isArray(payload.servers)?payload.servers:[];renderSmitheryResults();smitherySearchStatus.textContent=state.smithery.results.length?'共找到 '+state.smithery.results.length+' 个结果':'未找到匹配结果';}catch(error){state.smithery.results=[];renderSmitheryResults();smitherySearchStatus.textContent=error instanceof Error?error.message:'Smithery 搜索失败';window.alert(error instanceof Error?error.message:'Smithery 搜索失败');}}
  function renderSmitheryResults(){if(!state.smithery.results.length){smitheryResults.innerHTML='<div class="empty">'+(state.smithery.query?'没有匹配的 Smithery 服务器。':'输入关键字后会在这里显示搜索结果。')+'</div>';return;}smitheryResults.innerHTML=state.smithery.results.map(item=>'<article class="smithery-card"><div class="smithery-card-top"><div class="smithery-head"><div><div class="smithery-name">'+escapeHtml(item.name||item.qualifiedName)+'</div><div class="smithery-sub">'+escapeHtml(item.qualifiedName)+'</div></div><button class="icon-btn" data-open-detail="'+escapeAttr(item.qualifiedName||'')+'" title="打开 Smithery 详情页" aria-label="打开 Smithery 详情页">↗</button></div><div class="smithery-meta"><span class="pill">use '+escapeHtml(String(item.useCount||0))+'</span></div></div><div class="smithery-desc">'+escapeHtml(item.description||'无描述')+'</div><div class="smithery-sub">'+escapeHtml(item.connectionUrl)+'</div></article>').join('');smitheryResults.querySelectorAll('[data-open-detail]').forEach(el=>el.onclick=()=>openSmitheryDetail(el.getAttribute('data-open-detail')));}
  function openSmitheryDetail(qualifiedName){if(!qualifiedName)return;openExternalUrl('https://smithery.ai/servers/'+qualifiedName);}
  function openExternalUrl(url){if(!url)return;window.open(url,'_blank','noopener');}
  async function closeService(){if(!window.confirm('确认关闭本地 MCP 配置页服务？'))return;await fetch('/api/close',{method:'POST'});document.body.innerHTML='<div style="display:flex;min-height:100vh;align-items:center;justify-content:center;font:16px/1.6 Segoe UI,system-ui,sans-serif;color:#475467;background:#f5f7fb;">本地 MCP 配置页已关闭，现在可以关闭这个页面了。</div>';setTimeout(()=>window.close(),300);}
  async function fetchJson(url,options){const response=await fetch(url,options);const payload=await response.json();if(!response.ok)throw new Error(payload.error||'请求失败');return payload;}
  function escapeHtml(value){return String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');}
  function escapeAttr(value){return escapeHtml(value).replaceAll('"','&quot;');}
  </script></body></html>`
}
