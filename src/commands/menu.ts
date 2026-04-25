import ansis from 'ansis'
import inquirer from 'inquirer'
import fs from 'fs-extra'
import { spawn } from 'node:child_process'
import { homedir } from 'node:os'
import ora from 'ora'
import { join } from 'pathe'
import { version } from '../../package.json'
import { configMcp } from './config-mcp'
import { closeHelpWebServer, getActiveHelpWebState, launchHelpWebDetached } from './help-web'
import { init } from './init'
import { update } from './update'
import { buildDate } from '../generated/build-info'
import { i18n } from '../i18n'
import {
  collectSkills,
  detectBaseEnvironmentToolStatuses,
  getAgentSkillsDir,
  listAgentSkillDirectories,
  SCIENTIFIC_INTERNET_GUIDE_URL,
  uninstallWorkflows,
} from '../utils/installer'
import type { BaseEnvironmentInstallAction, BaseEnvironmentToolStatus } from '../utils/installer'
import { readCcgConfig, writeCcgConfig } from '../utils/config'
import { PACKAGE_ROOT } from '../utils/installer-template'
import { compareVersions, getGlobalPackageVersion, getLatestVersion } from '../utils/version'

type MenuAction =
  | 'init'
  | 'update'
  | 'popular-workflows'
  | 'skills'
  | 'mcp'
  | 'environment'
  | 'api'
  | 'tools'
  | 'coding-tools'
  | 'help'
  | 'uninstall'
  | 'exit'

type ManagedPackage = {
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

const CODING_TOOL_PACKAGES: ManagedPackage[] = [
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

const CLAUDE_CODE_TOOL_PACKAGES: ManagedPackage[] = [
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

const POPULAR_WORKFLOW_PACKAGES: ManagedPackage[] = [
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

type ManagedPackageStatus = ManagedPackage & {
  installedVersion: string | null
  latestVersion: string | null
}

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
const SKILLS_SH_URL = 'https://skills.sh/'
const MENU_SEPARATOR = '----------'

type InstallStatus = {
  isInstalled: boolean
  installedVersion: string | null
  currentVersion: string
  needsUpdate: boolean
}

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
  const [workflowSkills, yqSkills, baseSkills, superpowersSkills, externalAgentSkills] = await Promise.all([
    listInstalledWorkflowSkills(),
    listInstalledYqAgentSkills(),
    listInstalledBaseSkills(),
    listInstalledSuperpowersSkills(),
    listInstalledExternalAgentSkills(),
  ])

  return workflowSkills.length + yqSkills.length + baseSkills.length + superpowersSkills.length + externalAgentSkills.length
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
  const agentSkillsDir = join(getAgentSkillsDir(), installSubdir)
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

async function listInstalledWorkflowSkills(): Promise<InstalledSkill[]> {
  const workflowSkillsDir = join(homedir(), '.claude', 'skills', 'yq')
  if (!(await fs.pathExists(workflowSkillsDir))) {
    return []
  }

  return collectSkills(workflowSkillsDir)
    .map(skill => ({
      name: skill.name,
      path: skill.skillPath,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
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

async function listInstalledExternalAgentSkills(): Promise<InstalledSkill[]> {
  const agentSkillsDir = getAgentSkillsDir()
  if (!(await fs.pathExists(agentSkillsDir))) {
    return []
  }

  const rootGroups = new Set(['yq', 'yq-base', 'superpowers'])

  return collectSkills(agentSkillsDir)
    .filter(skill => {
      const normalizedPath = skill.relPath.replace(/\\/g, '/')
      const rootGroup = normalizedPath.split('/')[0]
      return !rootGroups.has(rootGroup)
    })
    .map(skill => ({
      name: skill.name,
      path: skill.skillPath,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
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

function printSkillsStorageNotice(): void {
  console.log(ansis.gray(`  技能存储在 ${getAgentSkillsDir()}，遵循 Agent Skills 开放标准。`))
  console.log(ansis.gray('  兼容的工具：Claude Code、Codex、Gemini CLI 等'))
  console.log()
}

function createHeaderLine(content = ''): string {
  return `║${content.padStart(Math.floor((HEADER_INNER_WIDTH + content.length) / 2)).padEnd(HEADER_INNER_WIDTH)}║`
}

function formatMenuChoice(label: string, description?: string): string {
  if (!description) {
    return label
  }

  const normalizedDescription = description.replace(/^\s*-\s*/u, '')
  return `${label}  ${ansis.gray(`-  ${normalizedDescription}`)}`
}

function shouldPauseAfterMainMenuAction(action: MenuAction): boolean {
  return !['mcp', 'skills', 'tools', 'coding-tools', 'environment', 'popular-workflows'].includes(action)
}

async function getInstallStatus(commandCount: number): Promise<InstallStatus> {
  const config = await readCcgConfig()
  const installedVersion = config?.general?.version || null
  const isInstalled = Boolean(installedVersion) && commandCount > 0
  const needsUpdate = installedVersion !== null && compareVersions(version, installedVersion) !== 0

  return {
    isInstalled,
    installedVersion,
    currentVersion: version,
    needsUpdate,
  }
}

function printInstallStatus(status: InstallStatus): void {
  //console.log(ansis.cyan('  工作流状态'))

  const installedVersion = status.installedVersion

  if (!status.isInstalled || !installedVersion) {
    console.log(ansis.gray('  未检测到已安装工作流，可先执行初始化 / 重装工作流'))
    console.log()
    return
  }

  console.log(`  已安装版本: ${ansis.yellow(`v${installedVersion}`)}`)

  if (!status.needsUpdate) {
    console.log(ansis.green(`  当前启动版本与已安装版本一致: v${status.currentVersion}`))
    console.log()
    return
  }

  const isCurrentNewer = compareVersions(status.currentVersion, installedVersion) > 0
  const reminder = isCurrentNewer
    ? `检测到已安装版本较旧，当前启动版本为 v${status.currentVersion}，建议执行 ${ansis.cyan('yq update')}`
    : `检测到当前启动版本较旧，已安装版本为 v${installedVersion}，建议更新 CLI 或使用较新的 yq-workflow 版本`

  console.log(ansis.yellow(`  更新提醒: ${reminder}`))
  console.log()
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
    createHeaderLine('AI Coding Toolkit'),
    createHeaderLine('Workflow + Tools + MCP'),
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

function resolveInteractiveCommand(command: string, args: string[]): { command: string, args: string[] } {
  if (process.platform !== 'win32') {
    return { command, args }
  }

  if (command === 'start') {
    return {
      command: 'cmd',
      args: ['/c', 'start', '', ...args],
    }
  }

  if (['npm', 'npx', 'pnpm', 'corepack'].includes(command)) {
    return {
      command: 'cmd',
      args: ['/c', command, ...args],
    }
  }

  return { command, args }
}

function runInteractiveCommand(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const resolved = resolveInteractiveCommand(command, args)
    const child = spawn(resolved.command, resolved.args, {
      cwd: process.cwd(),
      stdio: 'inherit',
      env: process.env,
    })

    child.on('exit', code => {
      if (code === 0) resolve()
      else reject(new Error(`${resolved.command} exited with code ${code ?? 'unknown'}`))
    })
    child.on('error', reject)
  })
}

async function configApi(): Promise<void> {
  console.log()
  console.log(ansis.cyan.bold('  下载模型 API 配置工具'))
  console.log()
  console.log('  YQ 不再内置模型 API 配置逻辑。')
  console.log(`  请手动下载 ${ansis.cyan('cc-switch')} 后完成模型 API 配置：`)
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

async function openExternalUrl(url: string): Promise<boolean> {
  try {
    if (process.platform === 'win32') {
      await runInteractiveCommand('start', [url])
    }
    else if (process.platform === 'darwin') {
      await runInteractiveCommand('open', [url])
    }
    else {
      await runInteractiveCommand('xdg-open', [url])
    }

    return true
  }
  catch {
    return false
  }
}

async function showAgentSkillsDirectories(): Promise<void> {
  const rootDir = getAgentSkillsDir()
  const directories = await listAgentSkillDirectories(rootDir)

  console.log()
  console.log(ansis.cyan.bold('  本地 Skills 目录'))
  printSkillsStorageNotice()

  if (directories.length === 0) {
    console.log(ansis.gray('  暂未发现 Skills 目录'))
    console.log(ansis.gray(`  ${rootDir}`))
    console.log()
    return
  }

  console.log(ansis.cyan(`  共发现 ${directories.length} 个目录`))
  for (const item of directories) {
    console.log(`  ${ansis.green(item.relativePath.padEnd(32))} ${ansis.gray(item.path)}`)
  }
  console.log()
}

async function listGlobalSkillsWithCli(): Promise<void> {
  console.log()
  console.log(ansis.cyan.bold('  全局已安装 Skills'))
  printSkillsStorageNotice()
  console.log(ansis.gray(`  来源：${SKILLS_SH_URL}`))
  console.log()
  await runInteractiveCommand('npx', ['skills', 'list', '-g'])
  console.log()
}

async function installSkillPackage(source: string): Promise<void> {
  const normalizedSource = source.trim()
  if (!normalizedSource) {
    console.log()
    console.log(ansis.gray('  已取消'))
    console.log()
    return
  }

  console.log()
  console.log(ansis.cyan(`  正在安装 Skills: ${normalizedSource}`))
  console.log(ansis.gray('  将调用 npx skills add，并安装到全局 Skills 目录'))
  console.log()
  await runInteractiveCommand('npx', ['skills', 'add', normalizedSource, '-g'])
  console.log()
}

async function searchAndInstallSkills(): Promise<void> {
  const { query } = await inquirer.prompt([{
    type: 'input',
    name: 'query',
    message: '输入要检索的关键词',
  }])

  if (!query?.trim()) {
    console.log()
    console.log(ansis.gray('  已取消'))
    console.log()
    return
  }

  console.log()
  console.log(ansis.cyan(`  正在检索 Skills.sh: ${query.trim()}`))
  console.log(ansis.gray('  检索结果会由 skills 官方 CLI 直接输出'))
  console.log()
  await runInteractiveCommand('npx', ['skills', 'find', query.trim()])
  console.log()

  const { source } = await inquirer.prompt([{
    type: 'input',
    name: 'source',
    message: '输入 owner/repo 或 owner/repo@skill 继续安装，留空返回',
  }])

  if (!source?.trim()) {
    console.log()
    console.log(ansis.gray('  已返回'))
    console.log()
    return
  }

  await installSkillPackage(source)
}

async function updateGlobalSkills(): Promise<void> {
  const { confirmUpdate } = await inquirer.prompt([{
    type: 'confirm',
    name: 'confirmUpdate',
    message: '更新全局 Skills？',
    default: true,
  }])

  if (!confirmUpdate) {
    console.log()
    console.log(ansis.gray('  已取消'))
    console.log()
    return
  }

  console.log()
  console.log(ansis.cyan('  正在更新全局 Skills...'))
  console.log()
  await runInteractiveCommand('npx', ['skills', 'update', '-g', '-y'])
  console.log()
}

async function getManagedPackageStatuses(packages: ManagedPackage[]): Promise<ManagedPackageStatus[]> {
  return Promise.all(
    packages.map(async item => {
      if (item.installType === 'external-link' || !item.packageName) {
        return {
          ...item,
          installedVersion: null,
          latestVersion: item.statusHint || null,
        }
      }

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
}

async function detectManagedPackageStatuses(
  packages: ManagedPackage[],
  title: string,
): Promise<ManagedPackageStatus[]> {
  const spinner = ora(`正在检测${title}版本...`).start()

  try {
    const statuses = await getManagedPackageStatuses(packages)
    spinner.succeed(`${title}版本检测完成`)
    return statuses
  }
  catch (error) {
    spinner.fail(`${title}版本检测失败`)
    throw error
  }
}

function printManagedPackageStatusLines(
  packages: ManagedPackageStatus[],
  options: {
    title: string
    subtitle: string
  },
): void {
  console.log()
  console.log(ansis.cyan.bold(`  ${options.title}`))
  console.log(ansis.gray(`  ${options.subtitle}`))
  console.log()

  for (const item of packages) {
    if (item.openDirectly) {
      continue
    }

    if (item.installType === 'external-link') {
      const statusText = item.latestVersion
        ? ansis.green(item.latestVersion)
        : ansis.gray('打开下载页')
      console.log(`  ${ansis.cyan(item.label.padEnd(14))} ${statusText}`)
      if (item.description) {
        console.log(ansis.gray(`  ${' '.repeat(16)}${item.description}`))
      }
      if (item.tutorialUrl) {
        console.log(ansis.gray(`  ${' '.repeat(16)}教程：${item.tutorialUrl}`))
      }
      continue
    }

    const installedText = item.installedVersion
      ? ansis.yellow(`v${item.installedVersion}`)
      : ansis.gray('未安装')
    const latestText = item.latestVersion
      ? ansis.green(`v${item.latestVersion}`)
      : ansis.red('查询失败')
    console.log(`  ${ansis.cyan(item.label.padEnd(14))} 当前: ${installedText}  最新: ${latestText}`)
    if (item.description) {
      console.log(ansis.gray(`  ${' '.repeat(16)}${item.description}`))
    }
    if (item.tutorialUrl) {
      console.log(ansis.gray(`  ${' '.repeat(16)}教程：${item.tutorialUrl}`))
    }
  }

  console.log()
}

function formatManagedPackageChoice(item: ManagedPackageStatus): string {
  if (item.installType === 'external-link') {
    if (item.openDirectly) {
      return `${item.label}  ${ansis.gray(`- ${item.description || '打开项目主页'}`)}`
    }

    const description = item.description ? `；${item.description}` : ''
    return `${item.label}  ${ansis.gray(`- ${item.latestVersion || '桌面客户端下载'}${description}`)}`
  }

  const currentText = item.installedVersion ? `当前 v${item.installedVersion}` : '未安装'
  const latestText = item.latestVersion ? `最新 v${item.latestVersion}` : '最新查询失败'
  const description = item.description ? `；${item.description}` : ''
  return `${item.label}  ${ansis.gray(`- ${currentText} / ${latestText}${description}`)}`
}

function getPackageActionLabel(item: ManagedPackageStatus): string {
  if (item.installType === 'external-link') {
    return item.externalActionText || '打开下载页'
  }

  if (!item.installedVersion) {
    return '安装最新版本'
  }

  if (!item.latestVersion) {
    return '重新安装'
  }

  return compareVersions(item.latestVersion, item.installedVersion) > 0
    ? '更新到最新版本'
    : '重新安装当前最新版本'
}

async function installOrUpdateManagedPackage(item: ManagedPackageStatus): Promise<void> {
  if (item.installType === 'external-link') {
    const url = item.externalUrl
    if (!url) {
      console.log()
      console.log(ansis.red(`  ${item.label} 未配置下载地址`))
      console.log()
      return
    }

    const actionText = item.externalActionText || '打开下载页'
    const { confirmOpen } = await inquirer.prompt([{
      type: 'confirm',
      name: 'confirmOpen',
      message: `${actionText}：${item.label}？`,
      default: true,
    }])

    if (!confirmOpen) {
      console.log()
      console.log(ansis.gray('  已取消'))
      console.log()
      return
    }

    console.log()
    const opened = await openExternalUrl(url)
    if (opened) {
      console.log(ansis.green(`  已尝试打开 ${item.label} 下载页`))
    }
    else {
      console.log(ansis.yellow(`  未能自动打开浏览器，请手动访问 ${url}`))
    }
    console.log()
    return
  }

  const actionLabel = getPackageActionLabel(item)
  const currentText = item.installedVersion ? `v${item.installedVersion}` : '未安装'
  const latestText = item.latestVersion ? `v${item.latestVersion}` : '未知'

  const { confirmInstall } = await inquirer.prompt([{
    type: 'confirm',
    name: 'confirmInstall',
    message: `${actionLabel} ${item.label}？（当前 ${currentText}，最新 ${latestText}）`,
    default: true,
  }])

  if (!confirmInstall) {
    console.log()
    console.log(ansis.gray('  已取消'))
    console.log()
    return
  }

  console.log()
  console.log(ansis.cyan(`  正在处理 ${item.label}...`))
  console.log()
  await runInteractiveCommand('npm', ['install', '-g', `${item.packageName}@latest`])
  console.log(ansis.green(`  ${item.label} 已安装 / 更新完成`))
  console.log()
}

async function uninstallManagedPackage(item: ManagedPackageStatus): Promise<void> {
  if (item.installType === 'external-link') {
    console.log()
    console.log(ansis.gray(`  ${item.label} 为外部桌面客户端，请在系统应用管理中卸载`))
    console.log()
    return
  }

  if (!item.installedVersion) {
    console.log()
    console.log(ansis.gray(`  ${item.label} 当前未安装`))
    console.log()
    return
  }

  const { confirmUninstall } = await inquirer.prompt([{
    type: 'confirm',
    name: 'confirmUninstall',
    message: `卸载 ${item.label}？（当前 v${item.installedVersion}）`,
    default: false,
  }])

  if (!confirmUninstall) {
    console.log()
    console.log(ansis.gray('  已取消'))
    console.log()
    return
  }

  console.log()
  console.log(ansis.cyan(`  正在卸载 ${item.label}...`))
  console.log()
  if (!item.packageName) {
    throw new Error(`${item.label} 缺少 npm 包名配置`)
  }
  await runInteractiveCommand('npm', ['uninstall', '-g', item.packageName])
  console.log(ansis.green(`  ${item.label} 已卸载`))
  console.log()
}

async function runManagedPackage(item: ManagedPackageStatus): Promise<void> {
  if (!item.runCommand) {
    return
  }

  console.log()
  console.log(ansis.cyan(`  正在运行 ${item.label}...`))
  console.log()
  await runInteractiveCommand(item.runCommand.command, item.runCommand.args)
  if (item.runCommand.successText) {
    console.log(ansis.green(item.runCommand.successText))
  }
  console.log()
}

async function openManagedPackageTutorial(item: ManagedPackageStatus): Promise<void> {
  const url = item.tutorialUrl
  if (!url) {
    console.log()
    console.log(ansis.gray(`  ${item.label} 暂未配置教程地址`))
    console.log()
    return
  }

  const actionText = item.tutorialActionText || '打开教程'
  const { confirmOpen } = await inquirer.prompt([{
    type: 'confirm',
    name: 'confirmOpen',
    message: `${actionText}：${item.label}？`,
    default: true,
  }])

  if (!confirmOpen) {
    console.log()
    console.log(ansis.gray('  已取消'))
    console.log()
    return
  }

  console.log()
  const opened = await openExternalUrl(url)
  if (opened) {
    console.log(ansis.green(`  已尝试打开 ${item.label} 教程`))
  }
  else {
    console.log(ansis.yellow(`  未能自动打开浏览器，请手动访问 ${url}`))
  }
  console.log()
}

async function manageSinglePackage(item: ManagedPackageStatus): Promise<void> {
  const installLabel = getPackageActionLabel(item)
  const choices = [
    { name: installLabel, value: 'install' },
    ...(item.installedVersion && item.installType !== 'external-link' ? [{ name: '卸载', value: 'uninstall' }] : []),
    ...(item.runCommand ? [{ name: item.installedVersion ? '运行' : '运行（npx）', value: 'run' }] : []),
    ...(item.tutorialUrl && item.tutorialUrl !== item.externalUrl ? [{ name: '打开教程', value: 'tutorial' }] : []),
    { name: '返回', value: 'back' },
  ]

  const { action } = await inquirer.prompt([{
    type: 'list',
    name: 'action',
    message: `选择 ${item.label} 的操作`,
    choices,
    theme: {
      indexMode: 'number',
    },
  }])

  if (action === 'install') {
    await installOrUpdateManagedPackage(item)
  }
  else if (action === 'uninstall') {
    await uninstallManagedPackage(item)
  }
  else if (action === 'run') {
    await runManagedPackage(item)
  }
  else if (action === 'tutorial') {
    await openManagedPackageTutorial(item)
  }
}

async function runManagedPackageMenu(
  packages: ManagedPackage[],
  options: {
    title: string
    subtitle: string
    selectMessage: string
    continueMessage: string
  },
): Promise<void> {
  while (true) {
    const statuses = await detectManagedPackageStatuses(packages, options.title)

    printManagedPackageStatusLines(statuses, {
      title: options.title,
      subtitle: options.subtitle,
    })

    const { target } = await inquirer.prompt([{
      type: 'list',
      name: 'target',
      message: options.selectMessage,
      choices: [
        ...statuses.map(item => ({
          name: formatManagedPackageChoice(item),
          value: item.id,
        })),
        { name: '重新检测版本', value: 'refresh' },
        { name: '返回', value: 'back' },
      ],
      pageSize: 10,
      theme: {
        indexMode: 'number',
      },
    }])

    if (target === 'back') return
    if (target === 'refresh') continue

    const selected = statuses.find(item => item.id === target)
    if (!selected) continue

    if (selected.openDirectly) {
      console.log()
      if (selected.externalUrl && await openExternalUrl(selected.externalUrl)) {
        console.log(ansis.green(`  已尝试打开 ${selected.label} 项目页`))
      }
      else if (selected.externalUrl) {
        console.log(ansis.yellow(`  未能自动打开浏览器，请手动访问 ${selected.externalUrl}`))
      }
      else {
        console.log(ansis.red(`  ${selected.label} 未配置项目地址`))
      }
      console.log()

      await inquirer.prompt([{
        type: 'input',
        name: 'continue',
        message: ansis.gray(options.continueMessage),
      }])
      continue
    }

    await manageSinglePackage(selected)

    await inquirer.prompt([{
      type: 'input',
      name: 'continue',
      message: ansis.gray(options.continueMessage),
    }])
  }
}

export async function configSkills(): Promise<void> {
  while (true) {
    const activeHelpWeb = await getActiveHelpWebState()
    console.log()
    console.log(ansis.cyan.bold('  配置 Skills'))
    printSkillsStorageNotice()
    console.log(ansis.gray(`  已集成 Skills 官方目录与 CLI：${SKILLS_SH_URL}`))
    if (activeHelpWeb) {
      console.log(ansis.green(`  本地网页版 Skills 运行中：${activeHelpWeb.url}`))
    }
    console.log()

    const { action } = await inquirer.prompt([{
      type: 'list',
      name: 'action',
      message: '选择 Skills 操作',
      pageSize: 12,
      choices: [
        { name: '1. 本地网页版 Skills', value: 'web' },
        { name: '2. 关闭本地网页版 Skills', value: 'web-close' },
        { name: '3. 查看本地 Skills 目录', value: 'dirs' },
        { name: '4. 查看全局已安装 Skills', value: 'list' },
        { name: '5. 检索并安装 Skills.sh 技能', value: 'search' },
        { name: '6. 安装指定 Skills 包 / 单个 Skill', value: 'install' },
        { name: '7. 更新全局 Skills', value: 'update' },
        { name: '8. 打开 skills.sh', value: 'open' },
        { name: 'B. 返回', value: 'back' },
      ],
    }])

    if (action === 'back') return

    if (action === 'web') {
      const result = await launchHelpWebDetached('agents')
      console.log()
      if (result.status === 'reused') {
        console.log(ansis.green(`  已复用已打开的本地网页版 Skills：${result.url}`))
      }
      else {
        console.log(ansis.green('  已尝试打开本地网页版 Skills，默认目录为 .agents/skills'))
      }
      console.log(ansis.gray('  如未自动打开，请执行 yq config skills-web'))
      console.log()
    }
    else if (action === 'web-close') {
      const closed = await closeHelpWebServer()
      console.log()
      if (closed) {
        console.log(ansis.green('  已关闭本地网页版 Skills'))
      }
      else {
        console.log(ansis.gray('  当前没有运行中的本地网页版 Skills'))
      }
      console.log()
    }
    else if (action === 'dirs') {
      await showAgentSkillsDirectories()
    }
    else if (action === 'list') {
      await listGlobalSkillsWithCli()
    }
    else if (action === 'search') {
      await searchAndInstallSkills()
    }
    else if (action === 'install') {
      const { source } = await inquirer.prompt([{
        type: 'input',
        name: 'source',
        message: '输入 owner/repo 或 owner/repo@skill',
      }])

      await installSkillPackage(source || '')
    }
    else if (action === 'update') {
      await updateGlobalSkills()
    }
    else {
      const opened = await openExternalUrl(SKILLS_SH_URL)
      console.log()
      if (opened) {
        console.log(ansis.green('  已尝试打开 skills.sh'))
      }
      else {
        console.log(ansis.yellow(`  未能自动打开浏览器，请手动访问 ${SKILLS_SH_URL}`))
      }
      console.log()
    }

    await inquirer.prompt([{
      type: 'input',
      name: 'continue',
      message: ansis.gray('按 Enter 返回 Skills 菜单...'),
    }])
  }
}

async function runCodingToolsMenu(): Promise<void> {
  await runManagedPackageMenu(CODING_TOOL_PACKAGES, {
    title: '安装编程工具',
    subtitle: '统一管理 Claude Code、Codex、Gemini CLI、OpenCode 与 MossX 客户端',
    selectMessage: '选择要管理的编程工具',
    continueMessage: '按 Enter 返回编程工具菜单...',
  })
}

async function runClaudeCodeToolsMenu(): Promise<void> {
  await runManagedPackageMenu(CLAUDE_CODE_TOOL_PACKAGES, {
    title: 'Claude Code 工具',
    subtitle: '统一管理 Claude Code、ccusage、CCR 与 CCometixLine',
    selectMessage: '选择要管理的 Claude Code 工具',
    continueMessage: '按 Enter 返回 Claude Code 工具菜单...',
  })
}

async function runPopularWorkflowsMenu(): Promise<void> {
  await runManagedPackageMenu(POPULAR_WORKFLOW_PACKAGES, {
    title: '热门开源工作流',
    subtitle: '查看热门开源工作流的安装状态、版本、描述与教程入口',
    selectMessage: '选择要管理的热门开源工作流',
    continueMessage: '按 Enter 返回热门开源工作流菜单...',
  })
}

async function detectBaseEnvironmentStatuses(): Promise<BaseEnvironmentToolStatus[]> {
  const spinner = ora('正在检测基础环境版本...').start()

  try {
    const statuses = await detectBaseEnvironmentToolStatuses()
    spinner.succeed('基础环境检测完成')
    return statuses
  }
  catch (error) {
    spinner.fail('基础环境检测失败')
    throw error
  }
}

function padTableCell(value: string, width: number): string {
  if (value.length <= width) {
    return value.padEnd(width)
  }

  return `${value.slice(0, Math.max(0, width - 1))}…`
}

function printBaseEnvironmentStatusLines(statuses: BaseEnvironmentToolStatus[]): void {
  const columns = {
    label: 14,
    status: 8,
    version: 14,
    detail: 40,
  }
  const separator = `  +-${'-'.repeat(columns.label)}-+-${'-'.repeat(columns.status)}-+-${'-'.repeat(columns.version)}-+-${'-'.repeat(columns.detail)}-+`
  const header = `  | ${padTableCell('工具', columns.label)} | ${padTableCell('状态', columns.status)} | ${padTableCell('版本', columns.version)} | ${padTableCell('说明', columns.detail)} |`

  console.log()
  console.log(ansis.cyan.bold('  基础环境检测'))
  console.log(ansis.gray('  检测 Git、PowerShell、Node.js、Python、pnpm、uv、VS Code，并提供安装入口'))
  console.log(ansis.gray('  菜单额外提供“科学上网”快捷入口，可直接打开相关文章'))
  console.log()
  console.log(ansis.gray(separator))
  console.log(ansis.cyan(header))
  console.log(ansis.gray(separator))

  for (const item of statuses) {
    const row = `  | ${padTableCell(item.label, columns.label)} | ${padTableCell(item.installed ? '已安装' : '缺失', columns.status)} | ${padTableCell(item.version ? `v${item.version}` : '-', columns.version)} | ${padTableCell(item.detail, columns.detail)} |`
    console.log(row)
  }

  console.log(ansis.gray(separator))
  console.log()
}

function formatBaseEnvironmentChoice(item: BaseEnvironmentToolStatus): string {
  const statusText = item.version ? `当前 v${item.version}` : '未检测到'
  return `${item.label}  ${ansis.gray(`- ${statusText}；${item.detail}`)}`
}

async function executeBaseEnvironmentInstallAction(
  tool: BaseEnvironmentToolStatus,
  action: BaseEnvironmentInstallAction,
): Promise<void> {
  if (action.type === 'link') {
    const opened = action.url ? await openExternalUrl(action.url) : false
    console.log()
    if (opened) {
      console.log(ansis.green(`  已尝试打开 ${tool.label} 安装页面`))
    }
    else {
      console.log(ansis.yellow(`  未能自动打开浏览器，请手动访问 ${action.url}`))
    }
    console.log()
    return
  }

  const command = action.command
  const args = action.args || []
  if (!command) {
    console.log()
    console.log(ansis.red(`  ${tool.label} 缺少可执行安装命令`))
    console.log()
    return
  }

  const { confirmed } = await inquirer.prompt([{
    type: 'confirm',
    name: 'confirmed',
    message: `${action.label}：${tool.label}？`,
    default: true,
  }])

  if (!confirmed) {
    console.log()
    console.log(ansis.gray('  已取消'))
    console.log()
    return
  }

  console.log()
  console.log(ansis.cyan(`  正在处理 ${tool.label}...`))
  console.log()
  await runInteractiveCommand(command, args)
  console.log(ansis.green(`  ${action.successText || `${tool.label} 操作已执行完成`}`))
  console.log()
}

async function manageBaseEnvironmentTool(tool: BaseEnvironmentToolStatus): Promise<boolean> {
  const choices = [
    ...tool.installActions.map(action => ({
      name: action.label,
      value: action.id,
    })),
    { name: '返回', value: 'back' },
  ]

  console.log()
  console.log(ansis.cyan.bold(`  ${tool.label}`))
  console.log(ansis.gray(`  ${tool.detail}`))
  console.log(ansis.gray(`  ${tool.description}`))
  console.log()

  if (tool.installActions.length === 0) {
    console.log(ansis.gray('  当前平台暂未提供自动安装入口'))
    console.log()
    return true
  }

  const { actionId } = await inquirer.prompt([{
    type: 'list',
    name: 'actionId',
    message: `选择 ${tool.label} 的操作`,
    choices,
    theme: {
      indexMode: 'number',
    },
  }])

  if (actionId === 'back') {
    return false
  }

  const selectedAction = tool.installActions.find(item => item.id === actionId)
  if (!selectedAction) {
    return false
  }

  await executeBaseEnvironmentInstallAction(tool, selectedAction)
  return true
}

async function runBaseEnvironmentMenu(): Promise<void> {
  while (true) {
    const statuses = await detectBaseEnvironmentStatuses()
    printBaseEnvironmentStatusLines(statuses)
    const { target } = await inquirer.prompt([{
      type: 'list',
      name: 'target',
      message: '选择要查看或安装的基础环境',
      choices: [
        ...statuses.map(item => ({
          name: formatBaseEnvironmentChoice(item),
          value: item.id,
        })),
        { name: '打开网站：科学上网推荐列表', value: 'scientific-internet' },
        { name: '重新检测版本', value: 'refresh' },
        { name: '返回', value: 'back' },
      ],
      pageSize: 10,
      theme: {
        indexMode: 'number',
      },
    }])

    if (target === 'back') {
      return
    }

    if (target === 'refresh') {
      continue
    }

    if (target === 'scientific-internet') {
      const opened = await openExternalUrl(SCIENTIFIC_INTERNET_GUIDE_URL)
      console.log()
      if (opened) {
        console.log(ansis.green('  已尝试打开科学上网推荐列表'))
      }
      else {
        console.log(ansis.yellow(`  未能自动打开浏览器，请手动访问 ${SCIENTIFIC_INTERNET_GUIDE_URL}`))
      }
      console.log()
      continue
    }

    const selected = statuses.find(item => item.id === target)
    if (!selected) {
      continue
    }

    const shouldPause = await manageBaseEnvironmentTool(selected)

    if (shouldPause) {
      await inquirer.prompt([{
        type: 'input',
        name: 'continue',
        message: ansis.gray('按 Enter 返回基础环境检测菜单...'),
      }])
    }
  }
}

export async function showHelp(): Promise<void> {
  console.log()
  console.log(ansis.cyan.bold('  常用命令'))
  console.log()
  console.log(`  ${ansis.green('npx yq-workflow'.padEnd(28))} ${ansis.gray('打开主菜单')}`)
  console.log(`  ${ansis.green('npx yq-workflow menu'.padEnd(28))} ${ansis.gray('打开主菜单')}`)
  console.log(`  ${ansis.green('npx yq-workflow init'.padEnd(28))} ${ansis.gray('初始化 / 重装工作流')}`)
  console.log(`  ${ansis.green('npx yq-workflow update'.padEnd(28))} ${ansis.gray('更新工作流')}`)
  console.log(`  ${ansis.green('npx yq-workflow help'.padEnd(28))} ${ansis.gray('查看常用命令说明')}`)
  console.log(`  ${ansis.green('npx yq-workflow config skills'.padEnd(28))} ${ansis.gray('打开 Skills 配置菜单')}`)
  console.log(`  ${ansis.green('npx yq-workflow config skills-web'.padEnd(28))} ${ansis.gray('直接打开本地网页版 Skills')}`)
  console.log(`  ${ansis.green('npx yq-workflow config mcp'.padEnd(28))} ${ansis.gray('配置 MCP')}`)
  console.log(`  ${ansis.green('npx yq-workflow config api'.padEnd(28))} ${ansis.gray('打开 cc-switch 下载页')}`)
  console.log(`  ${ansis.green('npx yq-workflow diagnose-mcp'.padEnd(28))} ${ansis.gray('诊断 MCP 配置')}`)
  console.log(`  ${ansis.green('npx yq-workflow fix-mcp'.padEnd(28))} ${ansis.gray('修复 MCP 配置')}`)
  console.log()
  console.log(ansis.cyan('  提示'))
  console.log(ansis.gray('  Skills 的网页浏览、目录查看、安装与更新，请进入“配置 Skills”。'))
  console.log()
}

async function uninstall(): Promise<boolean> {
  const { confirm } = await inquirer.prompt([{
    type: 'confirm',
    name: 'confirm',
    message: '确定卸载和删除配置？',
    default: false,
  }])

  if (!confirm) {
    console.log()
    console.log(ansis.gray(i18n.t('common:cancelled')))
    console.log()
    return false
  }

  const installDir = join(homedir(), '.claude')
  const result = await uninstallWorkflows(installDir)
  const configPath = getConfigFilePath()
  if (await fs.pathExists(configPath)) {
    await fs.remove(configPath)
  }

  console.log()
  console.log(ansis.green('  YQ 工作流与配置已移除'))
  console.log(ansis.gray(`  移除命令数: ${result.removedCommands.length}`))
  console.log(ansis.gray(`  移除技能数: ${result.removedSkills.length}`))
  console.log(ansis.gray(`  删除 yq-workflow: ${result.removedGlobalPackage ? '已执行' : '未执行成功'}`))
  if (result.errors.length > 0) {
    console.log(ansis.yellow('  卸载告警:'))
    for (const error of result.errors) {
      console.log(`    ${ansis.yellow('•')} ${error}`)
    }
  }
  console.log()
  return true
}

export async function showMainMenu(): Promise<void> {
  while (true) {
    const [commandCount, skillCount] = await Promise.all([
      countInstalledCommands(),
      countInstalledSkills(),
    ])
    const installStatus = await getInstallStatus(commandCount)
    drawHeader(commandCount, skillCount)
    printInstallStatus(installStatus)
    printMenuResources()

    const { action } = await inquirer.prompt([{
      type: 'list',
      name: 'action',
      message: 'YQ 主菜单',
      pageSize: 16,
      choices: [
        new inquirer.Separator(`${MENU_SEPARATOR} 核心工作流 ${MENU_SEPARATOR}`),
        { name: formatMenuChoice('1. 初始化 / 重装工作流', '- 安装 YQ 工作流'), value: 'init' },
        { name: formatMenuChoice('2. 更新工作流', '- 更新到最新版本'), value: 'update' },
        { name: formatMenuChoice('3. 热门开源工作流', '- GET SHIT DONE / gstack / Trellis'), value: 'popular-workflows' },
        { name: formatMenuChoice('4. 配置 Skills', '- Skills.sh + 本地 Skills 目录'), value: 'skills' },
        { name: formatMenuChoice('5. 配置 MCP', '- 必装 / 数据库 / Git / 文件资源'), value: 'mcp' },
        new inquirer.Separator(`${MENU_SEPARATOR} 编程工具 ${MENU_SEPARATOR}`),
        { name: formatMenuChoice('T. Claude Code 工具', '- Claude Code, ccusage, CCR, CCometixLine'), value: 'tools' },
        { name: formatMenuChoice('E. 基础环境检测', '- Git, PowerShell, Node.js, Python, pnpm, uv, VS Code'), value: 'environment' },
        { name: formatMenuChoice('C. 安装编程工具', '- Claude Code, Codex, Gemini, OpenCode, MossX'), value: 'coding-tools' },
        { name: formatMenuChoice('A. 配置模型 API', '- 打开 cc-switch 下载页'), value: 'api' },
        new inquirer.Separator(`${MENU_SEPARATOR} YQ ${MENU_SEPARATOR}`),
        { name: formatMenuChoice('H. 帮助', '- 查看已安装命令、Skills 与工具'), value: 'help' },
        { name: formatMenuChoice('-. 卸载和删除配置', '- 移除工作流文件并删除 yq-workflow'), value: 'uninstall' },
        new inquirer.Separator('-'.repeat(41)),
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
      case 'popular-workflows':
        await runPopularWorkflowsMenu()
        break
      case 'mcp':
        await configMcp()
        break
      case 'skills':
        await configSkills()
        break
      case 'api':
        await configApi()
        break
      case 'tools':
        await runClaudeCodeToolsMenu()
        break
      case 'environment':
        await runBaseEnvironmentMenu()
        break
      case 'coding-tools':
        await runCodingToolsMenu()
        break
      case 'help':
        await showHelp()
        break
      case 'uninstall':
        if (await uninstall()) {
          console.log(ansis.gray(`  ${i18n.t('common:goodbye')}`))
          console.log()
          return
        }
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

    if (shouldPauseAfterMainMenuAction(action as MenuAction)) {
      await inquirer.prompt([{
        type: 'input',
        name: 'continue',
        message: ansis.gray(i18n.t('common:pressEnterToReturn')),
      }])
    }
  }
}
