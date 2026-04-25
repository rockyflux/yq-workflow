import type { CAC } from 'cac'
import type { CliOptions } from './types'
import ansis from 'ansis'
import { version } from '../package.json'
import { configMcp } from './commands/config-mcp'
import { diagnoseMcp, fixMcp } from './commands/diagnose-mcp'
import { closeHelpWebServer, startHelpWebServer } from './commands/help-web'
import { init } from './commands/init'
import { configApi, configSkills, showHelp, showMainMenu } from './commands/menu'
import { i18n, initI18n } from './i18n'

function customizeHelp(sections: any[]): any[] {
  sections.unshift({
    title: '',
    body: ansis.cyan.bold(`YQ AI Coding Toolkit v${version}`),
  })

  sections.push({
    title: ansis.yellow(i18n.t('cli:help.commands')),
    body: [
      `  ${ansis.cyan('yq')}               ${i18n.t('cli:help.commandDescriptions.showMenu')}`,
      `  ${ansis.cyan('yq menu')}          ${i18n.t('cli:help.commandDescriptions.showMenu')}`,
      `  ${ansis.cyan('yq init')} | ${ansis.cyan('i')}      ${i18n.t('cli:help.commandDescriptions.initConfig')}`,
      `  ${ansis.cyan('yq help')}          查看常用命令说明`,
      `  ${ansis.cyan('yq config skills')} 打开 Skills 配置菜单`,
      `  ${ansis.cyan('yq config skills-web')} 直接打开 Skills 网页帮助`,
      `  ${ansis.cyan('yq config mcp')}    ${i18n.t('cli:help.commandDescriptions.configMcp')}`,
      `  ${ansis.cyan('yq config api')}    打开 cc-switch 下载页`,
      `  ${ansis.cyan('yq diagnose-mcp')}  ${i18n.t('cli:help.commandDescriptions.diagnoseMcp')}`,
      `  ${ansis.cyan('yq fix-mcp')}       ${i18n.t('cli:help.commandDescriptions.fixMcp')}`,
      '',
      ansis.gray(`  ${i18n.t('cli:help.shortcuts')}`),
      `  ${ansis.cyan('yq i')}             ${i18n.t('cli:help.shortcutDescriptions.quickInit')}`,
    ].join('\n'),
  })

  sections.push({
    title: ansis.yellow(i18n.t('cli:help.options')),
    body: [
      `  ${ansis.green('--force, -f')}               ${i18n.t('cli:help.optionDescriptions.forceOverwrite')}`,
      `  ${ansis.green('--help, -h')}                ${i18n.t('cli:help.optionDescriptions.displayHelp')}`,
      `  ${ansis.green('--version, -v')}             ${i18n.t('cli:help.optionDescriptions.displayVersion')}`,
      '',
      ansis.gray(`  ${i18n.t('cli:help.nonInteractiveMode')}`),
      `  ${ansis.green('--skip-prompt, -s')}         ${i18n.t('cli:help.optionDescriptions.skipAllPrompts')}`,
      `  ${ansis.green('--skip-mcp')}                Skip MCP configuration during install`,
      `  ${ansis.green('--workflows, -w')} <list>    ${i18n.t('cli:help.optionDescriptions.workflows')}`,
      `  ${ansis.green('--install-dir, -d')} <path>  ${i18n.t('cli:help.optionDescriptions.installDir')}`,
    ].join('\n'),
  })

  sections.push({
    title: ansis.yellow(i18n.t('cli:help.examples')),
    body: [
      ansis.gray(`  # ${i18n.t('cli:help.exampleDescriptions.showInteractiveMenu')}`),
      `  ${ansis.cyan('yq')}`,
      '',
      ansis.gray(`  # ${i18n.t('cli:help.exampleDescriptions.runFullInitialization')}`),
      `  ${ansis.cyan('yq init')}`,
      `  ${ansis.cyan('yq i')}`,
      '',
      ansis.gray('  # Non-interactive install'),
      `  ${ansis.cyan('yq i --skip-prompt --skip-mcp')}`,
      '',
    ].join('\n'),
  })

  return sections
}

export async function setupCommands(cli: CAC): Promise<void> {
  try {
    await initI18n('zh-CN')
  }
  catch {
    await initI18n('zh-CN')
  }

  cli
    .command('', i18n.t('cli:help.commandDescriptions.showMenu'))
    .action(async (_options: CliOptions) => {
      await showMainMenu()
    })

  cli
    .command('menu', i18n.t('cli:help.commandDescriptions.showMenu'))
    .action(async () => {
      await showMainMenu()
    })

  cli
    .command('init', i18n.t('cli:help.commandDescriptions.initConfig'))
    .alias('i')
    .option('--force, -f', i18n.t('cli:help.optionDescriptions.forceOverwrite'))
    .option('--skip-prompt, -s', i18n.t('cli:help.optionDescriptions.skipAllPrompts'))
    .option('--skip-mcp', 'Skip MCP configuration (used during update)')
    .option('--workflows, -w <workflows>', i18n.t('cli:help.optionDescriptions.workflows'))
    .option('--install-dir, -d <path>', i18n.t('cli:help.optionDescriptions.installDir'))
    .action(async (options: CliOptions) => {
      await init(options)
    })

  cli
    .command('help', '查看帮助概览')
    .action(async () => {
      await showHelp()
    })

  cli
    .command('diagnose-mcp', i18n.t('cli:help.commandDescriptions.diagnoseMcp'))
    .action(async () => {
      await diagnoseMcp()
    })

  cli
    .command('fix-mcp', i18n.t('cli:help.commandDescriptions.fixMcp'))
    .action(async () => {
      await fixMcp()
    })

  cli
    .command('config <subcommand>', i18n.t('cli:help.commandDescriptions.configMcp'))
    .action(async (subcommand: string) => {
      if (subcommand === 'mcp') {
        await configMcp()
      }
      else if (subcommand === 'api') {
        await configApi()
      }
      else if (subcommand === 'skills') {
        await configSkills()
      }
      else if (subcommand === 'skills-web') {
        await startHelpWebServer({ openBrowser: true })
      }
      else if (subcommand === 'skills-web-close') {
        const closed = await closeHelpWebServer()
        if (closed) {
          console.log(ansis.green('已关闭本地网页版 Skills'))
        }
        else {
          console.log(ansis.gray('当前没有运行中的本地网页版 Skills'))
        }
      }
      else {
        console.log(ansis.red(i18n.t('common:unknownSubcommand', { subcommand })))
        console.log(ansis.gray(i18n.t('common:availableSubcommands', { list: 'mcp, api, skills, skills-web, skills-web-close' })))
      }
    })

  cli.help(sections => customizeHelp(sections))
  cli.version(version)
}
