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
```

## 常用命令入口

```bash
npx yq-workflow
npx yq-workflow menu
npx yq-workflow init
npx yq-workflow update
npx yq-workflow config mcp
npx yq-workflow config api
npx yq-workflow diagnose-mcp
```

## 主菜单包含什么

- 工作流安装 / 重装
- 工作流更新
- MCP 配置
- API 配置
- 输出风格选择
- 实用工具：`ccusage`、`CCometixLine`
- Claude Code 安装 / 更新
- Codex 安装 / 更新
- 工具更新检查：`Claude Code`、`Codex`、`CCR`、`CCometixLine`
- 帮助页：分别展示已安装 `/yq:*` 命令与已安装 `yq-skills`

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

然后进入帮助页查看，命令和技能是分开展示的。
