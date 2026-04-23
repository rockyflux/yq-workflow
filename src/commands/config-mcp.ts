import ansis from 'ansis'
import inquirer from 'inquirer'
import { installMcpServer, removeFastContextPrompt, uninstallAceTool, uninstallContextWeaver, uninstallFastContext, uninstallMcpServer } from '../utils/installer'

type McpOption = {
  id: string
  name: string
  desc: string
  command: string
  args: string[]
  setup?: () => Promise<{ args?: string[], env?: Record<string, string>, skip?: boolean }>
}

type McpCategory = {
  id: string
  name: string
  desc: string
  tools: McpOption[]
}

async function syncMcpMirrors(): Promise<void> {
  console.log(ansis.gray('✓ MCP 配置已写入 Claude Code'))
}

async function confirmSetup(title: string): Promise<boolean> {
  const { action } = await inquirer.prompt([{
    type: 'list',
    name: 'action',
    message: `${title}：选择操作`,
    choices: [
      { name: `${ansis.green('➜')} 继续配置`, value: 'continue' },
      { name: `${ansis.gray('返回')}`, value: 'back' },
    ],
  }])

  return action === 'continue'
}

async function promptPostgres(): Promise<{ args?: string[], skip?: boolean }> {
  if (!await confirmSetup('PostgreSQL')) {
    return { skip: true }
  }

  console.log(ansis.cyan('📖 PostgreSQL 连接串示例：'))
  console.log(`   ${ansis.gray('•')} postgresql://localhost/mydb`)
  console.log(`   ${ansis.gray('•')} postgresql://user:password@localhost:5432/mydb`)
  console.log()

  const { connectionString } = await inquirer.prompt([{
    type: 'input',
    name: 'connectionString',
    message: 'PostgreSQL 连接串',
    validate: (v: string) => v.trim() !== '' || '请输入连接串',
  }])

  return {
    args: ['-y', '@modelcontextprotocol/server-postgres', connectionString.trim()],
  }
}

async function promptGithub(): Promise<{ env?: Record<string, string>, skip?: boolean }> {
  if (!await confirmSetup('GitHub')) {
    return { skip: true }
  }

  console.log(ansis.cyan('📖 获取 GitHub Personal Access Token：'))
  console.log(`   访问 ${ansis.underline('https://github.com/settings/tokens')} 创建 Token`)
  console.log(`   ${ansis.gray('•')} 仅读仓库可先给最小权限，私有仓库通常需要 repo 相关权限`)
  console.log()

  const { token } = await inquirer.prompt([{
    type: 'password',
    name: 'token',
    message: 'GitHub Token',
    mask: '*',
    validate: (v: string) => v.trim() !== '' || '请输入 Token',
  }])

  return {
    env: { GITHUB_PERSONAL_ACCESS_TOKEN: token.trim() },
  }
}

async function promptLocalGit(): Promise<{ args?: string[], skip?: boolean }> {
  if (!await confirmSetup('Git')) {
    return { skip: true }
  }

  const { repositoryPath } = await inquirer.prompt([{
    type: 'input',
    name: 'repositoryPath',
    message: 'Git 仓库路径',
    default: process.cwd(),
    validate: (v: string) => v.trim() !== '' || '请输入仓库路径',
  }])

  return {
    args: ['--from', 'mcp-server-git', 'mcp-server-git', '--repository', repositoryPath.trim()],
  }
}

async function promptFilesystem(): Promise<{ args?: string[], skip?: boolean }> {
  if (!await confirmSetup('Filesystem')) {
    return { skip: true }
  }

  console.log(ansis.cyan('📖 Filesystem MCP 允许访问的目录：'))
  console.log(`   ${ansis.gray('•')} 可填一个或多个目录，多个路径用英文逗号分隔`)
  console.log(`   ${ansis.gray('•')} 默认使用当前目录：${process.cwd()}`)
  console.log()

  const { allowedDirs } = await inquirer.prompt([{
    type: 'input',
    name: 'allowedDirs',
    message: '允许访问的目录',
    default: process.cwd(),
    validate: (v: string) => v.trim() !== '' || '请输入至少一个目录',
  }])

  const paths = allowedDirs
    .split(',')
    .map((item: string) => item.trim())
    .filter(Boolean)

  return {
    args: ['-y', '@modelcontextprotocol/server-filesystem', ...paths],
  }
}

async function promptMemory(): Promise<{ env?: Record<string, string>, skip?: boolean }> {
  if (!await confirmSetup('Memory')) {
    return { skip: true }
  }

  const { memoryFilePath } = await inquirer.prompt([{
    type: 'input',
    name: 'memoryFilePath',
    message: `MEMORY_FILE_PATH ${ansis.gray('(可选，留空使用默认路径)')}`,
    default: '',
  }])

  const env: Record<string, string> = {}
  if (memoryFilePath.trim()) {
    env.MEMORY_FILE_PATH = memoryFilePath.trim()
  }

  return { env }
}

const ESSENTIAL_MCPS: McpOption[] = [
  { id: 'context7', name: 'Context7', desc: '获取最新库文档', command: 'npx', args: ['-y', '@upstash/context7-mcp@latest'] },
  { id: 'playwright', name: 'Playwright', desc: '浏览器自动化 / 测试', command: 'npx', args: ['-y', '@playwright/mcp@latest'] },
  { id: 'mcp-deepwiki', name: 'DeepWiki', desc: '知识库查询 / 仓库百科', command: 'npx', args: ['-y', 'mcp-deepwiki@latest'] },
]

const DATABASE_MCPS: McpOption[] = [
  { id: 'postgres', name: 'PostgreSQL', desc: '只读查询 PostgreSQL 数据库', command: 'npx', args: ['-y', '@modelcontextprotocol/server-postgres'], setup: promptPostgres },
  { id: 'sqlite', name: 'SQLite', desc: '本地 SQLite 查询与表结构操作', command: 'npx', args: ['-y', '@mvd/sqlite-mcp@latest'] },
]

const GIT_MCPS: McpOption[] = [
  { id: 'github', name: 'GitHub', desc: 'GitHub 仓库 / PR / Issue 操作', command: 'npx', args: ['-y', '@modelcontextprotocol/server-github'], setup: promptGithub },
  { id: 'git', name: 'Git', desc: '本地 Git 仓库读取与版本信息查询', command: 'uvx', args: ['--from', 'mcp-server-git', 'mcp-server-git'], setup: promptLocalGit },
]

const FILE_RESOURCE_MCPS: McpOption[] = [
  { id: 'filesystem', name: 'Filesystem', desc: '本地文件与目录读写 / 搜索', command: 'npx', args: ['-y', '@modelcontextprotocol/server-filesystem'], setup: promptFilesystem },
  { id: 'memory', name: 'Memory', desc: '本地持久化知识图谱 / 资源记忆', command: 'npx', args: ['-y', '@modelcontextprotocol/server-memory'], setup: promptMemory },
]

const MCP_CATEGORIES: McpCategory[] = [
  { id: 'essential', name: '必装工具 MCP', desc: 'Context7 / Playwright / DeepWiki', tools: ESSENTIAL_MCPS },
  { id: 'database', name: '数据库操作 MCP', desc: 'PostgreSQL / SQLite', tools: DATABASE_MCPS },
  { id: 'git', name: 'Git / 版本控制 MCP', desc: 'GitHub / Git', tools: GIT_MCPS },
  { id: 'file-resource', name: '文件 / 资源操作 MCP', desc: 'Filesystem / Memory', tools: FILE_RESOURCE_MCPS },
]

/**
 * Configure MCP tools after installation
 */
export async function configMcp(): Promise<void> {
  console.log()
  console.log(ansis.cyan.bold('  配置 MCP 工具'))
  console.log()

  while (true) {
    const { action } = await inquirer.prompt([{
      type: 'list',
      name: 'action',
      message: '选择操作',
      choices: [
        ...MCP_CATEGORIES.map(category => ({
          name: `${ansis.green('➜')} ${category.name} ${ansis.gray(`(${category.desc})`)}`,
          value: category.id,
        })),
        { name: `${ansis.red('✕')} 卸载 MCP`, value: 'uninstall' },
        new inquirer.Separator(),
        { name: `${ansis.gray('返回')}`, value: 'cancel' },
      ],
    }])

    if (action === 'cancel')
      return

    if (action === 'uninstall') {
      await handleUninstall()
      continue
    }

    const category = MCP_CATEGORIES.find(item => item.id === action)
    if (category) {
      await handleCategory(category)
    }
  }
}

async function handleCategory(category: McpCategory): Promise<void> {
  while (true) {
    console.log()

    const { selected } = await inquirer.prompt([{
      type: 'checkbox',
      name: 'selected',
      message: `选择要安装的 ${category.name}（空格选择，回车确认）`,
      choices: [
        ...category.tools.map(tool => ({
          name: `${tool.name} ${ansis.gray(`- ${tool.desc}`)}`,
          value: tool.id,
        })),
        new inquirer.Separator(),
        { name: `${ansis.gray('返回')}`, value: '__back__' },
      ],
      validate: (values: string[]) => values.length > 0 || '请至少选择一个工具或选择返回',
    }])

    if (selected.includes('__back__')) {
      return
    }

    console.log()

    for (const id of selected) {
      const tool = category.tools.find(item => item.id === id)!
      const args = [...tool.args]
      let env: Record<string, string> = {}

      if (tool.setup) {
        const setupResult = await tool.setup()
        if (setupResult.skip) {
          console.log(ansis.gray(`已取消 ${tool.name} 的配置，返回 ${category.name}`))
          continue
        }
        if (setupResult.args) {
          args.splice(0, args.length, ...setupResult.args)
        }
        if (setupResult.env) {
          env = setupResult.env
        }
      }

      console.log(ansis.yellow(`⏳ 正在安装 ${tool.name}...`))
      const result = await installMcpServer(tool.id, tool.command, args, env)

      if (result.success) {
        console.log(ansis.green(`✓ ${tool.name} 安装成功`))
      }
      else {
        console.log(ansis.red(`✗ ${tool.name} 安装失败: ${result.message}`))
      }
    }

    console.log()
    await syncMcpMirrors()
    console.log(ansis.gray('重启 Claude Code CLI 使配置生效'))
  }
}

async function handleUninstall(): Promise<void> {
  while (true) {
    console.log()

    const allMcps = [
      { name: 'ace-tool', value: 'ace-tool' },
      { name: 'fast-context', value: 'fast-context' },
      { name: 'ContextWeaver', value: 'contextweaver' },
      { name: 'grok-search', value: 'grok-search' },
      ...MCP_CATEGORIES.flatMap(category => category.tools.map(tool => ({ name: tool.name, value: tool.id }))),
      new inquirer.Separator(),
      { name: `${ansis.gray('返回')}`, value: '__back__' },
    ]

    const { targets } = await inquirer.prompt([{
      type: 'checkbox',
      name: 'targets',
      message: '选择要卸载的 MCP（空格选择，回车确认）',
      choices: allMcps,
      validate: (values: string[]) => values.length > 0 || '请至少选择一个 MCP 或选择返回',
    }])

    if (targets.includes('__back__')) {
      return
    }

    console.log()

    for (const target of targets) {
      console.log(ansis.yellow(`⏳ 正在卸载 ${target}...`))

      let result
      if (target === 'ace-tool') {
        result = await uninstallAceTool()
      }
      else if (target === 'fast-context') {
        result = await uninstallFastContext()
        await removeFastContextPrompt()
      }
      else if (target === 'contextweaver') {
        result = await uninstallContextWeaver()
      }
      else {
        result = await uninstallMcpServer(target)
      }

      if (result.success) {
        console.log(ansis.green(`✓ ${target} 已卸载`))
      }
      else {
        console.log(ansis.red(`✗ ${target} 卸载失败: ${result.message}`))
      }
    }

    await syncMcpMirrors()
    console.log()
  }
}
