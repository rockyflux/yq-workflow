import ansis from 'ansis'
import inquirer from 'inquirer'
import fs from 'fs-extra'
import { homedir } from 'node:os'
import { join } from 'pathe'
import { configMcp } from './config-mcp'
import { init } from './init'
import { closePromptWebServer, getActivePromptWebState, launchPromptWebDetached } from './prompt-web'
import { update } from './update'
import { runBaseEnvironmentMenu } from './menu-base-environment'
import {
  CC_SWITCH_RELEASES_URL,
  HEADER_INNER_WIDTH,
  MENU_RESOURCES,
  MENU_SEPARATOR,
} from './menu-constants'
import type { MenuAction } from './menu-constants'
import { formatMenuChoice, promptMenuList, runInteractiveCommand } from './menu-helpers'
import {
  runAiAccountManagementMenu,
  runClaudeCodeToolsMenu,
  runCodingToolsMenu,
  runModelUsageMenu,
  runPopularWorkflowsMenu,
} from './menu-managed-packages'
import { configSkills, showHelp } from './menu-skills'
import { loadMenuAnnouncement, renderMenuStatus } from './menu-status'
import { i18n } from '../i18n'
import { trackMenuLaunch } from '../utils/counterapi'
import { uninstallWorkflows } from '../utils/installer'
import { readCcgConfig, writeCcgConfig } from '../utils/config'

function getConfigFilePath(): string {
  return join(homedir(), '.claude', '.yq', 'config.toml')
}

function shouldPauseAfterMainMenuAction(action: MenuAction): boolean {
  return !['mcp', 'prompts', 'skills', 'tools', 'coding-tools', 'ai-accounts', 'environment', 'popular-workflows', 'model-usage'].includes(action)
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

async function configPrompt(): Promise<void> {
  const activePromptWeb = await getActivePromptWebState()
  console.log()
  console.log(ansis.cyan.bold('  提示词配置'))
  console.log(ansis.gray(`  Claude：${join(homedir(), '.claude', 'CLAUDE.md')}`))
  console.log(ansis.gray(`  Codex：${join(homedir(), '.codex', 'AGENTS.md')}`))
  console.log(ansis.gray(`  Gemini：${join(homedir(), '.gemini', 'GEMINI.md')}`))
  console.log(ansis.gray(`  Cursor：${join(homedir(), '.cursor', 'rules', 'guidelines.mdc')}`))
  console.log(ansis.gray(`  Kiro：${join(homedir(), '.kiro', 'steering', 'kiro.md')}`))
  if (activePromptWeb) {
    console.log(ansis.green(`  本地提示词配置页运行中：${activePromptWeb.url}`))
  }
  console.log()

  const result = await launchPromptWebDetached('claude')
  if (result.status === 'reused') {
    console.log(ansis.green(`  已复用已打开的提示词配置页：${result.url}`))
  }
  else {
    console.log(ansis.green('  已尝试打开本地提示词配置页，默认展示 Claude 提示词'))
  }
  console.log(ansis.gray('  如未自动打开，可执行 yq config prompt-web'))
  console.log(ansis.gray('  按 Enter 将关闭本地提示词配置页，并自动返回'))
  console.log()

  await inquirer.prompt([{
    type: 'input',
    name: 'continue',
    message: ansis.gray('按 Enter 关闭本地提示词配置页并返回...'),
  }])

  const closed = await closePromptWebServer()
  console.log()
  if (closed) {
    console.log(ansis.green('  已关闭本地提示词配置页'))
  }
  else {
    console.log(ansis.gray('  当前没有运行中的本地提示词配置页'))
  }
  console.log()
}

export {
  configApi,
  configPrompt,
  configSkills,
  showHelp,
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
  void trackMenuLaunch()
  const announcement = await loadMenuAnnouncement()

  while (true) {
    const installStatus = await renderMenuStatus(HEADER_INNER_WIDTH, MENU_RESOURCES, announcement)
    const updateMenuChoice = installStatus.isCurrentNewer
      ? `${ansis.yellow('2. 更新工作流')}  ${ansis.yellowBright('-  更新到最新版本')} ${ansis.bgYellow.black(' 有版本更新 ')}`
      : formatMenuChoice('2. 更新工作流', '- 更新到最新版本')

    const { action } = await promptMenuList([{
      type: 'list',
      name: 'action',
      message: 'YQ 主菜单',
      pageSize: 16,
      choices: [
        new inquirer.Separator(`${MENU_SEPARATOR} 核心工作流 ${MENU_SEPARATOR}`),
        { name: formatMenuChoice('1. 初始化 / 重装工作流', '- 安装 YQ 工作流'), value: 'init' },
        { name: updateMenuChoice, value: 'update' },
        { name: formatMenuChoice('3. 热门开源工作流', '- GET SHIT DONE / gstack / Trellis'), value: 'popular-workflows' },
        { name: formatMenuChoice('4. 提示词配置', '- Claude / Codex / Gemini / Cursor / Kiro 提示词编辑器'), value: 'prompts' },
        { name: formatMenuChoice('5. 配置 Skills', '- Skills.sh + 本地 Skills 目录'), value: 'skills' },
        { name: formatMenuChoice('6. 配置 MCP', '- Claude / Codex / Gemini / Cursor / Kiro 本地网页管理'), value: 'mcp' },
        new inquirer.Separator(`${MENU_SEPARATOR} 编程工具 ${MENU_SEPARATOR}`),
        { name: formatMenuChoice('T. Claude Code 工具', '- Claude Code, ccusage, CCR, CCometixLine'), value: 'tools' },
        { name: formatMenuChoice('E. 基础环境检测', '- Git, PowerShell, Node.js, Python, pip, pnpm, uv, rg, VS Code'), value: 'environment' },
        { name: formatMenuChoice('C. 安装编程工具', '- CLI 命令行版 / 桌面端 UI'), value: 'coding-tools' },
        { name: formatMenuChoice('I. 模型账号管理', '- 客户端 / 续杯工具'), value: 'ai-accounts' },
        { name: formatMenuChoice('U. 模型使用统计', '- Claude Code / Codex / 网页版统计工具'), value: 'model-usage' },
        new inquirer.Separator(`${MENU_SEPARATOR} YQ ${MENU_SEPARATOR}`),
        { name: formatMenuChoice('H. 帮助', '- 查看已安装命令、Skills 与工具'), value: 'help' },
        { name: formatMenuChoice('-. 卸载和删除配置', '- 移除工作流文件并删除 yq-workflow'), value: 'uninstall' },
        new inquirer.Separator('-'.repeat(41)),
        { name: 'Q. 退出', value: 'exit' },
      ],
    }])

    const selectedAction = action as MenuAction

    switch (selectedAction) {
      case 'init':
        await init()
        break
      case 'update':
        await update()
        break
      case 'popular-workflows':
        await runPopularWorkflowsMenu()
        break
      case 'prompts':
        await configPrompt()
        break
      case 'mcp':
        await configMcp()
        break
      case 'skills':
        await configSkills()
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
      case 'ai-accounts':
        await runAiAccountManagementMenu()
        break
      case 'model-usage':
        await runModelUsageMenu()
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

    if (shouldPauseAfterMainMenuAction(selectedAction)) {
      await inquirer.prompt([{
        type: 'input',
        name: 'continue',
        message: ansis.gray(i18n.t('common:pressEnterToReturn')),
      }])
    }
  }
}
