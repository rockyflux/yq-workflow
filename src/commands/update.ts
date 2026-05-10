import ansis from 'ansis'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import inquirer from 'inquirer'
import ora from 'ora'
import { checkForUpdates, compareVersions } from '../utils/version'
import { readCcgConfig } from '../utils/config'
import { detectRuntimeSource } from '../utils/runtime-source'

const execAsync = promisify(exec)

export async function update(): Promise<void> {
  console.log()
  console.log(ansis.cyan.bold(`🔄 ${'检查更新...'}`))
  console.log()

  const spinner = ora('正在检查最新版本...').start()

  try {
    const { hasUpdate, currentVersion, latestVersion } = await checkForUpdates()
    const config = await readCcgConfig()
    const localVersion = config?.general?.version || '0.0.0'
    const runtimeSource = detectRuntimeSource()
    const needsWorkflowUpdate = compareVersions(currentVersion, localVersion) > 0
    const isCliOlderThanLocalWorkflow = compareVersions(currentVersion, localVersion) < 0
    const isLocalWorkflowLatest = latestVersion ? compareVersions(latestVersion, localVersion) === 0 : false
    spinner.stop()

    if (!latestVersion) {
      console.log(ansis.red('❌ 无法连接到 npm registry，请检查网络连接'))
      return
    }

    console.log(`当前版本: ${ansis.yellow(`v${currentVersion}`)}`)
    console.log(`最新版本: ${ansis.green(`v${latestVersion}`)}`)
    if (localVersion !== '0.0.0') {
      console.log(`本地工作流: ${ansis.gray(`v${localVersion}`)}`)
    }
    console.log()

    if (isCliOlderThanLocalWorkflow && isLocalWorkflowLatest) {
      console.log(ansis.yellow(`检测到当前运行的是较旧 CLI 入口（来源：${runtimeSource.label}，当前 v${currentVersion}，本地工作流 v${localVersion}）。`))
      console.log(ansis.gray('这时无需重装工作流，请改用 npx --yes yq-workflow@latest，或升级全局 yq-workflow 后重试。'))
      if (runtimeSource.path) {
        console.log(ansis.gray(`当前脚本路径: ${runtimeSource.path}`))
      }
      console.log()
      return
    }

    const message = hasUpdate
      ? `发现新版本 v${latestVersion}，是否更新？`
      : needsWorkflowUpdate
        ? `检测到本地工作流版本较旧，是否重新安装当前版本的工作流？`
        : `当前已是最新版本，是否强制重装工作流？`

    const { confirmUpdate } = await inquirer.prompt([{
      type: 'confirm',
      name: 'confirmUpdate',
      message,
      default: hasUpdate || needsWorkflowUpdate,
    }])

    if (!confirmUpdate) {
      console.log(ansis.gray('已取消更新'))
      return
    }

    const installSpinner = ora('正在下载并重装工作流...').start()
    await execAsync('npx --yes yq-workflow@latest init --force --skip-mcp --skip-prompt', {
      timeout: 300000,
      env: {
        ...process.env,
        YQ_UPDATE_MODE: 'true',
      },
    })
    installSpinner.succeed('工作流更新完成')

    console.log()
    if (hasUpdate) {
      console.log(ansis.gray(`已从 v${currentVersion} 更新到最新安装包，工作流已重装`))
    }
    else {
      console.log(ansis.gray('当前版本的工作流已重新安装'))
    }
    console.log()
  }
  catch (error) {
    spinner.stop()
    console.log(ansis.red(`❌ 更新失败: ${String(error)}`))
  }
}
