import { spawn } from 'node:child_process'
import type { McpClientId } from './mcp'
import { getSpawnCommand } from './platform'

export type SmitheryClientName = 'claude' | 'codex' | 'gemini-cli'

export type SmitheryCliStatus = {
  installed: boolean
  version: string | null
}

export type SmitherySearchServer = {
  name: string
  qualifiedName: string
  description?: string
  useCount?: number
  connectionUrl: string
}

type SmitherySearchResult = {
  servers?: SmitherySearchServer[]
}

type SmitheryAddResult = {
  success?: boolean
  qualifiedName?: string
  client?: string
  transport?: string
  hint?: string
}

type RunCommandOptions = {
  timeoutMs?: number
}

type RunCommandResult = {
  stdout: string
  stderr: string
  exitCode: number
}

const SMITHERY_PACKAGE = '@smithery/cli@latest'
const DEFAULT_TIMEOUT_MS = 60_000

export function mapMcpClientToSmitheryClient(clientId: McpClientId): SmitheryClientName {
  if (clientId === 'claude') return 'claude'
  if (clientId === 'gemini') return 'gemini-cli'
  return 'codex'
}

export function getSmitheryInstallCommand(): { command: string, args: string[] } {
  return {
    command: getNpmCommand(),
    args: ['install', '-g', SMITHERY_PACKAGE],
  }
}

export function getSmitherySearchCommand(query: string): { command: string, args: string[] } {
  return {
    command: getNpxCommand(),
    args: ['-y', SMITHERY_PACKAGE, 'mcp', 'search', query, '--json'],
  }
}

export function getSmitheryAddCommand(
  target: string,
  clientId: McpClientId,
  options: {
    config?: Record<string, unknown>
    id?: string
    name?: string
  } = {},
): { command: string, args: string[] } {
  const args = [
    '-y',
    SMITHERY_PACKAGE,
    'mcp',
    'add',
    target,
    '--client',
    mapMcpClientToSmitheryClient(clientId),
  ]

  if (options.id) {
    args.push('--id', options.id)
  }
  if (options.name) {
    args.push('--name', options.name)
  }
  if (options.config && Object.keys(options.config).length > 0) {
    args.push('--config', JSON.stringify(options.config))
  }

  return {
    command: getNpxCommand(),
    args,
  }
}

export async function getSmitheryCliStatus(): Promise<SmitheryCliStatus> {
  try {
    const result = await runCommand(getSmitheryCommand(), ['--version'], { timeoutMs: 15_000 })
    if (result.exitCode !== 0) {
      return { installed: false, version: null }
    }

    const version = parseSmitheryVersion(result.stdout || result.stderr)
    return {
      installed: Boolean(version),
      version,
    }
  }
  catch {
    return { installed: false, version: null }
  }
}

export async function installSmitheryCliGlobal(): Promise<SmitheryCliStatus> {
  const install = getSmitheryInstallCommand()
  const result = await runCommand(install.command, install.args, { timeoutMs: 180_000 })
  if (result.exitCode !== 0) {
    throw new Error(result.stderr.trim() || result.stdout.trim() || 'Smithery CLI 安装失败')
  }
  return await getSmitheryCliStatus()
}

export async function searchSmitheryServers(query: string): Promise<SmitherySearchServer[]> {
  const trimmedQuery = query.trim()
  if (!trimmedQuery) {
    return []
  }

  const search = getSmitherySearchCommand(trimmedQuery)
  const result = await runCommand(search.command, search.args, { timeoutMs: 120_000 })
  if (result.exitCode !== 0) {
    throw new Error(result.stderr.trim() || result.stdout.trim() || 'Smithery 搜索失败')
  }

  const payload = JSON.parse(result.stdout) as SmitherySearchResult
  return Array.isArray(payload.servers) ? payload.servers : []
}

export async function addSmitheryServer(
  target: string,
  clientId: McpClientId,
  options: {
    config?: Record<string, unknown>
    id?: string
    name?: string
  } = {},
): Promise<{ warning: string | null }> {
  const command = getSmitheryAddCommand(target, clientId, options)
  const result = await runCommand(command.command, command.args, { timeoutMs: 180_000 })

  const parsed = parseSmitheryAddResult(result.stdout)
  if (parsed?.success) {
    return {
      warning: result.exitCode === 0 ? null : (result.stderr.trim() || null),
    }
  }

  if (result.exitCode !== 0) {
    throw new Error(result.stderr.trim() || result.stdout.trim() || 'Smithery MCP 添加失败')
  }

  return { warning: result.stderr.trim() || null }
}

export function parseSmitheryVersion(output: string): string | null {
  const match = output.match(/\bv?(\d+\.\d+\.\d+)\b/i)
  return match ? match[1] : null
}

export function parseSmitheryAddResult(output: string): SmitheryAddResult | null {
  const text = output.trim()
  if (!text.startsWith('{')) {
    return null
  }

  try {
    return JSON.parse(text) as SmitheryAddResult
  }
  catch {
    return null
  }
}

function getSmitheryCommand(): string {
  return 'smithery'
}

function getNpxCommand(): string {
  return 'npx'
}

function getNpmCommand(): string {
  return 'npm'
}

async function runCommand(command: string, args: string[], options: RunCommandOptions = {}): Promise<RunCommandResult> {
  return await new Promise((resolve, reject) => {
    const spawnCommand = getSpawnCommand(command, args)
    const child = spawn(spawnCommand.command, spawnCommand.args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    })
    const stdoutChunks: Buffer[] = []
    const stderrChunks: Buffer[] = []
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
    const timer = setTimeout(() => {
      child.kill('SIGTERM')
      reject(new Error(`命令执行超时：${spawnCommand.command} ${spawnCommand.args.join(' ')}`))
    }, timeoutMs)

    child.stdout.on('data', chunk => stdoutChunks.push(Buffer.from(chunk)))
    child.stderr.on('data', chunk => stderrChunks.push(Buffer.from(chunk)))
    child.on('error', (error) => {
      clearTimeout(timer)
      reject(error)
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      resolve({
        stdout: Buffer.concat(stdoutChunks).toString('utf-8').trim(),
        stderr: Buffer.concat(stderrChunks).toString('utf-8').trim(),
        exitCode: code ?? 0,
      })
    })
  })
}
