export type MenuAction =
  | 'init'
  | 'update'
  | 'popular-workflows'
  | 'prompts'
  | 'skills'
  | 'mcp'
  | 'environment'
  | 'tools'
  | 'coding-tools'
  | 'ai-accounts'
  | 'model-usage'
  | 'help'
  | 'uninstall'
  | 'exit'

export type ManagedPackage = {
  id: string
  label: string
  packageName?: string
  description?: string
  category?: 'cli' | 'desktop'
  accountCategory?: 'client' | 'provider'
  installType?: 'npm' | 'external-link'
  openDirectly?: boolean
  externalUrl?: string
  externalActionText?: string
  statusHint?: string
  tutorialUrl?: string
  tutorialActionText?: string
  runOnly?: boolean
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
  {
    id: 'claude-code',
    label: 'Claude Code',
    packageName: '@anthropic-ai/claude-code',
    category: 'cli',
    description: 'Anthropic 官方 CLI 编程代理',
  },
  {
    id: 'codex-cli',
    label: 'Codex CLI',
    packageName: '@openai/codex',
    category: 'cli',
    description: 'OpenAI Codex 命令行工具',
  },
  {
    id: 'gemini-cli',
    label: 'Gemini CLI',
    packageName: '@google/gemini-cli',
    category: 'cli',
    description: 'Google 官方 Gemini 命令行工具',
  },
  {
    id: 'opencode',
    label: 'OpenCode',
    packageName: 'opencode-ai',
    category: 'cli',
    description: 'OpenCode.ai 命令行工具',
  },
  {
    id: 'mossx-client',
    label: 'MossX 客户端',
    category: 'desktop',
    description: 'MossX 桌面端客户端',
    installType: 'external-link',
    openDirectly: true,
    externalUrl: 'https://www.mossx.ai/download',
    externalActionText: '打开下载页',
  },
  {
    id: 'codex-app',
    label: 'Codex App',
    category: 'desktop',
    description: 'Codex 桌面端',
    installType: 'external-link',
    openDirectly: true,
    externalUrl: 'https://www.codex-docs.com/getting-started/quickstart',
    externalActionText: '打开安装指引',
    tutorialUrl: 'https://www.codex-docs.com/getting-started/quickstart',
    tutorialActionText: '打开快速开始',
  },
  {
    id: 'any-code',
    label: 'Any Code',
    category: 'desktop',
    description: '支持 Claude Code / Codex / Gemini 的桌面应用',
    installType: 'external-link',
    openDirectly: true,
    externalUrl: 'https://github.com/anyme123/Any-code/releases',
    externalActionText: '打开下载页',
    tutorialUrl: 'https://github.com/anyme123/Any-code',
    tutorialActionText: '打开项目主页',
  },
]

export const CODING_TOOL_CLI_PACKAGES = CODING_TOOL_PACKAGES.filter(item => item.category === 'cli')

export const CODING_TOOL_DESKTOP_PACKAGES = CODING_TOOL_PACKAGES.filter(item => item.category === 'desktop')

export const CC_SWITCH_RELEASES_URL = 'https://github.com/farion1231/cc-switch/releases'

export const AI_ACCOUNT_MANAGEMENT_PACKAGES: ManagedPackage[] = [
  {
    id: 'cc-switch',
    label: 'cc-switch',
    description: 'Claude Code / Codex / Gemini 等模型 API 切换与配置工具',
    accountCategory: 'client',
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
    accountCategory: 'client',
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
    accountCategory: 'client',
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
    accountCategory: 'client',
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
    accountCategory: 'client',
    installType: 'external-link',
    openDirectly: true,
    externalUrl: 'https://github.com/Wei-Shaw/sub2api',
    externalActionText: '打开项目主页',
    statusHint: 'GitHub 项目页',
  },
  {
    id: 'ldxp-unlimited-refill',
    label: '无限续杯工具 1',
    description: '支持 Cursor、Kiro，可同时5 台设备在线使用，推荐月卡。',
    accountCategory: 'provider',
    installType: 'external-link',
    openDirectly: true,
    externalUrl: 'https://pay.ldxp.cn/shop/xxdlzs',
    externalActionText: '打开网页',
    statusHint: '供应商网页',
  },
  {
    id: 'suiyuee-unlimited-refill',
    label: '无限续杯工具 2',
    description: '支持 Codex、Cursor、Windsurf、Kiro，限制频繁续杯，推荐月卡。',
    accountCategory: 'provider',
    installType: 'external-link',
    openDirectly: true,
    externalUrl: 'https://suiyuee.top/shop',
    externalActionText: '打开网页',
    statusHint: '供应商网页',
  },
   {
    id: 'makerich-club-refill',
    label: '账号购买 1 ',
    description: '支持ChatGPT Plus,Gemini Pro等，',
    accountCategory: 'provider',
    installType: 'external-link',
    openDirectly: true,
    externalUrl: 'https://makerich.club/',
    externalActionText: '打开网页',
    statusHint: '供应商网页',
  },
  {
    id: 'wafase-refill',
    label: '账号购买 2',
    description: '支持Cursor,ChatGPT Plus,Gemini Pro等，',
    accountCategory: 'provider',
    installType: 'external-link',
    openDirectly: true,
    externalUrl: 'https://wafase.com/',
    externalActionText: '打开网页',
    statusHint: '供应商网页',
  },
  {
    id: 'apis-you-refill',
    label: 'AI中转套餐大全',
    description: 'Claude Code中转站',
    accountCategory: 'provider',
    installType: 'external-link',
    openDirectly: true,
    externalUrl: 'https://apis.you/catalog',
    externalActionText: '打开网页',
    statusHint: '供应商网页',
  },
  {
    id: 'gpt-webfree-refill',
    label: '网页版ChatGPT Plus',
    description: '免费不限量使用',
    accountCategory: 'provider',
    installType: 'external-link',
    openDirectly: true,
    externalUrl: 'https://chat.sharedchat.cc/',
    externalActionText: '打开网页',
    statusHint: '供应商网页',
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

export const MODEL_USAGE_PACKAGES: ManagedPackage[] = [
  {
    id: 'claude-code-usage',
    label: 'Claude Code',
    description: '运行 ccusage 查看 Claude Code 模型使用统计',
    runOnly: true,
    runCommand: {
      command: 'npx',
      args: ['ccusage@latest'],
      successText: '  Claude Code 模型使用统计运行结束',
    },
  },
  {
    id: 'codex-usage',
    label: 'Codex',
    description: '运行 @ccusage/codex 查看 Codex 模型使用统计',
    runOnly: true,
    runCommand: {
      command: 'npx',
      args: ['@ccusage/codex@latest'],
      successText: '  Codex 模型使用统计运行结束',
    },
  },
  {
    id: 'usage-analytics-web',
    label: '网页版',
    description: '运行 claude-code-usage-analytics 打开网页版模型使用统计',
    runOnly: true,
    runCommand: {
      command: 'npx',
      args: ['claude-code-usage-analytics'],
      successText: '  网页版模型使用统计运行结束',
    },
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
export const SKILLS_MANAGE_URL = 'https://github.com/iamzhihuix/skills-manage'
export const MENU_SEPARATOR = '----------'
