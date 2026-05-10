import { defineConfig } from 'vitepress'

function resolveBase() {
  const pagesUrl = process.env.CI_PAGES_URL
  if (pagesUrl) {
    try {
      const pathname = new URL(pagesUrl).pathname.replace(/\/+$/, '')
      return pathname ? `${pathname}/` : '/'
    }
    catch {
      // 如果 CI_PAGES_URL 不是合法 URL，则继续走显式变量或默认值。
    }
  }

  const githubRepository = process.env.GITHUB_REPOSITORY
  if (githubRepository) {
    const [, repositoryName = ''] = githubRepository.split('/')
    if (repositoryName.endsWith('.github.io'))
      return '/'
    if (repositoryName)
      return `/${repositoryName}/`
  }

  return process.env.VITEPRESS_BASE || '/yq-workflow/'
}

const base = resolveBase()

export default defineConfig({
  title: 'yq-workflow',
  description: '面向AI编程开发者工作流工具包',

  base,
  lastUpdated: true,
  cleanUrls: true,

  head: [
    ['link', { rel: 'icon', type: 'image/png', href: `${base}logo.png` }],
  ],

  themeConfig: {
    nav: [
      { text: '指南', link: '/guide/getting-started' },
      { text: '命令', link: '/guide/commands' },
      { text: '工作流', link: '/guide/workflows' },
      { text: 'Skills', link: '/guide/skills' },
      { text: 'MCP 配置', link: '/guide/mcp' },
      { text: '配置', link: '/guide/configuration'}
    ],
    sidebar: [
      {
        text: '入门',
        items: [
          { text: '快速开始', link: '/guide/getting-started' },
          { text: '命令参考', link: '/guide/commands' },
        ],
      },
      {
        text: '进阶',
        items: [
          { text: '工作流指南', link: '/guide/workflows' },
          { text: '技能说明', link: '/guide/skills' },
          { text: 'MCP 配置', link: '/guide/mcp' },
          { text: '配置说明', link: '/guide/configuration' },
        ],
      },
    ],
    editLink: {
      pattern: 'https://github.com/rockyflux/yq-workflow/edit/main/docs/:path',
      text: '在 GitHub 上编辑此页',
    },
    footer: {
      message: '基于 MIT 许可发布',
      copyright: 'Copyright © 2026-present yunqu Contributors',
    },
    docFooter: {
      prev: '上一页',
      next: '下一页',
    },
    outline: {
      label: '页面导航',
    },
    lastUpdated: {
      text: '最后更新于',
    },
    returnToTopLabel: '回到顶部',
    sidebarMenuLabel: '菜单',
    darkModeSwitchLabel: '主题',
    socialLinks: [
      { icon: 'github', link: 'https://github.com/rockyflux/yq-workflow' },
    ],
    search: {
      provider: 'local',
    },
  },
})
