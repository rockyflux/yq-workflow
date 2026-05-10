import ansis from 'ansis'
import fs from 'fs-extra'
import { homedir } from 'node:os'
import { join } from 'pathe'
import { version } from '../../package.json'
import { buildDate } from '../generated/build-info'
import { collectSkills, getAgentSkillsDir } from '../utils/installer'
import { readCcgConfig } from '../utils/config'
import { PACKAGE_ROOT } from '../utils/installer-template'
import { detectRuntimeSource } from '../utils/runtime-source'
import { compareVersions } from '../utils/version'

const MENU_ANNOUNCEMENT_URL = 'https://plainraw.com/raw/7e7659f4e301'
const MENU_ANNOUNCEMENT_TIMEOUT_MS = 1500

type InstallStatus = {
  isInstalled: boolean
  installedVersion: string | null
  currentVersion: string
  hasVersionMismatch: boolean
  isWorkflowOutdated: boolean
  isCliOutdated: boolean
}

type InstalledSkill = {
  name: string
  path: string
}

async function countInstalledCommands(): Promise<number> {
  const commandsDir = join(homedir(), '.claude', 'commands', 'yq')
  if (!(await fs.pathExists(commandsDir))) return 0
  const files = await fs.readdir(commandsDir)
  return files.filter(file => file.endsWith('.md')).length
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

async function listInstalledExternalAgentSkills(): Promise<InstalledSkill[]> {
  const agentSkillsDir = getAgentSkillsDir()
  if (!(await fs.pathExists(agentSkillsDir))) {
    return []
  }

  const rootGroups = new Set(['yq', 'yq-base', 'superpowers'])

  return collectSkills(agentSkillsDir)
    .filter((skill) => {
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

async function countInstalledSkills(): Promise<number> {
  const [workflowSkills, yqSkills, baseSkills, superpowersSkills, externalAgentSkills] = await Promise.all([
    listInstalledWorkflowSkills(),
    listInstalledSkillsFromTemplate('yq-skills', 'yq'),
    listInstalledSkillsFromTemplate('base-skills', 'yq-base'),
    listInstalledSkillsFromTemplate('superpowers', 'superpowers'),
    listInstalledExternalAgentSkills(),
  ])

  return workflowSkills.length + yqSkills.length + baseSkills.length + superpowersSkills.length + externalAgentSkills.length
}

export function getVersionStatus(currentVersion: string, installedVersion: string | null): Pick<InstallStatus, 'hasVersionMismatch' | 'isWorkflowOutdated' | 'isCliOutdated'> {
  if (!installedVersion) {
    return {
      hasVersionMismatch: false,
      isWorkflowOutdated: false,
      isCliOutdated: false,
    }
  }

  const comparison = compareVersions(currentVersion, installedVersion)

  return {
    hasVersionMismatch: comparison !== 0,
    isWorkflowOutdated: comparison > 0,
    isCliOutdated: comparison < 0,
  }
}

async function getInstallStatus(commandCount: number): Promise<InstallStatus> {
  const config = await readCcgConfig()
  const installedVersion = config?.general?.version || null
  const isInstalled = Boolean(installedVersion) && commandCount > 0
  const {
    hasVersionMismatch,
    isWorkflowOutdated,
    isCliOutdated,
  } = getVersionStatus(version, installedVersion)

  return {
    isInstalled,
    installedVersion,
    currentVersion: version,
    hasVersionMismatch,
    isWorkflowOutdated,
    isCliOutdated,
  }
}

function printInstallStatus(status: InstallStatus): void {
  const installedVersion = status.installedVersion

  if (!status.isInstalled || !installedVersion) {
    console.log(ansis.gray('  未检测到已安装工作流，可先执行初始化 / 重装工作流'))
    console.log()
    return
  }

  if (!status.hasVersionMismatch) {
    console.log(ansis.green(`  当前是最新安装版本: v${status.currentVersion}`))
    console.log()
    return
  }

  console.log(`  已安装版本: ${ansis.yellow(`v${installedVersion}`)}`)

  const reminder = status.isWorkflowOutdated
    ? `检测到已安装工作流较旧，当前启动版本为 v${status.currentVersion}，可直接在主菜单选择更新`
    : `检测到当前运行的是较旧 CLI 入口（来源：${detectRuntimeSource().label}，当前 v${status.currentVersion}，本地工作流 v${installedVersion}）。请改用 npx --yes yq-workflow@latest，或升级全局 yq-workflow 后重试`

  console.log(ansis.yellow(`  更新提醒: ${reminder}`))
  console.log()
}

function formatHeaderResourceLine(label: string, url: string): string {
  return `${label} ${url}`
}

function repeatBorder(char: string, count: number): string {
  return char.repeat(Math.max(count, 0))
}

function isFullwidthCodePoint(codePoint: number): boolean {
  if (codePoint < 0x1100) {
    return false
  }

  return (
    codePoint <= 0x115F
    || codePoint === 0x2329
    || codePoint === 0x232A
    || (codePoint >= 0x2E80 && codePoint <= 0xA4CF && codePoint !== 0x303F)
    || (codePoint >= 0xAC00 && codePoint <= 0xD7A3)
    || (codePoint >= 0xF900 && codePoint <= 0xFAFF)
    || (codePoint >= 0xFE10 && codePoint <= 0xFE19)
    || (codePoint >= 0xFE30 && codePoint <= 0xFE6F)
    || (codePoint >= 0xFF00 && codePoint <= 0xFF60)
    || (codePoint >= 0xFFE0 && codePoint <= 0xFFE6)
    || (codePoint >= 0x1F300 && codePoint <= 0x1FAFF)
    || (codePoint >= 0x20000 && codePoint <= 0x3FFFD)
  )
}

function getDisplayWidth(value: string): number {
  let width = 0
  for (const char of value) {
    const codePoint = char.codePointAt(0) ?? 0
    width += isFullwidthCodePoint(codePoint) ? 2 : 1
  }
  return width
}

function padDisplay(value: string, targetWidth: number): string {
  const padding = Math.max(targetWidth - getDisplayWidth(value), 0)
  return value + ' '.repeat(padding)
}

function centerDisplay(value: string, targetWidth: number): string {
  const displayWidth = getDisplayWidth(value)
  if (displayWidth >= targetWidth) {
    return value
  }

  const remaining = targetWidth - displayWidth
  const leftPadding = Math.floor(remaining / 2)
  const rightPadding = remaining - leftPadding
  return `${' '.repeat(leftPadding)}${value}${' '.repeat(rightPadding)}`
}

function createHeaderLine(innerWidth: number, content = ''): string {
  return `║${centerDisplay(content, innerWidth)}║`
}

function getHeaderWidth(
  baseInnerWidth: number,
  commandCount: number,
  skillCount: number,
  resources: ReadonlyArray<{ label: string, url: string }>,
): number {
  const fixedLines = [
    '██╗   ██╗ ██████╗',
    '╚██╗ ██╔╝██╔═══██╗',
    ' ╚████╔╝ ██║   ██║',
    '  ╚██╔╝  ██║▄▄ ██║',
    '   ██║   ╚██████╔╝',
    '   ╚═╝    ╚══▀▀═╝',
    'AI Coding Toolkit',
    'Workflow + Tools + MCP',
    `v${version} | ${commandCount} commands | ${skillCount} skills | zh-CN`,
    `build ${buildDate}`,
    ...resources.map(resource => formatHeaderResourceLine(resource.label, resource.url)),
  ]

  const maxContentWidth = Math.max(...fixedLines.map(getDisplayWidth))
  const terminalWidth = process.stdout.columns ?? (baseInnerWidth + 2)
  const maxInnerWidth = Math.max(terminalWidth - 2, 20)

  return Math.min(Math.max(baseInnerWidth, maxContentWidth + 2), maxInnerWidth)
}

function wrapPlainText(text: string, maxWidth: number): string[] {
  if (maxWidth <= 0) {
    return [text]
  }

  const lines: string[] = []
  let current = ''

  for (const char of text) {
    if (getDisplayWidth(current + char) > maxWidth) {
      if (current) {
        lines.push(current)
      }
      current = char
      continue
    }

    current += char
  }

  if (current) {
    lines.push(current)
  }

  return lines.length > 0 ? lines : ['']
}

function drawHeader(
  baseInnerWidth: number,
  commandCount: number,
  skillCount: number,
  resources: ReadonlyArray<{ label: string, url: string }>,
): void {
  const innerWidth = getHeaderWidth(baseInnerWidth, commandCount, skillCount, resources)
  const resourceLines = resources.flatMap((resource) => {
    const wrappedLines = wrapPlainText(formatHeaderResourceLine(resource.label, resource.url), innerWidth)
    return wrappedLines.map(line => createHeaderLine(innerWidth, line))
  })
  const lines = [
    `╔${repeatBorder('═', innerWidth)}╗`,
    createHeaderLine(innerWidth),
    createHeaderLine(innerWidth, '██╗   ██╗ ██████╗'),
    createHeaderLine(innerWidth, '╚██╗ ██╔╝██╔═══██╗'),
    createHeaderLine(innerWidth, ' ╚████╔╝ ██║   ██║'),
    createHeaderLine(innerWidth, '  ╚██╔╝  ██║▄▄ ██║'),
    createHeaderLine(innerWidth, '   ██║   ╚██████╔╝'),
    createHeaderLine(innerWidth, '   ╚═╝    ╚══▀▀═╝'),
    createHeaderLine(innerWidth),
    createHeaderLine(innerWidth, 'AI Coding Toolkit'),
    createHeaderLine(innerWidth, 'Workflow + Tools + MCP'),
    createHeaderLine(innerWidth),
    createHeaderLine(innerWidth, `v${version} | ${commandCount} commands | ${skillCount} skills | zh-CN`),
    createHeaderLine(innerWidth, `build ${buildDate}`),
    ...resourceLines,
    `╚${repeatBorder('═', innerWidth)}╝`,
  ]

  console.log()
  for (const line of lines) {
    console.log(ansis.cyan(line))
  }
  console.log()
}

export async function loadMenuAnnouncement(): Promise<string | null> {
  try {
    const response = await fetch(MENU_ANNOUNCEMENT_URL, {
      signal: AbortSignal.timeout(MENU_ANNOUNCEMENT_TIMEOUT_MS),
    })

    if (!response.ok) {
      return null
    }

    const content = (await response.text())
      .split(/\r?\n/u)
      .map(line => line.trim())
      .filter(Boolean)
      .join('\n')

    return content || null
  }
  catch {
    return null
  }
}

function printMenuAnnouncement(announcement: string | null): void {
  if (!announcement) {
    return
  }

  const terminalWidth = process.stdout.columns ?? 120
  const contentWidth = Math.max(terminalWidth - 2, 20)

  console.log(ansis.cyan('  公告'))
  for (const line of announcement.split('\n')) {
    for (const wrappedLine of wrapPlainText(line, contentWidth)) {
      console.log(`  ${ansis.yellow(wrappedLine)}`)
    }
  }
  console.log()
}

export async function renderMenuStatus(
  innerWidth: number,
  resources: ReadonlyArray<{ label: string, url: string }>,
  announcement: string | null = null,
): Promise<InstallStatus> {
  const [commandCount, skillCount] = await Promise.all([
    countInstalledCommands(),
    countInstalledSkills(),
  ])
  const installStatus = await getInstallStatus(commandCount)

  drawHeader(innerWidth, commandCount, skillCount, resources)
  printInstallStatus(installStatus)
  printMenuAnnouncement(announcement)

  return installStatus
}
