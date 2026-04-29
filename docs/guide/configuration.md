# 配置说明

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

## 主菜单对应命令

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

## 主菜单包含什么

- 工作流安装 / 重装
- 工作流更新
- MCP 配置
- API 配置工具下载入口（跳转 `cc-switch` releases，手动完成配置）
- 输出风格选择
- 实用工具：`ccusage`、`CCometixLine`
- 安装编程工具：统一管理 Claude Code、Codex、Gemini CLI、OpenCode，并展示当前 / 最新版本
- 工具更新检查：`Claude Code`、`Codex`、`CCR`、`CCometixLine`
- 配置 Skills：第一个入口就是“本地网页版 Skills”，默认打开 `.agents/skills`，并可切换 `.claude/skills`、`.codex/skills`、`.gemini/skills`、`.kiro/skills`
- 配置 Skills：保留“桌面软件管理 Skills”入口，点击后跳转到 `Skills Manage` GitHub 项目页
- 本地网页版 Skills 若已运行，再次打开会复用现有页面；可在 Skills 菜单里关闭，也可执行 `npx yq-workflow config skills-web-close`
- 网页右上角提供“关闭服务”按钮，可直接在浏览器里关闭当前 Skills 服务
- 帮助页：仅显示主菜单对应的常用 `npx` 命令与操作提示

## 运行时约定

- 默认使用简体中文，不再弹出语言选择
- 初始化默认走无 Web UI 的轻量安装路径
- 主菜单保留完整入口分组，不再依赖旧版多模型路由配置
- MCP 分类固定为：
  - 必装工具
  - 数据库操作
  - Git / 版本控制
  - 文件 / 资源操作

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
