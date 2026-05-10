---
layout: home

hero:
  name: 'YQ-workflow'
  text: 'AI 编程工具工作台'
  tagline: '把工作流命令、全局提示词、Skills、MCP 和常用 AI 编程工具入口整理到一个可维护的本地控制台里。'
  image:
    src: /logo.png
    alt: YQ
  actions:
    - theme: brand
      text: '快速开始'
      link: /guide/getting-started
    - theme: alt
      text: '配置说明'
      link: /guide/configuration
    - theme: alt
      text: 'GitHub'
      link: https://github.com/rockyflux/yq-workflow

features:
  - icon: '1'
    title: '统一安装工作流资产'
    details: '初始化后会把 `/yq:*` 命令、提示词模板、规则文件和 Skills 安装到各自的标准目录，减少手工分散配置。'
  - icon: '2'
    title: '主菜单覆盖日常管理'
    details: '主菜单集中提供安装与更新、提示词配置、Skills 浏览、MCP 配置、基础环境检测、模型使用统计和常用工具入口。'
  - icon: '3'
    title: '支持多工具全局提示词'
    details: '可统一编辑 Claude、Codex、Gemini、Cursor、Kiro 的全局提示词。'
  - icon: '4'
    title: 'MCP 配置按客户端拆分'
    details: '在本地网页里分别管理 Claude、Codex、Gemini、Cursor、Kiro 的 MCP 配置，并保留四类预置模板与 Smithery 搜索入口。'
  - icon: '5'
    title: '命令和技能都可落地'
    details: '内置 29 个 `/yq:*` 命令，并同步 `yq`、`yq-base`、`superpowers` 三组技能镜像到本地目录，方便 Claude Code、Codex、Gemini CLI 等工具复用。'
  - icon: '6'
    title: '工具入口与检测放在一起'
    details: '除了 Claude Code、Codex、Gemini CLI、OpenCode 等 CLI，也提供 AionUi、MossX、Codex App、Any Code 等桌面端下载入口与基础环境版本检测。'
---

## 这是什么

YQ Workflow 不是新的编程代理，也不是模型路由层。

它更像一个面向 AI Coding 的本地工具工作台，用来整理这些经常分散在不同目录和不同网页里的东西：

- 工作流命令
- 全局提示词
- Skills
- MCP 配置
- 常用 AI 编程工具入口
- 基础环境与模型使用统计

## 安装后会管理什么

默认安装会写入这些位置：

```text
~/.claude/commands/yq/           /yq:* 命令文件
~/.claude/.yq/prompts/           提示词资产
~/.claude/skills/yq/             工作流技能
~/.agents/skills/                技能镜像目录
~/.kiro/skills/                  Kiro 技能镜像目录
~/.codex/AGENTS.md               Codex 全局提示词
~/.claude/CLAUDE.md              Claude 全局提示词
~/.gemini/GEMINI.md              Gemini 全局提示词
~/.cursor/rules/guidelines.mdc   Cursor 规则
~/.kiro/steering/kiro.md         Kiro steering
```

已有提示词文件会先备份，再写入最新内容。

## 文档怎么读

- 想先装起来：看 [快速开始](/guide/getting-started)
- 想确认命令入口：看 [命令参考](/guide/commands)
- 想理解工作流选择：看 [工作流指南](/guide/workflows)
- 想确认目录、备份和运行时约定：看 [配置说明](/guide/configuration)
- 想单独管理 Skills 或 MCP：看 [技能说明](/guide/skills) 和 [MCP 配置](/guide/mcp)

<style>
:root {
  --vp-home-hero-name-color: transparent;
  --vp-home-hero-name-background: -webkit-linear-gradient(120deg, #0f766e 20%, #f59e0b 90%);
  --vp-home-hero-image-background-image: linear-gradient(-45deg, #0f766e33 50%, #f59e0b33 50%);
  --vp-home-hero-image-filter: blur(44px);
}

@media (min-width: 640px) {
  :root {
    --vp-home-hero-image-filter: blur(56px);
  }
}

@media (min-width: 960px) {
  :root {
    --vp-home-hero-image-filter: blur(68px);
  }
}
</style>
