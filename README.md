# YQ Workflow

YQ Workflow 是一个面向 AI Coding 的本地工具工作台，用来把工作流命令、全局提示词、Skills、MCP 和常用工具入口整理到一起。

它的定位不是新的代理框架，也不是模型路由层，而是一个可维护的“统一入口”：

- 想安装或更新工作流，可以从这里开始
- 想配置 MCP、提示词、Skills，也可以从这里进入
- 想查看常用 AI 编程工具、账号入口和使用统计，同样可以在主菜单里完成

## 适合谁

如果你正在使用或准备使用这些工具，YQ Workflow 会比较合适：

- `Claude Code`
- `Codex`
- `Gemini CLI`
- 其他需要配合提示词、Skills、MCP 一起使用的 AI 编程工具

## 它能帮你做什么

- 安装并管理整套工作流
- 安装全局提示词文件到 `~/.claude/CLAUDE.md`、`~/.codex/AGENTS.md`、`~/.gemini/GEMINI.md`、`~/.cursor/rules/guidelines.mdc`、`~/.kiro/steering/kiro.md`
- 安装技能到 `~/.claude/skills/yq/`，并同步镜像到 `~/.agents/skills/` 与 `~/.kiro/skills/`
- 这些全局提示词模板由仓库内 `templates/steering/` 目录统一提供，并随 npm 包一起发布
- 其中 Codex / Claude / Kiro 模板会约束模型在合适的时候把阶段计划、关键决策、复杂排障结论等文档写入各自的 `~/Obsidian/...` 项目目录，并避免为低价值小改动制造文档噪音
- 用主菜单统一进入常用配置
- 管理 MCP
- 管理 Skills
- 管理提示词文件
- 查看常用 AI 编程工具入口
- 快速检查基础环境和模型使用统计

## 默认会写入哪些目录

```text
~/.claude/commands/yq/           /yq:* 命令文件
~/.claude/.yq/prompts/           提示词资产
~/.claude/skills/yq/             工作流技能
~/.agents/skills/                Agent Skills 镜像
~/.kiro/skills/                  Kiro Skills 镜像
~/.claude/CLAUDE.md              Claude 提示词
~/.codex/AGENTS.md               Codex 提示词
~/.gemini/GEMINI.md              Gemini 提示词
~/.cursor/rules/guidelines.mdc   Cursor 规则
~/.kiro/steering/kiro.md         Kiro steering
```

如果目标提示词文件已经存在，会先在同级的 `*-backup/` 目录下创建备份，并最多保留最新 10 份。

## 快速开始

先安装 `Node.js 20+`：<https://nodejs.org/zh-cn>

如果本机还没有 `node` / `npm` / `npx`，请先完成这一步，再继续下面的初始化命令。

无需全局安装，推荐先用 `npx` 直接初始化：

```bash
npx yq-workflow@latest init
```

如果你想先查看发布页、版本信息或 npm 安装入口，可以直接打开：

<https://www.npmjs.com/package/yq-workflow>

安装完成后，或你只是想直接打开主菜单时，运行：

```bash
npx yq-workflow
```

首次使用时，按主菜单一步步操作即可。默认界面为简体中文。

如果你已经知道自己要做什么，也可以直接使用：

```bash
npx yq-workflow menu
npx yq-workflow init
npx yq-workflow update
```

## 第一次使用建议

推荐顺序：

1. 运行 `npx yq-workflow`
2. 先完成工作流安装或更新
3. 打开 `提示词配置`
4. 打开 `配置 Skills`
5. 打开 `配置 MCP`
6. 按需要查看 `基础环境检测`、`安装编程工具` 与 `模型使用统计`

这样配完之后，后续基本就可以围绕主菜单直接使用。

## 主菜单里有什么

主菜单主要分成几类常用入口：

- 工作流安装、更新、卸载
- `配置 Skills`
- `配置 MCP`
- `提示词配置`
- 热门开源工作流
- Claude Code 工具
- 安装编程工具
- AI 账号管理
- 基础环境检测
- 模型使用统计

如果你不想记命令，直接从主菜单进就够了。


## 常用场景

### 1. 想把环境先搭起来

运行 `npx yq-workflow`，从主菜单完成安装。

### 2. 想管理 MCP

进入 `配置 MCP`，用本地网页分别管理 Claude、Codex、Gemini、Cursor、Kiro 的 MCP 配置。页面内保留必装工具、数据库操作、Git / 版本控制、文件 / 资源操作四类预置模板，并支持 Smithery 搜索。

### 3. 想整理 Skills

进入 `配置 Skills`，可以打开本地网页版 Skills、查看本地技能目录，或者跳转到 `Skills Manage` 项目页。

### 4. 想调整提示词

进入 `提示词配置`，统一编辑 Claude、Codex、Gemini、Cursor、Kiro 的提示词文件；保存前会先确认，并自动保留备份，每种提示词最多保留最新 10 份。你也可以在这里继续微调“什么时候该把经验、方案、排障记录写到 Obsidian”的规则。

### 5. 想看工具是否装好

进入 `基础环境检测` 或 `安装编程工具`，查看本机常用工具状态。基础环境检测会展示 `Git`、`PowerShell`、`Node.js`、`Python`、`pip`、`pnpm`、`uv`、`ripgrep (rg)`、`VS Code` 的版本信息；安装编程工具会区分 CLI 命令行版和桌面端 UI。

### 6. 想找模型账号或科学上网入口

进入 `AI 账号管理`，可以按客户端、账号 / token 供应商分组打开常用网页入口，也可以直接打开科学上网推荐列表。

## 常用命令

```bash
npx yq-workflow
npx yq-workflow menu
npx yq-workflow init
npx yq-workflow update
npx yq-workflow help
npx yq-workflow config skills
npx yq-workflow config mcp
npx yq-workflow config prompt
```

## 当前主菜单会管理的工具

- `Claude Code`、`Codex CLI`、`Gemini CLI`、`OpenCode`
- `AionUi`、`MossX 客户端`、`Codex App`、`Any Code`
- `ccusage`、`CCR`、`CCometixLine`、`Claude HUD`
- `cc-switch`、`Cockpit Tools`、`Cherry Studio`

## 文档站点部署

仓库内文档使用 `VitePress`，本地预览与构建命令如下：

```bash
pnpm docs:dev
pnpm docs:build
pnpm docs:preview
```

GitHub 自动部署配置位于 `.github/workflows/deploy-docs.yml`，默认在 `main` 分支推送后发布到 GitHub Pages。

首次启用时请在仓库设置中确认：

1. 打开 `Settings -> Pages`
2. `Source` 选择 `GitHub Actions`
3. 确保默认发布分支为 `main`

VitePress 的 `base` 已兼容 GitHub Pages 仓库路径，默认仓库 `yq-workflow` 会发布到 `/yq-workflow/`，若仓库名变化会自动按仓库名调整。

## 你可以怎么理解它

可以把 YQ Workflow 理解成一个给 AI 编程工具配套的“控制台”：

- 把常用入口集中起来
- 把零散配置整理起来
- 把日常要反复找的东西收进同一个菜单里

重点不是增加复杂度，而是减少来回找入口、找文件、找配置的时间。
