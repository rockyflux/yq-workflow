import ansis from 'ansis'
import inquirer from 'inquirer'
import { spawn } from 'node:child_process'

export function formatMenuChoice(label: string, description?: string): string {
  if (!description) {
    return label
  }

  const normalizedDescription = description.replace(/^\s*-\s*/u, '')
  return `${label}  ${ansis.gray(`-  ${normalizedDescription}`)}`
}

export async function promptMenuList(questions: any): Promise<any> {
  console.log()
  const normalizedQuestions = Array.isArray(questions)
    ? questions.map((question) => {
        if (question?.type === 'list' && typeof question.message === 'string' && !question.message.endsWith('\n')) {
          return {
            ...question,
            message: `${question.message}\n`,
          }
        }
        return question
      })
    : questions

  return inquirer.prompt(normalizedQuestions)
}

function resolveInteractiveCommand(command: string, args: string[]): { command: string, args: string[] } {
  if (process.platform !== 'win32') {
    return { command, args }
  }

  if (command === 'start') {
    return {
      command: 'cmd',
      args: ['/c', 'start', '', ...args],
    }
  }

  if (['npm', 'npx', 'pnpm', 'corepack'].includes(command)) {
    return {
      command: 'cmd',
      args: ['/c', command, ...args],
    }
  }

  return { command, args }
}

export function runInteractiveCommand(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const resolved = resolveInteractiveCommand(command, args)
    const child = spawn(resolved.command, resolved.args, {
      cwd: process.cwd(),
      stdio: 'inherit',
      env: process.env,
    })

    child.on('exit', code => {
      if (code === 0) resolve()
      else reject(new Error(`${resolved.command} exited with code ${code ?? 'unknown'}`))
    })
    child.on('error', reject)
  })
}

export async function openExternalUrl(url: string): Promise<boolean> {
  try {
    if (process.platform === 'win32') {
      await runInteractiveCommand('start', [url])
    }
    else if (process.platform === 'darwin') {
      await runInteractiveCommand('open', [url])
    }
    else {
      await runInteractiveCommand('xdg-open', [url])
    }

    return true
  }
  catch {
    return false
  }
}
