import { homedir } from 'node:os'
import { basename, dirname, extname, join } from 'pathe'
import fs from 'fs-extra'
import { getCodexDir } from './installer-paths'

export type PromptProfileId = 'claude' | 'codex' | 'gemini'

export type PromptProfileDefinition = {
  id: PromptProfileId
  label: string
  description: string
  path: string
}

export type PromptBackupEntry = {
  fileName: string
  path: string
  size: number
  modifiedAt: string
}

export function getPromptProfileDefinitions(): PromptProfileDefinition[] {
  return [
    {
      id: 'claude',
      label: 'Claude 提示词',
      description: '编辑 Claude Code 全局提示词',
      path: join(homedir(), '.claude', 'CLAUDE.md'),
    },
    {
      id: 'codex',
      label: 'Codex 提示词',
      description: '编辑 Codex 全局提示词',
      path: join(getCodexDir(), 'AGENTS.md'),
    },
    {
      id: 'gemini',
      label: 'Gemini 提示词',
      description: '编辑 Gemini CLI 全局提示词',
      path: join(homedir(), '.gemini', 'GEMINI.md'),
    },
  ]
}

export function getPromptProfileDefinition(profileId: PromptProfileId): PromptProfileDefinition {
  return getPromptProfileDefinitions().find(item => item.id === profileId) || getPromptProfileDefinitions()[0]
}

export function getPromptBackupDir(filePath: string): string {
  const baseName = basename(filePath)
  const nameWithoutExt = baseName.slice(0, Math.max(0, baseName.length - extname(baseName).length)) || baseName
  return join(dirname(filePath), `${nameWithoutExt}-backup`)
}

export function getTimestampedBackupPath(filePath: string, now = new Date()): string {
  return join(getPromptBackupDir(filePath), `${basename(filePath)}.bak-${now.toISOString().replace(/[:.]/g, '-')}`)
}

export async function backupFileIfExists(filePath: string, now = new Date()): Promise<string | null> {
  if (!(await fs.pathExists(filePath))) {
    return null
  }

  const stat = await fs.stat(filePath)
  if (!stat.isFile()) {
    throw new Error(`目标不是文件：${filePath}`)
  }

  const backupPath = getTimestampedBackupPath(filePath, now)
  await fs.ensureDir(getPromptBackupDir(filePath))
  await fs.copy(filePath, backupPath, { overwrite: false, errorOnExist: true })
  return backupPath
}

export async function listPromptBackupEntries(filePath: string): Promise<PromptBackupEntry[]> {
  const fileDir = getPromptBackupDir(filePath)
  const targetName = basename(filePath)

  if (!(await fs.pathExists(fileDir))) {
    return []
  }

  const entries = await fs.readdir(fileDir)
  const backups = await Promise.all(entries
    .filter(name => name.startsWith(`${targetName}.bak-`))
    .map(async (fileName) => {
      const backupPath = join(fileDir, fileName)
      const stat = await fs.stat(backupPath)
      if (!stat.isFile()) {
        return null
      }

      return {
        fileName,
        path: backupPath,
        size: stat.size,
        modifiedAt: stat.mtime.toISOString(),
      } satisfies PromptBackupEntry
    }))

  return backups
    .filter((entry): entry is PromptBackupEntry => entry !== null)
    .sort((a, b) => b.fileName.localeCompare(a.fileName))
}

export async function readPromptFile(filePath: string): Promise<string> {
  if (!(await fs.pathExists(filePath))) {
    return ''
  }

  return fs.readFile(filePath, 'utf-8')
}

export async function writePromptFileWithBackup(filePath: string, content: string, now = new Date()): Promise<string | null> {
  await fs.ensureDir(dirname(filePath))
  const backupPath = await backupFileIfExists(filePath, now)
  await fs.writeFile(filePath, content, 'utf-8')
  return backupPath
}

export async function restorePromptFileFromBackup(filePath: string, backupFileName: string, now = new Date()): Promise<string | null> {
  if (basename(backupFileName) !== backupFileName || !backupFileName.startsWith(`${basename(filePath)}.bak-`)) {
    throw new Error('非法的备份文件名')
  }

  const backupPath = join(getPromptBackupDir(filePath), backupFileName)
  if (!(await fs.pathExists(backupPath))) {
    throw new Error('备份文件不存在')
  }

  const stat = await fs.stat(backupPath)
  if (!stat.isFile()) {
    throw new Error('备份目标不是文件')
  }

  const content = await fs.readFile(backupPath, 'utf-8')
  return writePromptFileWithBackup(filePath, content, now)
}
