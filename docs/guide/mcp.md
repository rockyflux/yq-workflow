# MCP 配置

MCP 用来补足 AI 编程工具的外部能力。不配也能用，配好之后在查文档、连数据库、看 GitHub、读写文件这些场景会顺手很多。

```bash
npx yq-workflow menu  # 选「配置 MCP」
```

YQ 会打开一个本地网页，用来分别管理这些客户端的 MCP 配置：

- Claude
- Codex
- Gemini
- Cursor
- Kiro

页面里保留四类预置模板，也支持搜索、启停、JSON 直编和保存前自动备份。

## 必装工具 MCP

- **Context7** — 获取最新库文档。
- **Playwright** — 浏览器自动化和测试。
- **DeepWiki** — 知识库查询 / 仓库百科。

## 数据库操作 MCP

- **PostgreSQL** — 连接 PostgreSQL 做只读查询。
- **SQLite** — 本地 SQLite 查询与表结构操作。

## Git / 版本控制 MCP

- **GitHub** — 仓库、PR、Issue 等远程协作能力。
- **Git** — 本地仓库历史、分支、提交信息读取。

## 文件 / 资源操作 MCP

- **Filesystem** — 本地文件与目录读写、搜索、查看元数据。
- **Memory** — 本地持久化知识图谱，适合保存结构化记忆和资源线索。

## Smithery 集成

MCP 配置页里集成了 Smithery：

- 检测本机是否已安装 `@smithery/cli`
- 支持执行 `npm install -g @smithery/cli@latest`
- 支持搜索服务器并打开详情页
- 搜索时可直接复用 `npx -y @smithery/cli@latest`

## 配置会写到哪里

不同客户端会写到各自的配置文件，而不是只写 Claude：

- Claude：`~/.claude.json`
- Gemini：`~/.gemini/settings.json`
- 其他客户端按各自本地配置路径管理

## 出问题了？

```bash
npx yq-workflow diagnose-mcp
```

这个命令会检查 Claude 侧的 MCP 配置问题。

如果需要自动修复基础问题，还可以运行：

```bash
npx yq-workflow fix-mcp
```
