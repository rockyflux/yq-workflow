import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterAll, describe, expect, it } from 'vitest'
import fs from 'fs-extra'
import { getAllCommandIds, getWorkflowById, getWorkflowConfigs, installWorkflows, uninstallWorkflows } from '../installer'

describe('workflow registry', () => {
  it('contains commands', () => {
    expect(getAllCommandIds().length).toBeGreaterThan(10)
  })

  it('returns sorted configs', () => {
    const configs = getWorkflowConfigs()
    for (let i = 1; i < configs.length; i++) {
      expect(configs[i].order).toBeGreaterThanOrEqual(configs[i - 1].order)
    }
  })

  it('returns undefined for unknown workflow', () => {
    expect(getWorkflowById('missing')).toBeUndefined()
  })
})

describe('install / uninstall', () => {
  const tmpDir = join(tmpdir(), `yq-installer-${Date.now()}`)

  afterAll(async () => {
    await fs.remove(tmpDir)
  })

  it('installs commands and prompts', async () => {
    const result = await installWorkflows(getAllCommandIds(), tmpDir, true, {
      mcpProvider: 'skip',
    })

    expect(result.success).toBe(true)
    expect(result.installedCommands.length).toBeGreaterThan(10)
    expect(fs.existsSync(join(tmpDir, 'commands', 'yq', 'workflow.md'))).toBe(true)
    expect(fs.existsSync(join(tmpDir, '.yq', 'prompts', 'claude'))).toBe(true)
  })

  it('writes command content for installed workflow files', async () => {
    const content = readFileSync(join(tmpDir, 'commands', 'yq', 'workflow.md'), 'utf-8')
    expect(content.length).toBeGreaterThan(20)
  })

  it('uninstalls cleanly', async () => {
    const result = await uninstallWorkflows(tmpDir)
    expect(result.success).toBe(true)
    expect(fs.existsSync(join(tmpDir, 'commands', 'yq'))).toBe(false)
  })
})
