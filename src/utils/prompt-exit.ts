export function isPromptExitError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false
  }

  return error.name === 'ExitPromptError'
    || error.message.includes('User force closed the prompt')
}
