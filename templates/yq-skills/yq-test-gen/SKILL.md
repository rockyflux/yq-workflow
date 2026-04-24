---
name: yq-test-gen
description: Use when behavior needs executable test coverage for new features, bug fixes, regressions, unit or integration cases, or risk-based validation.
---

# YQ Test Generation

## Overview

把需求、设计和实现转成可执行测试，覆盖主路径、边界条件、异常分支和回归风险。

**Core principle:** 测试先服务于行为保护，再服务于实现细节。

## When to Use

- 用户要补测试、写单测、集成测试或回归用例
- 新功能已实现，需要建立保护网
- 修 bug 后需要用测试锁住回归
- 模块复杂、依赖多、改动风险高

## Route Elsewhere

- 行为和边界还没定：先转 `yq-req-analysis` 或 `yq-system-design`
- 主要是实现功能：转 `yq-code-gen`
- 主要是审查改动质量：转 `yq-code-review`

## Process

1. 提炼验收点、关键分支和最高风险行为。
2. 选择测试层次：单元、集成、契约或端到端。
3. 设计主流程、边界、异常和权限场景。
4. 明确测试数据、夹具、mock 和稳定性要求。
5. 标注当前覆盖缺口和后续补测建议。

## Output

```markdown
# Test Plan or Test Result
## Coverage Targets
## Test Cases
## Test Level Strategy
## Fixtures / Mocks / Data Setup
## Edge Cases
## Known Gaps
## Recommended Next Step
```

## Related Skills

- 上游通常来自 `yq-code-gen`、`yq-debug`
- 下游通常接 `yq-code-review`、`yq-security-scan`
- 写行为保护时建议参考 `superpowers:test-driven-development`

## Common Mistakes

- 只测 happy path
- 过度 mock，脱离真实行为
- 用实现细节驱动测试命名和断言
