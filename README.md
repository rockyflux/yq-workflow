# YQ Workflow

YQ 是一个面向AI编程工作流工具包，用来把命令、提示词、技能与辅助规则安装到标准目录，帮助你更快搭好一套可直接使用的 AI 编码工作流。


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
- 提供交互式 CLI：`init`、`update`、`menu`、`config mcp`、`config api`

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
- Claude Code CLI
- 可选的 MCP 凭证

## 常用命令

- `npx yq-workflow`
- `npx yq-workflow menu`
- `npx yq-workflow init`
- `npx yq-workflow update`
- `npx yq-workflow config mcp`
- `npx yq-workflow config api`
- `npx yq-workflow diagnose-mcp`

## 主菜单能力

- 展示版本号、已安装命令数、Skills 总数与 build 日期
- 支持工作流安装、重装与更新
- 提供 MCP 配置入口
- 提供 API 配置工具下载入口
- 支持输出风格选择
- 集成 `ccusage`、`CCometixLine`
- 支持 Claude Code / Codex 安装与更新
- 提供独立工具更新检查入口

## MCP 分类

`npx yq-workflow config mcp` 当前按四类组织：

- 必装工具：`Context7`、`Playwright`、`DeepWiki`
- 数据库操作：`PostgreSQL`、`SQLite`
- Git / 版本控制：`GitHub`、`Git`
- 文件 / 资源操作：`Filesystem`、`Memory`

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
