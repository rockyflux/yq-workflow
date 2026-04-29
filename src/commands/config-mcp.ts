import ansis from 'ansis'
import inquirer from 'inquirer'
import { closeMcpWebServer, getActiveMcpWebState, launchMcpWebDetached } from './mcp-web'

export async function configMcp(): Promise<void> {
  const activeMcpWeb = await getActiveMcpWebState()
  console.log()
  console.log(ansis.cyan.bold('  配置 MCP'))
  console.log(ansis.gray('  通过本地网页独立管理 Claude / Codex / Gemini / Cursor / Kiro 的 MCP 配置'))
  console.log(ansis.gray('  预置模板仍按四类维护：必装工具、数据库操作、Git / 版本控制、文件 / 资源操作'))
  if (activeMcpWeb) {
    console.log(ansis.green(`  本地 MCP 配置页运行中：${activeMcpWeb.url}`))
  }
  console.log()

  const result = await launchMcpWebDetached('claude')
  if (result.status === 'reused') {
    console.log(ansis.green(`  已复用已打开的 MCP 配置页：${result.url}`))
  }
  else {
    console.log(ansis.green('  已尝试打开本地 MCP 配置页，默认展示 Claude 配置'))
  }
  console.log(ansis.gray('  如未自动打开，可执行 yq config mcp-web'))
  console.log(ansis.gray('  按 Enter 将关闭本地 MCP 配置页，并自动返回'))
  console.log()

  await inquirer.prompt([{
    type: 'input',
    name: 'continue',
    message: ansis.gray('按 Enter 关闭本地 MCP 配置页并返回...'),
  }])

  const closed = await closeMcpWebServer()
  console.log()
  if (closed) {
    console.log(ansis.green('  已关闭本地 MCP 配置页'))
  }
  else {
    console.log(ansis.gray('  当前没有运行中的本地 MCP 配置页'))
  }
  console.log()
}
