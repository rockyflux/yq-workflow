# Contributing to YQ Workflow

感谢你愿意为 `yq-workflow` 做贡献。

这个项目的目标不是做一个单一 AI 工具的包装器，而是提供一套围绕 AI 编程工作流的安装、配置和管理工具，覆盖工作流命令、提示词、Skills、MCP 与常用编程工具入口。

在开始提交代码前，建议先花几分钟读完这份文档，能少踩很多边界问题。

## 贡献前先了解

提交前请先确认你的改动符合当前产品方向：

- `Claude Code` 只是支持的工具之一，不是产品本体
- 不要重新引入 `codeagent-wrapper`
- 不要恢复前后端模型路由、Gemini/Codex 分流执行或二进制下载流
- 安装与更新逻辑保持为 TypeScript 实现
- CLI 默认使用简体中文，不再提供语言选择

如果你修改了用户可见行为，请同步更新：

- `README.md`
- `AGENTS.md`
- 必要时补充 `CHANGELOG.md`

## 本地开发环境

建议使用以下环境：

- Node.js 20+
- `pnpm` 10+
- PowerShell（Windows）

安装依赖：

```bash
pnpm install
```

常用命令：

```bash
pnpm dev
pnpm typecheck
pnpm test
pnpm build
pnpm lint
pnpm docs:dev
pnpm docs:build
```

说明：

- `pnpm dev`：本地启动 CLI 开发入口
- `pnpm typecheck`：TypeScript 类型检查
- `pnpm test`：运行 Vitest
- `pnpm build`：构建发布产物，构建前会自动刷新 build info
- `pnpm docs:dev` / `pnpm docs:build`：调试或构建文档站

## 仓库结构

常见目录职责如下：

- `src/`：CLI 命令、安装逻辑、菜单逻辑、工具能力
- `templates/`：提示词、steering、Skills、rules、输出风格模板
- `docs/`：文档站内容
- `scripts/`：构建辅助脚本
- `bin/`：CLI 启动入口

改动前尽量先判断你改的是哪一层：

- CLI 交互与入口：优先看 `src/commands/`
- 安装 / 更新 / 文件写入：优先看 `src/utils/installer-*`
- 模板与发布内容：优先看 `templates/`
- 对外说明：优先看 `README.md` 与 `docs/`

## 推荐贡献流程

1. 先阅读相关代码、文档和最近提交，确认当前实现边界
2. 尽量做最小充分改动，不顺手扩张 unrelated scope
3. 涉及用户可见行为时，同时补文档
4. 在本地完成必要验证后再提交

适合贡献的内容包括：

- 菜单与工作流入口优化
- MCP / Skills / 提示词配置能力增强
- 安装、更新、卸载逻辑修复
- 文档改进
- 测试补充

## 代码风格与实现约束

请尽量遵守以下约定：

- 优先复用现有结构和命名方式
- 保持改动局部、可读、易回滚
- 避免为了小需求引入新的抽象层
- 不要硬编码密钥、token、路径外的用户隐私信息
- 不要用不可信输入拼接 shell 命令
- 安装 / 更新 / 卸载逻辑保持 TypeScript-only

项目层面的重要约束：

- `templates/steering/` 下的模板会被安装到不同 AI 工具目录
- `templates/yq-skills/`、`templates/base-skills/`、`templates/superpowers/` 会同步复制到多个目标目录
- npm 包发布内容依赖 `package.json` 中的 `files` 字段，修改模板目录时请检查是否仍被正确发布

## 测试与验证

在声明完成前，默认至少运行：

```bash
pnpm typecheck
pnpm test
pnpm build
```

如果你的改动还涉及以下内容，也请补充对应验证：

- 文档站改动：`pnpm docs:build`
- Lint 相关改动：`pnpm lint`
- 安装逻辑改动：至少做一轮本地 smoke test，确认目标文件写入、覆盖备份、目录创建等流程正常

请不要在没有验证证据的情况下声称“已通过”或“可发布”。

## 提交规范

提交信息格式：

```text
<type>(scope): <summary>
```

要求：

- `summary` 使用中文
- 以动词开头
- 长度不超过 50 字
- 不加句号

常用类型：

- `feat`
- `fix`
- `refactor`
- `docs`
- `test`
- `chore`

示例：

```text
feat(menu): 新增模型使用统计入口
fix(init): 修复提示词模板未复制问题
docs(readme): 补充 Skills 配置说明
```

## Pull Request 建议

PR 描述建议至少写清楚：

- 改动目的
- 关键实现点
- 影响范围
- 验证方式与结果
- 是否同步更新文档

如果改动影响主菜单、安装流程、提示词配置、MCP 配置或 Skills 管理，建议附上：

- 关键界面截图
- 关键命令输出摘要
- 手工验证步骤

## 文档贡献建议

这个仓库很依赖“说明清楚”。

如果你在改这些内容，通常值得顺手补文档：

- 主菜单入口调整
- 新增工具支持
- 模板安装路径变化
- 备份 / 恢复行为变化
- 用户首次使用路径变化

文档内容尽量写“用户怎么做”和“为什么这样做”，避免只写抽象描述。

## 重大改动请先对齐

以下类型的改动，建议先开 issue 或先讨论再做：

- 根级配置调整
- 发布流程修改
- 模板安装目标路径变更
- 技能目录镜像策略变更
- 主菜单核心分组重排
- 对产品定位有影响的行为变化

## 一个小的完成前检查清单

提交前可以快速过一遍：

- [ ] 改动和当前产品方向一致
- [ ] 没有引入与任务无关的重构
- [ ] 用户可见改动已同步更新文档
- [ ] 已完成 `pnpm typecheck`
- [ ] 已完成 `pnpm test`
- [ ] 已完成 `pnpm build`
- [ ] 提交信息符合仓库约定

感谢你的贡献。把工具做顺手这件事，本身就很有价值。
