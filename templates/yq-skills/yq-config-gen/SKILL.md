---
name: yq-config-gen
description: Use when an application needs environment variables, config templates, runtime settings, or safer configuration organization before delivery.
---

# YQ Config Generation

## Overview

整理运行配置、环境参数和模板文件，明确哪些可变、哪些敏感、哪些需要按环境分层管理。

**Core principle:** 配置必须可理解、可替换、可审计，不能靠口口相传。

## When to Use

- 需要生成 `.env.example`、配置模板或部署参数说明
- 功能涉及多环境差异、密钥、开关或外部依赖
- 需要统一默认值、必填项和覆盖规则
- 你怀疑交付时会因配置不清而出故障

## Route Elsewhere

- 主要是系统架构设计：转 `yq-system-design`
- 主要是代码实现：转 `yq-code-gen`
- 主要是部署或分支交付说明：转 `yq-doc-gen`、`yq-git-helper`

## Process

1. 枚举运行所需配置及其责任归属。
2. 区分必填、可选、敏感和派生配置。
3. 定义默认值、环境差异和覆盖顺序。
4. 生成模板、注释和安全使用说明。
5. 标出缺失配置时的失败方式与排查入口。

## Output

```markdown
# Configuration Plan
## Config Inventory
## Required and Optional Settings
## Environment Differences
## Defaults and Override Rules
## Secret Handling Notes
## Example Template
## Recommended Next Step
```

## Related Skills

- 上游通常来自 `yq-system-design`
- 下游通常接 `yq-code-gen`、`yq-doc-gen`
- 涉及敏感项时可配合 `yq-security-scan`

## Common Mistakes

- 混淆敏感配置和普通参数
- 没有说明默认值和覆盖顺序
- 配置模板和真实运行要求不一致
