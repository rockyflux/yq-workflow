import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterAll, describe, expect, it } from 'vitest'
import fs from 'fs-extra'
import { getAllCommandIds, installWorkflows } from '../installer'

describe('installWorkflows mcp injection', () => {
  const skipDir = join(tmpdir(), `yq-skip-${Date.now()}`)
  const aceDir = join(tmpdir(), `yq-ace-${Date.now()}`)

  afterAll(async () => {
    await fs.remove(skipDir)
    await fs.remove(aceDir)
  })

  it('installs with skip provider', async () => {
    const result = await installWorkflows(getAllCommandIds(), skipDir, true, {
      mcpProvider: 'skip',
    })
    expect(result.success).toBe(true)
    const content = readFileSync(join(skipDir, 'commands', 'yq', 'workflow.md'), 'utf-8')
    expect(content).not.toContain('{{MCP_SEARCH_TOOL}}')
  })

  it('installs with ace-tool provider', async () => {
    const result = await installWorkflows(getAllCommandIds(), aceDir, true, {
      mcpProvider: 'ace-tool',
    })
    expect(result.success).toBe(true)
    const content = readFileSync(join(aceDir, 'commands', 'yq', 'workflow.md'), 'utf-8')
    expect(content).not.toContain('{{MCP_SEARCH_TOOL}}')
  })
})
