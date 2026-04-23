import { describe, expect, it } from 'vitest'
import { injectConfigVariables } from '../installer'

describe('injectConfigVariables', () => {
  it('injects ace-tool tool names by default', () => {
    const result = injectConfigVariables('{{MCP_SEARCH_TOOL}} / {{MCP_SEARCH_PARAM}}', {})
    expect(result).toBe('mcp__ace-tool__search_context / query')
  })

  it('injects contextweaver tool names', () => {
    const result = injectConfigVariables('{{MCP_SEARCH_TOOL}} / {{MCP_SEARCH_PARAM}}', {
      mcpProvider: 'contextweaver',
    })
    expect(result).toBe('mcp__contextweaver__codebase-retrieval / information_request')
  })

  it('replaces MCP references with Glob + Grep fallback when provider is skip', () => {
    const result = injectConfigVariables('调用 `{{MCP_SEARCH_TOOL}}` 检索，参数 {{MCP_SEARCH_PARAM}}', {
      mcpProvider: 'skip',
    })
    expect(result).toContain('Glob + Grep')
    expect(result).not.toContain('{{MCP_SEARCH_TOOL}}')
    expect(result).not.toContain('{{MCP_SEARCH_PARAM}}')
  })

  it('injects lite flag when enabled', () => {
    const result = injectConfigVariables('tool {{LITE_MODE_FLAG}}run', { liteMode: true })
    expect(result).toBe('tool --lite run')
  })
})
