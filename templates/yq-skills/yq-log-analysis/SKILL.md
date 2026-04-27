---
name: yq-log-analysis
description: Use when application, system, or trace logs need to be turned into timelines, signals, suspicious patterns, and actionable debugging findings.
upstream:
  - yq-debug
downstream:
  - yq-debug
  - yq-performance-opt
  - yq-security-scan
route_when:
  - if: 主要是代码根因分析
    go:
      - yq-debug
  - if: 主要是性能基线和瓶颈
    go:
      - yq-performance-opt
  - if: 主要是安全异常和攻击迹象
    go:
      - yq-security-scan
handoff:
  next_recommended: yq-debug
  alternates:
    - yq-performance-opt
    - yq-security-scan
---

# YQ Log Analysis

## Overview

把原始日志转成可读的事件时间线、异常信号和排查线索，减少“看了很多日志但没有结论”的情况。

**Core principle:** 先提取信号和时间线，再推断根因。

## When to Use

- 用户给出大量日志，希望提炼异常点
- 需要按时间线还原请求、任务或事故过程
- 需要从 trace id、request id、错误堆栈里找线索
- 你想先从日志证据收口，再进入 debug

## Route Elsewhere

- 主要是代码根因分析：转 `yq-debug`
- 主要是性能基线和瓶颈：转 `yq-performance-opt`
- 主要是安全异常和攻击迹象：转 `yq-security-scan`

## Process

1. 识别时间范围、环境、关键请求标识和上下文。
2. 去噪并聚合同类错误、告警和状态变化。
3. 还原关键时间线和跨模块链路。
4. 提取异常模式、首次发生点和重复信号。
5. 输出最值得验证的怀疑点和下一步动作。

## Output

```markdown
# Log Analysis
## Scope and Time Window
## Key Signals
## Timeline
## Suspicious Patterns
## Most Likely Failure Points
## Questions to Verify
## Recommended Next Step
```

## Related Skills

- 常作为 `yq-debug` 前置
- 性能侧分析可继续接 `yq-performance-opt`
- 涉及攻击或越权迹象时接 `yq-security-scan`

## Recommended Next Step

- 默认交给 `yq-debug`，把时间线和异常信号转成根因假设验证
- 如果日志已经明确指向资源瓶颈，改接 `yq-performance-opt`
- 如果日志里出现越权、扫描或异常访问迹象，接 `yq-security-scan`

## Common Mistakes

- 只罗列报错，不做归并
- 没有按时间和链路重建上下文
- 把噪音日志误当关键证据
