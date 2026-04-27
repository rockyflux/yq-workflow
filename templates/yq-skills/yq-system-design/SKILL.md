---
name: yq-system-design
description: Use when a requirement needs architecture decisions, module boundaries, key flows, trade-offs, or an implementation path before coding starts.
upstream:
  - yq-req-analysis
downstream:
  - yq-api-design
  - yq-db-design
  - yq-config-gen
  - yq-code-gen
route_when:
  - if: 范围和验收标准还不清楚
    go:
      - yq-req-analysis
  - if: 主要是接口字段与错误语义
    go:
      - yq-api-design
  - if: 主要是数据库模型
    go:
      - yq-db-design
  - if: 已经有方案，只差落地
    go:
      - yq-code-gen
handoff:
  next_recommended: yq-api-design
  alternates:
    - yq-db-design
    - yq-config-gen
    - yq-code-gen
---

# YQ System Design

## Overview

把需求转成系统级方案，明确组件职责、边界、关键链路、非功能要求和技术取舍。

**Core principle:** 先定义边界和流转，再讨论技术选型。

## When to Use

- 需求基本明确，但实现路径不止一种
- 需要确定模块拆分、调用关系、状态流或部署影响
- 需要把性能、安全、观测、可靠性纳入方案
- 开发前需要统一技术方向和风险控制方式

## Route Elsewhere

- 范围和验收标准还不清楚：转 `yq-req-analysis`
- 主要是接口字段与错误语义：转 `yq-api-design`
- 主要是数据库模型：转 `yq-db-design`
- 已经有方案，只差落地：转 `yq-code-gen`

## Process

1. 重述目标、约束和本次设计边界。
2. 划分组件职责、依赖关系和关键状态。
3. 描述主流程、失败流程、恢复或降级路径。
4. 说明性能、安全、审计、监控如何落地。
5. 对关键方案给出 trade-off、风险和推荐路径。

## Output

```markdown
# System Design
## Goal and Scope
## Assumptions
## Architecture Overview
## Components and Responsibilities
## Key Flows
## Reliability / Security / Observability
## Trade-offs and Alternatives
## Risks
## Recommended Next Step
```

## Related Skills

- 上游通常来自 `yq-req-analysis`
- 下游常接 `yq-api-design`、`yq-db-design`、`yq-config-gen`、`yq-code-gen`
- 复杂多步骤实现前可配合 `superpowers:writing-plans`

## Recommended Next Step

- 默认先交给 `yq-api-design`、`yq-db-design`、`yq-config-gen` 细化契约、数据和配置
- 如果方案已经足够具体，也可以直接进入 `yq-code-gen`

## Common Mistakes

- 只有结构，没有决策理由
- 只讲成功路径，不讲失败和恢复
- 把框架特性当成业务边界设计
