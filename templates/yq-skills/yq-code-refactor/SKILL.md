---
name: yq-code-refactor
description: Use when existing code needs safer structural cleanup, duplication removal, modularization, or maintainability improvement without intentionally changing expected behavior.
---

# YQ Code Refactor

## Overview

在行为守恒前提下改善结构、命名、职责和边界，降低理解成本、改动成本和回归风险。

**Core principle:** 先保护行为，再调整结构。

## When to Use

- 用户要重构、拆模块、去重或收敛职责
- 代码难测、难扩展、耦合过高或命名失真
- 评审已经指出明显的可维护性问题
- 功能反复出错，但根因在结构而不是单点 bug

## Route Elsewhere

- 主要是新增功能：转 `yq-code-gen`
- 主要是根因排查：转 `yq-debug`
- 主要是质量审查：转 `yq-code-review`

## Process

1. 识别重复、长函数、隐式耦合和职责混杂。
2. 明确行为保护方式：现有测试、补测或验证清单。
3. 选择最小有效改法，避免大爆炸重写。
4. 检查结构是否更清晰、更易测、更易改。
5. 记录本次已处理项和剩余技术债。

## Output

```markdown
# Refactor Summary
## Problems Addressed
## Refactor Strategy
## Behavior Preservation Notes
## Structural Improvements
## Remaining Debt
## Recommended Next Step
```

## Related Skills

- 上游常来自 `yq-code-review`、`yq-performance-opt`
- 下游通常接 `yq-test-gen`、`yq-code-review`
- 验证完成前可参考 `superpowers:verification-before-completion`

## Common Mistakes

- 把功能变更伪装成重构
- 没有行为保护就大范围重写
- 只改格式和命名，没有解决真实结构问题
