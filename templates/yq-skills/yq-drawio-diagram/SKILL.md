---
name: yq-drawio-diagram
description: Use when the user requests any visual diagram using draw.io - flowcharts, architecture diagrams, UML, ERD, sequence diagrams, org charts, mind maps, wireframes, network topology, or other diagramming needs
argument-hint: "[language: zh-CN (default) | en | ja | ...]"
allowed-tools:
  - Write
  - Read
  - Bash(python3:*)
  - Bash(python:*)
metadata:
  author: jgraph
  source: https://github.com/jgraph/drawio-mcp
upstream:
  - yq-init-project
  - yq-system-design
  - yq-db-design
  - yq-code-explain
downstream:
  - yq-system-design
  - yq-doc-gen
route_when:
  - if: 主要目标是系统方案、模块边界或架构讨论
    go:
      - yq-system-design
  - if: 主要目标是数据库结构建模
    go:
      - yq-db-design
  - if: 主要目标是文档沉淀和交付材料
    go:
      - yq-doc-gen
handoff:
  next_recommended: yq-doc-gen
  alternates:
    - yq-system-design
---

# Draw.io Diagram Generation

Generate draw.io diagrams by creating compressed URLs via Python and opening them in the browser.

## Overview

把架构、流程、数据关系和其他结构化信息转成可编辑的 draw.io 图，便于讨论、沉淀和交付。

**Core principle:** 先明确图要回答什么问题，再选择图类型和表达粒度。

## When to Use

- 用户明确要求画流程图、架构图、时序图、ERD、UML 或其他结构图
- 文字说明不足以支撑讨论，需要可视化表达系统关系
- 需要把设计结论沉淀为文档可复用图示

## Route Elsewhere

- 主要目标是系统方案、模块边界或架构讨论：转 `yq-system-design`
- 主要目标是数据库结构建模：转 `yq-db-design`
- 主要目标是文档沉淀和交付材料：转 `yq-doc-gen`

## Configuration

### Working Directory
Current working directory: !`pwd`

### Language
- **Default**: `zh-CN` (Chinese)
- **Resolution order** (highest priority first):
  1. `$0` argument from `/drawio-diagram [language]` invocation
  2. Language preference explicitly mentioned in the user's request (e.g., "用英文画", "draw in Japanese")
  3. Default: `zh-CN`
- Diagram labels, notes, and descriptions should use the resolved language
- Technical terms (protocol names, opcodes, HTTP headers, status codes, framework names, etc.) MUST remain in English
- Examples:
  - `zh-CN`: "握手阶段" (not "Handshake Phase"), but keep "HTTP GET", "101 Switching Protocols"
  - `en`: "Handshake Phase", "HTTP GET", "101 Switching Protocols" (all English)

## Reference

Read [claude-project-instructions.md](claude-project-instructions.md) (relative to this skill file) for the complete diagram generation instructions, including:
- Supported diagram types
- Format selection guide (Mermaid / CSV / XML)
- Python URL generation code
- Format examples (Mermaid, XML, CSV syntax)

## Agent CLI Adaptation

The reference instructions mention "HTML artifact" — in Agent CLI environments there are no artifacts. Instead:

1. **Modify the Python script**: At the end of the script (after generating the URL), add `import webbrowser; webbrowser.open(url)` to directly open the draw.io URL in the default browser — no intermediate HTML page needed
2. **Save HTML backup**: Save the HTML to `{intent}-{type}-{timestamp}.html` in the current working directory (see Configuration > Working Directory above). Naming convention:
   - `{intent}`: 1-5 word kebab-case subject (e.g., `mqtt-conn`, `user-auth-flow`)
   - `{type}`: Abbreviated diagram type (e.g., `seq`, `flow`, `erd`, `arch`, `class`, `mind`)
   - `{timestamp}`: Format `YYYYMMDDHHMMSS`
   - Example: `mqtt-conn-seq-20260211143052.html`
   - **Retry / fix of a previous diagram** (e.g., user reports an error, asks for style tweaks, or requests content changes to the same diagram): Reuse the exact same filename to overwrite it
   - **Different diagram**: Generate a new filename

### URL Safety

**NEVER** manually type, copy, or reproduce generated URLs in text responses. The URL contains compressed base64 data — even a single character change breaks it. Always let the Python script generate the URL and embed it directly in the HTML file.

## Related Skills

- 常作为 `yq-system-design`、`yq-db-design`、`yq-code-explain` 的可视化补充
- 图产物沉淀进说明文档时通常接 `yq-doc-gen`

## Recommended Next Step

- 默认交给 `yq-doc-gen`，把图和文字说明一起沉淀进设计文档或交付材料
- 如果画图过程中发现方案边界仍不清晰，回到 `yq-system-design`
