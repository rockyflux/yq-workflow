import fs from 'fs-extra'
import { homedir } from 'node:os'
import { join } from 'pathe'

export interface AgentSkillDirectory {
  name: string
  path: string
  relativePath: string
}

export function getAgentSkillsDir(): string {
  return process.env.YQ_AGENT_SKILLS_DIR || join(homedir(), '.agents', 'skills')
}

export function getCodexDir(): string {
  return process.env.YQ_CODEX_DIR || join(homedir(), '.codex')
}

export async function listAgentSkillDirectories(rootDir = getAgentSkillsDir()): Promise<AgentSkillDirectory[]> {
  if (!(await fs.pathExists(rootDir))) {
    return []
  }

  const results: AgentSkillDirectory[] = []

  async function scan(dir: string, relativeDir = ''): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true })

    for (const entry of entries) {
      if (!entry.isDirectory()) continue

      const entryPath = join(dir, entry.name)
      const entryRelativePath = relativeDir ? join(relativeDir, entry.name) : entry.name

      results.push({
        name: entry.name,
        path: entryPath,
        relativePath: entryRelativePath,
      })

      await scan(entryPath, entryRelativePath)
    }
  }

  await scan(rootDir)
  return results.sort((a, b) => a.relativePath.localeCompare(b.relativePath))
}
