import { SCIENTIFIC_INTERNET_GUIDE_URL } from '../utils/installer'

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
  autoInstallOnRun?: boolean
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
    id: 'pi',
    label: 'Pi',
    packageName: '@earendil-works/pi-coding-agent',
    category: 'cli',
    description: '可扩展的极简 Agent 运行时',
    tutorialUrl: 'https://pi.dev/',
    tutorialActionText: '打开官网',
  },
  {
    id: 'orca',
    label: 'Orca',
    category: 'desktop',
    description: 'Agent 开发环境，并行运行 Claude Code、Codex 等 CLI Agent',
    installType: 'external-link',
    openDirectly: true,
    externalUrl: 'https://www.onorca.dev/',
    externalActionText: '打开下载页',
    tutorialUrl: 'https://www.onorca.dev/',
    tutorialActionText: '打开项目主页',
  },
  {
    id: 'dsh-desktop',
    label: 'DSH Desktop',
    category: 'desktop',
    description: 'DeepSeek Harness 开源桌面客户端',
    installType: 'external-link',
    openDirectly: true,
    externalUrl: 'https://www.dshdesktop.cn/',
    externalActionText: '打开下载页',
  },
  {
    id: 'terax',
    label: 'Terax',
    category: 'desktop',
    description: '终端优先的 AI 原生开发工作区',
    installType: 'external-link',
    openDirectly: true,
    externalUrl: 'https://terax.app/',
    externalActionText: '打开下载页',
    tutorialUrl: 'https://terax.app/',
    tutorialActionText: '打开项目主页',
  },
  {
    id: 'cli-manager',
    label: 'CLI-Manager',
    category: 'desktop',
    description: '跨平台 AI CLI 工作台',
    installType: 'external-link',
    openDirectly: true,
    externalUrl: 'https://cli-manager.github.io/',
    externalActionText: '打开下载页',
    tutorialUrl: 'https://cli-manager.github.io/',
    tutorialActionText: '打开项目主页',
  },
]

export const CODING_TOOL_CLI_PACKAGES = CODING_TOOL_PACKAGES.filter(item => item.category === 'cli')

export const CODING_TOOL_DESKTOP_PACKAGES = CODING_TOOL_PACKAGES.filter(item => item.category === 'desktop')

export const CC_SWITCH_RELEASES_URL = 'https://github.com/farion1231/cc-switch/releases'
export const MAGPIE_HOME_URL = 'https://usemagpie.ai/zh/'

export const AI_ACCOUNT_MANAGEMENT_PACKAGES: ManagedPackage[] = [
  {
    id: 'magpie',
    label: 'magpie',
    description: '本地模型网关，一次配置供应商后在 Claude Code、Codex、Gemini CLI 等 Agent 中一键切换模型',
    accountCategory: 'client',
    installType: 'external-link',
    openDirectly: true,
    externalUrl: MAGPIE_HOME_URL,
    externalActionText: '打开官网',
    statusHint: '官方网站',
  },
  {
    id: 'cc-switch',
    label: 'cc-switch',
    description: '本地账号切换工具，适合管理 Claude Code、Codex、Gemini CLI 等配置',
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
    description: '多账号管理客户端，支持多实例运行与一键切换常见 AI 编程工具账号',
    accountCategory: 'client',
    installType: 'external-link',
    openDirectly: true,
    externalUrl: 'https://github.com/jlcodes99/cockpit-tools',
    externalActionText: '打开项目主页',
    statusHint: 'GitHub 项目页',
  },
  {
    id: 'cherry-studio',
    label: 'Cherry Studio',
    description: '跨平台 AI 客户端，适合统一管理和测试多个模型账号',
    accountCategory: 'client',
    installType: 'external-link',
    openDirectly: true,
    externalUrl: 'https://www.cherry-ai.com/',
    externalActionText: '打开官网',
    statusHint: '官方网站',
  },
  {
    id: 'scientific-internet-guide',
    label: '科学上网推荐列表',
    description: '常用科学上网工具与相关文章导航页；地址：www.ermao.net/posts/vpn',
    accountCategory: 'provider',
    installType: 'external-link',
    openDirectly: true,
    externalUrl: SCIENTIFIC_INTERNET_GUIDE_URL,
    externalActionText: '打开网页',
    statusHint: '推荐列表',
  },
  {
    id: 'cli-proxy-api',
    label: 'CLIProxyAPI',
    description: '统一代理与中转入口，适合给 Claude、OpenAI、Gemini 等提供兼容 API',
    accountCategory: 'client',
    installType: 'external-link',
    openDirectly: true,
    externalUrl: 'https://github.com/router-for-me/CLIProxyAPI',
    externalActionText: '打开项目主页',
    statusHint: 'GitHub 项目页',
  },
  {
    id: 'sub2api-crs2',
    label: 'Sub2API-CRS2',
    description: '开源中转服务，统一接入 Claude、OpenAI、Gemini 等订阅与接口',
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
    description: '支持 Cursor、Kiro 等，强调多设备在线使用，适合月卡方案；地址：pay.ldxp.cn/shop/xxdlzs',
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
    description: '支持 Codex、Cursor、Windsurf、Kiro 等，适合常规续杯场景；地址：q.chuhai.cool',
    accountCategory: 'provider',
    installType: 'external-link',
    openDirectly: true,
    externalUrl: 'https://q.chuhai.cool/',
    externalActionText: '打开网页',
    statusHint: '供应商网页',
  },
  {
    id: 'makerich-club-refill',
    label: '账号购买 1',
    description: '提供 ChatGPT Plus、Gemini Pro 等常见账号购买入口；地址：makerich.club',
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
    description: '提供 Cursor、ChatGPT Plus、Gemini Pro 等账号购买入口；地址：wafase.com',
    accountCategory: 'provider',
    installType: 'external-link',
    openDirectly: true,
    externalUrl: 'https://wafase.com/',
    externalActionText: '打开网页',
    statusHint: '供应商网页',
  },
  {
    id: 'apis-you-refill',
    label: 'AI 中转套餐大全',
    description: 'Coding Plan 与渠道指南，汇总常见编程套餐与中转方案；地址：rockyflux.github.io/ai-guide/programming/coding-plan.html',
    accountCategory: 'provider',
    installType: 'external-link',
    openDirectly: true,
    externalUrl: 'https://rockyflux.github.io/ai-guide/programming/coding-plan.html',
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
  {
    id: 'codeburn',
    label: 'CodeBurn',
    packageName: 'codeburn',
    description: '多工具 AI 编程 Token / 成本观测 TUI 面板（Claude Code、Codex、Cursor 等）',
    tutorialUrl: 'https://github.com/getagentseal/codeburn',
    autoInstallOnRun: true,
    runCommand: {
      command: 'codeburn',
      args: [],
      successText: '  CodeBurn 运行结束',
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
    url: 'https://github.com/rockyflux/yq-workflow',
  },
] as const

export const HEADER_INNER_WIDTH = 60
export const SKILLS_SH_URL = 'https://skills.sh/'
export const SKILLS_MANAGE_URL = 'https://skillsmanager.dev/zh'
export const PROMPTHUB_URL = 'https://prompthub.click/'
export const MENU_SEPARATOR = '----------'
