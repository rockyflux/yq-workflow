import type { InstallResult } from '../types'
import ansis from 'ansis'
import fs from 'fs-extra'
import { exec, execFile } from 'node:child_process'
import { homedir } from 'node:os'
import { basename, dirname, join } from 'pathe'
import { promisify } from 'node:util'
import { getWorkflowById } from './installer-data'
import { PACKAGE_ROOT, injectConfigVariables, replaceHomePathsInTemplate } from './installer-template'
import { installSkillCommands } from './skill-registry'

const execAsync = promisify(exec)
const execFileAsync = promisify(execFile)

export {
  getAllCommandIds,
  getWorkflowById,
  getWorkflowConfigs,
  getWorkflowPreset,
  WORKFLOW_PRESETS,
} from './installer-data'
export type { WorkflowPreset } from './installer-data'

export { injectConfigVariables } from './installer-template'

export {
  installAceTool,
  installAceToolRs,
  installContextWeaver,
  installFastContext,
  installMcpServer,
  uninstallAceTool,
  uninstallContextWeaver,
  uninstallFastContext,
  uninstallMcpServer,
} from './installer-mcp'
export type { ContextWeaverConfig } from './installer-mcp'

export {
  removeFastContextPrompt,
  writeFastContextPrompt,
} from './installer-prompt'

export {
  collectInvocableSkills,
  collectSkills,
  parseFrontmatter,
} from './skill-registry'
export type { SkillMeta } from './skill-registry'

interface InstallConfig {
  liteMode: boolean
  mcpProvider: string
  skipImpeccable?: boolean
}

interface InstallContext {
  installDir: string
  force: boolean
  config: InstallConfig
  templateDir: string
  result: InstallResult
}

export interface AgentSkillDirectory {
  name: string
  path: string
  relativePath: string
}

export type BaseEnvironmentToolId = 'git' | 'powershell' | 'nodejs' | 'python' | 'pnpm' | 'uv' | 'vscode'

export interface BaseEnvironmentInstallAction {
  id: string
  label: string
  type: 'command' | 'link'
  command?: string
  args?: string[]
  url?: string
  successText?: string
}

export interface BaseEnvironmentToolStatus {
  id: BaseEnvironmentToolId
  label: string
  description: string
  installed: boolean
  version: string | null
  detail: string
  installActions: BaseEnvironmentInstallAction[]
}

export const SCIENTIFIC_INTERNET_GUIDE_URL = 'https://www.ermao.net/posts/vpn/'

type DetectionAttempt = {
  command: string
  args: string[]
  label: string
  versionPattern?: RegExp
  runner?: 'exec-file' | 'powershell'
}

type BaseEnvironmentToolDefinition = {
  id: BaseEnvironmentToolId
  label: string
  description: string
  detect: (platform?: NodeJS.Platform) => DetectionAttempt[]
  getDetail: (version: string | null, sourceLabel: string | null, platform?: NodeJS.Platform, commandPath?: string | null) => string
  installActions: Partial<Record<NodeJS.Platform, BaseEnvironmentInstallAction[]>>
  locateCommand?: string | ((platform: NodeJS.Platform) => string | null)
}

function extractVersion(output: string, pattern?: RegExp): string | null {
  const normalized = output.trim()
  if (!normalized) {
    return null
  }

  const match = (pattern || /(\d+(?:\.\d+)+)/).exec(normalized)
  return match?.[1] || null
}

function toPowerShellLiteral(value: string): string {
  return `'${value.replace(/'/g, '\'\'')}'`
}

export function buildPowerShellDetectionCommand(command: string, args: string[]): string {
  const parts = [toPowerShellLiteral(command), ...args.map(toPowerShellLiteral)]
  return `& ${parts.join(' ')}`
}

async function resolveCommandPath(command: string, platform: NodeJS.Platform): Promise<string | null> {
  try {
    const locator = platform === 'win32' ? 'where.exe' : 'which'
    const { stdout } = await execFileAsync(locator, [command], {
      timeout: 10000,
      windowsHide: true,
    })
    const firstLine = stdout.split(/\r?\n/u).map(item => item.trim()).find(Boolean)
    return firstLine || null
  }
  catch {
    return null
  }
}

async function detectCommandVersion(attempts: DetectionAttempt[]): Promise<{ version: string | null, sourceLabel: string | null }> {
  for (const attempt of attempts) {
    try {
      const { stdout, stderr } = attempt.runner === 'powershell'
        ? await execFileAsync('powershell', ['-NoProfile', '-Command', buildPowerShellDetectionCommand(attempt.command, attempt.args)], {
            timeout: 20000,
            windowsHide: true,
          })
        : await execFileAsync(attempt.command, attempt.args, {
            timeout: 20000,
            windowsHide: true,
          })
      const output = `${stdout || ''}\n${stderr || ''}`.trim()
      const version = extractVersion(output, attempt.versionPattern)
      if (version) {
        return {
          version,
          sourceLabel: attempt.label,
        }
      }
    }
    catch {
      continue
    }
  }

  return {
    version: null,
    sourceLabel: null,
  }
}

function getBaseEnvironmentToolDefinitions(): BaseEnvironmentToolDefinition[] {
  return [
    {
      id: 'git',
      label: 'Git',
      description: '检测 Git 命令行并提供官方安装入口',
      detect: () => [
        { command: 'git', args: ['--version'], label: 'git', versionPattern: /git version (\d+(?:\.\d+)+)/i },
      ],
      getDetail: version => version ? `已检测到 Git ${version}` : '未检测到 Git 命令',
      installActions: {
        win32: [
          {
            id: 'install-winget',
            label: '使用 winget 安装 / 更新',
            type: 'command',
            command: 'winget',
            args: ['install', '--id', 'Git.Git', '-e', '--source', 'winget'],
            successText: 'Git 安装命令已执行完成',
          },
          {
            id: 'open-download',
            label: '打开 Git 官网下载页',
            type: 'link',
            url: 'https://git-scm.com/download/win',
          },
        ],
        darwin: [
          {
            id: 'install-brew',
            label: '使用 Homebrew 安装 / 更新',
            type: 'command',
            command: 'brew',
            args: ['install', 'git'],
            successText: 'Git 安装命令已执行完成',
          },
          {
            id: 'open-download',
            label: '打开 Git 官网下载页',
            type: 'link',
            url: 'https://git-scm.com/download/mac',
          },
        ],
      },
      locateCommand: 'git',
    },
    {
      id: 'powershell',
      label: 'PowerShell',
      description: '检测 PowerShell 版本，Windows 与 macOS 提供安装入口',
      detect: platform => {
        if (platform === 'win32') {
          return [
            { command: 'pwsh', args: ['--version'], label: 'PowerShell 7', versionPattern: /(\d+(?:\.\d+)+)/ },
            { command: 'powershell', args: ['-NoProfile', '-Command', '$PSVersionTable.PSVersion.ToString()'], label: 'Windows PowerShell', versionPattern: /(\d+(?:\.\d+)+)/ },
          ]
        }

        if (platform === 'darwin') {
          return [
            { command: 'pwsh', args: ['--version'], label: 'PowerShell', versionPattern: /(\d+(?:\.\d+)+)/ },
          ]
        }

        return []
      },
      getDetail: (version, sourceLabel, platform) => {
        if (!version) {
          return platform === 'win32'
            ? '未检测到可用的 PowerShell 命令'
            : '未检测到 PowerShell 7 (pwsh)'
        }

        return sourceLabel ? `已检测到 ${sourceLabel} ${version}` : `已检测到 PowerShell ${version}`
      },
      installActions: {
        win32: [
          {
            id: 'install-winget',
            label: '使用 winget 安装 / 更新 PowerShell 7',
            type: 'command',
            command: 'winget',
            args: ['install', '--id', 'Microsoft.PowerShell', '-e', '--source', 'winget'],
            successText: 'PowerShell 安装命令已执行完成',
          },
          {
            id: 'open-download',
            label: '打开 PowerShell 官网',
            type: 'link',
            url: 'https://learn.microsoft.com/powershell/scripting/install/installing-powershell-on-windows',
          },
        ],
        darwin: [
          {
            id: 'install-brew',
            label: '使用 Homebrew 安装 PowerShell',
            type: 'command',
            command: 'brew',
            args: ['install', '--cask', 'powershell'],
            successText: 'PowerShell 安装命令已执行完成',
          },
          {
            id: 'open-download',
            label: '打开 PowerShell 官网',
            type: 'link',
            url: 'https://learn.microsoft.com/powershell/scripting/install/installing-powershell-on-macos',
          },
        ],
      },
      locateCommand: platform => platform === 'win32' ? 'powershell' : 'pwsh',
    },
    {
      id: 'nodejs',
      label: 'Node.js',
      description: '检测 Node.js 运行时版本',
      detect: () => [
        { command: 'node', args: ['--version'], label: 'node', versionPattern: /v?(\d+(?:\.\d+)+)/i },
      ],
      getDetail: version => version ? `已检测到 Node.js ${version}` : '未检测到 Node.js',
      installActions: {
        win32: [
          {
            id: 'install-winget',
            label: '使用 winget 安装 / 更新 Node.js LTS',
            type: 'command',
            command: 'winget',
            args: ['install', '--id', 'OpenJS.NodeJS.LTS', '-e', '--source', 'winget'],
            successText: 'Node.js 安装命令已执行完成',
          },
          {
            id: 'open-download',
            label: '打开 Node.js 官网下载页',
            type: 'link',
            url: 'https://nodejs.org/zh-cn/download',
          },
        ],
        darwin: [
          {
            id: 'install-brew',
            label: '使用 Homebrew 安装 / 更新 Node.js',
            type: 'command',
            command: 'brew',
            args: ['install', 'node'],
            successText: 'Node.js 安装命令已执行完成',
          },
          {
            id: 'open-download',
            label: '打开 Node.js 官网下载页',
            type: 'link',
            url: 'https://nodejs.org/zh-cn/download',
          },
        ],
      },
      locateCommand: 'node',
    },
    {
      id: 'python',
      label: 'Python',
      description: '检测 Python 解释器版本',
      detect: () => [
        { command: 'python3', args: ['--version'], label: 'python3', versionPattern: /Python (\d+(?:\.\d+)+)/i },
        { command: 'python', args: ['--version'], label: 'python', versionPattern: /Python (\d+(?:\.\d+)+)/i },
      ],
      getDetail: (version, sourceLabel) => {
        if (!version) {
          return '未检测到 Python'
        }

        return sourceLabel ? `已检测到 ${sourceLabel} ${version}` : `已检测到 Python ${version}`
      },
      installActions: {
        win32: [
          {
            id: 'install-winget',
            label: '使用 winget 安装 / 更新 Python 3',
            type: 'command',
            command: 'winget',
            args: ['install', '--id', 'Python.Python.3.12', '-e', '--source', 'winget'],
            successText: 'Python 安装命令已执行完成',
          },
          {
            id: 'open-download',
            label: '打开 Python 官网下载页',
            type: 'link',
            url: 'https://www.python.org/downloads/',
          },
        ],
        darwin: [
          {
            id: 'install-brew',
            label: '使用 Homebrew 安装 / 更新 Python 3',
            type: 'command',
            command: 'brew',
            args: ['install', 'python'],
            successText: 'Python 安装命令已执行完成',
          },
          {
            id: 'open-download',
            label: '打开 Python 官网下载页',
            type: 'link',
            url: 'https://www.python.org/downloads/macos/',
          },
        ],
      },
      locateCommand: platform => platform === 'win32' ? 'python' : 'python3',
    },
    {
      id: 'pnpm',
      label: 'pnpm',
      description: '检测 pnpm 包管理器版本',
      detect: platform => platform === 'win32'
        ? [
            { command: 'pnpm', args: ['--version'], label: 'pnpm', versionPattern: /(\d+(?:\.\d+)+)/i, runner: 'powershell' },
          ]
        : [
            { command: 'pnpm', args: ['--version'], label: 'pnpm', versionPattern: /(\d+(?:\.\d+)+)/i },
          ],
      getDetail: version => version ? `已检测到 pnpm ${version}` : '未检测到 pnpm',
      installActions: {
        win32: [
          {
            id: 'install-corepack',
            label: '使用 Corepack 启用 pnpm',
            type: 'command',
            command: 'corepack',
            args: ['enable', 'pnpm'],
            successText: 'pnpm 启用命令已执行完成',
          },
          {
            id: 'open-docs',
            label: '打开 pnpm 安装文档',
            type: 'link',
            url: 'https://pnpm.io/installation',
          },
        ],
        darwin: [
          {
            id: 'install-corepack',
            label: '使用 Corepack 启用 pnpm',
            type: 'command',
            command: 'corepack',
            args: ['enable', 'pnpm'],
            successText: 'pnpm 启用命令已执行完成',
          },
          {
            id: 'open-docs',
            label: '打开 pnpm 安装文档',
            type: 'link',
            url: 'https://pnpm.io/installation',
          },
        ],
      },
      locateCommand: 'pnpm',
    },
    {
      id: 'uv',
      label: 'uv',
      description: '检测 Astral uv 版本，并提供官方安装入口',
      detect: platform => platform === 'win32'
        ? [
            { command: 'uv', args: ['--version'], label: 'uv', versionPattern: /uv (\d+(?:\.\d+)+)/i, runner: 'powershell' },
          ]
        : [
            { command: 'uv', args: ['--version'], label: 'uv', versionPattern: /uv (\d+(?:\.\d+)+)/i },
          ],
      getDetail: version => version ? `已检测到 uv ${version}` : '未检测到 uv',
      installActions: {
        win32: [
          {
            id: 'install-official',
            label: '运行 uv 官方安装脚本',
            type: 'command',
            command: 'powershell',
            args: ['-ExecutionPolicy', 'ByPass', '-c', 'irm https://astral.sh/uv/install.ps1 | iex'],
            successText: 'uv 安装脚本已执行完成',
          },
          {
            id: 'open-docs',
            label: '打开 uv 安装文档',
            type: 'link',
            url: 'https://docs.astral.sh/uv/getting-started/installation/',
          },
        ],
        darwin: [
          {
            id: 'install-official',
            label: '运行 uv 官方安装脚本',
            type: 'command',
            command: 'sh',
            args: ['-c', 'curl -LsSf https://astral.sh/uv/install.sh | sh'],
            successText: 'uv 安装脚本已执行完成',
          },
          {
            id: 'open-docs',
            label: '打开 uv 安装文档',
            type: 'link',
            url: 'https://docs.astral.sh/uv/getting-started/installation/',
          },
        ],
      },
      locateCommand: 'uv',
    },
    {
      id: 'vscode',
      label: 'VS Code',
      description: '检测 Visual Studio Code CLI 版本与命令路径',
      detect: platform => platform === 'win32'
        ? [
            { command: 'code', args: ['--version'], label: 'code --version', versionPattern: /(\d+(?:\.\d+)+)/i, runner: 'powershell' },
            { command: 'code', args: ['-v'], label: 'code -v', versionPattern: /(\d+(?:\.\d+)+)/i, runner: 'powershell' },
          ]
        : [
            { command: 'code', args: ['--version'], label: 'code --version', versionPattern: /(\d+(?:\.\d+)+)/i },
            { command: 'code', args: ['-v'], label: 'code -v', versionPattern: /(\d+(?:\.\d+)+)/i },
          ],
      getDetail: (version, _sourceLabel, _platform, commandPath) => {
        if (!version) {
          return '未检测到 code 命令'
        }

        return commandPath
          ? `已检测到 VS Code ${version} (${commandPath})`
          : `已检测到 VS Code ${version}`
      },
      installActions: {
        win32: [
          {
            id: 'install-winget',
            label: '使用 winget 安装 / 更新 VS Code',
            type: 'command',
            command: 'winget',
            args: ['install', '--id', 'Microsoft.VisualStudioCode', '-e', '--source', 'winget'],
            successText: 'VS Code 安装命令已执行完成',
          },
          {
            id: 'open-download',
            label: '打开 VS Code 官网',
            type: 'link',
            url: 'https://code.visualstudio.com/',
          },
        ],
        darwin: [
          {
            id: 'install-brew',
            label: '使用 Homebrew 安装 VS Code',
            type: 'command',
            command: 'brew',
            args: ['install', '--cask', 'visual-studio-code'],
            successText: 'VS Code 安装命令已执行完成',
          },
          {
            id: 'open-download',
            label: '打开 VS Code 官网',
            type: 'link',
            url: 'https://code.visualstudio.com/',
          },
        ],
      },
      locateCommand: 'code',
    },
  ]
}

export function getBaseEnvironmentTools(platform: NodeJS.Platform = process.platform): BaseEnvironmentToolStatus[] {
  return getBaseEnvironmentToolDefinitions().map((item) => {
    const installActions = item.installActions[platform] || []
    return {
      id: item.id,
      label: item.label,
      description: item.description,
      installed: false,
      version: null,
      detail: item.getDetail(null, null, platform),
      installActions,
    }
  })
}

export async function detectBaseEnvironmentToolStatuses(
  platform: NodeJS.Platform = process.platform,
): Promise<BaseEnvironmentToolStatus[]> {
  const definitions = getBaseEnvironmentToolDefinitions()

  return Promise.all(definitions.map(async (item) => {
    const installActions = item.installActions[platform] || []
    const attempts = item.detect(platform)
    const locateCommand = typeof item.locateCommand === 'function'
      ? item.locateCommand(platform)
      : item.locateCommand
    const commandPath = locateCommand ? await resolveCommandPath(locateCommand, platform) : null
    const { version, sourceLabel } = attempts.length > 0
      ? await detectCommandVersion(attempts)
      : { version: null, sourceLabel: null }

    return {
      id: item.id,
      label: item.label,
      description: item.description,
      installed: version !== null,
      version,
      detail: item.getDetail(version, sourceLabel, platform, commandPath),
      installActions,
    }
  }))
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

async function prepareDirectoryDestination(destDir: string): Promise<void> {
  if (!(await fs.pathExists(destDir))) return

  const stats = await fs.lstat(destDir)
  if (stats.isDirectory()) return

  await fs.remove(destDir)
}

async function copyMdTemplates(
  ctx: InstallContext,
  srcDir: string,
  destDir: string,
  options: { inject?: boolean } = {},
): Promise<string[]> {
  const installed: string[] = []
  if (!(await fs.pathExists(srcDir))) return installed

  await fs.ensureDir(destDir)
  const files = await fs.readdir(srcDir)
  for (const file of files) {
    if (!file.endsWith('.md')) continue
    const destFile = join(destDir, file)
    if (ctx.force || !(await fs.pathExists(destFile))) {
      let content = await fs.readFile(join(srcDir, file), 'utf-8')
      if (options.inject) content = injectConfigVariables(content, ctx.config)
      content = replaceHomePathsInTemplate(content, ctx.installDir)
      await fs.writeFile(destFile, content, 'utf-8')
    }
    installed.push(file.replace('.md', ''))
  }
  return installed
}

function getBackupFilePath(filePath: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  return `${filePath}.bak-${timestamp}`
}

async function backupFileIfExists(filePath: string): Promise<string | null> {
  if (!(await fs.pathExists(filePath))) return null

  const stats = await fs.lstat(filePath)
  if (!stats.isFile()) {
    throw new Error(`Destination exists but is not a file: ${filePath}`)
  }

  const backupPath = getBackupFilePath(filePath)
  await fs.copy(filePath, backupPath, { overwrite: false, errorOnExist: true })
  return backupPath
}

async function installTemplateFile(
  ctx: InstallContext,
  srcFile: string,
  destFile: string,
  options: { inject?: boolean, backupBeforeOverwrite?: boolean, overwrite?: boolean } = {},
): Promise<void> {
  if (!(await fs.pathExists(srcFile))) return

  await fs.ensureDir(dirname(destFile))

  if (options.overwrite === false && await fs.pathExists(destFile)) return

  let content = await fs.readFile(srcFile, 'utf-8')
  if (options.inject) content = injectConfigVariables(content, ctx.config)
  content = replaceHomePathsInTemplate(content, ctx.installDir)

  if (options.backupBeforeOverwrite) {
    await backupFileIfExists(destFile)
  }

  await fs.writeFile(destFile, content, 'utf-8')
}

function generateCommandPlaceholder(workflow: NonNullable<ReturnType<typeof getWorkflowById>>): string {
  return `---
description: "${workflow.descriptionEn}"
---

# /yq:${workflow.commands[0]}

${workflow.description}

## 使用方式

1. 在当前仓库中明确目标、约束和验收标准。
2. 先阅读相关代码、文档和最近改动，理解现状。
3. 如任务复杂，先产出实施计划；如任务简单，直接最小改动实现。
4. 完成后运行与改动直接相关的验证命令，并如实汇报结果。

## 输出要求

- 默认使用中文回复。
- 优先给结论，再补充依据和风险。
- 不要假装已验证；没有命令输出就明确说明未验证。
`
}

async function installCommandFiles(ctx: InstallContext, workflowIds: string[]): Promise<void> {
  const commandsDir = join(ctx.installDir, 'commands', 'yq')

  for (const workflowId of workflowIds) {
    const workflow = getWorkflowById(workflowId)
    if (!workflow) {
      ctx.result.errors.push(`Unknown workflow: ${workflowId}`)
      continue
    }

    for (const cmd of workflow.commands) {
      const destFile = join(commandsDir, `${cmd}.md`)

      try {
        if (ctx.force || !(await fs.pathExists(destFile))) {
          await fs.writeFile(destFile, generateCommandPlaceholder(workflow), 'utf-8')
        }
        ctx.result.installedCommands.push(cmd)
      }
      catch (error) {
        ctx.result.errors.push(`Failed to install ${cmd}: ${error}`)
        ctx.result.success = false
      }
    }
  }
}

async function installPromptFiles(ctx: InstallContext): Promise<void> {
  const promptsTemplateDir = join(ctx.templateDir, 'prompts', 'claude')
  const promptsDir = join(ctx.installDir, '.yq', 'prompts', 'claude')

  try {
    const installed = await copyMdTemplates(ctx, promptsTemplateDir, promptsDir)
    for (const name of installed) {
      ctx.result.installedPrompts.push(`claude/${name}`)
    }
  }
  catch (error) {
    ctx.result.errors.push(`Failed to install prompts: ${error}`)
    ctx.result.success = false
  }
}

async function collectSkillNames(dir: string, depth = 0): Promise<string[]> {
  const names: string[] = []
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isDirectory()) {
        names.push(...await collectSkillNames(join(dir, entry.name), depth + 1))
      }
      else if (entry.name === 'SKILL.md' && depth > 0) {
        names.push(basename(dir))
      }
    }
  }
  catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (code !== 'ENOENT') {
      console.error(`[YQ] Failed to read skills directory ${dir}: ${code || error}`)
    }
  }
  return names
}

async function removeDirCollectMdNames(dir: string): Promise<string[]> {
  if (!(await fs.pathExists(dir))) return []
  const files = await fs.readdir(dir)
  const names = files.filter(f => f.endsWith('.md')).map(f => f.replace('.md', ''))
  await fs.remove(dir)
  return names
}

async function getYqAgentTemplateDirNames(templateDir: string): Promise<string[]> {
  const yqSkillsTemplateDir = join(templateDir, 'yq-skills')
  if (!(await fs.pathExists(yqSkillsTemplateDir))) return []

  const entries = await fs.readdir(yqSkillsTemplateDir, { withFileTypes: true })
  return entries.filter(entry => entry.isDirectory()).map(entry => entry.name)
}

async function getBaseSkillNames(templateDir: string): Promise<string[]> {
  const baseSkillsTemplateDir = join(templateDir, 'base-skills')
  if (!(await fs.pathExists(baseSkillsTemplateDir))) return []

  const entries = await fs.readdir(baseSkillsTemplateDir, { withFileTypes: true })
  return entries.filter(entry => entry.isDirectory()).map(entry => entry.name)
}

async function hasSuperpowersTemplateDir(templateDir: string): Promise<boolean> {
  const superpowersTemplateDir = join(templateDir, 'superpowers')
  return fs.pathExists(superpowersTemplateDir)
}

async function getSuperpowersSkillNames(templateDir: string): Promise<string[]> {
  const superpowersTemplateDir = join(templateDir, 'superpowers')
  if (!(await fs.pathExists(superpowersTemplateDir))) return []

  const entries = await fs.readdir(superpowersTemplateDir, { withFileTypes: true })
  return entries.filter(entry => entry.isDirectory()).map(entry => entry.name)
}

async function installSkillFiles(ctx: InstallContext): Promise<void> {
  const skillsTemplateDir = join(ctx.templateDir, 'skills')
  const skillsDestDir = join(ctx.installDir, 'skills', 'yq')
  if (!(await fs.pathExists(skillsTemplateDir))) return

  try {
    const oldSkillsRoot = join(ctx.installDir, 'skills')
    const legacyItems = ['tools', 'orchestration', 'SKILL.md', 'run_skill.js']
    const needsMigration = !await fs.pathExists(skillsDestDir)
      && await fs.pathExists(join(oldSkillsRoot, 'tools'))

    if (needsMigration) {
      await fs.ensureDir(skillsDestDir)
      for (const item of legacyItems) {
        const oldPath = join(oldSkillsRoot, item)
        const newPath = join(skillsDestDir, item)
        if (await fs.pathExists(oldPath)) {
          await fs.move(oldPath, newPath, { overwrite: true })
        }
      }
    }

    await fs.copy(skillsTemplateDir, skillsDestDir, {
      overwrite: true,
      errorOnExist: false,
    })

    const replacePathsInDir = async (dir: string): Promise<void> => {
      const entries = await fs.readdir(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = join(dir, entry.name)
        if (entry.isDirectory()) {
          await replacePathsInDir(fullPath)
        }
        else if (entry.name.endsWith('.md')) {
          const content = await fs.readFile(fullPath, 'utf-8')
          const processed = replaceHomePathsInTemplate(content, ctx.installDir)
          if (processed !== content) {
            await fs.writeFile(fullPath, processed, 'utf-8')
          }
        }
      }
    }
    await replacePathsInDir(skillsDestDir)

    const installedSkills = await collectSkillNames(skillsDestDir)
    ctx.result.installedSkills = installedSkills.length
  }
  catch (error) {
    ctx.result.errors.push(`Failed to install skills: ${error}`)
    ctx.result.success = false
  }
}

async function installYqAgentSkills(ctx: InstallContext): Promise<void> {
  const yqSkillsTemplateDir = join(ctx.templateDir, 'yq-skills')
  const baseSkillsTemplateDir = join(ctx.templateDir, 'base-skills')
  const superpowersTemplateDir = join(ctx.templateDir, 'superpowers')
  if (
    !(await fs.pathExists(yqSkillsTemplateDir))
    && !(await fs.pathExists(baseSkillsTemplateDir))
    && !(await fs.pathExists(superpowersTemplateDir))
  ) return

  try {
    const agentSkillsDir = getAgentSkillsDir()
    await fs.ensureDir(agentSkillsDir)

    if (await fs.pathExists(yqSkillsTemplateDir)) {
      const yqSkillsDestDir = join(agentSkillsDir, 'yq')
      await prepareDirectoryDestination(yqSkillsDestDir)
      await fs.copy(yqSkillsTemplateDir, yqSkillsDestDir, {
        overwrite: true,
        errorOnExist: false,
      })
      ctx.result.installedAgentSkills = (await getYqAgentTemplateDirNames(ctx.templateDir)).length
    }

    if (await fs.pathExists(baseSkillsTemplateDir)) {
      const baseSkillsDestDir = join(agentSkillsDir, 'yq-base')
      await prepareDirectoryDestination(baseSkillsDestDir)
      await fs.copy(baseSkillsTemplateDir, baseSkillsDestDir, {
        overwrite: true,
        errorOnExist: false,
      })
      ctx.result.installedBaseSkills = (await getBaseSkillNames(ctx.templateDir)).length
    }

    if (await fs.pathExists(superpowersTemplateDir)) {
      const superpowersDestDir = join(agentSkillsDir, 'superpowers')
      await prepareDirectoryDestination(superpowersDestDir)
      await fs.copy(superpowersTemplateDir, superpowersDestDir, {
        overwrite: true,
        errorOnExist: false,
      })
      ctx.result.installedSuperpowers = (await getSuperpowersSkillNames(ctx.templateDir)).length
    }

  }
  catch (error) {
    ctx.result.errors.push(`Failed to install yq agent skills: ${error}`)
    ctx.result.success = false
  }
}

async function installSkillGeneratedCommands(ctx: InstallContext): Promise<void> {
  const skillsTemplateDir = join(ctx.templateDir, 'skills')
  const skillsInstallDir = join(ctx.installDir, 'skills', 'yq')
  const commandsDir = join(ctx.installDir, 'commands', 'yq')

  if (!(await fs.pathExists(skillsTemplateDir))) return

  try {
    const existingCommandNames = new Set<string>()
    const existingFiles = await fs.readdir(commandsDir).catch(() => [] as string[])
    for (const f of existingFiles) {
      if (f.endsWith('.md')) {
        existingCommandNames.add(basename(f, '.md'))
      }
    }

    const skipCategories: import('./skill-registry').SkillCategory[] = []
    if (ctx.config.skipImpeccable) {
      skipCategories.push('impeccable')
    }

    const generated = await installSkillCommands(
      skillsTemplateDir,
      skillsInstallDir,
      commandsDir,
      existingCommandNames,
      skipCategories,
    )

    if (generated.length > 0) {
      ctx.result.installedCommands.push(...generated)
      ctx.result.installedSkillCommands = generated.length
    }
  }
  catch (error) {
    ctx.result.errors.push(`Skill Registry command generation warning: ${error}`)
  }
}

async function installRuleFiles(ctx: InstallContext): Promise<void> {
  try {
    const installed = await copyMdTemplates(
      ctx,
      join(ctx.templateDir, 'rules'),
      join(ctx.installDir, 'rules'),
    )
    if (installed.length > 0) ctx.result.installedRules = true
  }
  catch (error) {
    ctx.result.errors.push(`Failed to install rules: ${error}`)
  }
}

async function installGlobalInstructionFiles(ctx: InstallContext): Promise<void> {
  try {
    await installTemplateFile(
      ctx,
      join(ctx.templateDir, 'AGENTS.md'),
      join(getCodexDir(), 'AGENTS.md'),
      { backupBeforeOverwrite: true, overwrite: true },
    )
    await installTemplateFile(
      ctx,
      join(ctx.templateDir, 'CLAUDE.md'),
      join(ctx.installDir, 'CLAUDE.md'),
      { backupBeforeOverwrite: true, overwrite: true },
    )
  }
  catch (error) {
    ctx.result.errors.push(`Failed to install global instruction files: ${error}`)
    ctx.result.success = false
  }
}

export async function installWorkflows(
  workflowIds: string[],
  installDir: string,
  force = false,
  config?: {
    liteMode?: boolean
    mcpProvider?: string
    skipImpeccable?: boolean
  },
): Promise<InstallResult> {
  const ctx: InstallContext = {
    installDir,
    force,
    config: {
      liteMode: config?.liteMode || false,
      mcpProvider: config?.mcpProvider || 'ace-tool',
      skipImpeccable: config?.skipImpeccable || false,
    },
    templateDir: join(PACKAGE_ROOT, 'templates'),
    result: {
      success: true,
      installedCommands: [],
      installedPrompts: [],
      installedSkills: 0,
      installedAgentSkills: 0,
      installedBaseSkills: 0,
      installedSuperpowers: 0,
      errors: [],
      configPath: '',
    },
  }

  if (!(await fs.pathExists(ctx.templateDir))) {
    ctx.result.errors.push(`Template directory not found: ${ctx.templateDir}`)
    ctx.result.success = false
    return ctx.result
  }

  await fs.ensureDir(join(installDir, 'commands', 'yq'))
  await fs.ensureDir(join(installDir, '.yq'))
  await fs.ensureDir(join(installDir, '.yq', 'prompts'))

  await installCommandFiles(ctx, workflowIds)
  await installPromptFiles(ctx)
  await installSkillFiles(ctx)
  await installYqAgentSkills(ctx)
  await installSkillGeneratedCommands(ctx)
  await installRuleFiles(ctx)
  await installGlobalInstructionFiles(ctx)

  if (ctx.result.installedCommands.length === 0 && ctx.result.errors.length === 0) {
    ctx.result.errors.push(`No commands were installed (expected ${workflowIds.length}).`)
    ctx.result.success = false
  }

  ctx.result.configPath = join(installDir, 'commands', 'yq')
  return ctx.result
}

export interface UninstallResult {
  success: boolean
  removedCommands: string[]
  removedPrompts: string[]
  removedAgents: string[]
  removedSkills: string[]
  removedRules: boolean
  removedBin: boolean
  removedGlobalPackage: boolean
  errors: string[]
}

async function uninstallGlobalYqWorkflowPackage(): Promise<void> {
  if (process.env.YQ_SKIP_GLOBAL_PACKAGE_UNINSTALL === 'true') {
    return
  }

  await execAsync('npm uninstall -g yq-workflow', {
    timeout: 120000,
    env: process.env,
  })
}

export async function uninstallWorkflows(installDir: string): Promise<UninstallResult> {
  const result: UninstallResult = {
    success: true,
    removedCommands: [],
    removedPrompts: [],
    removedAgents: [],
    removedSkills: [],
    removedRules: false,
    removedBin: false,
    removedGlobalPackage: false,
    errors: [],
  }

  const commandsDir = join(installDir, 'commands', 'yq')
  const agentsDir = join(installDir, 'agents', 'yq')
  const skillsDir = join(installDir, 'skills', 'yq')
  const rulesDir = join(installDir, 'rules')
  const yqConfigDir = join(installDir, '.yq')
  const userAgentSkillsDir = getAgentSkillsDir()

  try {
    result.removedCommands = await removeDirCollectMdNames(commandsDir)
  }
  catch (error) {
    result.errors.push(`Failed to remove commands directory: ${error}`)
    result.success = false
  }

  try {
    result.removedAgents = await removeDirCollectMdNames(agentsDir)
  }
  catch (error) {
    result.errors.push(`Failed to remove agents directory: ${error}`)
    result.success = false
  }

  if (await fs.pathExists(userAgentSkillsDir)) {
    try {
      const yqAgentDirNames = await getYqAgentTemplateDirNames(join(PACKAGE_ROOT, 'templates'))
      const baseSkillNames = await getBaseSkillNames(join(PACKAGE_ROOT, 'templates'))
      const mirroredDirNames = [
        ...(yqAgentDirNames.length > 0 ? ['yq'] : []),
        ...(baseSkillNames.length > 0 ? ['yq-base'] : []),
        ...(await hasSuperpowersTemplateDir(join(PACKAGE_ROOT, 'templates')) ? ['superpowers'] : []),
      ]

      for (const dirName of new Set(mirroredDirNames)) {
        const mirroredDir = join(userAgentSkillsDir, dirName)
        if (await fs.pathExists(mirroredDir)) {
          await fs.remove(mirroredDir)
          result.removedAgents.push(dirName)
        }
      }
    }
    catch (error) {
      result.errors.push(`Failed to remove mirrored ~/.agents/skills directories: ${error}`)
      result.success = false
    }
  }

  if (await fs.pathExists(skillsDir)) {
    try {
      result.removedSkills = await collectSkillNames(skillsDir)
      await fs.remove(skillsDir)
    }
    catch (error) {
      result.errors.push(`Failed to remove skills: ${error}`)
      result.success = false
    }
  }

  if (await fs.pathExists(rulesDir)) {
    try {
      for (const ruleFile of ['yq-skills.md', 'yq-grok-search.md', 'yq-skill-routing.md']) {
        const rulePath = join(rulesDir, ruleFile)
        if (await fs.pathExists(rulePath)) {
          await fs.remove(rulePath)
          result.removedRules = true
        }
      }
    }
    catch (error) {
      result.errors.push(`Failed to remove rules: ${error}`)
    }
  }

  if (await fs.pathExists(yqConfigDir)) {
    try {
      await fs.remove(yqConfigDir)
      result.removedPrompts.push('ALL_PROMPTS_AND_CONFIGS')
    }
    catch (error) {
      result.errors.push(`Failed to remove .yq directory: ${error}`)
    }
  }

  try {
    await uninstallGlobalYqWorkflowPackage()
    result.removedGlobalPackage = true
  }
  catch (error) {
    result.errors.push(`Failed to uninstall global package yq-workflow: ${error}`)
  }

  return result
}

export function showInstallSummary(result: InstallResult): void {
  console.log()
  console.log(ansis.green.bold('✅ Installation complete'))
  console.log(ansis.gray(`Commands: ${result.installedCommands.length}`))
  if (result.installedPrompts.length > 0) {
    console.log(ansis.gray(`Prompts: ${result.installedPrompts.length}`))
  }
  if ((result.installedSkills || 0) > 0) {
    console.log(ansis.gray(`Skills: ${result.installedSkills}`))
  }
  if ((result.installedAgentSkills || 0) > 0) {
    console.log(ansis.gray(`Agent Skills: ${result.installedAgentSkills}`))
  }
  if ((result.installedBaseSkills || 0) > 0) {
    console.log(ansis.gray(`Base Skills: ${result.installedBaseSkills}`))
  }
  if ((result.installedSuperpowers || 0) > 0) {
    console.log(ansis.gray(`Superpowers: ${result.installedSuperpowers}`))
  }
  if (result.errors.length > 0) {
    console.log(ansis.yellow(`Warnings: ${result.errors.length}`))
  }
  console.log()
}
