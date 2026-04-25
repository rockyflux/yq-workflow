# YQ Workflow

YQ 是一个 AI 编程工具助手，用来把命令、提示词、技能、规则和常用工具入口安装到标准目录，帮助你更快搭好一套可直接使用的 AI 编程环境。


## 项目简介

安装工作流时，还会同步以下镜像目录：

- `templates/yq-skills/` -> `~/.agents/skills/yq/`
- `templates/base-skills/` -> `~/.agents/skills/yq-base/`
- `templates/superpowers/` -> `~/.agents/skills/superpowers/`
- `templates/AGENTS.md` -> `~/.codex/AGENTS.md`
- `templates/CLAUDE.md` -> `~/.claude/CLAUDE.md`

若目标文件已存在，安装时会先生成同目录时间戳备份，再覆盖为最新模板。

## 它能做什么

- 安装 `/yq:*` 命令到 `~/.claude/commands/yq/`
- 安装提示词资产到 `~/.claude/.yq/prompts/`
- 安装共享技能与规则到 Claude / Agents 目录
- 提供交互式 CLI：管理工作流、MCP、Skills，以及 Claude Code、Codex、Gemini CLI、OpenCode、MossX 客户端等编程工具入口

## 快速开始

```bash
npx yq-workflow
```

默认行为：

- 使用简体中文，不再弹出语言选择
- 初始化默认走无 Web UI 的轻量安装路径
- 初始化会默认安装 `Impeccable` 前端 UI/UX 设计增强命令包，不再单独询问
- 主菜单会检测本地是否已安装工作流，并提示版本状态

也可以直接打开菜单或初始化：

```bash
npx yq-workflow menu
npx yq-workflow init
```

## 环境要求

- Node.js 20+
- Claude Code CLI 或其他按需接入的 AI 编程工具
- 可选的 MCP 凭证

## 常用命令

- `npx yq-workflow`
- `npx yq-workflow menu`
- `npx yq-workflow init`
- `npx yq-workflow update`
- `npx yq-workflow help`
- `npx yq-workflow config skills`
- `npx yq-workflow config skills-web`
- `npx yq-workflow config skills-web-close`
- `npx yq-workflow config mcp`
- `npx yq-workflow config api`
- `npx yq-workflow diagnose-mcp`

## 主菜单能力

- 展示版本号、已安装命令数、Skills 总数与 build 日期
- 支持工作流安装、重装与更新
- 提供 MCP 配置入口
- 提供“热门开源工作流”入口，可统一查看 `GET SHIT DONE`、`gstack`、`Trellis` 的安装状态、版本、描述与教程地址
- 提供 Skills 配置入口，可查看 `~/.agents/skills/` 目录并集成 `skills.sh`
- `配置 Skills` 的第一个操作为“本地网页版 Skills”，可直接打开左侧文件树、右侧文件预览的本地网页，默认目录 `.agents/skills`
- 若本地网页版 Skills 已在运行，再次打开会直接复用，不会重复启动；也支持在 Skills 菜单里关闭，或运行 `npx yq-workflow config skills-web-close`
- 网页版右上角也提供“关闭服务”按钮，可直接在浏览器里关闭当前 Skills 服务
- 在“编程工具”分组下提供“配置模型 API”入口，可打开 `cc-switch` 下载页
- 主菜单在“编程工具”分组下提供独立的“基础环境检测”入口，可检测 `Git`、`PowerShell`、`Node.js`、`Python`、`pnpm`、`uv`、`VS Code` 版本，并以表格方式展示状态、版本与命令路径
- 提供统一的“Claude Code 工具”子菜单，管理 `Claude Code`、`ccusage`、`CCR`、`CCometixLine`
- Claude Code 工具与安装编程工具菜单都会在检测版本时显示加载提示，并展示是否安装、当前版本与最新版本；外部下载型客户端会展示下载提示并支持一键打开下载页
- 支持通过统一的“安装编程工具”子菜单管理 Claude Code、Codex、Gemini CLI、OpenCode、MossX 客户端
- 热门开源工作流菜单支持对 npm 工作流执行安装 / 更新 / 卸载，并可一键打开教程；`gstack` 当前提供教程直达入口
- 帮助页改为常用 `npx` 命令说明，不再承担 Skills 浏览入口
- 主菜单中的“卸载和删除配置”会移除工作流文件、清理 `.yq` 配置，并额外执行全局 `yq-workflow` 删除

## MCP 分类

`npx yq-workflow config mcp` 当前按四类组织：

- 必装工具：`Context7`、`Playwright`、`DeepWiki`
- 数据库操作：`PostgreSQL`、`SQLite`
- Git / 版本控制：`GitHub`、`Git`
- 文件 / 资源操作：`Filesystem`、`Memory`

## Skills 配置

主菜单新增“配置 Skills”入口，默认展示并管理 `~/.agents/skills/` 下的技能目录。

- 技能存储在实际路径 `~/.agents/skills/`，遵循 Agent Skills 开放标准
- 兼容的工具包括 `Claude Code`、`Codex`、`Gemini CLI` 等
- 集成 [skills.sh](https://skills.sh/) 与官方 `npx skills` CLI
- 支持查看本地目录、列出全局已安装 skills、关键词检索、安装指定 skill 包、更新全局 skills
- 支持本地网页版 Skills 浏览器：左侧文件树，右侧文件预览，默认根目录 `.agents/skills`
- 也可直接运行 `npx yq-workflow config skills` 或 `npx yq-workflow config skills-web`

## 安装目录

```text
~/.claude/
├── commands/yq/          # /yq:* 命令文件
├── skills/yq/            # 工作流技能
├── rules/                # 辅助规则
└── .yq/
    ├── config.toml
    └── prompts/claude/

~/.agents/skills/
├── yq/
├── yq-base/
└── superpowers/
```

## 验证

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
```

## 延伸阅读
- [贡献指南](./CONTRIBUTING.md)
- [文档站](./docs)
