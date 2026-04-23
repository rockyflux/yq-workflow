import { describe, expect, it } from 'vitest'
import { createDefaultConfig } from '../config'

describe('createDefaultConfig', () => {
  const baseOptions = {
    language: 'zh-CN' as const,
    installedWorkflows: ['workflow', 'plan'],
  }

  it('sets version from package.json', () => {
    const config = createDefaultConfig(baseOptions)
    expect(config.general.version).toMatch(/^\d+\.\d+\.\d+/)
  })

  it('sets language correctly', () => {
    const config = createDefaultConfig(baseOptions)
    expect(config.general.language).toBe('zh-CN')
  })

  it('stores installed workflows', () => {
    const config = createDefaultConfig(baseOptions)
    expect(config.workflows.installed).toEqual(['workflow', 'plan'])
  })

  it('defaults mcpProvider to ace-tool', () => {
    const config = createDefaultConfig(baseOptions)
    expect(config.mcp.provider).toBe('ace-tool')
  })

  it('respects custom mcpProvider', () => {
    const config = createDefaultConfig({ ...baseOptions, mcpProvider: 'contextweaver' })
    expect(config.mcp.provider).toBe('contextweaver')
  })

  it('stores performance flags', () => {
    const config = createDefaultConfig({ ...baseOptions, liteMode: true, skipImpeccable: true })
    expect(config.performance?.liteMode).toBe(true)
    expect(config.performance?.skipImpeccable).toBe(true)
  })
})
