export type HelpCommandItem = {
  command: string
  description: string
}

export const HELP_OVERVIEW_URL = 'https://rockyflux.github.io/yq-workflow/'

export const COMMON_HELP_COMMANDS: HelpCommandItem[] = [
  { command: 'npx yq-workflow', description: '打开主菜单' },
  { command: 'npx yq-workflow menu', description: '打开主菜单' },
  { command: 'npx yq-workflow init', description: '初始化或重装工作流' },
  { command: 'npx yq-workflow update', description: '更新工作流' },
  { command: 'npx yq-workflow config prompt', description: '打开提示词配置' },
  { command: 'npx yq-workflow config skills', description: '打开 Skills 配置' },
  { command: 'npx yq-workflow config mcp', description: '打开 MCP 配置' },
  { command: 'npx yq-workflow help', description: '查看常用命令说明' },
]

export const HELP_COMMAND_HINTS: string[] = [
  '这里只显示主菜单有对应入口的命令。',
  '热门开源工作流、编程工具、环境检测、账号管理和模型使用统计当前请从主菜单进入。',
]
