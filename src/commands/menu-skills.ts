import ansis from 'ansis'
import inquirer from 'inquirer'
import fs from 'fs-extra'
import { homedir } from 'node:os'
import { join } from 'pathe'
import { closeHelpWebServer, getActiveHelpWebState, launchHelpWebDetached } from './help-web'
import { SKILLS_SH_URL } from './menu-constants'
import { openExternalUrl, promptMenuList, runInteractiveCommand } from './menu-helpers'
import {
  collectSkills,
  getAgentSkillsDir,
  listAgentSkillDirectories,
} from '../utils/installer'

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
        { name: '2. 关闭本地网页版 Skills', value: 'web-close' },
        { name: '3. 查看本地 Skills 目录', value: 'dirs' },
        { name: '4. 查看全局已安装 Skills', value: 'list' },
        { name: '5. 检索并安装 Skills.sh 技能', value: 'search' },
        { name: '6. 安装指定 Skills 包 / 单个 Skill', value: 'install' },
        { name: '7. 更新全局 Skills', value: 'update' },
        { name: '8. 打开网站 skills.sh', value: 'open' },
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
