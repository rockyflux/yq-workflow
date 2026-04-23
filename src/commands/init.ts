import type { InitOptions, SupportedLang } from '../types'
import ansis from 'ansis'
import fs from 'fs-extra'
import inquirer from 'inquirer'
import { homedir } from 'node:os'
import { join } from 'pathe'
import { i18n, initI18n } from '../i18n'
import { createDefaultConfig, readCcgConfig, writeCcgConfig } from '../utils/config'
import { getAllCommandIds, installWorkflows, showInstallSummary } from '../utils/installer'

type ApiProvider = 'official' | 'third-party' | '302ai' | 'skip'

async function applyApiSettings(installDir: string, provider: ApiProvider, apiUrl: string, apiKey: string): Promise<void> {
  const settingsPath = join(installDir, 'settings.json')
  let settings: Record<string, any> = {}

  if (await fs.pathExists(settingsPath)) {
    settings = await fs.readJSON(settingsPath)
  }

  settings.env ||= {}

  if (provider === 'official' || provider === 'skip') {
    delete settings.env.ANTHROPIC_BASE_URL
    delete settings.env.ANTHROPIC_AUTH_TOKEN
    delete settings.env.ANTHROPIC_API_KEY
  }
  else {
    settings.env.ANTHROPIC_BASE_URL = apiUrl
    settings.env.ANTHROPIC_AUTH_TOKEN = apiKey
    delete settings.env.ANTHROPIC_API_KEY
  }

  await fs.ensureDir(installDir)
  await fs.writeJSON(settingsPath, settings, { spaces: 2 })
}

export async function init(options: InitOptions = {}): Promise<void> {
  console.log()
  console.log(ansis.cyan.bold('  YQ Workflow Toolkit'))
  console.log(ansis.gray('  安装 Claude Code 命令包、提示词与项目辅助能力'))
  console.log()

  let language: SupportedLang = options.lang || 'zh-CN'
  const existingConfig = await readCcgConfig()

  if (existingConfig?.general?.language && !options.lang) {
    language = existingConfig.general.language
  }
  await initI18n(language)

  if (!options.skipPrompt && !existingConfig?.general?.language && !options.lang) {
    const { selectedLang } = await inquirer.prompt([{
      type: 'list',
      name: 'selectedLang',
      message: '选择语言 / Select language',
      choices: [
        { name: '简体中文', value: 'zh-CN' },
        { name: 'English', value: 'en' },
      ],
      default: 'zh-CN',
    }])
    language = selectedLang
    await initI18n(language)
  }

  const installDir = options.installDir || join(homedir(), '.claude')
  const selectedWorkflows = options.workflows?.split(',').map(v => v.trim()).filter(Boolean) || getAllCommandIds()

  let apiProvider: ApiProvider = 'skip'
  let apiUrl = ''
  let apiKey = ''
  let mcpProvider = existingConfig?.mcp?.provider || 'skip'
  let liteMode = existingConfig?.performance?.liteMode || false
  let skipImpeccable = existingConfig?.performance?.skipImpeccable || false

  if (!options.skipPrompt) {
    const apiAnswers = await inquirer.prompt([
      {
        type: 'list',
        name: 'provider',
        message: 'API 配置',
        choices: [
          { name: '跳过，保持官方登录或自行管理', value: 'skip' },
          { name: 'Anthropic 官方', value: 'official' },
          { name: '第三方 API 代理', value: 'third-party' },
          { name: '302.AI', value: '302ai' },
        ],
        default: 'skip',
      },
      {
        type: 'input',
        name: 'url',
        message: 'API URL',
        when: (answers: { provider: ApiProvider }) => answers.provider === 'third-party',
        validate: (value: string) => value.trim() !== '' || '请输入 API URL',
      },
      {
        type: 'password',
        name: 'key',
        message: 'API Key',
        when: (answers: { provider: ApiProvider }) => answers.provider === 'third-party' || answers.provider === '302ai',
        mask: '*',
        validate: (value: string) => value.trim() !== '' || '请输入 API Key',
      },
    ] as any)

    apiProvider = apiAnswers.provider
    if (apiProvider === 'third-party') {
      apiUrl = apiAnswers.url.trim()
      apiKey = apiAnswers.key.trim()
    }
    else if (apiProvider === '302ai') {
      apiUrl = 'https://api.302.ai/cc'
      apiKey = apiAnswers.key.trim()
    }

    const installAnswers = await inquirer.prompt([
      {
        type: 'list',
        name: 'mcpProvider',
        message: '默认 MCP 提供方',
        choices: [
          { name: '稍后手动配置', value: 'skip' },
          { name: 'ace-tool', value: 'ace-tool' },
          { name: 'ace-tool-rs', value: 'ace-tool-rs' },
          { name: 'fast-context', value: 'fast-context' },
          { name: 'ContextWeaver', value: 'contextweaver' },
        ],
        default: mcpProvider,
      },
      {
        type: 'confirm',
        name: 'liteMode',
        message: '启用轻量模式？',
        default: liteMode,
      },
      {
        type: 'confirm',
        name: 'skipImpeccable',
        message: '跳过 Impeccable 前端命令安装？',
        default: skipImpeccable,
      },
      {
        type: 'confirm',
        name: 'confirmInstall',
        message: '确认开始安装？',
        default: true,
      },
    ] as any)

    if (!installAnswers.confirmInstall) {
      console.log()
      console.log(ansis.gray(i18n.t('common:cancelled')))
      console.log()
      return
    }

    mcpProvider = installAnswers.mcpProvider
    liteMode = installAnswers.liteMode
    skipImpeccable = installAnswers.skipImpeccable
  }

  const result = await installWorkflows(selectedWorkflows, installDir, options.force || false, {
    liteMode,
    mcpProvider,
    skipImpeccable,
  })

  await applyApiSettings(installDir, apiProvider, apiUrl, apiKey)

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
