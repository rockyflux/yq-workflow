// 支持的语言
export type SupportedLang = 'zh-CN'

// YQ 配置
export interface CcgConfig {
  general: {
    version: string
    language: SupportedLang
    outputStyle?: string
    createdAt: string
  }
  workflows: {
    installed: string[]
  }
  paths: {
    commands: string
    prompts: string
    backup: string
  }
  mcp: {
    provider: string
    setup_url: string
  }
  performance?: {
    liteMode?: boolean
    skipImpeccable?: boolean
  }
}

// 工作流定义
export interface WorkflowConfig {
  id: string
  name: string
  nameEn: string
  category: string
  commands: string[]
  defaultSelected: boolean
  order: number
  description?: string
  descriptionEn?: string
}

// 初始化选项
export interface InitOptions {
  lang?: SupportedLang
  skipPrompt?: boolean
  skipMcp?: boolean
  force?: boolean
  workflows?: string
  installDir?: string
}

// 安装结果
export interface InstallResult {
  success: boolean
  installedCommands: string[]
  installedPrompts: string[]
  installedSkills?: number
  installedSkillCommands?: number
  installedRules?: boolean
  errors: string[]
  configPath: string
}

// ace-tool 配置
export interface AceToolConfig {
  baseUrl: string
  token: string
}

// fast-context (Windsurf Fast Context) 配置
export interface FastContextConfig {
  apiKey?: string
  includeSnippets?: boolean
}

// Re-export CLI types
export * from './cli'
