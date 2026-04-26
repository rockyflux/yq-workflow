import { homedir } from 'node:os'
import { basename, dirname, join } from 'pathe'
import fs from 'fs-extra'
import { parse, stringify } from 'smol-toml'
import { getCodexDir } from './installer-paths'
import { getMcpCommand, isWindows } from './platform'

export interface McpServerConfig {
  type: 'stdio' | 'sse'
  command?: string
  args?: string[]
  url?: string
  env?: Record<string, string>
  startup_timeout_ms?: number
}

export interface ClaudeCodeConfig {
  mcpServers?: Record<string, McpServerConfig>
  hasCompletedOnboarding?: boolean
  customApiKeyResponses?: { approved: string[], rejected: string[] }
  env?: Record<string, string>
  primaryApiKey?: string
  installMethod?: 'npm-global' | 'native'
  [key: string]: any
}

export type McpClientId = 'claude' | 'codex' | 'gemini'

type McpConfigDocument = Record<string, any>

export type McpClientDefinition = {
  id: McpClientId
  label: string
  configPath: string
  format: 'json' | 'toml'
}

export function getClaudeCodeConfigPath(): string {
  return process.env.YQ_CLAUDE_CONFIG_PATH || join(homedir(), '.claude.json')
}

export function getCodexMcpConfigPath(): string {
  return process.env.YQ_CODEX_CONFIG_PATH || join(getCodexDir(), 'config.toml')
}

export function getGeminiMcpConfigPath(): string {
  return process.env.YQ_GEMINI_SETTINGS_PATH || join(homedir(), '.gemini', 'settings.json')
}

export function getMcpClientDefinitions(): McpClientDefinition[] {
  return [
    { id: 'claude', label: 'Claude', configPath: getClaudeCodeConfigPath(), format: 'json' },
    { id: 'codex', label: 'Codex', configPath: getCodexMcpConfigPath(), format: 'toml' },
    { id: 'gemini', label: 'Gemini', configPath: getGeminiMcpConfigPath(), format: 'json' },
  ]
}

export function getMcpClientDefinition(clientId: McpClientId): McpClientDefinition {
  return getMcpClientDefinitions().find(item => item.id === clientId) || getMcpClientDefinitions()[0]
}

export async function readMcpClientConfig(clientId: McpClientId): Promise<McpConfigDocument | null> {
  const client = getMcpClientDefinition(clientId)
  if (!(await fs.pathExists(client.configPath))) {
    return null
  }

  try {
    const content = await fs.readFile(client.configPath, 'utf-8')
    return client.format === 'toml'
      ? parse(content) as McpConfigDocument
      : JSON.parse(content) as McpConfigDocument
  }
  catch (error) {
    console.error(`Failed to read ${client.label} MCP config:`, error)
    return null
  }
}

export async function writeMcpClientConfig(clientId: McpClientId, config: McpConfigDocument): Promise<void> {
  const client = getMcpClientDefinition(clientId)
  await fs.ensureDir(dirname(client.configPath))
  const content = client.format === 'toml'
    ? `${stringify(config as never)}\n`
    : `${JSON.stringify(config, null, 2)}\n`

  await fs.writeFile(client.configPath, content, 'utf-8')
}

export async function backupMcpClientConfig(clientId: McpClientId): Promise<string | null> {
  const client = getMcpClientDefinition(clientId)
  if (!(await fs.pathExists(client.configPath))) {
    return null
  }

  const backupDir = join(dirname(client.configPath), `${basename(client.configPath, client.format === 'toml' ? '.toml' : '.json')}-backup`)
  const backupPath = join(backupDir, `${basename(client.configPath)}.bak-${new Date().toISOString().replace(/[:.]/g, '-')}`)
  await fs.ensureDir(backupDir)
  await fs.copy(client.configPath, backupPath, { overwrite: false, errorOnExist: true })
  return backupPath
}

export function getMcpServersFromConfig(clientId: McpClientId, config: McpConfigDocument | null): Record<string, McpServerConfig> {
  if (!config || typeof config !== 'object') {
    return {}
  }

  if (clientId === 'codex') {
    return ((config.mcp_servers || {}) as Record<string, McpServerConfig>)
  }

  return ((config.mcpServers || {}) as Record<string, McpServerConfig>)
}

export function setMcpServersInConfig(
  clientId: McpClientId,
  config: McpConfigDocument | null,
  servers: Record<string, McpServerConfig>,
): McpConfigDocument {
  const nextConfig = config ? JSON.parse(JSON.stringify(config)) as McpConfigDocument : {}
  if (clientId === 'codex') {
    nextConfig.mcp_servers = servers
    return nextConfig
  }

  nextConfig.mcpServers = servers
  return nextConfig
}

export async function listConfiguredMcpServers(clientId: McpClientId): Promise<Record<string, McpServerConfig>> {
  return getMcpServersFromConfig(clientId, await readMcpClientConfig(clientId))
}

export async function upsertMcpServer(clientId: McpClientId, serverId: string, serverConfig: McpServerConfig): Promise<void> {
  const currentConfig = await readMcpClientConfig(clientId)
  const currentServers = getMcpServersFromConfig(clientId, currentConfig)
  currentServers[serverId] = serverConfig
  const nextConfig = setMcpServersInConfig(clientId, currentConfig, currentServers)
  await writeMcpClientConfig(clientId, clientId === 'claude' ? fixWindowsMcpConfig(nextConfig as ClaudeCodeConfig) : nextConfig)
}

export async function removeMcpServerFromClient(clientId: McpClientId, serverId: string): Promise<void> {
  const currentConfig = await readMcpClientConfig(clientId)
  const currentServers = getMcpServersFromConfig(clientId, currentConfig)
  delete currentServers[serverId]
  await writeMcpClientConfig(clientId, setMcpServersInConfig(clientId, currentConfig, currentServers))
}

export function applyPlatformCommand(config: McpServerConfig): void {
  if (!isWindows() || !config.command || config.command === 'cmd') {
    return
  }

  const mcpCmd = getMcpCommand(config.command)
  if (mcpCmd[0] === 'cmd') {
    config.command = mcpCmd[0]
    config.args = [...mcpCmd.slice(1), ...(config.args || [])]
  }
}

export function buildMcpServerConfig(
  baseConfig: McpServerConfig,
  apiKey?: string,
  placeholder = 'YOUR_API_KEY',
  envVarName?: string,
): McpServerConfig {
  const config = JSON.parse(JSON.stringify(baseConfig)) as McpServerConfig
  applyPlatformCommand(config)

  if (!apiKey) {
    return config
  }

  if (envVarName && config.env) {
    config.env[envVarName] = apiKey
    return config
  }

  if (config.args) {
    config.args = config.args.map(arg => arg.replace(placeholder, apiKey))
  }

  if (config.url) {
    config.url = config.url.replace(placeholder, apiKey)
  }

  return config
}

export function repairCorruptedMcpArgs(config: McpServerConfig): boolean {
  if (!isWindows() || config.command !== 'cmd' || !config.args) {
    return false
  }

  let repaired = false
  if (config.args[0] === 'cmd') {
    config.args.shift()
    repaired = true
  }

  if (config.args[0] === '/c' && config.args.length >= 3 && config.args[1] === config.args[2]) {
    config.args.splice(2, 1)
    repaired = true
  }

  return repaired
}

export function fixWindowsMcpConfig(config: ClaudeCodeConfig): ClaudeCodeConfig {
  if (!isWindows() || !config.mcpServers) {
    return config
  }

  const fixed = JSON.parse(JSON.stringify(config)) as ClaudeCodeConfig
  for (const serverConfig of Object.values(fixed.mcpServers || {})) {
    repairCorruptedMcpArgs(serverConfig)
    applyPlatformCommand(serverConfig)
  }
  return fixed
}

export function mergeMcpServers(
  existing: ClaudeCodeConfig | null,
  newServers: Record<string, McpServerConfig>,
): ClaudeCodeConfig {
  const config: ClaudeCodeConfig = existing || { mcpServers: {} }
  config.mcpServers = { ...(config.mcpServers || {}), ...newServers }
  return config
}

export async function readClaudeCodeConfig(): Promise<ClaudeCodeConfig | null> {
  return await readMcpClientConfig('claude') as ClaudeCodeConfig | null
}

export async function writeClaudeCodeConfig(config: ClaudeCodeConfig): Promise<void> {
  await writeMcpClientConfig('claude', config)
}

export async function backupClaudeCodeConfig(): Promise<string | null> {
  return await backupMcpClientConfig('claude')
}

export async function diagnoseMcpConfig(): Promise<string[]> {
  const issues: string[] = []
  const configPath = getClaudeCodeConfigPath()
  if (!(await fs.pathExists(configPath))) {
    issues.push('❌ ~/.claude.json does not exist')
    return issues
  }

  const config = await readClaudeCodeConfig()
  if (!config) {
    issues.push('❌ Failed to parse ~/.claude.json')
    return issues
  }

  if (!config.mcpServers || Object.keys(config.mcpServers).length === 0) {
    issues.push('⚠️  No MCP servers configured')
    return issues
  }

  if (isWindows()) {
    for (const [name, server] of Object.entries(config.mcpServers)) {
      if (server.command && ['npx', 'uvx', 'node'].includes(server.command) && server.command !== 'cmd') {
        issues.push(`❌ ${name}: Command not properly wrapped for Windows (should use cmd /c)`)
      }
    }
  }

  if (issues.length === 0) {
    issues.push('✅ MCP configuration looks good')
  }

  return issues
}
