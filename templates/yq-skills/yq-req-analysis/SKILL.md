---
name: yq-req-analysis
description: Use when requirements are vague, conflicting, incomplete, or likely to cause rework unless scope, constraints, actors, and acceptance criteria are clarified first.
upstream:
  - yq-init-project
downstream:
  - yq-system-design
  - yq-api-design
  - yq-db-design
  - yq-code-gen
  - yq-debug
route_when:
  - if: 系统方案和模块边界已成为主要问题
    go:
      - yq-system-design
  - if: 主要是接口契约
    go:
      - yq-api-design
  - if: 主要是表结构和迁移
    go:
      - yq-db-design
  - if: 主要是实现或修 bug
    go:
      - yq-code-gen
      - yq-debug
handoff:
  next_recommended: yq-system-design
  alternates:
    - yq-api-design
    - yq-db-design
---

# YQ Requirement Analysis

## Overview

把零散想法、口头描述、PRD、Issue 和上下游限制收敛成可设计、可开发、可验收的需求定义。

**Core principle:** 先澄清目标、边界和验收，再进入设计或编码。

## When to Use

- 需求来源很多，但范围和成功标准不清楚
- 用户要梳理功能范围、角色、约束、验收标准
- 团队已经准备设计或开发，但仍有明显歧义
- 你怀疑继续推进会导致返工、范围蔓延或责任不清

## Route Elsewhere

- 系统方案和模块边界已成为主要问题：转 `yq-system-design`
- 主要是接口契约：转 `yq-api-design`
- 主要是表结构和迁移：转 `yq-db-design`
- 主要是实现或修 bug：转 `yq-code-gen`、`yq-debug`

## Process

1. 提炼业务目标、用户角色和成功标准。
2. 区分事实、假设、约束和待确认项。
3. 拆分主流程、异常流程、权限和数据边界。
4. 明确范围内、范围外和依赖项。
5. 生成可验证的验收标准与开放问题清单。

## Output

```markdown
# Requirement Analysis
## Business Goal
## Users and Scenarios
## In Scope
## Out of Scope
## Constraints and Dependencies
## Acceptance Criteria
## Open Questions
## Recommended Next Step
```

## Related Skills

- 下游通常接 `yq-system-design`
- 细化接口或数据时接 `yq-api-design`、`yq-db-design`
- 如果需求是多步骤交付输入，可参考 `superpowers:writing-plans`

## Recommended Next Step

- 默认交给 `yq-system-design`，把目标、边界和验收转成实现方案
- 如果需求已经明确收敛在接口或数据面，也可以直接进入 `yq-api-design` 或 `yq-db-design`

## Common Mistakes

- 把实现方案提前写死在需求里
- 只写正常流程，漏掉失败路径和权限边界
- 没有显式列出“不做什么”
