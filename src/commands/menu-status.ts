import ansis from 'ansis'
import fs from 'fs-extra'
import { homedir } from 'node:os'
import { join } from 'pathe'
import { version } from '../../package.json'
import { buildDate } from '../generated/build-info'
import { collectSkills, getAgentSkillsDir } from '../utils/installer'
import { readCcgConfig } from '../utils/config'
import { PACKAGE_ROOT } from '../utils/installer-template'
import { compareVersions } from '../utils/version'

type InstallStatus = {
  isInstalled: boolean
  installedVersion: string | null
  currentVersion: string
  needsUpdate: boolean
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

function createHeaderLine(innerWidth: number, content = ''): string {
  return `║${content.padStart(Math.floor((innerWidth + content.length) / 2)).padEnd(innerWidth)}║`
}

function drawHeader(innerWidth: number, commandCount: number, skillCount: number): void {
  const lines = [
    '╔════════════════════════════════════════════════════════════╗',
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
    createHeaderLine(innerWidth),
    '╚════════════════════════════════════════════════════════════╝',
  ]

  console.log()
  for (const line of lines) {
    console.log(ansis.cyan(line))
  }
  console.log()
}

function printMenuResources(resources: ReadonlyArray<{ label: string, url: string }>): void {
  console.log(ansis.cyan('  参考资源'))
  for (const resource of resources) {
    console.log(`  ${ansis.green(resource.label.padEnd(16))} ${ansis.gray(resource.url)}`)
  }
  console.log()
}

export async function renderMenuStatus(
  innerWidth: number,
  resources: ReadonlyArray<{ label: string, url: string }>,
): Promise<void> {
  const [commandCount, skillCount] = await Promise.all([
    countInstalledCommands(),
    countInstalledSkills(),
  ])
  const installStatus = await getInstallStatus(commandCount)

  drawHeader(innerWidth, commandCount, skillCount)
  printInstallStatus(installStatus)
  printMenuResources(resources)
}
