---
name: yq-db-design
description: Use when a feature needs database schema design, entity relationships, indexes, migrations, data lifecycle rules, or persistence trade-offs.
upstream:
  - yq-system-design
downstream:
  - yq-code-gen
  - yq-test-gen
  - yq-performance-opt
route_when:
  - if: 需求和业务范围还不清楚
    go:
      - yq-req-analysis
  - if: 主要是接口契约
    go:
      - yq-api-design
  - if: 主要是实现 Repository 或 SQL
    go:
      - yq-code-gen
  - if: 主要是性能排查
    go:
      - yq-performance-opt
handoff:
  next_recommended: yq-code-gen
  alternates:
    - yq-test-gen
    - yq-performance-opt
---

# YQ Database Design

## Overview

为业务能力设计可落地的数据模型，覆盖实体关系、约束、索引、迁移和数据演进风险。

**Core principle:** 先定义数据边界和生命周期，再写持久化代码。

## When to Use

- 需要新增表、字段、索引或迁移方案
- 需要把领域模型转成数据库结构
- 需要考虑查询性能、一致性、保留策略或审计要求
- 需要评估 schema 变更对现网和回滚的影响

## Route Elsewhere

- 需求和业务范围还不清楚：转 `yq-req-analysis`
- 主要是接口契约：转 `yq-api-design`
- 主要是实现 Repository 或 SQL：转 `yq-code-gen`
- 主要是性能排查：转 `yq-performance-opt`

## Process

1. 提炼实体、关系、主键和业务约束。
2. 设计表结构、索引和唯一性规则。
3. 明确写入路径、读取模式和一致性要求。
4. 规划迁移、回滚、历史数据兼容和清理策略。
5. 标出性能、容量和演进风险。

## Output

```markdown
# Database Design
## Scope
## Entities and Relationships
## Schema Proposal
## Index and Constraint Plan
## Migration and Rollback Notes
## Data Lifecycle and Retention
## Risks and Trade-offs
## Recommended Next Step
```

## Related Skills

- 上游通常来自 `yq-system-design`
- 下游通常接 `yq-code-gen`、`yq-test-gen`
- 数据性能问题可继续接 `yq-performance-opt`

## Recommended Next Step

- 默认交给 `yq-code-gen`，把 schema、索引和迁移方案落成实现
- 如果需要先保护数据读写行为，可先补 `yq-test-gen`
- 如果当前焦点已经转到查询瓶颈或索引收益，改走 `yq-performance-opt`

## Common Mistakes

- 按代码结构建表，而不是按业务约束建模
- 缺少迁移和回滚说明
- 只考虑写入，不考虑查询和生命周期
