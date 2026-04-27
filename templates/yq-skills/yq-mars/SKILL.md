---
name: yq-mars
description: 用于 Easitline / Mars 项目的日常功能开发、CRUD 页面增改、参数配置、数据源配置、data-mars 绑定、ajax.remoteCall、ajax.daoCall、/webcall DAO 路由、普通 /servlet action 开发。只要用户要在这个项目里新增页面、补 CRUD、接字典、改配置、补 DAO 查询、补 servlet 写操作、排查 data-mars 或 webcall/remoteCall 调用链，就应主动使用这个 skill，而不是按通用 Java Web 模板生写。
---

# yq-mars

面向当前仓库的 Mars 开发技能。它不是一张“DAO 查、Servlet 写”的提示卡，而是一套可直接执行的开发流程：

1. 识别需求落在哪条链路
2. 找到同模块真实样例
3. 复用页面协议、DAO type、Servlet 风格
4. 补齐验证与交付说明

核心目标只有一个：基于仓库现有模式完成最小充分实现，而不是额外发明一套通用模板。

## 何时使用

只要任务涉及以下任一内容，就优先使用这个 skill：

- 新增、修改或排查 JSP 页面
- `data-mars`、`render()`、`initTable()`、`queryData()` 绑定
- `/webcall?action=...`、`ajax.daoCall(...)`
- `/servlet/*?action=...` 写接口
- CRUD、批量操作、导出、上传、配置页、字典页、树页
- `ServerContext`、`AppContext`、参数配置、缓存刷新
- Mars 风格调用链排障

## 使用原则

- 先判断需求落点，再决定走 DAO、`/webcall` 还是 Servlet
- 先找同模块真实样例，再动手实现
- 先复用现有协议、字段、返回结构，再考虑抽象
- 先做定向验证，再给出交付说明

## 总流程

### 第 0 步：先归类需求

先判断本次需求属于哪一类：

- 列表页 / 查询页
- 编辑页 / 新增页 / 详情页
- 只读 DAO control
- 写接口 Servlet action
- 配置 / 参数 / 数据源 / 节点
- 上传 / 下载 / 导出 / 流输出
- 调用链排障

### 第 1 步：先找同模块样例

默认搜索顺序：

1. 同模块 JSP
2. 同模块 DAO `@WebObject/@WebControl`
3. 同模块 Servlet `actionForXxx`
4. 相邻基类、工具类、上下文类

至少同时检查三处：

- 页面怎么发请求
- DAO 返回的 type 和字段是什么
- Servlet 用什么方式收参、落库、返回

先看真实代码，再做实现；不要先写抽象模板，再回头硬套项目。

### 第 2 步：选择链路

#### 默认走 DAO / `webcall` 的场景

- 表单回显
- 字典
- 列表或分页查询
- 树
- 模板片段
- 文本或统计块
- 页面初始化并行读取多个只读 control

常见前端形式：

- `data-mars="WeeklyDao.record"`
- `$("#editForm").render(...)`
- `$("#searchForm").initTable({mars:"TaskDao.myTaskList"})`
- `ajax.remoteCall("${ctxPath}/webcall?action=ResumeEmailTemplateDao.record", {...}, cb)`
- `ajax.daoCall({controls:["FlowDao.businessInfo"],params:FlowCore.params}, cb)`

#### 默认走 Servlet 的场景

- 新增、修改、删除
- 批量处理
- 事务、权限、副作用、通知
- 上传、导出、流输出
- 缓存刷新、参数生效
- 复杂校验

常见前端形式：

- `ajax.remoteCall("${ctxPath}/servlet/weekly?action=add", data, cb)`
- `ajax.remoteCall("${ctxPath}/servlet/affair?action=update", data, cb)`
- `location.href = "${ctxPath}/servlet/weekly?action=export..." + ...`

### 第 3 步：识别当前模块的代码风格

不要把仓库里的约定写成绝对规则。这里有默认路径，也有历史变体：

- DAO 以查为主，但少量读接口也会带轻副作用
- Servlet 大多返回 `EasyResult`，但也存在 `JSONObject`、`void + renderJson/renderHtml`、`void + 输出流`
- 写接口不只一种装配方式：`getJSONObject(prefix)`、`EasyRecord`、`getModel(Class, prefix)`、私有 `getModel(prefix)`

结论：优先复用当前模块已有风格，不要为了“理论统一”去改老模块协议。

## Mars 开发全流程

### A. 新增一个标准 CRUD 页面

推荐按五层来拆，而不是只盯着页面和接口：

1. 列表页 JSP
2. 编辑页 JSP
3. 详情页 JSP 或只读模式
4. DAO 查询 control
5. Servlet 写接口

#### A1. 列表页

列表页优先复用以下结构：

- `#searchForm`
- `initTable`
- `queryData`
- `toolbar`
- `rowBar`
- 搜索表单 + 隐藏字段 + 选择器

典型模式：

- 搜索表单字段直接挂在 `#searchForm`
- `initTable({mars:'TaskDao.myTaskList', id:'tableId', cols:[...]})`
- 排序时重新调用 `queryData(...)`
- 行操作走 `popup.layerShow(...)` 打开编辑页或详情页

#### A2. 编辑页

编辑页优先确认以下几点：

- 是否使用 `data-mars="Dao.record"`
- 是否使用 `data-mars-prefix`
- 是否已有附件、评论、富文本、选择器、弹层子表单
- 保存时是直接 `form.getJSONObject(...)`，还是已有特殊协议

常见组件：

- 附件：`FileDao.fileList` + `easyUploadFile(...)`
- 富文本：`wangEditor`
- 选择器：`singleUser` / `multiUser` / `singleProject`
- 局部模板：`data-template`

#### A3. 详情页

详情页通常有两种做法：

- 复用编辑页，只是禁用输入或切到只读模式
- 独立详情页，但仍沿用同一个 `record` control

不要为详情页重写另一套 DAO，除非字段组织完全不同。

#### A4. DAO 负责读

查询类接口默认落 DAO，先选对 `@WebControl type`：

- `RECORD`：单条回显
- `DICT`：字典
- `PAGE`：分页
- `LIST`：普通列表
- `TEMPLATE`：模板片段、块数据
- `TEXT`：单值文本
- `TREE`：树结构
- `OTHER`：特殊结果

DAO 实现时，优先围绕这三样组织：

- `EasySQL`：拼查询条件、排序、`IN`、`LIKE`
- `getQuery()` / `getMainQuery()`：执行 SQL、查单条、查列表、查统计值
- `EasyRecord`：在 DAO 或 Servlet 内承接单条模型数据

#### A5. Servlet 负责写

写接口常见动作：

- `actionForAdd`
- `actionForUpdate`
- `actionForDelete`
- `actionForBatchXxx`
- `actionForMoveUp/MoveDown`
- `actionForRenderTemplate`

优先复用现有 action 命名风格。

### B. 列表页完整做法

列表页默认检查：

1. 搜索表单字段命名
2. 是否有隐藏字段配合选择器
3. `initTable` 的 `mars/id/limit/height/toolbar/cols`
4. 是否有 `rowDoubleEvent`
5. 是否需要 `table.on('sort(...)')`
6. `query()` 和 `clearForm()` 如何写

常见流程：

1. 页面初始化 `initTable`
2. 用户搜索时 `queryData`
3. 点击新增打开编辑页
4. 编辑成功后刷新表格

### C. 编辑页完整做法

编辑页默认检查：

1. `data-mars` 是否负责回显
2. `data-mars-prefix` 是否与后端前缀一致
3. 主键、外键、`fkId`、随机 ID 是否需要通过隐藏字段保留
4. 是否有附件、文件列表、评论、模板片段
5. 保存前校验放前端、后端，还是两边都做

常见保存流程：

1. `form.validate("#editForm")`
2. `var data = form.getJSONObject("#editForm")`
3. 视情况补 `draft`、`status` 等附加字段
4. `ajax.remoteCall("${ctxPath}/servlet/xxx?action=add|update", data, cb)`
5. 成功后 `layer.msg(...)` + `popup.closeTab()` 或刷新父页

### D. DAO 设计流程

新增 DAO control 时：

1. 先确认 `@WebObject` 名是否已存在
2. 确认 control 名是否与页面语义一致
3. 选择正确 `Types.*`
4. 按返回形态决定 `queryForRecord/queryForList/queryForPageList/getDictByQuery/getText`
5. 参数读取优先与页面现有字段命名保持一致

参数来源常见有三类：

- `param.getString("userId")`
- `getParam("weekly")`
- `getMethodParam(0)`

### D1. `EasySQL` 怎么用

`EasySQL` 是当前仓库里最常见的查询拼装器，通常用于：

- `where 1=1` 风格条件拼接
- `append(...)` 加等值条件
- `appendLike(...)` 加模糊查询
- `appendRLike(...)` 加右模糊或特殊 like
- `appendIn(...)` 加 `IN (...)`
- 动态 `order by`

常见套路：

1. 先 `new EasySQL(...)` 或 `getEasySQL(...)`
2. 再按参数是否为空追加条件
3. 最后交给 `queryForRecord/queryForList/queryForPageList`

### D2. `EasyRecord` 怎么用

`EasyRecord` 是当前仓库里最常见的单条落库模型，通常用于：

- `new EasyRecord("table_name", "pk_name")`
- `setColumns(getJSONObject("prefix"))`
- `setPrimaryValues(...)`
- `set("FIELD", value)` 补系统字段
- 交给 `getQuery().save/update`

适合：

- 传统表单增删改
- 只改一张表或少量字段的动作
- 和 `data-mars-prefix` 一一对应的表单

### D3. `EasyQuery` 怎么用

当前仓库主要通过：

- `getQuery()`
- `getMainQuery()`

来拿查询对象。

常见用法：

- `getQuery().save(record)`
- `getQuery().update(record)`
- `getQuery().executeUpdate(sql, params...)`
- `getQuery().queryForRow(sql, params, mapper)`
- `getQuery().queryForList(sql, params, mapper)`
- `getQuery().queryForInt(sql, params...)`
- `getQuery().queryForString(sql, params...)`

补充说明：

- `getQuery()` 默认走当前应用数据源
- `getMainQuery()` 常用于主库或跨库场景

### D4. 事务怎么判断

这套仓库里显式 `begin/commit/rollback` 很少见，实际更常见的是：

- 顺序执行多个 `save/update/executeUpdate`
- 出错后 `catch SQLException` 并返回 `EasyResult.fail(...)`

因此：

- 不要凭空给普通模块补一套陌生事务模板
- 先看当前模块是否已经有显式事务写法
- 如果没有，优先沿用现有风格；如果需求确实高风险，再谨慎补事务控制

### E. Servlet 设计流程

新增写接口时：

1. 先看本模块既有 Servlet 是 `EasyRecord` 风格还是 `Model` 风格
2. 确认收参方式：
   - `getJSONObject()`
   - `getJSONObject("prefix")`
   - `getJsonPara("name")`
   - `getJSONArray()`
3. 先校验参数，再落库
4. 按模块风格返回：
   - `EasyResult.ok/fail`
   - `renderJson`
   - `renderHtml`
   - 输出流

落库时常见组合：

- `EasyRecord + getQuery().save/update`
- `getQuery().executeUpdate(...)` 做状态切换、删除、批量更新
- `getQuery().queryForInt/queryForString` 做存在性检查、排序号、编号生成

### F. 附件 / 上传 / 文件预览

涉及附件时，默认同时检查：

- 页面上的 `FileDao.fileList`
- 上传入口 `easyUploadFile(...)`
- `/servlet/upload/*`
- `/fileview/*`

常见流程：

1. 页面通过 `FileDao.fileList` 展示已有附件
2. 上传后把 `fileId` 写回隐藏字段或附件列表 DOM
3. 保存业务记录时带上 `fkId` 或文件 ID
4. 详情页通过 `fileview` 预览

### G. 导出 / 下载 / 流输出

涉及导出时，不要默认走 `EasyResult`，先判断应该采用哪种返回方式：

- `location.href` 下载
- `HttpServletResponse` 直接写流
- `renderText/renderHtml`

常见场景：

- PDF 合并
- Excel 导出
- 文件下载
- 任务脚本或同步接口返回纯文本状态

### H. 配置 / 参数 / 应用上下文

涉及配置类需求时，先分层：

#### 全局平台级

- `ServerContext.getProperties(...)`

#### 应用级

- `AppContext.getContext(Constants.APP_NAME).getProperty(...)`

#### 配置改动时要额外确认

- 是否只是改库
- 是否要刷新缓存
- 是否要同步上下文
- 是否要通知其他节点或模块

### J. 日志与异常处理

优先参考：

- 基类 `debug/info/warn/error`
- `LogEngine.getLogger("logName")`
- `LogEngine.getLogger("appName", "logName")`

但要注意旧代码里有历史包袱：

- `printStackTrace()`
- 直接打印整份请求 JSON

这些旧写法可以作为排查线索，但不要在新改动里继续复制。

## `@WebControl` 类型速查

- `Types.RECORD`：单条回显
- `Types.DICT`：字典
- `Types.PAGE`：分页
- `Types.LIST`：普通列表
- `Types.TEMPLATE`：模板块或页面片段
- `Types.TEXT`：单值文本
- `Types.TREE`：树结构
- `Types.OTHER`：特殊场景

不要把分页查询机械写成 `LIST`。

## 常见误区

- 不要先写通用 Java Web 模板，再回头硬贴 Mars
- 不要绕过 `data-mars` 和既有 `/webcall` 协议新造接口
- 不要默认所有页面都要 AES 加密提交
- 不要默认所有列表都用 `Types.LIST`
- 不要忽视 `data-mars-prefix` 与后端前缀一致性
- 不要把历史代码里的 `printStackTrace()`、整包请求日志当成最佳实践
- 不要无故改字段名、参数前缀或返回结构

## 交付要求

完成需求时默认给出：

1. 改了哪些文件
2. 本次主要走的是 `data-mars/DAO`、`remoteCall/Servlet` 还是混合
3. 保持了哪些关键约定：
   - 参数前缀
   - 返回结构
   - 是否沿用既有加密协议
   - 是否涉及缓存/配置刷新
4. 做了哪些验证；没验证就明确说明未验证

## 参考资料

- `references/patterns.md`：架构判断、选型矩阵、链路识别
- `references/examples.md`：按场景分类的代码样板
