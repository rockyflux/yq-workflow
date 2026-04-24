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
import { buildDate } from '../generated/build-info'
import { i18n } from '../i18n'
import { getWorkflowConfigs, uninstallWorkflows } from '../utils/installer'
import { readCcgConfig, writeCcgConfig } from '../utils/config'
import { PACKAGE_ROOT } from '../utils/installer-template'
import { compareVersions, getGlobalPackageVersion, getLatestVersion } from '../utils/version'

type MenuAction =
  | 'init'
  | 'update'
  | 'mcp'
  | 'api'
  | 'style'
  | 'tools'
  | 'install-claude'
  | 'install-codex'
  | 'check-updates'
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

type ManagedPackage = {
  label: string
  packageName: string
}

const MANAGED_PACKAGES: ManagedPackage[] = [
  { label: 'Claude Code', packageName: '@anthropic-ai/claude-code' },
  { label: 'Codex', packageName: '@openai/codex' },
  { label: 'CCR', packageName: '@musistudio/claude-code-router' },
  { label: 'CCometixLine', packageName: '@cometix/ccline' },
]

const MENU_RESOURCES = [
  {
    label: 'AI 编程实践指南',
    url: 'https://github.com/rockyflux/ai-guide',
  },
  {
    label: '项目地址',
    url: 'http://172.16.68.178:8090/vb-coding/yq-workflow',
  },
] as const

const HEADER_INNER_WIDTH = 60
const CC_SWITCH_RELEASES_URL = 'https://github.com/farion1231/cc-switch/releases'

function getConfigFilePath(): string {
  return join(homedir(), '.claude', '.yq', 'config.toml')
}

async function countInstalledCommands(): Promise<number> {
  const commandsDir = join(homedir(), '.claude', 'commands', 'yq')
  if (!(await fs.pathExists(commandsDir))) return 0
  const files = await fs.readdir(commandsDir)
  return files.filter(file => file.endsWith('.md')).length
}

async function countInstalledSkills(): Promise<number> {
  const [yqSkills, baseSkills, superpowersSkills] = await Promise.all([
    listInstalledYqAgentSkills(),
    listInstalledBaseSkills(),
    listInstalledSuperpowersSkills(),
  ])

  return yqSkills.length + baseSkills.length + superpowersSkills.length
}

async function listInstalledCommands(): Promise<string[]> {
  const commandsDir = join(homedir(), '.claude', 'commands', 'yq')
  if (!(await fs.pathExists(commandsDir))) return []

  const files = await fs.readdir(commandsDir)
  return files
    .filter(file => file.endsWith('.md'))
    .map(file => file.replace(/\.md$/u, ''))
    .sort((a, b) => a.localeCompare(b))
}

type InstalledSkill = {
  name: string
  path: string
}

async function listInstalledSkillsFromTemplate(templateSubdir: string, installSubdir: string): Promise<InstalledSkill[]> {
  const agentSkillsDir = join(homedir(), '.agents', 'skills', installSubdir)
  const templateDir = join(PACKAGE_ROOT, 'templates', templateSubdir)

  if (!(await fs.pathExists(agentSkillsDir)) || !(await fs.pathExists(templateDir))) {
    return []
  }

  const templateEntries = await fs.readdir(templateDir, { withFileTypes: true })
  const installedSkills: InstalledSkill[] = []

  for (const entry of templateEntries) {
    if (!entry.isDirectory()) continue
    const skillDir = join(agentSkillsDir, entry.name)
    const skillFile = join(skillDir, 'SKILL.md')
    if (await fs.pathExists(skillFile)) {
      installedSkills.push({
        name: entry.name,
        path: skillDir,
      })
    }
  }

  return installedSkills.sort((a, b) => a.name.localeCompare(b.name))
}

async function listInstalledYqAgentSkills(): Promise<InstalledSkill[]> {
  return listInstalledSkillsFromTemplate('yq-skills', 'yq')
}

async function listInstalledBaseSkills(): Promise<InstalledSkill[]> {
  return listInstalledSkillsFromTemplate('base-skills', 'yq-base')
}

async function listInstalledSuperpowersSkills(): Promise<InstalledSkill[]> {
  return listInstalledSkillsFromTemplate('superpowers', 'superpowers')
}

function printInstalledSkillsSection(title: string, items: InstalledSkill[], emptyText: string): void {
  console.log()
  console.log(ansis.cyan(`  ${title}`))
  if (items.length === 0) {
    console.log(ansis.gray(`    ${emptyText}`))
    return
  }

  for (const item of items) {
    console.log(`  ${ansis.green(item.name.padEnd(24))} ${ansis.gray(item.path)}`)
  }
}

function createHeaderLine(content = ''): string {
  return `║${content.padStart(Math.floor((HEADER_INNER_WIDTH + content.length) / 2)).padEnd(HEADER_INNER_WIDTH)}║`
}

function drawHeader(commandCount: number, skillCount: number): void {
  const lines = [
    '╔════════════════════════════════════════════════════════════╗',
    createHeaderLine(),
    createHeaderLine('██╗   ██╗ ██████╗'),
    createHeaderLine('╚██╗ ██╔╝██╔═══██╗'),
    createHeaderLine(' ╚████╔╝ ██║   ██║'),
    createHeaderLine('  ╚██╔╝  ██║▄▄ ██║'),
    createHeaderLine('   ██║   ╚██████╔╝'),
    createHeaderLine('   ╚═╝    ╚══▀▀═╝'),
    createHeaderLine(),
    createHeaderLine('Claude Code Workflow Toolkit'),
    createHeaderLine('Commands + Skills + MCP'),
    createHeaderLine(),
    createHeaderLine(`v${version} | ${commandCount} commands | ${skillCount} skills | zh-CN`),
    createHeaderLine(`build ${buildDate}`),
    createHeaderLine(),
    '╚════════════════════════════════════════════════════════════╝',
  ]

  console.log()
  for (const line of lines) {
    console.log(ansis.cyan(line))
  }
  console.log()
}

function printMenuResources(): void {
  console.log(ansis.cyan('  参考资源'))
  for (const resource of MENU_RESOURCES) {
    console.log(`  ${ansis.green(resource.label.padEnd(16))} ${ansis.gray(resource.url)}`)
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
  console.log(ansis.cyan.bold('  下载 API 配置工具'))
  console.log()
  console.log('  YQ 不再内置 API 配置逻辑。')
  console.log(`  请手动下载 ${ansis.cyan('cc-switch')} 后完成 API 配置：`)
  console.log(`  ${ansis.gray(CC_SWITCH_RELEASES_URL)}`)
  console.log()

  try {
    if (process.platform === 'win32') {
      await runInteractiveCommand('start', [CC_SWITCH_RELEASES_URL])
    }
    else if (process.platform === 'darwin') {
      await runInteractiveCommand('open', [CC_SWITCH_RELEASES_URL])
    }
    else {
      await runInteractiveCommand('xdg-open', [CC_SWITCH_RELEASES_URL])
    }

    console.log(ansis.green('  已尝试打开下载页面'))
  }
  catch {
    console.log(ansis.yellow('  未能自动打开浏览器，请手动访问上面的链接'))
  }

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

async function checkManagedPackageUpdates(): Promise<void> {
  console.log()
  console.log(ansis.cyan.bold('  检查工具更新'))
  console.log(ansis.gray('  检查并更新 Claude Code、Codex、CCR 和 CCometixLine'))
  console.log()

  const packages = await Promise.all(
    MANAGED_PACKAGES.map(async item => {
      const [installedVersion, latestVersion] = await Promise.all([
        getGlobalPackageVersion(item.packageName),
        getLatestVersion(item.packageName),
      ])

      return {
        ...item,
        installedVersion,
        latestVersion,
      }
    }),
  )

  for (const item of packages) {
    const installedText = item.installedVersion
      ? ansis.yellow(`v${item.installedVersion}`)
      : ansis.gray('未安装')
    const latestText = item.latestVersion
      ? ansis.green(`v${item.latestVersion}`)
      : ansis.red('查询失败')
    console.log(`  ${ansis.cyan(item.label.padEnd(14))} 当前: ${installedText}  最新: ${latestText}`)
  }

  console.log()

  const updatable = packages.filter(item =>
    item.latestVersion
    && (!item.installedVersion || compareVersions(item.latestVersion, item.installedVersion) > 0),
  )

  if (updatable.length === 0) {
    console.log(ansis.green('  当前已是最新版本，或暂无可更新项目'))
    console.log()
    return
  }

  const { targets } = await inquirer.prompt([{
    type: 'checkbox',
    name: 'targets',
    message: '选择要安装 / 更新的工具',
    choices: updatable.map(item => ({
      name: `${item.label} (${item.installedVersion ? `v${item.installedVersion}` : '未安装'} -> v${item.latestVersion})`,
      value: item.packageName,
      checked: true,
    })),
  }])

  if (!targets.length) {
    console.log()
    console.log(ansis.gray('  已取消'))
    console.log()
    return
  }

  for (const packageName of targets as string[]) {
    const item = updatable.find(entry => entry.packageName === packageName)
    if (!item) continue

    console.log()
    console.log(ansis.cyan(`  正在更新 ${item.label}...`))
    console.log()
    await runInteractiveCommand('npm', ['install', '-g', `${item.packageName}@latest`])
    console.log(ansis.green(`  ${item.label} 更新完成`))
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

async function installCodex(): Promise<void> {
  const { confirmInstall } = await inquirer.prompt([{
    type: 'confirm',
    name: 'confirmInstall',
    message: '使用 npm 全局安装 / 更新 Codex？',
    default: true,
  }])

  if (!confirmInstall) {
    console.log()
    console.log(ansis.gray('  已取消'))
    console.log()
    return
  }

  console.log()
  console.log(ansis.cyan('  正在安装 Codex...'))
  console.log()
  await runInteractiveCommand('npm', ['install', '-g', '@openai/codex'])
  console.log()
  console.log(ansis.green('  Codex 安装成功'))
  console.log(ansis.gray('  运行 codex 命令启动'))
  console.log()
}

async function showHelp(): Promise<void> {
  const [installedCommands, installedSkills, installedBaseSkills, installedSuperpowers] = await Promise.all([
    listInstalledCommands(),
    listInstalledYqAgentSkills(),
    listInstalledBaseSkills(),
    listInstalledSuperpowersSkills(),
  ])

  console.log()
  console.log(ansis.cyan.bold('  已安装项概览'))
  console.log()

  console.log(ansis.cyan('  命令'))
  if (installedCommands.length === 0) {
    console.log(ansis.gray('    暂未发现已安装命令'))
  }
  else {
    const workflowMap = new Map(
      getWorkflowConfigs().flatMap(workflow =>
        workflow.commands.map(command => [command, workflow.description || ''] as const),
      ),
    )

    for (const command of installedCommands) {
      const description = workflowMap.get(command) || ''
      console.log(`  ${ansis.green(`/yq:${command}`.padEnd(24))} ${ansis.gray(description)}`)
    }
  }

  printInstalledSkillsSection('Skills', installedSkills, '暂未发现已安装 yq-skills')
  printInstalledSkillsSection('Base Skills', installedBaseSkills, '暂未发现已安装 yq-base skills')
  printInstalledSkillsSection('Superpowers', installedSuperpowers, '暂未发现已安装 superpowers')
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
    const [commandCount, skillCount] = await Promise.all([
      countInstalledCommands(),
      countInstalledSkills(),
    ])
    drawHeader(commandCount, skillCount)
    printMenuResources()

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
        { name: '4. 配置 API                 - 打开 cc-switch 下载页', value: 'api' },
        { name: '5. 配置输出风格             - 选择常用输出人格', value: 'style' },
        new inquirer.Separator('─────────────── 其他工具 ────────────────'),
        { name: 'T. 实用工具                 - ccusage, CCometixLine', value: 'tools' },
        { name: 'C. 安装 Claude Code         - 安装 / 更新 CLI', value: 'install-claude' },
        { name: 'D. 安装 Codex               - 安装 / 更新 CLI', value: 'install-codex' },
        new inquirer.Separator('────────────────── YQ ───────────────────'),
        { name: 'H. 帮助                     - 查看已安装命令和Skills', value: 'help' },
        { name: 'U. 检查更新                 - 检查并更新 Claude Code、Codex、CCR、CCometixLine', value: 'check-updates' },
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
      case 'install-codex':
        await installCodex()
        break
      case 'check-updates':
        await checkManagedPackageUpdates()
        break
      case 'help':
        await showHelp()
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
