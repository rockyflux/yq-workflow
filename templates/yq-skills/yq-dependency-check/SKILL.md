---
name: yq-dependency-check
description: Use when packages or libraries need review for vulnerability exposure, version drift, upgrade risk, compatibility, or supply-chain concerns.
upstream:
  - yq-code-review
  - yq-security-scan
downstream:
  - yq-security-scan
  - yq-code-gen
  - yq-doc-gen
  - yq-git-helper
route_when:
  - if: 主要是代码漏洞路径
    go:
      - yq-security-scan
  - if: 主要是功能异常排查
    go:
      - yq-debug
  - if: 主要是实现升级代码
    go:
      - yq-code-gen
handoff:
  next_recommended: yq-security-scan
  alternates:
    - yq-code-gen
    - yq-doc-gen
    - yq-git-helper
---

# YQ Dependency Check

## Overview

评估三方依赖是否安全、是否过时、升级会带来什么兼容或运维风险，以及是否值得引入。

**Core principle:** 不只看“能不能装”，还要看“能不能长期安全使用”。

## When to Use

- 用户要检查依赖风险、升级影响或漏洞暴露
- 准备升级框架、SDK 或关键基础库
- 想判断一个新依赖是否值得采用
- 线上问题可能与版本漂移、breaking change 或 transitive dependency 有关

## Route Elsewhere

- 主要是代码漏洞路径：转 `yq-security-scan`
- 主要是功能异常排查：转 `yq-debug`
- 主要是实现升级代码：转 `yq-code-gen`

## Process

1. 识别直接依赖、传递依赖和业务关键程度。
2. 检查漏洞、维护状态、发布活跃度和版本跨度。
3. 分析 breaking changes、迁移成本和兼容面。
4. 评估供应链风险、锁版本策略和回滚方案。
5. 输出升级建议、阻塞项和验证重点。

## Output

```markdown
# Dependency Check
## Scope
## Risk Summary
## Vulnerabilities or Drift
## Upgrade Impact
## Compatibility Notes
## Recommendation
## Recommended Next Step
```

## Related Skills

- 常与 `yq-security-scan`、`yq-doc-gen` 配合
- 涉及代码改造时下游通常接 `yq-code-gen`
- 发版说明可继续交给 `yq-git-helper`

## Recommended Next Step

- 如果依赖风险会扩散到应用攻击面，默认接 `yq-security-scan`
- 如果已经决定升级或替换实现，接 `yq-code-gen`
- 如果需要同步升级说明、验证重点和交付注意事项，补 `yq-doc-gen` 或 `yq-git-helper`

## Common Mistakes

- 只看 CVE，不看维护状态和迁移成本
- 忽略传递依赖和锁版本策略
- 升级建议没有验证重点
