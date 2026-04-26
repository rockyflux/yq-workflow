import type { AceToolConfig, FastContextConfig } from '../types'
import { homedir } from 'node:os'
import fs from 'fs-extra'
import { join } from 'pathe'
import { type McpServerConfig, backupMcpClientConfig, buildMcpServerConfig, getMcpServersFromConfig, readMcpClientConfig, removeMcpServerFromClient, setMcpServersInConfig, writeMcpClientConfig } from './mcp'
import { isWindows } from './platform'

// ═══════════════════════════════════════════════════════
// Shared types & helpers
// ═══════════════════════════════════════════════════════

type McpInstallResult = { success: boolean, message: string, configPath?: string }

/**
 * Common pipeline for installing an MCP server into ~/.claude.json:
 * read → backup → merge → Windows fix → write.
 *
 * All MCP installers funnel through this to avoid duplication.
 */
async function configureMcpInClaude(
  serverId: string,
  serverConfig: McpServerConfig,
  label: string,
): Promise<McpInstallResult> {
  try {
    const existingConfig = await readMcpClientConfig('claude')
    const existingServers = getMcpServersFromConfig('claude', existingConfig)

    // Backup before modifying (if config exists)
    if (Object.keys(existingServers).length > 0) {
      const backupPath = await backupMcpClientConfig('claude')
      if (backupPath) {
        console.log(`  ✓ Backup created: ${backupPath}`)
      }
    }

    existingServers[serverId] = serverConfig
    await writeMcpClientConfig('claude', setMcpServersInConfig('claude', existingConfig, existingServers))

    if (isWindows()) {
      console.log('  ✓ Applied Windows MCP configuration fixes')
    }

    return {
      success: true,
      message: isWindows()
        ? `${label} configured successfully with Windows compatibility`
        : `${label} configured successfully`,
      configPath: join(homedir(), '.claude.json'),
    }
  }
  catch (error) {
    return {
      success: false,
      message: `Failed to configure ${label}: ${error}`,
    }
  }
}

// ═══════════════════════════════════════════════════════
// ace-tool MCP
// ═══════════════════════════════════════════════════════

/**
 * Uninstall ace-tool MCP configuration from ~/.claude.json
 */
export async function uninstallAceTool(): Promise<{ success: boolean, message: string }> {
  try {
    const existingConfig = await readMcpClientConfig('claude')
    const existingServers = getMcpServersFromConfig('claude', existingConfig)

    if (!existingConfig) {
      return { success: true, message: 'No ~/.claude.json found, nothing to remove' }
    }

    if (!existingServers['ace-tool']) {
      return { success: true, message: 'ace-tool MCP not found in config' }
    }

    await backupMcpClientConfig('claude')
    await removeMcpServerFromClient('claude', 'ace-tool')

    return { success: true, message: 'ace-tool MCP removed from ~/.claude.json' }
  }
  catch (error) {
    return { success: false, message: `Failed to uninstall ace-tool: ${error}` }
  }
}

/**
 * Install and configure ace-tool MCP for Claude Code.
 */
export async function installAceTool(config: AceToolConfig): Promise<McpInstallResult> {
  const { baseUrl, token } = config

  const args = ['-y', 'ace-tool@latest']
  if (baseUrl) args.push('--base-url', baseUrl)
  if (token) args.push('--token', token)

  const serverConfig = buildMcpServerConfig({ type: 'stdio', command: 'npx', args })
  return configureMcpInClaude('ace-tool', serverConfig, 'ace-tool MCP')
}

/**
 * Install and configure ace-tool-rs MCP for Claude Code.
 * ace-tool-rs is a Rust implementation — more lightweight and faster.
 */
export async function installAceToolRs(config: AceToolConfig): Promise<McpInstallResult> {
  const { baseUrl, token } = config

  const args = ['ace-tool-rs']
  if (baseUrl) args.push('--base-url', baseUrl)
  if (token) args.push('--token', token)

  const serverConfig = buildMcpServerConfig({
    type: 'stdio',
    command: 'npx',
    args,
    env: { RUST_LOG: 'info' },
  })
  return configureMcpInClaude('ace-tool', serverConfig, 'ace-tool-rs MCP')
}

// ═══════════════════════════════════════════════════════
// ContextWeaver MCP
// ═══════════════════════════════════════════════════════

/**
 * ContextWeaver MCP configuration
 */
export interface ContextWeaverConfig {
  siliconflowApiKey: string
}

/**
 * Install and configure ContextWeaver MCP for Claude Code.
 * ContextWeaver is a local-first semantic code search engine with hybrid search + rerank.
 */
export async function installContextWeaver(config: ContextWeaverConfig): Promise<McpInstallResult> {
  const { siliconflowApiKey } = config

  try {
    // 0. Install contextweaver CLI globally
    console.log('  ⏳ 正在安装 ContextWeaver CLI...')
    const { execSync } = await import('node:child_process')
    try {
      execSync('npm install -g @hsingjui/contextweaver', { stdio: 'pipe' })
      console.log('  ✓ ContextWeaver CLI 安装成功')
    }
    catch {
      if (process.platform !== 'win32') {
        try {
          execSync('sudo npm install -g @hsingjui/contextweaver', { stdio: 'pipe' })
          console.log('  ✓ ContextWeaver CLI 安装成功 (sudo)')
        }
        catch {
          console.log('  ⚠ ContextWeaver CLI 安装失败，请手动运行: npm install -g @hsingjui/contextweaver')
        }
      }
      else {
        console.log('  ⚠ ContextWeaver CLI 安装失败，请手动运行: npm install -g @hsingjui/contextweaver')
      }
    }

    // 1. Create ContextWeaver config directory and .env file
    const contextWeaverDir = join(homedir(), '.contextweaver')
    await fs.ensureDir(contextWeaverDir)

    const envContent = `# ContextWeaver 配置 (由 YQ 自动生成)

# Embedding API - 硅基流动
EMBEDDINGS_API_KEY=${siliconflowApiKey}
EMBEDDINGS_BASE_URL=https://api.siliconflow.cn/v1/embeddings
EMBEDDINGS_MODEL=Qwen/Qwen3-Embedding-8B
EMBEDDINGS_MAX_CONCURRENCY=10
EMBEDDINGS_DIMENSIONS=1024

# Reranker - 硅基流动
RERANK_API_KEY=${siliconflowApiKey}
RERANK_BASE_URL=https://api.siliconflow.cn/v1/rerank
RERANK_MODEL=Qwen/Qwen3-Reranker-8B
RERANK_TOP_N=20
`
    await fs.writeFile(join(contextWeaverDir, '.env'), envContent, 'utf-8')

    // 2. Configure MCP via shared pipeline
    const serverConfig = buildMcpServerConfig({
      type: 'stdio',
      command: 'contextweaver',
      args: ['mcp'],
    })
    return await configureMcpInClaude('contextweaver', serverConfig, 'ContextWeaver MCP')
  }
  catch (error) {
    return { success: false, message: `Failed to configure ContextWeaver: ${error}` }
  }
}

/**
 * Uninstall ContextWeaver MCP from Claude Code.
 * Delegates to generic uninstallMcpServer.
 */
export function uninstallContextWeaver(): Promise<{ success: boolean, message: string }> {
  return uninstallMcpServer('contextweaver')
}

// ═══════════════════════════════════════════════════════
// Fast Context (Windsurf) MCP
// ═══════════════════════════════════════════════════════

/**
 * Install and configure Fast Context (Windsurf) MCP for Claude Code.
 */
export async function installFastContext(config: FastContextConfig): Promise<McpInstallResult> {
  const { apiKey, includeSnippets } = config

  const env: Record<string, string> = {}
  if (apiKey) env.WINDSURF_API_KEY = apiKey
  if (includeSnippets) env.FC_INCLUDE_SNIPPETS = 'true'

  const serverConfig = buildMcpServerConfig({
    type: 'stdio',
    command: 'npx',
    args: ['-y', '--prefer-online', 'fast-context-mcp@latest'],
    ...(Object.keys(env).length > 0 ? { env } : {}),
  })
  return configureMcpInClaude('fast-context', serverConfig, 'fast-context MCP')
}

/**
 * Uninstall Fast Context MCP from Claude Code.
 * Delegates to generic uninstallMcpServer.
 */
export function uninstallFastContext(): Promise<{ success: boolean, message: string }> {
  return uninstallMcpServer('fast-context')
}

// ═══════════════════════════════════════════════════════
// Generic MCP server install/uninstall
// ═══════════════════════════════════════════════════════

/**
 * Install a generic MCP server to Claude Code
 */
export async function installMcpServer(
  id: string,
  command: string,
  args: string[],
  env: Record<string, string> = {},
): Promise<{ success: boolean, message: string }> {
  const serverConfig = buildMcpServerConfig({ type: 'stdio', command, args, env })
  return configureMcpInClaude(id, serverConfig, id)
}

/**
 * Uninstall a generic MCP server from Claude Code
 */
export async function uninstallMcpServer(id: string): Promise<{ success: boolean, message: string }> {
  try {
    const existingServers = await readMcpClientConfig('claude').then(config => getMcpServersFromConfig('claude', config))
    if (existingServers[id]) {
      await removeMcpServerFromClient('claude', id)
    }
    return { success: true, message: `${id} MCP uninstalled successfully` }
  }
  catch (error) {
    return { success: false, message: `Failed to uninstall ${id}: ${error}` }
  }
}
