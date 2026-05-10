import ansis from 'ansis'
import inquirer from 'inquirer'
import ora from 'ora'
import { compareVersions, getGlobalPackageVersion, getLatestVersion } from '../utils/version'
import {
  AI_ACCOUNT_MANAGEMENT_PACKAGES,
  CLAUDE_CODE_TOOL_PACKAGES,
  CODING_TOOL_CLI_PACKAGES,
  CODING_TOOL_DESKTOP_PACKAGES,
  MODEL_USAGE_PACKAGES,
  POPULAR_WORKFLOW_PACKAGES,
} from './menu-constants'
import type { ManagedPackage, ManagedPackageStatus } from './menu-constants'
import { openExternalUrl, promptMenuList, runInteractiveCommand } from './menu-helpers'

async function getManagedPackageStatuses(packages: ManagedPackage[]): Promise<ManagedPackageStatus[]> {
  return Promise.all(
    packages.map(async item => {
      if (item.installType === 'external-link' || !item.packageName) {
        return {
          ...item,
          installedVersion: null,
          latestVersion: item.statusHint || null,
        }
      }

      const [installedVersion, latestVersion] = await Promise.all([
        getGlobalPackageVersion(item.packageName),
        getLatestVersion(item.packageName),
      ])

      return {
        ...item,
        installedVersion,
        latestVersion,
      }
    }),
  )
}

async function detectManagedPackageStatuses(
  packages: ManagedPackage[],
  title: string,
  options?: {
    silent?: boolean
  },
): Promise<ManagedPackageStatus[]> {
  const spinner = options?.silent ? null : ora(`正在检测${title}版本...`).start()

  try {
    const statuses = await getManagedPackageStatuses(packages)
    spinner?.succeed(`${title}版本检测完成`)
    return statuses
  }
  catch (error) {
    spinner?.fail(`${title}版本检测失败`)
    throw error
  }
}

function printManagedPackageStatusLines(
  packages: ManagedPackageStatus[],
  options: {
    title: string
    subtitle: string
  },
): void {
  console.log()
  console.log(ansis.cyan.bold(`  ${options.title}`))
  console.log(ansis.gray(`  ${options.subtitle}`))
  console.log()

  for (const item of packages) {
    if (item.runOnly) {
      console.log(`  ${ansis.cyan(item.label.padEnd(14))} ${ansis.green('运行（npx）')}`)
      if (item.description) {
        console.log(ansis.gray(`  ${' '.repeat(16)}${item.description}`))
      }
      continue
    }

    if (item.openDirectly) {
      const statusText = item.latestVersion
        ? ansis.green(item.latestVersion)
        : ansis.gray(item.externalActionText || '打开网页')
      console.log(`  ${ansis.cyan(item.label.padEnd(14))} ${statusText}`)
      if (item.description) {
        console.log(ansis.gray(`  ${' '.repeat(16)}${item.description}`))
      }
      continue
    }

    if (item.installType === 'external-link') {
      const statusText = item.latestVersion
        ? ansis.green(item.latestVersion)
        : ansis.gray('打开下载页')
      console.log(`  ${ansis.cyan(item.label.padEnd(14))} ${statusText}`)
      if (item.description) {
        console.log(ansis.gray(`  ${' '.repeat(16)}${item.description}`))
      }
      if (item.tutorialUrl) {
        console.log(ansis.gray(`  ${' '.repeat(16)}教程：${item.tutorialUrl}`))
      }
      continue
    }

    const installedText = item.installedVersion
      ? ansis.yellow(`v${item.installedVersion}`)
      : ansis.gray('未安装')
    const latestText = item.latestVersion
      ? ansis.green(`v${item.latestVersion}`)
      : ansis.red('查询失败')
    console.log(`  ${ansis.cyan(item.label.padEnd(14))} 当前: ${installedText}  最新: ${latestText}`)
    if (item.description) {
      console.log(ansis.gray(`  ${' '.repeat(16)}${item.description}`))
    }
    if (item.tutorialUrl) {
      console.log(ansis.gray(`  ${' '.repeat(16)}教程：${item.tutorialUrl}`))
    }
  }

  console.log()
}

function formatManagedPackageChoice(item: ManagedPackageStatus): string {
  if (item.runOnly) {
    return `${item.label}  ${ansis.gray(`- ${item.description || '运行统计命令'}`)}`
  }

  if (item.category === 'desktop') {
    return `${item.label}  ${ansis.gray(`- ${item.description || item.externalActionText || '打开网页'}`)}`
  }

  if (item.installType === 'external-link') {
    if (item.openDirectly) {
      return `${item.label}  ${ansis.gray(`- ${item.description || item.externalActionText || '打开网页'}`)}`
    }

    const description = item.description ? `；${item.description}` : ''
    return `${item.label}  ${ansis.gray(`- ${item.latestVersion || '桌面客户端下载'}${description}`)}`
  }

  const currentText = item.installedVersion ? `当前 v${item.installedVersion}` : '未安装'
  const latestText = item.latestVersion ? `最新 v${item.latestVersion}` : '最新查询失败'
  const description = item.description ? `；${item.description}` : ''
  return `${item.label}  ${ansis.gray(`- ${currentText} / ${latestText}${description}`)}`
}

function getPackageActionLabel(item: ManagedPackageStatus): string {
  if (item.runOnly) {
    return '运行（npx）'
  }

  if (item.installType === 'external-link') {
    return item.externalActionText || '打开下载页'
  }

  if (!item.installedVersion) {
    return '安装最新版本'
  }

  if (!item.latestVersion) {
    return '重新安装'
  }

  return compareVersions(item.latestVersion, item.installedVersion) > 0
    ? '更新到最新版本'
    : '重新安装当前最新版本'
}

async function installOrUpdateManagedPackage(item: ManagedPackageStatus): Promise<void> {
  if (item.installType === 'external-link') {
    const url = item.externalUrl
    if (!url) {
      console.log()
      console.log(ansis.red(`  ${item.label} 未配置下载地址`))
      console.log()
      return
    }

    const actionText = item.externalActionText || '打开下载页'
    const { confirmOpen } = await inquirer.prompt([{
      type: 'confirm',
      name: 'confirmOpen',
      message: `${actionText}：${item.label}？`,
      default: true,
    }])

    if (!confirmOpen) {
      console.log()
      console.log(ansis.gray('  已取消'))
      console.log()
      return
    }

    console.log()
    const opened = await openExternalUrl(url)
    if (opened) {
      console.log(ansis.green(`  已尝试打开 ${item.label} 下载页`))
    }
    else {
      console.log(ansis.yellow(`  未能自动打开浏览器，请手动访问 ${url}`))
    }
    console.log()
    return
  }

  const actionLabel = getPackageActionLabel(item)
  const currentText = item.installedVersion ? `v${item.installedVersion}` : '未安装'
  const latestText = item.latestVersion ? `v${item.latestVersion}` : '未知'

  const { confirmInstall } = await inquirer.prompt([{
    type: 'confirm',
    name: 'confirmInstall',
    message: `${actionLabel} ${item.label}？（当前 ${currentText}，最新 ${latestText}）`,
    default: true,
  }])

  if (!confirmInstall) {
    console.log()
    console.log(ansis.gray('  已取消'))
    console.log()
    return
  }

  console.log()
  console.log(ansis.cyan(`  正在处理 ${item.label}...`))
  console.log()
  await runInteractiveCommand('npm', ['install', '-g', `${item.packageName}@latest`])
  console.log(ansis.green(`  ${item.label} 已安装 / 更新完成`))
  console.log()
}

async function uninstallManagedPackage(item: ManagedPackageStatus): Promise<void> {
  if (item.installType === 'external-link') {
    console.log()
    console.log(ansis.gray(`  ${item.label} 为外部桌面客户端，请在系统应用管理中卸载`))
    console.log()
    return
  }

  if (!item.installedVersion) {
    console.log()
    console.log(ansis.gray(`  ${item.label} 当前未安装`))
    console.log()
    return
  }

  const { confirmUninstall } = await inquirer.prompt([{
    type: 'confirm',
    name: 'confirmUninstall',
    message: `卸载 ${item.label}？（当前 v${item.installedVersion}）`,
    default: false,
  }])

  if (!confirmUninstall) {
    console.log()
    console.log(ansis.gray('  已取消'))
    console.log()
    return
  }

  console.log()
  console.log(ansis.cyan(`  正在卸载 ${item.label}...`))
  console.log()
  if (!item.packageName) {
    throw new Error(`${item.label} 缺少 npm 包名配置`)
  }
  await runInteractiveCommand('npm', ['uninstall', '-g', item.packageName])
  console.log(ansis.green(`  ${item.label} 已卸载`))
  console.log()
}

async function runManagedPackage(item: ManagedPackageStatus): Promise<void> {
  if (!item.runCommand) {
    return
  }

  console.log()
  console.log(ansis.cyan(`  正在运行 ${item.label}...`))
  console.log()
  await runInteractiveCommand(item.runCommand.command, item.runCommand.args)
  if (item.runCommand.successText) {
    console.log(ansis.green(item.runCommand.successText))
  }
  console.log()
}

async function openManagedPackageTutorial(item: ManagedPackageStatus): Promise<void> {
  const url = item.tutorialUrl
  if (!url) {
    console.log()
    console.log(ansis.gray(`  ${item.label} 暂未配置教程地址`))
    console.log()
    return
  }

  const actionText = item.tutorialActionText || '打开教程'
  const { confirmOpen } = await inquirer.prompt([{
    type: 'confirm',
    name: 'confirmOpen',
    message: `${actionText}：${item.label}？`,
    default: true,
  }])

  if (!confirmOpen) {
    console.log()
    console.log(ansis.gray('  已取消'))
    console.log()
    return
  }

  console.log()
  const opened = await openExternalUrl(url)
  if (opened) {
    console.log(ansis.green(`  已尝试打开 ${item.label} 教程`))
  }
  else {
    console.log(ansis.yellow(`  未能自动打开浏览器，请手动访问 ${url}`))
  }
  console.log()
}

async function manageSinglePackage(item: ManagedPackageStatus): Promise<void> {
  const installLabel = getPackageActionLabel(item)
  const choices = [
    ...(item.runOnly ? [] : [{ name: installLabel, value: 'install' }]),
    ...(item.installedVersion && item.installType !== 'external-link' ? [{ name: '卸载', value: 'uninstall' }] : []),
    ...(item.runCommand ? [{ name: item.installedVersion ? '运行' : '运行（npx）', value: 'run' }] : []),
    ...(item.tutorialUrl && item.tutorialUrl !== item.externalUrl ? [{ name: '打开教程', value: 'tutorial' }] : []),
    { name: '返回', value: 'back' },
  ]

  const { action } = await promptMenuList([{
    type: 'list',
    name: 'action',
    message: `选择 ${item.label} 的操作`,
    choices,
    theme: {
      indexMode: 'number',
    },
  }])

  if (action === 'install') {
    await installOrUpdateManagedPackage(item)
  }
  else if (action === 'uninstall') {
    await uninstallManagedPackage(item)
  }
  else if (action === 'run') {
    await runManagedPackage(item)
  }
  else if (action === 'tutorial') {
    await openManagedPackageTutorial(item)
  }
}

async function runManagedPackageMenu(
  packages: ManagedPackage[],
  options: {
    title: string
    subtitle: string
    selectMessage: string
    continueMessage: string
    silentDetection?: boolean
    showSummary?: boolean
    showRefresh?: boolean
    groupChoices?: (statuses: ManagedPackageStatus[]) => any[]
  },
): Promise<void> {
  while (true) {
    const statuses = await detectManagedPackageStatuses(packages, options.title, {
      silent: options.silentDetection,
    })

    if (options.showSummary !== false) {
      printManagedPackageStatusLines(statuses, {
        title: options.title,
        subtitle: options.subtitle,
      })
    }

    const { target } = await promptMenuList([{
      type: 'list',
      name: 'target',
      message: options.selectMessage,
      choices: options.groupChoices
        ? [
            ...options.groupChoices(statuses),
            ...(options.showRefresh === false ? [] : [{ name: '重新检测版本', value: 'refresh' }]),
            { name: '返回', value: 'back' },
          ]
        : [
            ...statuses.map(item => ({
              name: formatManagedPackageChoice(item),
              value: item.id,
            })),
            ...(options.showRefresh === false ? [] : [{ name: '重新检测版本', value: 'refresh' }]),
            { name: '返回', value: 'back' },
          ],
      pageSize: 10,
      theme: {
        indexMode: 'number',
      },
    }])

    if (target === 'back') return
    if (target === 'refresh') continue

    const selected = statuses.find(item => item.id === target)
    if (!selected) continue

    if (selected.openDirectly) {
      console.log()
      if (selected.externalUrl && await openExternalUrl(selected.externalUrl)) {
        console.log(ansis.green(`  已尝试打开 ${selected.label} 项目页`))
      }
      else if (selected.externalUrl) {
        console.log(ansis.yellow(`  未能自动打开浏览器，请手动访问 ${selected.externalUrl}`))
      }
      else {
        console.log(ansis.red(`  ${selected.label} 未配置项目地址`))
      }
      console.log()

      await inquirer.prompt([{
        type: 'input',
        name: 'continue',
        message: ansis.gray(options.continueMessage),
      }])
      continue
    }

    await manageSinglePackage(selected)

    await inquirer.prompt([{
      type: 'input',
      name: 'continue',
      message: ansis.gray(options.continueMessage),
    }])
  }
}

export async function runCodingToolsMenu(): Promise<void> {
  while (true) {
    const cliStatuses = await detectManagedPackageStatuses(CODING_TOOL_CLI_PACKAGES, 'CLI 工具')
    const desktopStatuses: ManagedPackageStatus[] = CODING_TOOL_DESKTOP_PACKAGES.map(item => ({
      ...item,
      installedVersion: null,
      latestVersion: null,
    }))

    console.log()
    console.log(ansis.cyan.bold('  安装编程工具'))
    console.log(ansis.gray('  同页展示 CLI 命令行版与桌面端 UI；仅 CLI 工具执行版本检测'))
    console.log()

    const { target } = await promptMenuList([{
      type: 'list',
      name: 'target',
      message: '选择要管理的编程工具',
      choices: [
        new inquirer.Separator('---------- CLI 命令行版 ----------'),
        ...cliStatuses.map(item => ({
          name: formatManagedPackageChoice(item),
          value: item.id,
        })),
        { name: '重新检测 CLI 版本', value: 'refresh' },
        new inquirer.Separator('---------- 桌面端 UI ----------'),
        ...desktopStatuses.map(item => ({
          name: formatManagedPackageChoice(item),
          value: item.id,
        })),
        { name: '返回', value: 'back' },
      ],
      pageSize: 14,
      theme: {
        indexMode: 'number',
      },
    }])

    if (target === 'back') return
    if (target === 'refresh') {
      continue
    }

    const statuses = [...cliStatuses, ...desktopStatuses]
    const selected = statuses.find(item => item.id === target)
    if (!selected) continue

    if (selected.openDirectly) {
      console.log()
      if (selected.externalUrl && await openExternalUrl(selected.externalUrl)) {
        console.log(ansis.green(`  已尝试打开 ${selected.label}`))
      }
      else if (selected.externalUrl) {
        console.log(ansis.yellow(`  未能自动打开浏览器，请手动访问 ${selected.externalUrl}`))
      }
      else {
        console.log(ansis.red(`  ${selected.label} 未配置项目地址`))
      }
    }
    else {
      await manageSinglePackage(selected)
    }

    console.log()
    await inquirer.prompt([{
      type: 'input',
      name: 'continue',
      message: ansis.gray('按 Enter 返回编程工具菜单...'),
    }])
  }
}

export async function runAiAccountManagementMenu(): Promise<void> {
  await runManagedPackageMenu(AI_ACCOUNT_MANAGEMENT_PACKAGES, {
    title: '模型账号管理、续杯',
    subtitle: '按客户端与账号 / token 供应商分组展示常用入口，也包含科学上网推荐列表快捷入口',
    selectMessage: '选择要打开的网页',
    continueMessage: '按 Enter 返回 模型账号管理菜单...',
    silentDetection: true,
    showSummary: false,
    showRefresh: false,
    groupChoices: statuses => [
      new inquirer.Separator('---------- 客户端 ----------'),
      ...statuses
        .filter(item => item.accountCategory === 'client')
        .map(item => ({
          name: formatManagedPackageChoice(item),
          value: item.id,
        })),
      new inquirer.Separator('---------- 账号 / token 供应商 ----------'),
      ...statuses
        .filter(item => item.accountCategory === 'provider')
        .map(item => ({
          name: formatManagedPackageChoice(item),
          value: item.id,
        })),
    ],
  })
}

export async function runClaudeCodeToolsMenu(): Promise<void> {
  await runManagedPackageMenu(CLAUDE_CODE_TOOL_PACKAGES, {
    title: 'Claude Code 工具',
    subtitle: '统一管理 Claude Code、ccusage、CCR 与 CCometixLine',
    selectMessage: '选择要管理的 Claude Code 工具',
    continueMessage: '按 Enter 返回 Claude Code 工具菜单...',
  })
}

export async function runModelUsageMenu(): Promise<void> {
  await runManagedPackageMenu(MODEL_USAGE_PACKAGES, {
    title: '模型使用统计',
    subtitle: '统一运行 Claude Code、Codex 与网页版的模型使用统计命令',
    selectMessage: '选择要运行的模型使用统计工具',
    continueMessage: '按 Enter 返回模型使用统计菜单...',
    silentDetection: true,
    showRefresh: false,
  })
}

export async function runPopularWorkflowsMenu(): Promise<void> {
  await runManagedPackageMenu(POPULAR_WORKFLOW_PACKAGES, {
    title: '热门开源工作流',
    subtitle: '查看热门开源工作流的安装状态、版本、描述与教程入口',
    selectMessage: '选择要管理的热门开源工作流',
    continueMessage: '按 Enter 返回热门开源工作流菜单...',
  })
}
