import { homedir } from 'node:os'
import { join, resolve, sep } from 'node:path'
import fs from 'fs-extra'
import { getAgentSkillsDir, getCodexDir, getKiroSkillsDir } from './installer'

export type HelpRootId =
  | 'agents'
  | 'claude'
  | 'codex'
  | 'cursor'
  | 'gemini'
  | 'kiro'
  | 'openclaw'
  | 'qoder'
  | 'trae'

export type HelpRootDefinition = {
  id: HelpRootId
  label: string
  path: string
}

export type HelpTreeNode = {
  name: string
  relativePath: string
  type: 'directory' | 'file'
  children?: HelpTreeNode[]
}

export function getHelpRootDefinitions(): HelpRootDefinition[] {
  return [
    { id: 'agents', label: '.agents/skills', path: getAgentSkillsDir() },
    { id: 'claude', label: '.claude/skills', path: join(homedir(), '.claude', 'skills') },
    { id: 'codex', label: '.codex/skills', path: join(getCodexDir(), 'skills') },
    { id: 'cursor', label: '.cursor/skills', path: join(homedir(), '.cursor', 'skills') },
    { id: 'gemini', label: '.gemini/skills', path: join(homedir(), '.gemini', 'skills') },
    { id: 'kiro', label: '.kiro/skills', path: getKiroSkillsDir() },
    { id: 'openclaw', label: '.openclaw/skills', path: join(homedir(), '.openclaw', 'skills') },
    { id: 'qoder', label: '.qoder/skills', path: join(homedir(), '.qoder', 'skills') },
    { id: 'trae', label: '.trae/skills', path: join(homedir(), '.trae', 'skills') },
  ]
}

export function getHelpRootDefinition(rootId: HelpRootId): HelpRootDefinition {
  return getHelpRootDefinitions().find(root => root.id === rootId) || getHelpRootDefinitions()[0]
}

export async function buildHelpTree(rootPath: string): Promise<HelpTreeNode[]> {
  if (!(await fs.pathExists(rootPath))) {
    return []
  }

  const scan = async (dirPath: string, relativeDir = ''): Promise<HelpTreeNode[]> => {
    const entries = await fs.readdir(dirPath, { withFileTypes: true })
    const nodes = await Promise.all(entries.map(async (entry) => {
      const entryPath = join(dirPath, entry.name)
      const relativePath = relativeDir ? join(relativeDir, entry.name) : entry.name
      if (entry.isDirectory()) {
        return {
          name: entry.name,
          relativePath,
          type: 'directory' as const,
          children: await scan(entryPath, relativePath),
        }
      }

      return {
        name: entry.name,
        relativePath,
        type: 'file' as const,
      }
    }))

    return nodes.sort(compareTreeNodes)
  }

  return scan(rootPath)
}

export function resolveHelpFilePath(rootPath: string, relativePath: string): string | null {
  const normalizedRoot = resolve(rootPath)
  const targetPath = resolve(normalizedRoot, relativePath)
  const rootWithSep = normalizedRoot.endsWith(sep) ? normalizedRoot : `${normalizedRoot}${sep}`

  if (targetPath !== normalizedRoot && !targetPath.startsWith(rootWithSep)) {
    return null
  }

  return targetPath
}

function compareTreeNodes(a: HelpTreeNode, b: HelpTreeNode): number {
  if (a.type !== b.type) {
    return a.type === 'directory' ? -1 : 1
  }

  return a.name.localeCompare(b.name, 'zh-CN')
}
