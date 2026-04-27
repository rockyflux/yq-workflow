---
name: yq-code-gen
description: Use when requirements or designs are ready to be turned into production code for feature delivery, scaffolding, implementation gaps, or maintainable module creation.
upstream:
  - yq-req-analysis
  - yq-system-design
  - yq-api-design
  - yq-db-design
  - yq-config-gen
downstream:
  - yq-test-gen
  - yq-code-review
  - yq-security-scan
route_when:
  - if: 范围或验收标准还不清楚
    go:
      - yq-req-analysis
  - if: 方案和边界还没定
    go:
      - yq-system-design
      - yq-api-design
      - yq-db-design
  - if: 重点是重构旧代码
    go:
      - yq-code-refactor
  - if: 重点是定位问题
    go:
      - yq-debug
handoff:
  next_recommended: yq-test-gen
  alternates:
    - yq-code-review
    - yq-security-scan
---

# YQ Code Generation

## Overview

把已经明确的需求、接口、数据和边界落成可运行、可验证、可维护的实现。

**Core principle:** 先对齐边界和验证方式，再写最贴近现有代码库的实现。

## When to Use

- 用户要实现功能、补模块、落地设计或补齐骨架
- 上游需求和方案已经基本稳定
- 需要在现有代码库模式内新增行为
- 重点是交付代码，不是讨论方案

## Route Elsewhere

- 范围或验收标准还不清楚：转 `yq-req-analysis`
- 方案和边界还没定：转 `yq-system-design`、`yq-api-design`、`yq-db-design`
- 重点是重构旧代码：转 `yq-code-refactor`
- 重点是定位问题：转 `yq-debug`

## Process

1. 汇总上游约束、假设和禁止事项。
2. 对照现有代码库找到最接近的实现模式。
3. 先立边界和接口，再填业务逻辑、校验和错误处理。
4. 为测试、日志和后续评审保留稳定观察点。
5. 标明未覆盖风险和后续补测点。

## Output

```markdown
# Code Generation Result
## Scope Implemented
## Files or Modules Added / Changed
## Key Decisions
## Validation and Error Handling
## Follow-up Tests Needed
## Recommended Next Step
```

## Related Skills

- 上游通常来自 `yq-req-analysis`、`yq-system-design`、`yq-api-design`、`yq-db-design`
- 下游通常接 `yq-test-gen`、`yq-code-review`、`yq-security-scan`
- 编码前后的验证纪律可参考 `superpowers:test-driven-development`

## Recommended Next Step

- 默认交给 `yq-test-gen`，先把关键行为和回归风险锁住
- 如果需要先做人审视角的风险收敛，可接 `yq-code-review`
- 如果改动涉及认证、授权、敏感数据或外部输入，可并行补 `yq-security-scan`

## Common Mistakes

- 直接开写，没有先收口边界
- 只补 happy path，没有错误语义和状态校验
- 生成脱离仓库风格的孤岛式代码
