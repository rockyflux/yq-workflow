#!/usr/bin/env node
import ansis from 'ansis'
import cac from 'cac'
import { setupCommands } from './cli-setup'
import { i18n } from './i18n'
import { isPromptExitError } from './utils/prompt-exit'

function handlePromptInterrupt(error: unknown): boolean {
  if (!isPromptExitError(error)) {
    return false
  }

  console.log()
  console.log(ansis.gray(`  ${i18n.t('common:goodbye') || '再见！'}`))
  console.log()
  process.exit(0)
}

async function main(): Promise<void> {
  const cli = cac('yq')
  await setupCommands(cli)
  cli.parse()
}

process.on('uncaughtException', (error) => {
  if (handlePromptInterrupt(error)) {
    return
  }

  console.error(error)
  process.exit(1)
})

process.on('unhandledRejection', (reason) => {
  if (handlePromptInterrupt(reason)) {
    return
  }

  console.error(reason)
  process.exit(1)
})

main().catch((error) => {
  if (handlePromptInterrupt(error)) {
    return
  }

  console.error(error)
  process.exitCode = 1
})
