import ansis from 'ansis'
import inquirer from 'inquirer'
import fs from 'fs-extra'
import { homedir } from 'node:os'
import { join } from 'pathe'
import { version } from '../../package.json'
import { configMcp } from './config-mcp'
import { init } from './init'
import { update } from './update'
import { i18n } from '../i18n'
import { getWorkflowConfigs } from '../utils/installer'
import { readCcgConfig, writeCcgConfig } from '../utils/config'
import { uninstallWorkflows } from '../utils/installer'

function drawHeader(): void {
  console.log()
  console.log(ansis.cyan.bold(`  YQ Workflow Toolkit v${version}`))
  console.log(ansis.gray('  Claude Code command packs and project helpers'))
  console.log()
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

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'provider',
      message: '选择 API 提供方',
      choices: [
        { name: 'Anthropic 官方 / 清除自定义配置', value: 'official' },
        { name: '第三方 API 代理', value: 'third-party' },
        { name: '302.AI', value: '302ai' },
      ],
      default: 'official',
    },
    {
      type: 'input',
      name: 'url',
      message: 'API URL',
      when: (input: { provider: string }) => input.provider === 'third-party',
      validate: (value: string) => value.trim() !== '' || '请输入 API URL',
    },
    {
      type: 'password',
      name: 'key',
      message: 'API Key',
      mask: '*',
      when: (input: { provider: string }) => input.provider === 'third-party' || input.provider === '302ai',
      validate: (value: string) => value.trim() !== '' || '请输入 API Key',
    },
  ] as any)

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

function showHelp(): void {
  console.log()
  console.log(ansis.cyan.bold('  已安装命令概览'))
  console.log()
  for (const workflow of getWorkflowConfigs()) {
    const command = workflow.commands[0]
    console.log(`  ${ansis.green(`/yq:${command}`.padEnd(20))} ${ansis.gray(workflow.description || '')}`)
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

  const configPath = join(installDir, '.yq', 'config.toml')
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
    const config = await readCcgConfig()
    drawHeader()

    if (config) {
      console.log(ansis.gray(`  已安装命令: ${config.workflows.installed.length}`))
      console.log(ansis.gray(`  默认 MCP: ${config.mcp.provider}`))
      console.log()
    }

    const { action } = await inquirer.prompt([{
      type: 'list',
      name: 'action',
      message: '选择操作',
      choices: [
        { name: '1. 初始化 / 重装工作流', value: 'init' },
        { name: '2. 更新工作流', value: 'update' },
        { name: '3. 配置 MCP', value: 'mcp' },
        { name: '4. 配置 API', value: 'api' },
        { name: '5. 查看命令列表', value: 'help' },
        { name: '6. 卸载', value: 'uninstall' },
        new inquirer.Separator(),
        { name: 'Q. 退出', value: 'exit' },
      ],
    }])

    switch (action) {
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
