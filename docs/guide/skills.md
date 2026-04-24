# 技能说明

YQ 在安装工作流时，不只会落 `/yq:*` 命令，也会把技能一并安装到标准目录，供 Claude Code 和代理工作流按需调用。

当前技能分成三组：

- `yq`：面向需求分析、设计、生成、重构、调试、测试、安全、性能、Git 等专项工程任务
- `yq-base`：通用基础能力，如前端设计、代码审查、日报总结、UML、SQL Review 等
- `superpowers`：强调流程纪律的技能层，如 brainstorming、writing-plans、systematic-debugging、verification-before-completion

## 安装到哪里

```text
~/.claude/skills/yq/           # 工作流技能

~/.agents/skills/
├── yq/                        # templates/yq-skills/ 的镜像
├── yq-base/                   # templates/base-skills/ 的镜像
└── superpowers/               # templates/superpowers/ 的镜像
```

其中：

- `~/.claude/skills/yq/` 更偏 Claude Code 自身工作流使用
- `~/.agents/skills/` 是给代理体系读取的镜像目录
- 安装或更新工作流时，这三组技能会一起同步

## 三组技能分别解决什么

### yq 技能

这一组偏“工程专项能力”，适合在需求已经比较明确时，按问题类型挑一个入口。

| 技能前缀 | 典型用途 |
|------|------|
| `yq-req-analysis` | 需求澄清、边界收敛、验收标准整理 |
| `yq-system-design` / `yq-api-design` / `yq-db-design` | 系统、接口、数据库设计 |
| `yq-code-gen` / `yq-code-refactor` / `yq-code-explain` | 生成实现、重构、解释代码 |
| `yq-debug` / `yq-log-analysis` / `yq-performance-opt` | 排障、日志分析、性能优化 |
| `yq-test-gen` / `yq-security-scan` / `yq-dependency-check` | 测试补齐、安全扫描、依赖检查 |
| `yq-git-helper` / `yq-doc-gen` / `yq-drawio-diagram` | Git 辅助、文档生成、图示输出 |

当前仓库内置的 `yq` 技能包括：

`yq-api-design`、`yq-code-explain`、`yq-code-gen`、`yq-code-refactor`、`yq-code-review`、`yq-config-gen`、`yq-db-design`、`yq-debug`、`yq-dependency-check`、`yq-doc-gen`、`yq-drawio-diagram`、`yq-git-helper`、`yq-init-project`、`yq-log-analysis`、`yq-performance-opt`、`yq-req-analysis`、`yq-security-scan`、`yq-system-design`、`yq-test-gen`。

### yq-base 技能

这一组偏“通用生产力增强”，适合补足常见但不一定属于主流程的能力。

- `frontend-design`、`ui-ux-pro-max`：前端页面、组件、视觉质量提升
- `code-reviewer`、`sql-code-review`：通用代码审查与 SQL 审查
- `uml`：用 PlantUML 输出结构图
- `session-wrap`、`research-note-wrap`：会话总结、调研纪要
- `commit-daily-summary`、`project-daily-summary`：日报、提交总结
- `skill-creator`：创建或优化技能本身

### superpowers 技能

这一组更像“流程护栏”，不是只做某件事，而是约束你如何把一件事做完整。

常用组合通常是：

```text
brainstorming
  -> writing-plans
  -> implementation
  -> requesting-code-review / receiving-code-review
  -> verification-before-completion
```

如果你在做这些事情，通常会命中这一组：

- 新功能或行为改动前先做 `brainstorming`
- 多步实施前用 `writing-plans`
- 真实问题排查时用 `systematic-debugging`
- 临近交付时做 `verification-before-completion`
- 需要并行实施、worktree 隔离、收尾集成时，再用对应的并行或 Git 技能

## 怎么理解“命令”和“技能”的关系

- `/yq:*` 命令是用户入口，适合直接发起一类任务
- 技能是执行时按需加载的能力模块，负责细化某个流程或专项动作
- 命令负责“从哪里进入”，技能负责“进去以后怎么做”

可以简单理解为：

```text
/yq:plan      -> 更偏任务入口
writing-plans -> 更偏内部执行方法
```

## 什么时候该关心技能

你通常会在这几种场景里主动关注它：

1. 你想知道安装后到底带了哪些能力，而不只是有哪些命令
2. 你在调试代理行为，想确认某个流程为什么会自动套用某个方法
3. 你准备扩展自己的工作流，希望复用现有 skill 目录结构
4. 你在帮助页里看到了 `yq-skills`，想知道它和 `/yq:*` 的区别

## 常见问题

### 技能会自动安装吗

会。执行 `npx yq-workflow` 初始化或更新工作流时，技能会和命令文件一起落到目标目录。

### 技能和命令是一一对应的吗

不是。

- 一个命令可能会触发多个技能
- 一个技能也可能被多个命令复用
- 还有一些技能是“流程级能力”，平时不会直接作为单独命令出现

### 怎么查看本机已装了哪些技能

可以直接打开主菜单帮助页查看，也可以检查本地目录：

```bash
Get-ChildItem ~/.agents/skills
Get-ChildItem ~/.claude/skills/yq
```

## 下一步

- [快速开始](/guide/getting-started)：先把工作流装起来
- [命令参考](/guide/commands)：从任务入口理解 `/yq:*`
- [工作流指南](/guide/workflows)：理解命令和技能如何串成完整闭环
- [配置说明](/guide/configuration)：确认安装目录和运行时结构
