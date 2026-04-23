import ansis from 'ansis'
import inquirer from 'inquirer'
import fs from 'fs-extra'
import { spawn } from 'node:child_process'
import { homedir } from 'node:os'
import { join } from 'pathe'
import { version } from '../../package.json'
import { configMcp } from './config-mcp'
import { init } from './init'
import { update } from './update'
import { i18n } from '../i18n'
import { getWorkflowConfigs, uninstallWorkflows } from '../utils/installer'
import { readCcgConfig, writeCcgConfig } from '../utils/config'
import { PACKAGE_ROOT } from '../utils/installer-template'

type MenuAction =
  | 'init'
  | 'update'
  | 'mcp'
  | 'api'
  | 'style'
  | 'tools'
  | 'install-claude'
  | 'help'
  | 'uninstall'
  | 'exit'

type StyleId =
  | 'default'
  | 'engineer-professional'
  | 'nekomata-engineer'
  | 'laowang-engineer'
  | 'ojousama-engineer'
  | 'abyss-cultivator'
  | 'abyss-concise'
  | 'abyss-command'
  | 'abyss-ritual'

const STYLE_CHOICES: Array<{ name: string, value: StyleId, file?: string }> = [
  { name: '默认 - Claude Code 原生风格', value: 'default' },
  { name: '专业工程师 - 简洁专业的技术风格', value: 'engineer-professional', file: 'engineer-professional.md' },
  { name: '猫娘工程师 - 可爱猫娘语气', value: 'nekomata-engineer', file: 'nekomata-engineer.md' },
  { name: '老王工程师 - 接地气的老王风格', value: 'laowang-engineer', file: 'laowang-engineer.md' },
  { name: '大小姐工程师 - 优雅大小姐语气', value: 'ojousama-engineer', file: 'ojousama-engineer.md' },
  { name: '邪修风格 - 宿命深渊 · 道语标签', value: 'abyss-cultivator', file: 'abyss-cultivator.md' },
  { name: '冷刃简报 - 保留邪修人格，更克制更短', value: 'abyss-concise', file: 'abyss-concise.md' },
  { name: '铁律军令 - 命令式压缩输出', value: 'abyss-command', file: 'abyss-command.md' },
  { name: '祭仪长卷 - 仪式感叙事张力', value: 'abyss-ritual', file: 'abyss-ritual.md' },
]

function getConfigFilePath(): string {
  return join(homedir(), '.claude', '.yq', 'config.toml')
}

async function countInstalledCommands(): Promise<number> {
  const commandsDir = join(homedir(), '.claude', 'commands', 'yq')
  if (!(await fs.pathExists(commandsDir))) return 0
  const files = await fs.readdir(commandsDir)
  return files.filter(file => file.endsWith('.md')).length
}

function drawHeader(commandCount: number): void {
  const lines = [
    '╔════════════════════════════════════════════════════════════╗',
    '║                                                            ║',
    '║                  ██╗   ██╗ ██████╗                         ║',
    '║                  ╚██╗ ██╔╝██╔═══██╗                        ║',
    '║                   ╚████╔╝ ██║   ██║                        ║',
    '║                    ╚██╔╝  ██║▄▄ ██║                        ║',
    '║                     ██║   ╚██████╔╝                        ║',
    '║                     ╚═╝    ╚══▀▀═╝                         ║',
    '║                                                            ║',
    '║               Claude Code Workflow Toolkit                 ║',
    '║                  Commands + Skills + MCP                   ║',
    '║                                                            ║',
    `║             v${version.padEnd(6)} | ${String(commandCount).padStart(2)} commands | zh-CN              ║`,
    '║                                                            ║',
    '╚════════════════════════════════════════════════════════════╝',
  ]

  console.log()
  for (const line of lines) {
    console.log(ansis.cyan(line))
  }
  console.log()
}

function runInteractiveCommand(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      stdio: 'inherit',
      shell: true,
      env: process.env,
    })

    child.on('exit', code => {
      if (code === 0) resolve()
      else reject(new Error(`${command} exited with code ${code ?? 'unknown'}`))
    })
    child.on('error', reject)
  })
}

async function configApi(): Promise<void> {
  console.log()
  console.log(ansis.cyan.bold('  配置 Claude Code API'))
  console.log()

  const settingsPath = join(homedir(), '.claude', 'settings.json')
  let settings: Record<string, any> = {}
  if (await fs.pathExists(settingsPath)) {
    settings = await fs.readJSON(settingsPath)
  }
  settings.env ||= {}

  const currentUrl = settings.env.ANTHROPIC_BASE_URL
  const currentKey = settings.env.ANTHROPIC_AUTH_TOKEN || settings.env.ANTHROPIC_API_KEY

  if (currentUrl || currentKey) {
    console.log(ansis.gray('当前已存在自定义 API 配置'))
    if (currentUrl) console.log(`  URL: ${ansis.cyan(currentUrl)}`)
    if (currentKey) console.log(`  Key: ${ansis.cyan('********')}`)
    console.log()
  }

  const answers = await inquirer.prompt([{
    type: 'list',
    name: 'provider',
    message: '选择 API 提供方',
    choices: [
      { name: 'Anthropic 官方 / 清除自定义配置', value: 'official' },
      { name: '第三方 API 代理', value: 'third-party' },
      { name: '302.AI', value: '302ai' },
    ],
    default: 'official',
  }, {
    type: 'input',
    name: 'url',
    message: 'API URL',
    when: (input: { provider: string }) => input.provider === 'third-party',
    validate: (value: string) => value.trim() !== '' || '请输入 API URL',
  }, {
    type: 'password',
    name: 'key',
    message: 'API Key',
    mask: '*',
    when: (input: { provider: string }) => input.provider === 'third-party' || input.provider === '302ai',
    validate: (value: string) => value.trim() !== '' || '请输入 API Key',
  }] as any)

  if (answers.provider === 'official') {
    delete settings.env.ANTHROPIC_BASE_URL
    delete settings.env.ANTHROPIC_AUTH_TOKEN
    delete settings.env.ANTHROPIC_API_KEY
  }
  else if (answers.provider === '302ai') {
    settings.env.ANTHROPIC_BASE_URL = 'https://api.302.ai/cc'
    settings.env.ANTHROPIC_AUTH_TOKEN = answers.key.trim()
    delete settings.env.ANTHROPIC_API_KEY
  }
  else {
    settings.env.ANTHROPIC_BASE_URL = answers.url.trim()
    settings.env.ANTHROPIC_AUTH_TOKEN = answers.key.trim()
    delete settings.env.ANTHROPIC_API_KEY
  }

  await fs.ensureDir(join(homedir(), '.claude'))
  await fs.writeJSON(settingsPath, settings, { spaces: 2 })

  console.log()
  console.log(ansis.green('  API 配置已保存'))
  console.log(ansis.gray(`  ${settingsPath}`))
  console.log()
}

export {
  configApi,
}

async function configStyle(): Promise<void> {
  const config = await readCcgConfig()
  const currentStyle = config?.general?.outputStyle || 'default'

  const { style } = await inquirer.prompt([{
    type: 'list',
    name: 'style',
    message: '选择输出风格',
    choices: STYLE_CHOICES,
    default: currentStyle,
  }])

  if (style === currentStyle) {
    console.log()
    console.log(ansis.gray('  风格未变更'))
    console.log()
    return
  }

  const styleDir = join(homedir(), '.claude', '.yq')
  const styleFile = join(styleDir, 'output-style.md')
  const selectedStyle = STYLE_CHOICES.find(item => item.value === style)

  await fs.ensureDir(styleDir)
  if (selectedStyle?.file) {
    const source = join(PACKAGE_ROOT, 'templates', 'output-styles', selectedStyle.file)
    if (await fs.pathExists(source)) {
      await fs.copyFile(source, styleFile)
    }
  }
  else if (await fs.pathExists(styleFile)) {
    await fs.remove(styleFile)
  }

  if (config) {
    config.general.outputStyle = style
    await writeCcgConfig(config)
  }

  console.log()
  console.log(ansis.green(`  输出风格已设置为: ${selectedStyle?.name || style}`))
  console.log(ansis.gray(`  ${styleFile}`))
  console.log()
}

async function runToolsMenu(): Promise<void> {
  const { tool } = await inquirer.prompt([{
    type: 'list',
    name: 'tool',
    message: '选择工具',
    choices: [
      { name: '1. ccusage - Claude Code 用量分析', value: 'ccusage' },
      { name: '2. CCometixLine - 状态栏工具（Git + 用量）', value: 'ccline' },
      { name: 'B. 返回', value: 'back' },
    ],
  }])

  if (tool === 'back') return

  if (tool === 'ccusage') {
    console.log()
    console.log(ansis.cyan('  运行 ccusage...'))
    console.log()
    await runInteractiveCommand('npx', ['ccusage'])
    return
  }

  const { cclineAction } = await inquirer.prompt([{
    type: 'list',
    name: 'cclineAction',
    message: 'CCometixLine 操作',
    choices: [
      { name: '1. 安装 / 更新', value: 'install' },
      { name: '2. 卸载', value: 'uninstall' },
      { name: 'B. 返回', value: 'back' },
    ],
  }])

  if (cclineAction === 'back') return

  console.log()
  if (cclineAction === 'install') {
    console.log(ansis.cyan('  正在安装 CCometixLine...'))
    await runInteractiveCommand('npm', ['install', '-g', '@cometix/ccline'])
    console.log(ansis.green('  @cometix/ccline 安装成功'))
    console.log(ansis.gray('  安装完成后会自动供 Claude Code 使用'))
  }
  else {
    console.log(ansis.cyan('  正在卸载 CCometixLine...'))
    await runInteractiveCommand('npm', ['uninstall', '-g', '@cometix/ccline'])
    console.log(ansis.green('  @cometix/ccline 已卸载'))
  }
  console.log()
}

async function installClaudeCode(): Promise<void> {
  const { confirmInstall } = await inquirer.prompt([{
    type: 'confirm',
    name: 'confirmInstall',
    message: '使用 npm 全局安装 / 更新 Claude Code？',
    default: true,
  }])

  if (!confirmInstall) {
    console.log()
    console.log(ansis.gray('  已取消'))
    console.log()
    return
  }

  console.log()
  console.log(ansis.cyan('  正在安装 Claude Code...'))
  console.log()
  await runInteractiveCommand('npm', ['install', '-g', '@anthropic-ai/claude-code'])
  console.log()
  console.log(ansis.green('  Claude Code 安装成功'))
  console.log(ansis.gray('  运行 claude 命令启动'))
  console.log()
}

function showHelp(): void {
  console.log()
  console.log(ansis.cyan.bold('  已安装命令概览'))
  console.log()
  for (const workflow of getWorkflowConfigs()) {
    const command = workflow.commands[0]
    console.log(`  ${ansis.green(`/yq:${command}`.padEnd(24))} ${ansis.gray(workflow.description || '')}`)
  }
  console.log()
}

async function uninstall(): Promise<void> {
  const { confirm } = await inquirer.prompt([{
    type: 'confirm',
    name: 'confirm',
    message: '确定卸载 YQ 工作流文件？',
    default: false,
  }])

  if (!confirm) {
    console.log()
    console.log(ansis.gray(i18n.t('common:cancelled')))
    console.log()
    return
  }

  const installDir = join(homedir(), '.claude')
  const result = await uninstallWorkflows(installDir)
  const configPath = getConfigFilePath()
  if (await fs.pathExists(configPath)) {
    await fs.remove(configPath)
  }

  console.log()
  console.log(ansis.green('  YQ 工作流文件已移除'))
  console.log(ansis.gray(`  移除命令数: ${result.removedCommands.length}`))
  console.log(ansis.gray(`  移除技能数: ${result.removedSkills.length}`))
  if (result.errors.length > 0) {
    console.log(ansis.yellow('  卸载告警:'))
    for (const error of result.errors) {
      console.log(`    ${ansis.yellow('•')} ${error}`)
    }
  }
  console.log()
}

export async function showMainMenu(): Promise<void> {
  while (true) {
    const commandCount = await countInstalledCommands()
    drawHeader(commandCount)

    const { action } = await inquirer.prompt([{
      type: 'list',
      name: 'action',
      message: 'YQ 主菜单',
      pageSize: 16,
      choices: [
        new inquirer.Separator('────────────── Claude Code ──────────────'),
        { name: '1. 初始化 / 重装工作流      - 安装 YQ 工作流', value: 'init' },
        { name: '2. 更新工作流               - 更新到最新版本', value: 'update' },
        { name: '3. 配置 MCP                 - 必装 / 数据库 / Git / 文件资源', value: 'mcp' },
        { name: '4. 配置 API                 - 自定义 API 端点', value: 'api' },
        { name: '5. 配置输出风格             - 选择常用输出人格', value: 'style' },
        new inquirer.Separator('─────────────── 其他工具 ────────────────'),
        { name: 'T. 实用工具                 - ccusage, CCometixLine', value: 'tools' },
        { name: 'C. 安装 Claude Code         - 安装 / 更新 CLI', value: 'install-claude' },
        new inquirer.Separator('────────────────── YQ ───────────────────'),
        { name: 'H. 帮助                     - 查看已安装命令', value: 'help' },
        { name: '-. 卸载 YQ                  - 移除工作流文件', value: 'uninstall' },
        new inquirer.Separator('─────────────────────────────────────────'),
        { name: 'Q. 退出', value: 'exit' },
      ],
    }])

    switch (action as MenuAction) {
      case 'init':
        await init()
        break
      case 'update':
        await update()
        break
      case 'mcp':
        await configMcp()
        break
      case 'api':
        await configApi()
        break
      case 'style':
        await configStyle()
        break
      case 'tools':
        await runToolsMenu()
        break
      case 'install-claude':
        await installClaudeCode()
        break
      case 'help':
        showHelp()
        break
      case 'uninstall':
        await uninstall()
        break
      case 'exit':
        console.log()
        console.log(ansis.gray(`  ${i18n.t('common:goodbye')}`))
        console.log()
        return
    }

    const currentConfig = await readCcgConfig()
    if (currentConfig) {
      await writeCcgConfig(currentConfig)
    }

    await inquirer.prompt([{
      type: 'input',
      name: 'continue',
      message: ansis.gray(i18n.t('common:pressEnterToReturn')),
    }])
  }
}
