export type MenuAction =
  | 'init'
  | 'update'
  | 'popular-workflows'
  | 'skills'
  | 'mcp'
  | 'environment'
  | 'tools'
  | 'coding-tools'
  | 'ai-accounts'
  | 'help'
  | 'uninstall'
  | 'exit'

export type ManagedPackage = {
  id: string
  label: string
  packageName?: string
  description?: string
  installType?: 'npm' | 'external-link'
  openDirectly?: boolean
  externalUrl?: string
  externalActionText?: string
  statusHint?: string
  tutorialUrl?: string
  tutorialActionText?: string
  runCommand?: {
    command: string
    args: string[]
    successText?: string
  }
}

export type ManagedPackageStatus = ManagedPackage & {
  installedVersion: string | null
  latestVersion: string | null
}

export const CODING_TOOL_PACKAGES: ManagedPackage[] = [
  { id: 'claude-code', label: 'Claude Code', packageName: '@anthropic-ai/claude-code' },
  { id: 'codex', label: 'Codex', packageName: '@openai/codex' },
  { id: 'gemini-cli', label: 'Gemini CLI', packageName: '@google/gemini-cli' },
  { id: 'opencode', label: 'OpenCode', packageName: 'opencode-ai' },
  {
    id: 'mossx-client',
    label: 'MossX 客户端',
    installType: 'external-link',
    externalUrl: 'https://www.mossx.ai/download',
    externalActionText: '打开下载页',
    statusHint: '桌面客户端下载',
  },
]

export const CC_SWITCH_RELEASES_URL = 'https://github.com/farion1231/cc-switch/releases'

export const AI_ACCOUNT_MANAGEMENT_PACKAGES: ManagedPackage[] = [
  {
    id: 'cc-switch',
    label: 'cc-switch',
    description: 'Claude Code / Codex / Gemini 等模型 API 切换与配置工具',
    installType: 'external-link',
    openDirectly: true,
    externalUrl: CC_SWITCH_RELEASES_URL,
    externalActionText: '打开下载页',
    statusHint: 'GitHub Releases',
  },
  {
    id: 'cockpit-tools',
    label: 'Cockpit Tools',
    description: '通用 AI IDE 账号管理工具，支持多账号多实例并行运行、一键切号',
    installType: 'external-link',
    openDirectly: true,
    externalUrl: 'https://github.com/jlcodes99/cockpit-tools',
    externalActionText: '打开项目主页',
    statusHint: 'GitHub 项目页',
  },
  {
    id: 'cli-proxy-api',
    label: 'CLIProxyAPI',
    description: '反代 / 聚合各渠道模型，对外提供统一 API Endpoint 与 Key',
    installType: 'external-link',
    openDirectly: true,
    externalUrl: 'https://github.com/router-for-me/CLIProxyAPI',
    externalActionText: '打开项目主页',
    statusHint: 'GitHub 项目页',
  },
  {
    id: 'cherry-studio',
    label: 'Cherry Studio',
    description: '跨平台 AI 对话客户端',
    installType: 'external-link',
    openDirectly: true,
    externalUrl: 'https://www.cherry-ai.com/',
    externalActionText: '打开官网',
    statusHint: '官方网站',
  },
  {
    id: 'sub2api-crs2',
    label: 'Sub2API-CRS2',
    description: '一站式开源中转服务，统一接入 Claude、OpenAI、Gemini、Antigravity 订阅',
    installType: 'external-link',
    openDirectly: true,
    externalUrl: 'https://github.com/Wei-Shaw/sub2api',
    externalActionText: '打开项目主页',
    statusHint: 'GitHub 项目页',
  },
]

export const CLAUDE_CODE_TOOL_PACKAGES: ManagedPackage[] = [
  CODING_TOOL_PACKAGES[0],
  { id: 'ccusage', label: 'ccusage', packageName: 'ccusage', runCommand: { command: 'npx', args: ['ccusage'], successText: '  ccusage 运行结束' } },
  { id: 'ccr', label: 'CCR', packageName: '@musistudio/claude-code-router' },
  { id: 'ccline', label: 'CCometixLine', packageName: '@cometix/ccline' },
  {
    id: 'claude-hud',
    label: 'Claude HUD',
    description: 'Claude Code 实时监控插件',
    installType: 'external-link',
    openDirectly: true,
    externalUrl: 'https://github.com/jarrodwatts/claude-hud/',
    externalActionText: '打开项目主页',
    statusHint: 'GitHub 项目页',
  },
]

export const POPULAR_WORKFLOW_PACKAGES: ManagedPackage[] = [
  {
    id: 'get-shit-done',
    label: 'GET SHIT DONE',
    packageName: 'get-shit-done-cc',
    description: '一个轻量但强大的元提示、上下文工程与规格驱动开发系统',
    tutorialUrl: 'https://github.com/gsd-build/get-shit-done/blob/main/README.zh-CN.md',
  },
  {
    id: 'gstack',
    label: 'gstack',
    description: '面向 AI Coding 的开源工作流集合，当前仅提供教程入口',
    installType: 'external-link',
    externalUrl: 'https://github.com/garrytan/gstack',
    externalActionText: '打开教程',
    tutorialUrl: 'https://github.com/garrytan/gstack',
    tutorialActionText: '打开教程',
    statusHint: '教程直达',
  },
  {
    id: 'trellis',
    label: 'Trellis',
    packageName: '@mindfoldhq/trellis',
    description: '给 AI 立规矩的开源框架',
    tutorialUrl: 'https://github.com/mindfold-ai/Trellis/blob/main/README_CN.md',
  },
]

export const MENU_RESOURCES = [
  {
    label: 'AI 编程实践指南',
    url: 'https://github.com/rockyflux/ai-guide',
  },
  {
    label: '项目地址',
    url: 'http://172.16.68.178:8090/vb-coding/yq-workflow',
  },
] as const

export const HEADER_INNER_WIDTH = 60
export const SKILLS_SH_URL = 'https://skills.sh/'
export const MENU_SEPARATOR = '----------'
