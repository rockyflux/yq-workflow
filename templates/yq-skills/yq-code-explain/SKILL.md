---
name: yq-code-explain
description: Use when code purpose, module responsibilities, data flow, dependencies, or hidden assumptions need to be explained for onboarding, debugging, or safe changes.
---

# YQ Code Explain

## Overview

把代码从“能看见”解释成“能理解”，说明职责、主流程、依赖、状态变化和隐含约束。

**Core principle:** 解释代码时优先回答“它为什么存在、怎样工作、哪里容易踩坑”。

## When to Use

- 用户要读代码、解释函数、梳理调用链或快速上手模块
- 需要先理解现状再做修改、排障或评审
- 模块行为复杂，单看代码难以快速形成心智模型
- 需要把实现翻译成更可讨论的业务和工程语言

## Route Elsewhere

- 主要是定位故障和根因：转 `yq-debug`
- 主要是交付新代码：转 `yq-code-gen`
- 主要是评审改动风险：转 `yq-code-review`

## Process

1. 明确解释目标：函数、模块、链路还是整体架构。
2. 提炼入口、出口、关键状态和依赖。
3. 说明主流程、分支逻辑和异常处理。
4. 标出重要假设、配置点和外部影响。
5. 总结最值得关注的风险或修改前提。

## Output

```markdown
# Code Explanation
## Purpose
## Main Flow
## Inputs / Outputs / State
## Dependencies
## Hidden Assumptions
## Risky Areas
## Recommended Next Step
```

## Related Skills

- 作为 `yq-debug`、`yq-code-refactor` 的常见前置
- 看完代码后准备动手实现时接 `yq-code-gen`
- 需要系统层解读时可回到 `yq-system-design`

## Common Mistakes

- 只复述代码，不提炼职责
- 没有说明状态和数据流
- 忽略外部依赖与隐含前提
