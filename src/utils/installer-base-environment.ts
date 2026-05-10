import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export type BaseEnvironmentToolId = 'git' | 'powershell' | 'nodejs' | 'python' | 'pip' | 'pnpm' | 'uv' | 'rg' | 'vscode'

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
            label: '使用 Homebrew 安装 / 更新 PowerShell',
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
      description: '检测 Node.js 运行时，支持使用 winget 或 Homebrew 安装',
      detect: () => [
        { command: 'node', args: ['--version'], label: 'node', versionPattern: /v?(\d+(?:\.\d+)+)/ },
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
            label: '打开 Node.js 官网',
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
            label: '打开 Node.js 官网',
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
      description: '检测 Python 解释器并提供官方安装入口',
      detect: platform => platform === 'win32'
        ? [
            { command: 'python', args: ['--version'], label: 'python', versionPattern: /Python (\d+(?:\.\d+)+)/i },
            { command: 'py', args: ['--version'], label: 'py', versionPattern: /Python (\d+(?:\.\d+)+)/i },
          ]
        : [
            { command: 'python3', args: ['--version'], label: 'python3', versionPattern: /Python (\d+(?:\.\d+)+)/i },
            { command: 'python', args: ['--version'], label: 'python', versionPattern: /Python (\d+(?:\.\d+)+)/i },
          ],
      getDetail: (version, sourceLabel) => {
        if (!version) return '未检测到 Python'
        return sourceLabel ? `已检测到 ${sourceLabel} ${version}` : `已检测到 Python ${version}`
      },
      installActions: {
        win32: [
          {
            id: 'install-winget',
            label: '使用 winget 安装 / 更新 Python',
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
            label: '使用 Homebrew 安装 / 更新 Python',
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
      id: 'pip',
      label: 'pip',
      description: '检测 pip Python 包管理器并提供修复入口',
      detect: platform => platform === 'win32'
        ? [
            { command: 'pip', args: ['--version'], label: 'pip', versionPattern: /pip (\d+(?:\.\d+)+)/i },
            { command: 'py', args: ['-m', 'pip', '--version'], label: 'py -m pip', versionPattern: /pip (\d+(?:\.\d+)+)/i },
            { command: 'python', args: ['-m', 'pip', '--version'], label: 'python -m pip', versionPattern: /pip (\d+(?:\.\d+)+)/i },
          ]
        : [
            { command: 'pip3', args: ['--version'], label: 'pip3', versionPattern: /pip (\d+(?:\.\d+)+)/i },
            { command: 'python3', args: ['-m', 'pip', '--version'], label: 'python3 -m pip', versionPattern: /pip (\d+(?:\.\d+)+)/i },
            { command: 'pip', args: ['--version'], label: 'pip', versionPattern: /pip (\d+(?:\.\d+)+)/i },
          ],
      getDetail: (version, sourceLabel) => {
        if (!version) return '未检测到 pip'
        return sourceLabel ? `已检测到 ${sourceLabel} ${version}` : `已检测到 pip ${version}`
      },
      installActions: {
        win32: [
          {
            id: 'install-ensurepip',
            label: '使用 ensurepip 修复 / 安装 pip',
            type: 'command',
            command: 'py',
            args: ['-m', 'ensurepip', '--upgrade'],
            successText: 'pip 修复命令已执行完成',
          },
          {
            id: 'open-docs',
            label: '打开 pip 官方文档',
            type: 'link',
            url: 'https://pip.pypa.io/en/stable/installation/',
          },
        ],
        darwin: [
          {
            id: 'install-ensurepip',
            label: '使用 ensurepip 修复 / 安装 pip',
            type: 'command',
            command: 'python3',
            args: ['-m', 'ensurepip', '--upgrade'],
            successText: 'pip 修复命令已执行完成',
          },
          {
            id: 'open-docs',
            label: '打开 pip 官方文档',
            type: 'link',
            url: 'https://pip.pypa.io/en/stable/installation/',
          },
        ],
      },
      locateCommand: platform => platform === 'win32' ? 'pip' : 'pip3',
    },
    {
      id: 'pnpm',
      label: 'pnpm',
      description: '检测 pnpm 包管理器并提供推荐安装方式',
      detect: platform => platform === 'win32'
        ? [
            { command: 'pnpm', args: ['--version'], label: 'pnpm', runner: 'powershell', versionPattern: /(\d+(?:\.\d+)+)/ },
            { command: 'pnpm.cmd', args: ['--version'], label: 'pnpm.cmd', runner: 'powershell', versionPattern: /(\d+(?:\.\d+)+)/ },
          ]
        : [
            { command: 'pnpm', args: ['--version'], label: 'pnpm', versionPattern: /(\d+(?:\.\d+)+)/ },
          ],
      getDetail: version => version ? `已检测到 pnpm ${version}` : '未检测到 pnpm',
      installActions: {
        win32: [
          {
            id: 'install-corepack',
            label: '使用 corepack 启用 pnpm',
            type: 'command',
            command: 'corepack',
            args: ['enable', 'pnpm'],
            successText: 'pnpm 启用命令已执行完成',
          },
          {
            id: 'install-npm',
            label: '使用 npm 全局安装 pnpm',
            type: 'command',
            command: 'npm',
            args: ['install', '-g', 'pnpm'],
            successText: 'pnpm 安装命令已执行完成',
          },
        ],
        darwin: [
          {
            id: 'install-corepack',
            label: '使用 corepack 启用 pnpm',
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
      locateCommand: platform => platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
    },
    {
      id: 'uv',
      label: 'uv',
      description: '检测 uv Python 工具链并提供安装入口',
      detect: () => [
        { command: 'uv', args: ['--version'], label: 'uv', versionPattern: /uv (\d+(?:\.\d+)+)/i },
      ],
      getDetail: version => version ? `已检测到 uv ${version}` : '未检测到 uv',
      installActions: {
        win32: [
          {
            id: 'install-winget',
            label: '使用 winget 安装 / 更新 uv',
            type: 'command',
            command: 'winget',
            args: ['install', '--id', 'astral-sh.uv', '-e', '--source', 'winget'],
            successText: 'uv 安装命令已执行完成',
          },
          {
            id: 'open-docs',
            label: '打开 uv 官网',
            type: 'link',
            url: 'https://docs.astral.sh/uv/getting-started/installation/',
          },
        ],
        darwin: [
          {
            id: 'install-script',
            label: '使用官方脚本安装 uv',
            type: 'command',
            command: 'sh',
            args: ['-c', 'curl -LsSf https://astral.sh/uv/install.sh | sh'],
            successText: 'uv 安装脚本已执行完成',
          },
          {
            id: 'open-docs',
            label: '打开 uv 官网',
            type: 'link',
            url: 'https://docs.astral.sh/uv/getting-started/installation/',
          },
        ],
      },
      locateCommand: 'uv',
    },
    {
      id: 'rg',
      label: 'ripgrep',
      description: '检测 ripgrep 命令行搜索工具并提供下载入口',
      detect: () => [
        { command: 'rg', args: ['--version'], label: 'rg', versionPattern: /ripgrep (\d+(?:\.\d+)+)/i },
      ],
      getDetail: version => version ? `已检测到 ripgrep ${version}` : '未检测到 ripgrep (rg)',
      installActions: {
        win32: [
          {
            id: 'open-download',
            label: '打开 ripgrep 下载页',
            type: 'link',
            url: 'https://ripgrep.dev/download/',
          },
        ],
        darwin: [
          {
            id: 'open-download',
            label: '打开 ripgrep 下载页',
            type: 'link',
            url: 'https://ripgrep.dev/download/',
          },
        ],
      },
      locateCommand: 'rg',
    },
    {
      id: 'vscode',
      label: 'VS Code',
      description: '检测 VS Code CLI 并提供安装入口',
      detect: platform => platform === 'win32'
        ? [
            { command: 'code.cmd', args: ['--version'], label: 'code.cmd', runner: 'powershell', versionPattern: /^(\d+(?:\.\d+)+)$/m },
            { command: 'code', args: ['--version'], label: 'code', runner: 'powershell', versionPattern: /^(\d+(?:\.\d+)+)$/m },
          ]
        : [
            { command: 'code', args: ['--version'], label: 'code', versionPattern: /^(\d+(?:\.\d+)+)$/m },
          ],
      getDetail: (version, _sourceLabel, _platform, commandPath) => {
        if (!version) return '未检测到 VS Code CLI (code)'
        return commandPath ? `已检测到 VS Code ${version} (${commandPath})` : `已检测到 VS Code ${version}`
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
      locateCommand: platform => platform === 'win32' ? 'code.cmd' : 'code',
    },
  ]
}

export function getBaseEnvironmentDetectionAttempts(
  toolId: BaseEnvironmentToolId,
  platform: NodeJS.Platform = process.platform,
): DetectionAttempt[] {
  const tool = getBaseEnvironmentToolDefinitions().find(item => item.id === toolId)
  return tool ? tool.detect(platform) : []
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
