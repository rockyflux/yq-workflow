# MCP 配置

MCP 工具用于补足 Claude Code 的外部能力。不配也能用，配好之后在查文档、连数据库、看 GitHub、读写文件这些场景会顺手很多。

```bash
npx yq-workflow menu  # 选「配置 MCP」
```

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

## MCP 同步

配好 MCP 之后，YQ 会自动把配置写入 Claude Code：

- `~/.claude.json`

## 出问题了？

```bash
npx yq-workflow diagnose-mcp
```

这个命令会检查你的 MCP 配置哪里不对。
