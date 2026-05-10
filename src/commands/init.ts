import type { InitOptions, SupportedLang } from '../types'
import ansis from 'ansis'
import inquirer from 'inquirer'
import { homedir } from 'node:os'
import { join } from 'pathe'
import { version as packageVersion } from '../../package.json'
import { i18n, initI18n } from '../i18n'
import { createDefaultConfig, readCcgConfig, writeCcgConfig } from '../utils/config'
import { getAgentSkillsDir, getAllCommandIds, getCodexDir, getCursorDir, getKiroDir, installWorkflows, showInstallSummary } from '../utils/installer'
import { compareVersions } from '../utils/version'

type TipSection = {
  title: string
  lines: string[]
}

function getInitConfirmMessage(installedVersion: string | null, currentVersion: string): string {
  if (!installedVersion) {
    return '确认开始安装？'
  }

  if (compareVersions(currentVersion, installedVersion) === 0) {
    return `检测到已安装版本与当前启动版本一致（v${currentVersion}），是否覆盖更新？`
  }

  return `检测到已安装版本为 v${installedVersion}，当前启动版本为 v${currentVersion}，是否更新？`
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
  return value + ' '.repeat(Math.max(targetWidth - getDisplayWidth(value), 0))
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

function renderTipBox(sections: TipSection[], indent = '  '): void {
  const terminalWidth = process.stdout.columns ?? 120
  const maxInnerWidth = Math.max(Math.min(terminalWidth - indent.length - 2, 116), 48)
  const allLines = sections.flatMap(section => [
    `◎ ${section.title}`,
    ...section.lines,
  ])
  const innerWidth = Math.min(
    maxInnerWidth,
    Math.max(...allLines.map(line => Math.min(getDisplayWidth(line), maxInnerWidth - 2))) + 2,
  )

  console.log(ansis.cyan(`${indent}╭${'─'.repeat(innerWidth)}╮`))

  for (const [index, section] of sections.entries()) {
    const title = `  ◎ ${section.title}`
    console.log(ansis.cyan(`${indent}│`) + ansis.white.bold(padDisplay(title, innerWidth)) + ansis.cyan('│'))

    for (const rawLine of section.lines) {
      for (const wrappedLine of wrapPlainText(rawLine, innerWidth - 4)) {
        const content = `    ${wrappedLine}`
        console.log(ansis.cyan(`${indent}│`) + ansis.gray(padDisplay(content, innerWidth)) + ansis.cyan('│'))
      }
    }

    if (index < sections.length - 1) {
      console.log(ansis.cyan(`${indent}│${' '.repeat(innerWidth)}│`))
    }
  }

  console.log(ansis.cyan(`${indent}╰${'─'.repeat(innerWidth)}╯`))
}

export async function init(options: InitOptions = {}): Promise<void> {
  const installDir = options.installDir || join(homedir(), '.claude')
  const commandsDir = join(installDir, 'commands', 'yq')
  const promptsDir = join(installDir, '.yq', 'prompts', 'claude')
  const workflowSkillsDir = join(installDir, 'skills', 'yq')
  const agentSkillsDir = join(getAgentSkillsDir(), 'yq')
  const tipSections: TipSection[] = [
    {
      title: '初始化会安装这些内容',
      lines: [
        '工作流命令、提示词模板、Skills、规则文件与全局编程规范配置',
      ],
    },
    {
      title: '写入目录',
      lines: [
        `Commands      ${commandsDir}`,
        `Prompts       ${promptsDir}`,
        `Workflow      ${workflowSkillsDir}`,
        `Agent Skills  ${agentSkillsDir}`,
        `Claude        ${join(installDir, 'CLAUDE.md')}`,
        `Codex         ${join(getCodexDir(), 'AGENTS.md')}`,
        `Cursor        ${join(getCursorDir(), 'rules', 'guidelines.mdc')}`,
        `Kiro          ${join(getKiroDir(), 'steering', 'kiro.md')}`,
      ],
    },
    {
      title: '不会改动这些内容',
      lines: [
        '不会影响现有编程工具的安装状态、登录态、API Key、模型配置、MCP 服务与 IDE 插件设置',
      ],
    },
    {
      title: '其他说明',
      lines: [
        '已存在的 CLAUDE.md、AGENTS.md、guidelines.mdc、kiro.md 会自动备份；',
      ],
    },
  ]

  console.log()
  console.log(ansis.cyan.bold('  YQ AI 编程工具助手'))
  renderTipBox(tipSections)
  console.log()

  const language: SupportedLang = 'zh-CN'
  const existingConfig = await readCcgConfig()
  await initI18n(language)

  const selectedWorkflows = options.workflows?.split(',').map(v => v.trim()).filter(Boolean) || getAllCommandIds()

  let mcpProvider = existingConfig?.mcp?.provider || 'skip'
  const liteMode = true
  const skipImpeccable = false

  if (!options.skipPrompt) {
    const installAnswers = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmInstall',
        message: getInitConfirmMessage(existingConfig?.general?.version || null, packageVersion),
        default: true,
      },
    ] as any)

    if (!installAnswers.confirmInstall) {
      console.log()
      console.log(ansis.gray(i18n.t('common:cancelled')))
      console.log()
      return
    }
  }

  const result = await installWorkflows(selectedWorkflows, installDir, options.force || false, {
    liteMode,
    mcpProvider,
    skipImpeccable,
  })

  const config = createDefaultConfig({
    language,
    installedWorkflows: selectedWorkflows,
    mcpProvider,
    liteMode,
    skipImpeccable,
  })
  await writeCcgConfig(config)

  showInstallSummary(result)

  console.log(ansis.green(`  已安装 ${result.installedCommands.length} 个命令到 ${join(installDir, 'commands', 'yq')}`))
  if ((result.installedSkills || 0) > 0) {
    console.log(ansis.green(`  已安装 ${result.installedSkills} 个 Skills 到 ${join(installDir, 'skills', 'yq')}`))
  }
  if ((result.installedAgentSkills || 0) > 0) {
    console.log(ansis.green(`  已安装 ${result.installedAgentSkills} 个 Agent Skills 到 ${join(getAgentSkillsDir(), 'yq')}`))
  }
  if ((result.installedBaseSkills || 0) > 0) {
    console.log(ansis.green(`  已安装 ${result.installedBaseSkills} 个 Base Skills 到 ${join(getAgentSkillsDir(), 'yq-base')}`))
  }
  if ((result.installedSuperpowers || 0) > 0) {
    console.log(ansis.green(`  已安装 ${result.installedSuperpowers} 个 Superpowers Skills 到 ${join(getAgentSkillsDir(), 'superpowers')}`))
  }
  console.log(ansis.gray(`  配置文件: ${join(installDir, '.yq', 'config.toml')}`))
  if (mcpProvider !== 'skip') {
    console.log(ansis.gray('  如需真正安装 MCP 服务，请继续运行: yq config mcp'))
  }
  if (result.errors.length > 0) {
    console.log()
    console.log(ansis.yellow('  安装告警:'))
    for (const error of result.errors) {
      console.log(`    ${ansis.yellow('•')} ${error}`)
    }
  }
  console.log()
}
