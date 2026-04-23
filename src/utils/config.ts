import type { CcgConfig, SupportedLang } from '../types'
import fs from 'fs-extra'
import { homedir } from 'node:os'
import { join } from 'pathe'
import { parse, stringify } from 'smol-toml'
import { version as packageVersion } from '../../package.json'

const YQ_DIR = join(homedir(), '.claude', '.yq')
const CONFIG_FILE = join(YQ_DIR, 'config.toml')

export function getCcgDir(): string {
  return YQ_DIR
}

export function getConfigPath(): string {
  return CONFIG_FILE
}

export async function ensureCcgDir(): Promise<void> {
  await fs.ensureDir(YQ_DIR)
}

export async function readCcgConfig(): Promise<CcgConfig | null> {
  try {
    if (await fs.pathExists(CONFIG_FILE)) {
      const content = await fs.readFile(CONFIG_FILE, 'utf-8')
      return parse(content) as unknown as CcgConfig
    }
  }
  catch {
    // Ignore invalid or missing config files.
  }
  return null
}

export async function writeCcgConfig(config: CcgConfig): Promise<void> {
  await ensureCcgDir()
  const content = stringify(config as never)
  await fs.writeFile(CONFIG_FILE, content, 'utf-8')
}

export function createDefaultConfig(options: {
  language: SupportedLang
  installedWorkflows: string[]
  mcpProvider?: string
  liteMode?: boolean
  skipImpeccable?: boolean
}): CcgConfig {
  return {
    general: {
      version: packageVersion,
      language: options.language,
      createdAt: new Date().toISOString(),
    },
    workflows: {
      installed: options.installedWorkflows,
    },
    paths: {
      commands: join(homedir(), '.claude', 'commands', 'yq'),
      prompts: join(YQ_DIR, 'prompts'),
      backup: join(YQ_DIR, 'backup'),
    },
    mcp: {
      provider: options.mcpProvider || 'ace-tool',
      setup_url: 'https://augmentcode.com/',
    },
    performance: {
      liteMode: options.liteMode || false,
      skipImpeccable: options.skipImpeccable || false,
    },
  }
}
