# 命令参考

当前命令包包含 29 个 `/yq:*` 命令，按职责分成四组。

## 开发与交付

| 命令 | 说明 |
|------|------|
| `/yq:workflow` | 单模型完整开发工作流：澄清、计划、实施、验证、交付 |
| `/yq:plan` | 整理上下文并生成可执行实施计划 |
| `/yq:execute` | 基于现有计划逐步实施并同步验证 |
| `/yq:team` | 面向团队协作的结构化交付入口 |
| `/yq:team-research` | 梳理需求、约束和成功标准 |
| `/yq:team-plan` | 拆任务边界并生成协作计划 |
| `/yq:team-exec` | 根据计划推进实现、记录分工和验证 |
| `/yq:team-review` | 汇总发现、风险与修复建议 |
| `/yq:frontend` | 前端任务专项流：需求、实现、验证、交付 |
| `/yq:backend` | 后端任务专项流：需求、实现、验证、交付 |
| `/yq:feat` | 在边界清晰后完成功能实现与验证 |
| `/yq:codex-exec` | 读取计划文件并在当前会话直接落实实现 |

```text
/yq:plan 为设置页补充导出配置能力
/yq:execute .claude/plan/export-settings.md
/yq:frontend 调整首页 Hero 和导航层级
```

## 分析与质量

| 命令 | 说明 |
|------|------|
| `/yq:analyze` | 只读分析代码、架构与风险 |
| `/yq:debug` | 复现问题、定位根因并安全修复 |
| `/yq:optimize` | 定位瓶颈、设计优化方案并验证收益 |
| `/yq:test` | 补齐关键路径、边界条件与回归测试 |
| `/yq:review` | 审查变更的正确性、风险与测试缺口 |
| `/yq:enhance` | 把模糊需求整理成结构化任务说明 |

```text
/yq:review
/yq:debug 为什么安装流程在 Windows 下找不到目标目录
```

## 项目与 Git

| 命令 | 说明 |
|------|------|
| `/yq:init` | 初始化项目 AI 上下文，生成 `CLAUDE.md` |
| `/yq:context` | 维护项目上下文、决策记录与历史整理 |
| `/yq:commit` | 智能生成 conventional commit 信息 |
| `/yq:rollback` | 交互式回滚到历史版本 |
| `/yq:clean-branches` | 安全清理已合并或过期分支 |
| `/yq:worktree` | 管理 Git worktree |

## OpenSpec / 规范驱动

| 命令 | 说明 |
|------|------|
| `/yq:spec-init` | 初始化 OpenSpec 环境并检查规范目录 |
| `/yq:spec-research` | 从需求提炼约束、范围和验收标准 |
| `/yq:spec-plan` | 根据规范生成实施计划 |
| `/yq:spec-impl` | 按规范执行实现并持续验证 |
| `/yq:spec-review` | 归档前检查规范一致性与剩余风险 |

```text
/yq:spec-init
/yq:spec-research 为插件市场增加安装排序功能
/yq:spec-plan
```

## 补充说明

- `/yq:frontend` 和 `/yq:backend` 现在是任务入口名称，不再代表底层会切到不同模型
- `/yq:codex-exec` 这个命令名保留用于兼容现有使用习惯；当前定位是“读取计划并在当前会话执行”
- 主菜单里的“帮助”会分别展示已安装的 `/yq:*` 命令和 `yq-skills`
