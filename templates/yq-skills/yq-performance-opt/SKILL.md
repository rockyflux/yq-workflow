---
name: yq-performance-opt
description: Use when latency, throughput, resource usage, or scalability concerns need evidence-based bottleneck analysis and optimization trade-offs.
upstream:
  - yq-debug
  - yq-log-analysis
  - yq-db-design
downstream:
  - yq-code-refactor
  - yq-code-gen
  - yq-doc-gen
route_when:
  - if: 主要是功能 bug
    go:
      - yq-debug
  - if: 主要是数据库建模
    go:
      - yq-db-design
  - if: 主要是代码结构清理
    go:
      - yq-code-refactor
handoff:
  next_recommended: yq-code-refactor
  alternates:
    - yq-code-gen
    - yq-doc-gen
---

# YQ Performance Optimization

## Overview

定位性能瓶颈，解释证据，提出带权衡说明的优化建议，而不是凭感觉“调快一点”。

**Core principle:** 先找瓶颈证据，再做优化动作。

## When to Use

- 用户反馈慢、吞吐低、资源高、容量不足
- 需要分析慢查询、热点路径、渲染卡顿或批处理耗时
- 需要给出优化优先级和收益预估
- 想避免过早优化或误优化

## Route Elsewhere

- 主要是功能 bug：转 `yq-debug`
- 主要是数据库建模：转 `yq-db-design`
- 主要是代码结构清理：转 `yq-code-refactor`

## Process

1. 明确性能目标、基线和观测指标。
2. 定位最贵的路径、资源和等待点。
3. 区分计算、IO、锁、网络、缓存或数据访问瓶颈。
4. 给出可验证的优化方案与收益/成本权衡。
5. 标出需要监控和回归验证的指标。

## Output

```markdown
# Performance Analysis
## Goal and Baseline
## Bottlenecks
## Evidence
## Optimization Options
## Trade-offs
## Validation Metrics
## Recommended Next Step
```

## Related Skills

- 常与 `yq-debug`、`yq-log-analysis` 配合
- 结构性优化可继续接 `yq-code-refactor`
- 实施优化时下游通常接 `yq-code-gen`

## Recommended Next Step

- 如果已经确认优化方向，默认接 `yq-code-refactor` 或 `yq-code-gen` 落地
- 如果需要把瓶颈证据、指标和优化取舍沉淀下来，补 `yq-doc-gen`

## Common Mistakes

- 没有基线就谈优化
- 只给建议，不给证据
- 混淆性能问题和普通功能缺陷
