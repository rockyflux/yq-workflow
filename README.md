# YQ Workflow

YQ 是一个 AI 编程工具助手，用来把命令、提示词、技能、规则和常用工具入口安装到标准目录，帮助你更快搭好一套可直接使用的 AI 编程环境。


## 项目简介

安装工作流时，还会同步以下镜像目录：

- `templates/yq-skills/` -> `~/.agents/skills/yq/`
- `templates/base-skills/` -> `~/.agents/skills/yq-base/`
- `templates/superpowers/` -> `~/.agents/skills/superpowers/`
- `templates/AGENTS.md` -> `~/.codex/AGENTS.md`
- `templates/CLAUDE.md` -> `~/.claude/CLAUDE.md`
- `templates/guidelines.mdc` -> `~/.cursor/rules/guidelines.mdc`

若目标文件已存在，安装时会先在同级按文件名生成备份目录并写入时间戳备份，例如 `AGENTS-backup/AGENTS.md.bak-时间戳`、`CLAUDE-backup/CLAUDE.md.bak-时间戳`、`guidelines-backup/guidelines.mdc.bak-时间戳`，再覆盖为最新模板。

## 它能做什么

- 安装 `/yq:*` 命令到 `~/.claude/commands/yq/`
- 安装提示词资产到 `~/.claude/.yq/prompts/`
- 安装共享技能与规则到 Claude / Agents 目录
- 提供交互式 CLI：管理工作流、MCP、Skills，以及 CLI 命令行版与桌面端 UI 两类 AI 编程工具入口，并内置 AI 账号管理网页导航

## 快速开始

```bash
npx yq-workflow
```

默认行为：

- 使用简体中文，不再弹出语言选择
- 初始化默认走无 Web UI 的轻量安装路径
- 初始化会默认安装 `Impeccable` 前端 UI/UX 设计增强命令包，不再单独询问
- 主菜单会检测本地是否已安装工作流，并提示版本状态；当当前启动版本更新时，会把“2. 更新工作流 - 更新到最新版本”高亮出来，方便直接选择

也可以直接打开菜单或初始化：

```bash
npx yq-workflow menu
npx yq-workflow init
```

## 环境要求

- Node.js 20+
- Claude Code CLI 或其他按需接入的 AI 编程工具
- 可选的 MCP 凭证

## 主菜单对应命令

- `npx yq-workflow`
- `npx yq-workflow menu`
- `npx yq-workflow init`
- `npx yq-workflow update`
- `npx yq-workflow help`
- `npx yq-workflow config prompt`
- `npx yq-workflow config skills`
- `npx yq-workflow config mcp`

帮助页当前只展示这组“主菜单有对应入口”的常用命令。像 `config *-web`、`config api`、`diagnose-mcp`、`fix-mcp` 这类 CLI 直达命令仍然可用，但不在帮助页主列表里展开。

## 主菜单能力

- 展示版本号、已安装命令数、Skills 总数与 build 日期
- 支持工作流安装、重装与更新；检测到新版本时，顶部会提示直接从主菜单选择“2. 更新工作流 - 更新到最新版本”，菜单项本身也会带颜色提醒
- 提供 MCP 配置入口，可打开本地网页独立管理 Claude / Codex / Gemini
- 提供“提示词配置”入口，可用本地网页统一编辑 `~/.claude/CLAUDE.md`、`~/.codex/AGENTS.md`、`~/.gemini/GEMINI.md`、`~/.cursor/rules/guidelines.mdc`
- 提供“热门开源工作流”入口，可统一查看 `GET SHIT DONE`、`gstack`、`Trellis` 的安装状态、版本、描述与教程地址
- 提供 Skills 配置入口，可查看 `~/.agents/skills/` 目录并集成 `skills.sh`
- `提示词配置` 会打开左侧提示词导航、右侧编辑器的本地网页；每次保存前会二次确认，并把当前版本备份到同级按文件名生成的目录，例如 `CLAUDE-backup/`、`AGENTS-backup/`、`guidelines-backup/`，再支持选择历史版本恢复；编辑 `Claude` 时还可一键导入热门 `CLAUDE.md` 模板到编辑器
- 若本地提示词配置页已在运行，再次打开会直接复用，不会重复启动；也支持运行 `npx yq-workflow config prompt-web-close` 或在网页里关闭服务
- `配置 Skills` 的第一个操作为“本地网页版 Skills”，可直接打开左侧文件树；右上角提供 `Skills.sh` 按钮切换到操作面板，右侧预览会隐藏，点击左侧文件后自动切回文件预览；同页支持查看已安装、检索安装、指定安装、更新与官网跳转；默认目录 `.agents/skills`
- 若本地网页版 Skills 已在运行，再次打开会直接复用，不会重复启动；也支持在 Skills 菜单里关闭，或运行 `npx yq-workflow config skills-web-close`
- 网页版右上角也提供“关闭服务”按钮，可直接在浏览器里关闭当前 Skills 服务
- `配置 MCP` 会打开本地网页，按 Claude / Codex / Gemini 三个引擎分标签管理 MCP；支持查看当前配置文件路径、添加工具、编辑 JSON、启用 / 停用、删除与刷新
- MCP 网页内仍保留四类预置模板：必装工具、数据库操作、Git / 版本控制、文件 / 资源操作；再次打开会直接复用现有实例，也支持运行 `npx yq-workflow config mcp-web-close` 或在网页中关闭服务
- MCP 网页新增 Smithery 集成区：可检测 / 安装全局 `@smithery/cli`、打开 `https://smithery.ai/servers`、执行 `smithery mcp search` 搜索服务器，并将结果一键添加到当前标签对应的 Claude / Codex / Gemini 客户端
- 主菜单在“编程工具”分组下提供独立的“基础环境检测”入口，可检测 `Git`、`PowerShell`、`Node.js`、`Python`、`pip`、`pnpm`、`uv`、`VS Code` 版本，并以表格方式展示状态、版本与命令路径；Windows 下会优先探测 `pnpm` / `code` 的 CLI shim，避免被 `pnpm.ps1` 或 `Code.exe` 抢占解析；菜单默认支持上下箭头选择，也支持数字定位到对应条目后按回车确认，另提供“打开网站：科学上网推荐列表”快捷入口
- 提供统一的“Claude Code 工具”子菜单，管理 `Claude Code`、`ccusage`、`CCR`、`CCometixLine`；其中 `Claude HUD` 作为直达入口可直接打开 GitHub 项目页
- Claude Code 工具与安装编程工具菜单都会在检测版本时显示加载提示；其中“安装编程工具”仅对 CLI 工具展示安装状态、当前版本与最新版本，桌面端 UI 工具只展示下载页或安装指引
- “安装编程工具”在同一个菜单页内分组展示 `CLI 命令行版` 与 `桌面端 UI`：CLI 包含 `Claude Code`、`Codex CLI`、`Gemini CLI`、`OpenCode`，桌面端 UI 包含 `MossX 客户端`、`Codex App`、`Any Code`
- 主菜单在“编程工具”分组下提供“AI 账号管理”子菜单，按“客户端”与“账号 / token 供应商”分组展示；客户端包含 `cc-switch`、`Cockpit Tools`、`Cherry Studio`、`CLIProxyAPI`、`Sub2API-CRS2`，供应商入口包含 `无限续杯工具 1`、`无限续杯工具 2`
- 主菜单在“编程工具”分组末尾提供“模型使用统计”子菜单，可直接运行 `npx ccusage@latest`、`npx @ccusage/codex@latest` 与 `npx claude-code-usage-analytics`
- 热门开源工作流菜单支持对 npm 工作流执行安装 / 更新 / 卸载，并可一键打开教程；`gstack` 当前提供教程直达入口
- 帮助页改为主菜单对应的常用 `npx` 命令说明，不再承担 Skills 浏览入口，也不再罗列所有 CLI 直达命令
- 主菜单中的“卸载和删除配置”会移除工作流文件、清理 `.yq` 配置，并额外执行全局 `yq-workflow` 删除

## MCP 配置

`npx yq-workflow config mcp` 会打开本地网页，独立管理：

- `~/.claude.json`
- `~/.codex/config.toml`
- `~/.gemini/settings.json`

网页中的预置模板仍按四类维护：

- 必装工具：`Context7`、`Playwright`、`DeepWiki`
- 数据库操作：`PostgreSQL`、`SQLite`
- Git / 版本控制：`GitHub`、`Git`
- 文件 / 资源操作：`Filesystem`、`Memory`

MCP 网页还集成了 Smithery 工作流：

- 支持执行 `npm install -g @smithery/cli@latest` 安装或更新全局 Smithery CLI
- 支持使用 `npx -y @smithery/cli@latest mcp search <关键词> --json` 搜索 Smithery 服务器
- 支持根据当前标签自动映射客户端参数：
  - Claude -> `--client claude-code`
  - Codex -> `--client codex`
  - Gemini -> `--client gemini-cli`
- 支持填写可选的 `--config JSON`、自定义 connection ID 和显示名称，再一键执行 `smithery mcp add`

## Skills 配置

主菜单新增“配置 Skills”入口，默认展示并管理 `~/.agents/skills/` 下的技能目录。

- 技能存储在实际路径 `~/.agents/skills/`，遵循 Agent Skills 开放标准
- 兼容的工具包括 `Claude Code`、`Codex`、`Gemini CLI` 等
- 集成 [skills.sh](https://skills.sh/) 与官方 `npx skills` CLI
- 支持查看本地目录
- 支持本地网页版 Skills 浏览器：左侧文件树，右侧文件预览，默认根目录 `.agents/skills`
- 本地网页版 Skills 内置全局 skills 查看、关键词检索安装、指定 skill 包安装、全局更新与 skills.sh 官网跳转
- 也可直接运行 `npx yq-workflow config skills` 或 `npx yq-workflow config skills-web`

## 提示词配置

主菜单在“核心工作流”分组下提供“提示词配置”入口，用于统一编辑：

- `~/.claude/CLAUDE.md`
- `~/.codex/AGENTS.md`
- `~/.gemini/GEMINI.md`
- `~/.cursor/rules/guidelines.mdc`

支持能力：

- 左侧切换 Claude / Codex / Gemini / Cursor 提示词，右侧直接编辑 Markdown / MDC 内容
- 编辑 Claude 提示词时，右侧工具栏提供“导入热门 Claude.md”按钮，可从远程模板拉取内容并回填编辑器，导入后需手动确认并保存
- 每次保存前会弹出确认，并在同级按文件名生成的目录里写入时间戳备份，例如 `CLAUDE-backup/CLAUDE.md.bak-时间戳`
- 可在网页中查看历史备份列表，并一键恢复指定版本
- 恢复历史版本时，会先为当前内容再生成一份新备份
- 可直接运行 `npx yq-workflow config prompt` 或 `npx yq-workflow config prompt-web`

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
