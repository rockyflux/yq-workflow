# YQ Workflow Toolkit

YQ is a single-model workflow toolkit for Claude Code. It installs command packs, prompts, skills, and helper rules into `~/.claude/` without relying on `codeagent-wrapper`, multi-model routing, or external model orchestration.

## What It Does

- Installs `/yq:*` command files into `~/.claude/commands/yq/`
- Installs Claude-oriented prompt assets into `~/.claude/.yq/prompts/`
- Installs shared skills and rules used by the workflow
- Provides an interactive `init / update / menu / config mcp / config api` CLI

## Quick Start

```bash
npx yq-workflow
```

默认使用中文，不再弹出语言选择。
Initialization now uses the no-Web-UI lite path by default, so `liteMode` is no longer prompted.

也可以显式打开主菜单或直接初始化：

```bash
npx yq-workflow menu
npx yq-workflow init
```

## Requirements

- Node.js 20+
- Claude Code CLI
- Optional MCP credentials if you want database, GitHub, or resource helpers

## Main Commands

- `npx yq-workflow`
- `npx yq-workflow menu`
- `npx yq-workflow init`
- `npx yq-workflow update`
- `npx yq-workflow config mcp`
- `npx yq-workflow config api`
- `npx yq-workflow diagnose-mcp`

## Interactive Menu

The main menu includes:

- Workflow install / reinstall
- Workflow update
- MCP configuration with essential, database, Git/version-control, and file/resource categories
- API configuration
- Output style selection
- Utility tools: `ccusage`, `CCometixLine`
- Claude Code install / update

## MCP Categories

`npx yq-workflow config mcp` now groups built-in MCP installers into:

- Essential tools: `Context7`, `Playwright`, `DeepWiki`
- Database operations: `PostgreSQL`, `SQLite`
- Git / version control: `GitHub`, `Git`
- File / resource operations: `Filesystem`, `Memory`

## Verification

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
```
