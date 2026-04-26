import type { InitOptions, SupportedLang } from '../types'
import ansis from 'ansis'
import inquirer from 'inquirer'
import { homedir } from 'node:os'
import { join } from 'pathe'
import { version as packageVersion } from '../../package.json'
import { i18n, initI18n } from '../i18n'
import { createDefaultConfig, readCcgConfig, writeCcgConfig } from '../utils/config'
import { getAgentSkillsDir, getAllCommandIds, installWorkflows, showInstallSummary } from '../utils/installer'
import { compareVersions } from '../utils/version'

function getInitConfirmMessage(installedVersion: string | null, currentVersion: string): string {
  if (!installedVersion) {
    return '确认开始安装？'
  }

  if (compareVersions(currentVersion, installedVersion) === 0) {
    return `检测到已安装版本与当前启动版本一致（v${currentVersion}），是否覆盖更新？`
  }

  return `检测到已安装版本为 v${installedVersion}，当前启动版本为 v${currentVersion}，是否更新？`
}

export async function init(options: InitOptions = {}): Promise<void> {
  console.log()
  console.log(ansis.cyan.bold('  YQ AI 编程工具助手'))
  console.log(ansis.gray('  安装工作流命令、提示词、技能与常用工具入口'))
  console.log(ansis.gray('  初始化仅安装工作流文件；API 可在 AI 账号管理或命令行中单独配置'))
  console.log()

  const language: SupportedLang = 'zh-CN'
  const existingConfig = await readCcgConfig()
  await initI18n(language)

  const installDir = options.installDir || join(homedir(), '.claude')
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
