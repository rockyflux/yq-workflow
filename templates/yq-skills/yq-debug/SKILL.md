---
name: yq-debug
description: Use when incorrect behavior, failing tests, incidents, or hard-to-explain runtime problems need reproduction, evidence gathering, root-cause analysis, and a safe next step.
---

# YQ Debug

## Overview

从“现象”走到“根因”和“修复方向”，强调复现、证据链、影响范围和结论可信度。

**Core principle:** 先找根因，再讨论修复。

## When to Use

- 用户要排查问题、定位 bug、解释异常行为
- 测试失败、线上报错、状态不一致或任务执行异常
- 现象存在，但根因不明确
- 需要给出可信的下一步，而不是猜测式修复

## Route Elsewhere

- 主要是读懂代码结构：转 `yq-code-explain`
- 已知根因，只差落地修复：转 `yq-code-gen`
- 输入主要是日志集合：先转 `yq-log-analysis`

## Process

1. 明确现象、预期差异和触发条件。
2. 缩小范围：输入、环境、模块、时间点和最近变更。
3. 收集证据：日志、堆栈、状态、配置和复现结果。
4. 建立并验证单一假设，区分确认项与高概率怀疑。
5. 输出根因、影响范围、修复建议和防回归动作。

## Output

```markdown
# Debug Report
## Symptom
## Trigger Conditions
## Evidence
## Root Cause or Best Hypothesis
## Impact Scope
## Fix Recommendation
## Regression Prevention
## Recommended Next Step
```

## Related Skills

- 常与 `yq-log-analysis`、`yq-code-explain` 配合
- 下游通常接 `yq-code-gen`、`yq-test-gen`
- 排障过程建议参考 `superpowers:systematic-debugging`

## Common Mistakes

- 一开始就改代码
- 把报错位置误当根因
- 没有区分“已确认”和“待验证”
