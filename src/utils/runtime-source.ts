export type RuntimeSourceKind = 'npx-cache' | 'global-install' | 'workspace' | 'unknown'

export type RuntimeSourceInfo = {
  kind: RuntimeSourceKind
  label: string
  path: string | null
}

function normalizePath(value: string | null | undefined): string {
  return (value || '').replace(/\\/g, '/').toLowerCase()
}

export function detectRuntimeSource(scriptPath = process.argv[1] || ''): RuntimeSourceInfo {
  const normalizedPath = normalizePath(scriptPath)

  if (!normalizedPath) {
    return {
      kind: 'unknown',
      label: '未知入口',
      path: null,
    }
  }

  if (normalizedPath.includes('/_npx/') || normalizedPath.includes('/npm-cache/_npx/')) {
    return {
      kind: 'npx-cache',
      label: 'npx 缓存',
      path: scriptPath,
    }
  }

  if (normalizedPath.includes('/node_modules/yq-workflow/bin/yq.mjs')) {
    if (normalizedPath.includes('/github/') || normalizedPath.includes('/workspace/') || normalizedPath.includes('/projects/')) {
      return {
        kind: 'workspace',
        label: '工作区源码',
        path: scriptPath,
      }
    }

    return {
      kind: 'global-install',
      label: '全局安装',
      path: scriptPath,
    }
  }

  return {
    kind: 'unknown',
    label: '未知入口',
    path: scriptPath,
  }
}
