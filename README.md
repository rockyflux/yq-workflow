# YQ Workflow

YQ Workflow 是一个面向 AI 编程场景的工具助手，帮你把常用命令、提示词、Skills 和配置入口整理到一起，尽快搭好一套顺手的工作环境。

它更像一个“统一入口”：

- 想安装或更新工作流，可以从这里开始
- 想配置 MCP、提示词、Skills，也可以从这里进入
- 想查看常用 AI 编程工具、账号入口和使用统计，同样可以在主菜单里完成

## 适合谁

如果你正在使用或准备使用这些工具，YQ Workflow 会比较合适：

- `Claude Code`
- `Codex`
- `Gemini CLI`
- 其他需要配合提示词、Skills、MCP 一起使用的 AI 编程工具

## 它能帮你做什么

- 安装并管理整套工作流
- 用主菜单统一进入常用配置
- 管理 MCP
- 管理 Skills
- 管理提示词文件
- 查看常用 AI 编程工具入口
- 快速检查基础环境和模型使用统计

## 快速开始

直接运行：

```bash
npx yq-workflow
```

首次使用时，按主菜单一步步操作即可。默认界面为简体中文。

如果你已经知道自己要做什么，也可以直接使用：

```bash
npx yq-workflow menu
npx yq-workflow init
npx yq-workflow update
```

## 第一次使用建议

推荐顺序：

1. 运行 `npx yq-workflow`
2. 先完成工作流安装或更新
3. 打开 `配置 Skills`
4. 打开 `配置 MCP`
5. 打开 `提示词配置`
6. 按需要安装或查看常用 AI 编程工具

这样配完之后，后续基本就可以围绕主菜单直接使用。

## 主菜单里有什么

主菜单主要分成几类常用入口：

- 工作流安装、更新、卸载
- `配置 Skills`
- `配置 MCP`
- `提示词配置`
- 热门开源工作流
- Claude Code 工具
- 安装编程工具
- AI 账号管理
- 基础环境检测
- 模型使用统计

如果你不想记命令，直接从主菜单进就够了。

## 常用场景

### 1. 想把环境先搭起来

运行 `npx yq-workflow`，从主菜单完成安装。

### 2. 想管理 MCP

进入 `配置 MCP`，用本地网页分别管理 Claude、Codex、Gemini 的 MCP 配置。

### 3. 想整理 Skills

进入 `配置 Skills`，查看本地技能目录、安装新 Skills，或者更新已有 Skills。

### 4. 想调整提示词

进入 `提示词配置`，统一编辑常用提示词文件；保存前会先确认，并自动保留备份。

### 5. 想看工具是否装好

进入 `基础环境检测` 或 `安装编程工具`，查看本机常用工具状态。

## 常用命令

```bash
npx yq-workflow
npx yq-workflow menu
npx yq-workflow init
npx yq-workflow update
npx yq-workflow help
npx yq-workflow config skills
npx yq-workflow config mcp
npx yq-workflow config prompt
```

## 你可以怎么理解它

可以把 YQ Workflow 理解成一个给 AI 编程工具配套的“控制台”：

- 把常用入口集中起来
- 把零散配置整理起来
- 把日常要反复找的东西收进同一个菜单里

重点不是增加复杂度，而是减少来回找入口、找文件、找配置的时间。
