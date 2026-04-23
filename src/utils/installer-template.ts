import { homedir } from 'node:os'
import { fileURLToPath } from 'node:url'
import fs from 'fs-extra'
import { dirname, join } from 'pathe'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

function findPackageRoot(startDir: string): string {
  let dir = startDir
  for (let i = 0; i < 10; i++) {
    if (fs.existsSync(join(dir, 'package.json')) && fs.existsSync(join(dir, 'templates'))) {
      return dir
    }
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }

  console.error(
    `[YQ] ⚠ PACKAGE_ROOT resolution failed.\n`
    + `  Start dir: ${startDir}\n`
    + `  Last checked: ${dir}\n`,
  )
  return startDir
}

export const PACKAGE_ROOT = findPackageRoot(__dirname)

const MCP_PROVIDERS: Record<string, { tool: string, param: string }> = {
  'ace-tool': { tool: 'mcp__ace-tool__search_context', param: 'query' },
  'ace-tool-rs': { tool: 'mcp__ace-tool__search_context', param: 'query' },
  'contextweaver': { tool: 'mcp__contextweaver__codebase-retrieval', param: 'information_request' },
  'fast-context': { tool: 'mcp__fast-context__fast_context_search', param: 'query' },
}

export function injectConfigVariables(content: string, config: {
  liteMode?: boolean
  mcpProvider?: string
}): string {
  let processed = content

  const liteModeFlag = config.liteMode ? '--lite ' : ''
  processed = processed.replace(/\{\{LITE_MODE_FLAG\}\}/g, liteModeFlag)

  const mcpProvider = config.mcpProvider || 'ace-tool'
  if (mcpProvider === 'skip') {
    processed = processed.replace(/,\s*\{\{MCP_SEARCH_TOOL\}\}/g, '')
    processed = processed.replace(
      /```\n\{\{MCP_SEARCH_TOOL\}\}[\s\S]*?\n```/g,
      '> MCP 未配置。使用 `Glob` 定位文件 + `Grep` 搜索关键符号 + `Read` 读取文件内容。',
    )
    processed = processed.replace(/`\{\{MCP_SEARCH_TOOL\}\}`/g, '`Glob + Grep`（MCP 未配置）')
    processed = processed.replace(/\{\{MCP_SEARCH_TOOL\}\}/g, 'Glob + Grep')
    processed = processed.replace(/\{\{MCP_SEARCH_PARAM\}\}/g, '')
    return processed
  }

  const provider = MCP_PROVIDERS[mcpProvider] ?? MCP_PROVIDERS['ace-tool']
  processed = processed.replace(/\{\{MCP_SEARCH_TOOL\}\}/g, provider.tool)
  processed = processed.replace(/\{\{MCP_SEARCH_PARAM\}\}/g, provider.param)
  return processed
}

export function replaceHomePathsInTemplate(content: string, installDir: string): string {
  const userHome = homedir()
  const yqDir = join(installDir, '.yq')
  const claudeDir = installDir
  const toForwardSlash = (path: string) => path.replace(/\\/g, '/')

  let processed = content
  processed = processed.replace(/~\/\.claude\/\.yq/g, toForwardSlash(yqDir))
  processed = processed.replace(/~\/\.claude/g, toForwardSlash(claudeDir))
  processed = processed.replace(/~\//g, `${toForwardSlash(userHome)}/`)
  return processed
}
