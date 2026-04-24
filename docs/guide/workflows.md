# 工作流指南

YQ 现在是单模型 Claude Code 工作流工具包，所以“怎么选工作流”主要看任务形态，而不是看要切给哪个模型。

## 怎么选

```text
拿到任务
  │
  ├─ 范围很小，直接做？ ─────→ /yq:feat
  │
  ├─ 明确偏前端或后端？ ───→ /yq:frontend 或 /yq:backend
  │
  ├─ 想先拿到计划文件？ ───→ /yq:plan → /yq:execute
  │
  ├─ 已有计划想直接执行？ ─→ /yq:codex-exec
  │
  ├─ 需要团队式分工推进？ ─→ /yq:team-* 系列
  │
  ├─ 需要规范先行？ ───────→ /yq:spec-* 系列
  │
  └─ 想整套流程跑完？ ─────→ /yq:workflow
```

## `plan -> execute`

这是最稳妥也最常用的一条路径。

```text
/yq:plan 为 MCP 配置菜单补充分类说明
/yq:execute .claude/plan/mcp-menu-copy.md
```

适合场景：

- 需求已经比较清楚，但你还想先审一眼计划
- 改动可能跨多个文件，想先确认边界和验证方式
- 你希望把计划文件保留下来，便于团队复用

## `codex-exec`

这个命令名是历史保留，但现在的作用很直接：**读取计划文件并在当前会话执行**。

```text
/yq:codex-exec .claude/plan/fix-docs-links.md
```

适合场景：

- 已经有计划文件，不想再做额外分流
- 想从计划直接落地实现
- 需要兼容旧习惯里的命令名

## `frontend / backend / feat`

这三类更像“轻量任务入口”。

- `/yq:feat`：通用功能开发，适合范围小、边界清晰的任务
- `/yq:frontend`：偏页面、交互、样式、组件结构的任务
- `/yq:backend`：偏服务、脚本、配置、逻辑、接口的任务

它们不再表示底层会自动切换到不同模型，只是帮助你快速选一个更贴合任务语义的入口。

## `team-*`

当任务需要分阶段协作、保留所有权信息和验证记录时，可以用团队工作流：

```text
/yq:team-research 梳理插件安装流程改造需求
/yq:team-plan plugin-install-refresh
/yq:team-exec
/yq:team-review
```

适合场景：

- 需要先明确约束、角色分工和成功标准
- 想把研究、规划、实施、审查拆成独立阶段
- 多人协作，需要更清晰的交接点

## `spec-*`

当需求约束多、验收要求严、或者你希望“先规范后实现”时，用 OpenSpec 这一组：

```text
/yq:spec-init
/yq:spec-research 为主菜单补充工具更新检查
/yq:spec-plan
/yq:spec-impl
/yq:spec-review
```

适合场景：

- 需求里有明确约束、验收标准、兼容性要求
- 想把实现过程沉淀成规范资产
- 需要在归档前检查规范和实现是否一致

## `workflow`

`/yq:workflow` 适合你想用一条命令走完整个开发闭环的时候：

```text
/yq:workflow 重整 README 与 docs 的安装说明
```

如果任务很大，通常还是建议先用 `plan` 拿到计划文件，再决定是否进入执行阶段。
