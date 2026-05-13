import ansis from 'ansis'
import inquirer from 'inquirer'
import { COMMON_HELP_COMMANDS, HELP_COMMAND_HINTS, HELP_OVERVIEW_URL } from './help-commands'
import { closeHelpWebServer, getActiveHelpWebState, launchHelpWebDetached } from './help-web'
import { SKILLS_MANAGE_URL, SKILLS_SH_URL } from './menu-constants'
import { openExternalUrl, promptMenuList } from './menu-helpers'
import { getAgentSkillsDir, listAgentSkillDirectories } from '../utils/installer'

export function printSkillsStorageNotice(): void {
  console.log(ansis.gray(`  技能存储在 ${getAgentSkillsDir()}，遵循 Agent Skills 开放标准。`))
  console.log(ansis.gray('  兼容的工具：Claude Code、Codex、Gemini CLI 等'))
  console.log()
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

    const { action } = await promptMenuList([{
      type: 'list',
      name: 'action',
      message: '选择 Skills 操作',
      pageSize: 12,
      choices: [
        { name: '1. 本地网页版 Skills', value: 'web' },
        { name: '2. 查看本地 Skills 目录', value: 'dirs' },
        { name: '3. 桌面软件管理 Skills', value: 'desktop-skills' },
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
      console.log(ansis.gray('  按 Enter 将关闭本地网页版 Skills，并自动返回菜单'))
      console.log()

      await inquirer.prompt([{
        type: 'input',
        name: 'continue',
        message: ansis.gray('按 Enter 关闭本地网页版 Skills 并返回菜单...'),
      }])

      const closed = await closeHelpWebServer()
      console.log()
      if (closed) {
        console.log(ansis.green('  已关闭本地网页版 Skills'))
      }
      else {
        console.log(ansis.gray('  当前没有运行中的本地网页版 Skills'))
      }
      console.log()
      continue
    }
    else if (action === 'dirs') {
      await showAgentSkillsDirectories()
    }
    else if (action === 'desktop-skills') {
      console.log()
      if (await openExternalUrl(SKILLS_MANAGE_URL)) {
        console.log(ansis.green('  已尝试打开 Skills Manage 项目页'))
      }
      else {
        console.log(ansis.yellow(`  未能自动打开浏览器，请手动访问 ${SKILLS_MANAGE_URL}`))
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

export async function showHelp(): Promise<void> {
  console.log()
  console.log(ansis.cyan.bold('  常用命令'))
  console.log()
  for (const item of COMMON_HELP_COMMANDS) {
    console.log(`  ${ansis.green(item.command.padEnd(40))} ${ansis.gray(item.description)}`)
  }
  console.log()
  console.log(ansis.cyan('  提示'))
  for (const hint of HELP_COMMAND_HINTS) {
    console.log(ansis.gray(`  ${hint}`))
  }
  console.log()

  if (await openExternalUrl(HELP_OVERVIEW_URL)) {
    console.log(ansis.green(`  已尝试打开帮助网页：${HELP_OVERVIEW_URL}`))
  }
  else {
    console.log(ansis.yellow(`  未能自动打开浏览器，请手动访问 ${HELP_OVERVIEW_URL}`))
  }
  console.log()
}
