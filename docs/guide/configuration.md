# 配置说明

## 这页能解决什么

如果你想确认这些信息，可以优先看这一页：

- 某个功能从哪个命令进入
- 某个菜单项背后实际会打开什么
- 本地网页是固定地址还是临时地址
- 外部工具、项目页、下载页分别在哪里

## 安装后目录结构

```text
~/.claude/
├── commands/yq/            # /yq:* 命令文件
├── skills/yq/              # 工作流技能
├── rules/                  # 辅助规则
└── .yq/
    └── prompts/
        └── claude/         # Claude 导向提示词资产

~/.agents/skills/
├── yq/                     # templates/yq-skills/ 的镜像
├── yq-base/                # templates/base-skills/ 的镜像
└── superpowers/            # templates/superpowers/ 的镜像

~/.kiro/skills/
├── yq/                     # templates/yq-skills/ 的镜像
├── yq-base/                # templates/base-skills/ 的镜像
└── superpowers/            # templates/superpowers/ 的镜像

~/.kiro/
└── steering/
    └── kiro.md             # Kiro 全局 steering 提示词
```

如果 `CLAUDE.md`、`AGENTS.md`、`GEMINI.md`、`guidelines.mdc`、`kiro.md` 已存在，保存前会先创建同级 `*-backup/` 目录，并最多保留最新 10 份备份。

## 主入口命令

```bash
npx yq-workflow
npx yq-workflow menu
npx yq-workflow init
npx yq-workflow update
npx yq-workflow help
npx yq-workflow config prompt
npx yq-workflow config skills
npx yq-workflow config mcp
```

帮助页只展示这组“主菜单有对应入口”的命令。`config *-web`、`config api`、`diagnose-mcp`、`fix-mcp` 等 CLI 直达命令仍可单独执行，但不放在帮助页主列表中。

## 本地网页入口

这三类功能都会启动一个本地网页服务，地址不是固定写死的，而是运行时自动分配：

- 监听地址：`http://127.0.0.1:<随机端口>`
- 已有实例运行时，会优先复用已有页面
- 页面右上角通常提供“关闭服务”按钮

### 提示词配置页

- 入口命令：`npx yq-workflow config prompt`
- 直达命令：`npx yq-workflow config prompt-web`
- 地址形式：`http://127.0.0.1:<port>`
- 作用：
  - 编辑 Claude、Codex、Gemini、Cursor、Kiro 的全局提示词
  - 保存前确认
  - 自动备份并支持历史恢复
  - Claude 支持导入热门 `Claude.md`

### Skills 网页版

- 入口命令：`npx yq-workflow config skills`
- 直达命令：`npx yq-workflow config skills-web`
- 关闭命令：`npx yq-workflow config skills-web-close`
- 地址形式：`http://127.0.0.1:<port>`
- 作用：
  - 浏览本地 Skills 文件树
  - 默认打开 `.agents/skills`
  - 可切换 `.claude/skills`、`.codex/skills`、`.gemini/skills`、`.kiro/skills`
  - 集成 Skills 官方目录与相关操作入口

### MCP 配置页

- 入口命令：`npx yq-workflow config mcp`
- 直达命令：`npx yq-workflow config mcp-web`
- 地址形式：`http://127.0.0.1:<port>`
- 作用：
  - 按客户端管理 Claude、Codex、Gemini、Cursor、Kiro 的 MCP
  - 支持预置模板、搜索、启停、JSON 直编
  - 保存前自动备份
  - 集成 Smithery 检测、安装、搜索和详情页跳转

## 主菜单总览

- 工作流安装 / 重装
- 工作流更新
- 热门开源工作流
- 提示词配置：本地网页统一编辑 Claude / Codex / Gemini / Cursor / Kiro
- 配置 Skills：本地网页版 Skills、查看本地目录、跳转 Skills Manage
- MCP 配置
- Claude Code 工具：`Claude Code`、`ccusage`、`CCR`、`CCometixLine`、`Claude HUD`
- 基础环境检测：`Git`、`PowerShell`、`Node.js`、`Python`、`pip`、`pnpm`、`uv`、`ripgrep (rg)`、`VS Code`
- 安装编程工具：统一管理 `Claude Code`、`Codex CLI`、`Gemini CLI`、`OpenCode`，以及 `AionUi`、`MossX`、`Codex App`、`Any Code`
- AI 账号管理：`cc-switch`、`Cockpit Tools`、`Cherry Studio` 与供应商入口
- 模型使用统计：`Claude Code`、`Codex`、`网页版`
- 本地网页版 Skills 若已运行，再次打开会复用现有页面；可在 Skills 菜单里关闭，也可执行 `npx yq-workflow config skills-web-close`
- 网页右上角提供“关闭服务”按钮，可直接在浏览器里关闭当前 Skills 服务
- 帮助页：仅显示主菜单对应的常用 `npx` 命令与操作提示

## 主菜单功能映射

### 初始化 / 重装工作流

- 安装命令、提示词、规则、Skills 和 steering 模板
- 覆盖更新前展示写入目录和影响边界

### 更新工作流

- 检测当前安装版本
- 更新到当前启动版本
- 若发现新版本，主菜单会高亮提示

### 热门开源工作流

- 查看 `GET SHIT DONE`、`gstack`、`Trellis`
- npm 包支持检测版本、安装 / 更新 / 卸载
- 外部项目支持打开教程或项目页

### 提示词配置

- 打开本地网页编辑 Claude、Codex、Gemini、Cursor、Kiro 的提示词文件
- 保存前确认
- 自动备份并支持历史恢复
- Claude 支持导入热门模板

### 配置 Skills

- 打开本地网页版 Skills
- 查看本地 Skills 目录
- 打开 `Skills Manage` 项目页

### 配置 MCP

- 按客户端管理 Claude、Codex、Gemini、Cursor、Kiro 的 MCP
- 支持搜索、启停、JSON 直编、自动备份
- 集成 Smithery CLI 检测、安装、搜索与详情页跳转

### Claude Code 工具

- 管理 `Claude Code`、`ccusage`、`CCR`、`CCometixLine`
- npm 工具支持安装 / 更新 / 卸载
- `ccusage` 可直接运行
- `Claude HUD` 为项目页直达入口

### 基础环境检测

- 表格展示常用基础工具的安装状态、版本与说明
- 可进入安装命令或官网下载页

### 安装编程工具

- `CLI 命令行版`：`Claude Code`、`Codex CLI`、`Gemini CLI`、`OpenCode`
- `桌面端 UI`：`AionUi`、`MossX 客户端`、`Codex App`、`Any Code`
- CLI 支持版本检测与安装 / 更新 / 卸载

### AI 账号管理

- 按“客户端”和“账号 / token 供应商”分组展示网页入口
- 包含科学上网推荐列表、续杯入口、账号购买与免费 Web Chat

### 模型使用统计

- 运行 `Claude Code`、`Codex`、`网页版` 三类统计命令

### 帮助

- 只展示主菜单有对应入口的常用命令

### 卸载和删除配置

- 卸载工作流文件
- 删除配置
- 尝试移除全局 `yq-workflow`

## 功能网址索引

下面这些是文档里最常会查到的外部网址，按功能分组列出。

### 项目与参考

- YQ Workflow 项目地址：<https://github.com/rockyflux/yq-workflow>
- AI 编程实践指南：<https://github.com/rockyflux/ai-guide>

### Skills 相关

- Skills 官方目录：<https://skills.sh/>
- Skills Manage 项目页：<https://github.com/iamzhihuix/skills-manage>

### 热门开源工作流

- GET SHIT DONE 教程：<https://github.com/gsd-build/get-shit-done/blob/main/README.zh-CN.md>
- gstack 项目 / 教程：<https://github.com/garrytan/gstack>
- Trellis 教程：<https://github.com/mindfold-ai/Trellis/blob/main/README_CN.md>

### Claude Code 工具

- Claude HUD 项目页：<https://github.com/jarrodwatts/claude-hud/>

### 桌面端编程工具

- AionUi：<https://www.aionui.com/zh/>
- MossX 客户端下载页：<https://www.mossx.ai/download>
- Codex App 安装指引：<https://www.codex-docs.com/getting-started/quickstart>
- Any Code 下载页：<https://github.com/anyme123/Any-code/releases>
- Any Code 项目页：<https://github.com/anyme123/Any-code>

### 账号与客户端工具

- cc-switch 下载页：<https://github.com/farion1231/cc-switch/releases>
- Cockpit Tools：<https://github.com/jlcodes99/cockpit-tools>
- Cherry Studio 官网：<https://www.cherry-ai.com/>
- CLIProxyAPI：<https://github.com/router-for-me/CLIProxyAPI>
- Sub2API-CRS2：<https://github.com/Wei-Shaw/sub2api>

### 账号 / token 与网络入口

- 科学上网推荐列表：<https://www.ermao.net/posts/vpn>
- 无限续杯工具 1：<https://pay.ldxp.cn/shop/xxdlzs>
- 无限续杯工具 2：<https://suiyuee.top/shop>
- 账号购买 1：<https://makerich.club/>
- 账号购买 2：<https://wafase.com/>
- AI 中转套餐大全：<https://apis.you/catalog>
- 免费 Web Chat 1：<https://chat.sharedchat.cc/>
- 免费 Web Chat 2：<https://chat.oaichat.cc/>

### MCP 生态

- Smithery 服务器目录：<https://smithery.ai/servers>

## 运行时约定

- 默认使用简体中文，不再弹出语言选择
- 初始化默认走无 Web UI 的轻量安装路径
- 主菜单保留完整入口分组，不再依赖旧版多模型路由配置
- MCP 分类固定为：
  - 必装工具
  - 数据库操作
  - Git / 版本控制
  - 文件 / 资源操作
- 提示词配置与 MCP 配置都会优先复用已打开的本地网页实例

## 快速定位

如果你只是想找一个入口，可以直接按下面用：

- 想编辑提示词：`npx yq-workflow config prompt`
- 想看 Skills：`npx yq-workflow config skills`
- 想管 MCP：`npx yq-workflow config mcp`
- 想检查本机环境：从主菜单进入 `基础环境检测`
- 想安装 CLI 或桌面端：从主菜单进入 `安装编程工具`
- 想找账号、续杯或网络入口：从主菜单进入 `AI 账号管理`

## 常见问题

**Node 18 报 `SyntaxError`**

升级到 Node 20+。当前依赖里的 `ora@9.x` 需要这个版本线。

**MCP 工具没生效**

运行：

```bash
npx yq-workflow diagnose-mcp
```

**想看现在到底装了哪些命令和技能**

打开：

```bash
npx yq-workflow menu
```

然后进入“配置 Skills”查看目录、网页预览和安装项。帮助页本身只列主菜单对应命令，不展开所有 CLI 子命令。

**想直接用网页方式浏览 skills 文件树**

运行：

```bash
npx yq-workflow config skills-web
```

**想关闭已经打开的 skills 网页**

运行：

```bash
npx yq-workflow config skills-web-close
```
