---
name: yq-api-design
description: Use when a service, frontend, or integration needs stable endpoint contracts, request and response schemas, error models, versioning, or interaction rules.
upstream:
  - yq-system-design
  - yq-req-analysis
downstream:
  - yq-code-gen
  - yq-test-gen
  - yq-security-scan
route_when:
  - if: 需求目标还没定
    go:
      - yq-req-analysis
  - if: 主要是系统层面的模块与流程
    go:
      - yq-system-design
  - if: 主要是数据库建模
    go:
      - yq-db-design
  - if: 只是在解释现有接口代码
    go:
      - yq-code-explain
handoff:
  next_recommended: yq-code-gen
  alternates:
    - yq-test-gen
    - yq-security-scan
---

# YQ API Design

## Overview

定义前后端或服务间的接口契约，覆盖资源模型、字段语义、错误约定、兼容策略和集成边界。

**Core principle:** 先稳定契约，再推进实现。

## When to Use

- 需要设计 REST、RPC、事件或内部服务接口
- 需要统一请求响应结构、错误码、幂等或分页规则
- 前后端、多服务或外部系统之间需要明确责任边界
- 你担心后续实现会因接口含糊而频繁返工

## Route Elsewhere

- 需求目标还没定：转 `yq-req-analysis`
- 主要是系统层面的模块与流程：转 `yq-system-design`
- 主要是数据库建模：转 `yq-db-design`
- 只是在解释现有接口代码：转 `yq-code-explain`

## Process

1. 明确调用方、被调方和业务动作。
2. 定义输入输出模型、校验规则和字段含义。
3. 设计错误语义、状态码、幂等和兼容策略。
4. 说明鉴权、限流、审计和可观测要求。
5. 标注变更风险、版本策略和下游影响。

## Output

```markdown
# API Design
## Scope
## Consumers and Providers
## Endpoints or Contracts
## Request and Response Schema
## Validation and Error Model
## Auth / Rate Limit / Audit Notes
## Compatibility and Versioning
## Recommended Next Step
```

## Related Skills

- 上游通常来自 `yq-system-design`
- 下游通常接 `yq-code-gen`、`yq-test-gen`
- 评估安全面时接 `yq-security-scan`

## Recommended Next Step

- 默认交给 `yq-code-gen`，把契约、错误模型和兼容策略落进实现
- 如果要先保护接口行为或契约边界，可先接 `yq-test-gen`
- 如果接口涉及认证、授权或输入暴露面，补 `yq-security-scan`

## Common Mistakes

- 只有字段，没有行为语义
- 错误模型和兼容策略缺失
- 把内部实现细节暴露成契约
