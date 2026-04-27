---
name: yq-security-scan
description: Use when application changes need a security-focused review for exploit paths, auth gaps, data exposure, trust boundaries, or release-blocking vulnerabilities.
upstream:
  - yq-code-review
  - yq-test-gen
  - yq-dependency-check
downstream:
  - yq-code-gen
  - yq-doc-gen
route_when:
  - if: 主要是普通代码质量 review
    go:
      - yq-code-review
  - if: 主要是依赖版本风险
    go:
      - yq-dependency-check
  - if: 主要是故障排查
    go:
      - yq-debug
handoff:
  next_recommended: yq-code-gen
  alternates:
    - yq-doc-gen
---

# YQ Security Scan

## Overview

从攻击者和防守者视角检查改动中的越权、注入、数据暴露、鉴权缺口和信任边界问题。

**Core principle:** 先看攻击面和边界，再看实现细节。

## When to Use

- 用户要做安全检查、漏洞扫描或上线前安全把关
- 改动涉及认证、授权、敏感数据、文件、网络或第三方输入
- 需要快速识别 release-blocking 风险
- 需要补齐安全视角而不只是功能正确性

## Route Elsewhere

- 主要是普通代码质量 review：转 `yq-code-review`
- 主要是依赖版本风险：转 `yq-dependency-check`
- 主要是故障排查：转 `yq-debug`

## Process

1. 明确入口、资产、信任边界和攻击面。
2. 检查认证、授权、输入校验和输出暴露。
3. 检查日志、审计、密钥和敏感配置处理。
4. 识别高危利用路径和影响范围。
5. 输出优先级明确的修复建议和阻塞项。

## Output

```markdown
# Security Review
## Scope
## Attack Surface
## Findings
## Impact
## Mitigations
## Residual Risks
## Recommended Next Step
```

## Related Skills

- 常与 `yq-code-review`、`yq-dependency-check` 配合
- 修复安全问题时下游通常接 `yq-code-gen`
- 沉淀上线风险、缓解措施和注意事项时可继续接 `yq-doc-gen`

## Recommended Next Step

- 如果发现可修复的问题，默认交给 `yq-code-gen` 落地整改
- 如果需要把风险、缓解措施和发布阻塞项沉淀给团队，接 `yq-doc-gen`

## Common Mistakes

- 只看库漏洞，不看业务授权
- 没有按严重度排序
- 把安全问题埋进一般建议里
