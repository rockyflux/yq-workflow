# 快速开始

## YQ 是什么

YQ 是一个 AI 编程工具助手，负责把工作流、命令、技能和常用工具入口组织到一起。

它会把这些内容安装到你的本地环境里：

- `/yq:*` 命令文件，放到 `~/.claude/commands/yq/`
- Claude 导向的提示词资产，放到 `~/.claude/.yq/prompts/`
- 工作流规则与技能
- `templates/yq-skills/`、`templates/base-skills/`、`templates/superpowers/` 对应镜像到 `~/.agents/skills/`

目标很直接：让你的 AI 编程环境拥有更完整的工作流、命令入口和协作约束，而不是再套一层黑盒编排。

## 需要什么

- **Node.js 20+**：`ora@9.x` 要求 Node 20，Node 18 会直接报语法错误
- **Claude Code CLI**：YQ 的命令包当前默认安装到它的标准目录
- **其他 AI 编程工具**：如 `Codex`、`Gemini CLI`、`OpenCode` 可在主菜单“安装编程工具”中按需安装
- **可选的 MCP 凭证**：如果你需要数据库、GitHub 或文件资源类 MCP，再按需配置

## 安装

```bash
npx yq-workflow
```

默认使用简体中文，不再弹出语言选择。
初始化默认走轻量安装路径，不再单独询问 `liteMode`。

也可以显式打开主菜单或直接初始化：

```bash
npx yq-workflow menu
npx yq-workflow init
```

## 安装后会得到什么

- 主菜单：安装 / 更新工作流、配置 MCP、打开 API 配置工具下载页、选择输出风格、通过“安装编程工具”统一管理 Claude Code / Codex / Gemini CLI / OpenCode、检查工具更新
- 29 个 `/yq:*` 命令：覆盖规划、执行、分析、调试、Spec 工作流、Git 辅助和项目上下文管理
- 技能镜像：YQ 自带技能、基础技能、Superpowers 技能会一起落到 `~/.agents/skills/`

## 先试一个最小示例

在 Claude Code 里输入：

```text
/yq:plan 为当前仓库补一个配置说明页面
```

如果你想直接执行已有计划，也可以：

```text
/yq:execute .claude/plan/example.md
```

## 更新与卸载

```bash
# 更新
npx yq-workflow@latest

# 卸载
npx yq-workflow menu
```

卸载入口在主菜单里。

## 下一步

- [命令参考](/guide/commands)：看 29 个命令分别做什么
- [工作流指南](/guide/workflows)：按任务类型选择合适的工作流
- [MCP 配置](/guide/mcp)：补齐外部能力
- [配置说明](/guide/configuration)：查看安装目录和运行时约定
