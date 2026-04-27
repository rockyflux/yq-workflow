---
name: yq-git-helper
description: Use when branches, commits, pull requests, merge readiness, or delivery packaging need to be organized for team handoff.
upstream:
  - yq-code-review
  - yq-doc-gen
  - yq-dependency-check
downstream:
  - superpowers:verification-before-completion
  - superpowers:finishing-a-development-branch
route_when:
  - if: 主要是实现功能
    go:
      - yq-code-gen
  - if: 主要是代码质量审查
    go:
      - yq-code-review
  - if: 主要是运行或技术文档
    go:
      - yq-doc-gen
handoff:
  next_recommended: superpowers:verification-before-completion
  alternates:
    - superpowers:finishing-a-development-branch
---

# YQ Git Helper

## Overview

整理分支、提交、PR 描述和合并前检查，让技术改动能被清晰、规范地交付出去。

**Core principle:** 交付不只是把代码推上去，还要让他人能理解、评审和接手。

## When to Use

- 用户要整理提交、写 PR、准备合并或发布说明
- 需要把一组改动收成清晰的交付单元
- 需要补充变更摘要、验证结果和风险说明
- 需要确认当前分支是否具备合并条件

## Route Elsewhere

- 主要是实现功能：转 `yq-code-gen`
- 主要是代码质量审查：转 `yq-code-review`
- 主要是运行或技术文档：转 `yq-doc-gen`

## Process

1. 整理改动范围、目的和验证结果。
2. 归纳 commit 主题和 PR 主叙事。
3. 检查测试、文档、风险说明和回滚准备。
4. 标出 reviewer 最需要先看的点。
5. 输出合并前的剩余阻塞项或建议动作。

## Output

```markdown
# Git Delivery Summary
## Branch Purpose
## Change Summary
## Validation
## Risks and Notes
## PR Description Draft
## Merge Readiness
## Recommended Next Step
```

## Related Skills

- 上游通常来自 `yq-code-review`、`yq-doc-gen`
- 完成前验证可参考 `superpowers:verification-before-completion`
- 分支收口流程可参考 `superpowers:finishing-a-development-branch`

## Recommended Next Step

- 默认先走 `superpowers:verification-before-completion`，确认交付说法和验证证据一致
- 需要继续收口分支、提交和合并动作时，接 `superpowers:finishing-a-development-branch`

## Common Mistakes

- 提交信息不能反映真实改动意图
- PR 只有“做了什么”，没有“为什么”和“怎么验证”
- 合并前没有显式列出风险和阻塞项
