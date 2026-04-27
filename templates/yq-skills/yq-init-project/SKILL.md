---
name: yq-init-project
description: 初始化项目 AI 上下文，生成/更新根级与模块级 CLAUDE.md 索引
upstream:
  - yq-drawio-diagram
downstream:
  - yq-req-analysis
  - yq-code-explain
  - yq-system-design
route_when:
  - if: 主要是梳理需求范围和验收标准
    go:
      - yq-req-analysis
  - if: 主要是读代码、解释调用链或快速上手模块
    go:
      - yq-code-explain
  - if: 主要是画结构图、流程图或架构图
    go:
      - yq-drawio-diagram
handoff:
  next_recommended: yq-req-analysis
  alternates:
    - yq-code-explain
    - yq-system-design
---

# YQ Init Project

## Overview

初始化仓库级 AI 上下文与模块索引，让后续需求分析、代码解释和设计讨论都建立在统一导航基线上。

**Core principle:** 先把仓库地图画清楚，再进入具体任务。

## 用法

`/init-project <项目摘要或名称>`

## When to Use

- 第一次接手仓库，需要快速建立可导航的 AI 上下文
- 仓库模块较多，后续任务容易因上下文分散而返工
- 希望把根级与模块级说明沉淀为可持续更新的索引文件

## Route Elsewhere

- 主要是梳理需求范围和验收标准：转 `yq-req-analysis`
- 主要是读代码、解释调用链或快速上手模块：转 `yq-code-explain`
- 主要是画结构图、流程图或架构图：转 `yq-drawio-diagram`

## 目标

以“根级简明 + 模块级详尽”的策略初始化项目 AI 上下文，确保后续任务有统一、可导航、可增量维护的上下文基线：

- 在仓库根生成/更新 `CLAUDE.md`（高层愿景、架构总览、模块索引、全局规范）。
- 在识别的各模块目录生成/更新本地 `CLAUDE.md`（接口、依赖、入口、测试、关键文件等）。
- 在信息充分时增强可读性（如结构图、导航信息）；若上下文不足，应明确降级并说明原因。

## Process

**步骤 1**：调用 `get-current-datetime` 子智能体获取当前时间戳。

**步骤 2**：调用一次 `init-architect` 子智能体，输入：

- `project_summary`: $ARGUMENTS
- `current_timestamp`: (来自步骤1的时间戳)

## 执行策略（Agent 自适应，无需用户传参）

- **阶段 A：全仓清点（轻量）**
  快速统计文件与目录，识别模块根（`package.json`、`pyproject.toml`、`go.mod`、`apps/*`、`packages/*`、`services/*` 等）。
- **阶段 B：模块优先扫描（中等）**
  对每个模块执行“入口 / 接口 / 依赖 / 测试 / 数据模型 / 质量工具”的定点读取与样本抽取。
- **阶段 C：深度补捞（按需）**
  小仓库可扩大读取面；大仓库按高风险 / 高价值路径分批补扫。
- **覆盖率度量与可续跑**
  输出“已扫描文件数 / 估算总文件数、已覆盖模块占比、忽略或跳过原因”，并列出“建议下一步深挖路径”。重复运行 `/init-project` 时按已有索引进行**增量更新**和**断点续扫**。

## 安全与边界

- 只读/写文档与索引，不改源代码。
- 默认忽略常见生成物与二进制大文件。
- 主对话仅输出摘要，完整内容写入仓库文件。

## Output

- 在主对话中打印“初始化结果摘要”，至少包含：
  - 根级 `CLAUDE.md` 是否创建/更新、主要栏目概览。
  - 识别的模块数量及其路径列表。
  - 每个模块 `CLAUDE.md` 的生成/更新情况。
  - 若启用了增强可读性项：明确说明是否生成结构图、是否补充导航信息（含数量）。
  - 覆盖率与主要缺口。
  - 若未读全：说明“为何到此为止”，并给出**可执行的下一步**（例如“建议优先补扫：`packages/auth/src/controllers`”）。

## Related Skills

- 初始化完成后通常接 `yq-req-analysis`、`yq-code-explain` 或 `yq-system-design`
- 如果需要把仓库结构、模块关系可视化，可配合 `yq-drawio-diagram`

## Recommended Next Step

- 默认交给 `yq-req-analysis`，把仓库上下文转成可执行需求讨论
- 如果当前目标是快速理解现有实现，改接 `yq-code-explain`
- 如果已经明确要讨论方案和边界，接 `yq-system-design`
