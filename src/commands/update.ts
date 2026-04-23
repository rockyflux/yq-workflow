import ansis from 'ansis'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import inquirer from 'inquirer'
import ora from 'ora'
import { checkForUpdates, compareVersions } from '../utils/version'
import { readCcgConfig } from '../utils/config'

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
    const needsWorkflowUpdate = compareVersions(currentVersion, localVersion) > 0
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
