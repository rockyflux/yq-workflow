import type { CcgConfig, SupportedLang } from '../types'

export interface CliOptions {
  force?: boolean
  skipPrompt?: boolean
  skipMcp?: boolean
  workflows?: string
  installDir?: string
}

export type { CcgConfig, SupportedLang }
