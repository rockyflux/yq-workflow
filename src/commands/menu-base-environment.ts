import ansis from 'ansis'
import inquirer from 'inquirer'
import ora from 'ora'
import {
  detectBaseEnvironmentToolStatuses,
  SCIENTIFIC_INTERNET_GUIDE_URL,
} from '../utils/installer'
import type { BaseEnvironmentInstallAction, BaseEnvironmentToolStatus } from '../utils/installer'
import { openExternalUrl, promptMenuList, runInteractiveCommand } from './menu-helpers'

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
  console.log(ansis.gray('  检测 Git、PowerShell、Node.js、Python、pip、pnpm、uv、VS Code，并提供安装入口'))
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

  const { actionId } = await promptMenuList([{
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

export async function runBaseEnvironmentMenu(): Promise<void> {
  while (true) {
    const statuses = await detectBaseEnvironmentStatuses()
    printBaseEnvironmentStatusLines(statuses)
    const { target } = await promptMenuList([{
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
