# Mars 开发模式

本文件不负责从零教学，而是帮助你快速判断当前需求应走哪条实现路径。核心回答三个问题：

1. 这类需求该走哪条链路
2. 该选什么 `@WebControl type`
3. 当前模块里哪些历史实现可以参考，哪些只能当线索

## 1. 先认模块，再认协议

这个仓库不是单一模板，而是长期演化出来的多种 Mars 变体。与其背概念，不如先找同模块的真实样例。

默认顺序：

1. 同模块 JSP
2. 同模块 DAO
3. 同模块 Servlet
4. 相邻工具类、基类、上下文类

## 2. 页面链路矩阵

### 列表页

常见特征：

- `#searchForm`
- `initTable`
- `queryData`
- 搜索条件、隐藏字段、选择器
- `rowBar`、`toolbar`

常见数据来源：

- DAO `LIST/PAGE/TEMPLATE`

### 编辑页

常见特征：

- `data-mars="Dao.record"`
- `data-mars-prefix`
- `form.getJSONObject(...)`
- `ajax.remoteCall("${ctxPath}/servlet/...")`
- 附件、富文本、弹层、选择器

### 详情页

常见特征：

- 复用 `record` control
- 与编辑页共享字段结构
- 只读模式或独立详情页

## 3. `/webcall` 默认承接 DAO 读接口

常见前端：

```js
ajax.remoteCall("${ctxPath}/webcall?action=ResumeEmailTemplateDao.record", { templateId: id }, callback)
```

```js
ajax.daoCall({
  controls: ["FlowDao.businessInfo"],
  params: FlowCore.params
}, callback)
```

默认用于：

- 回显
- 字典
- 分页或列表查询
- 树
- 模板片段
- 文本统计

判断要点：

- DAO 默认以查为主
- 老代码里也可能带轻副作用，不能只看接口名

## 4. `data-mars` 是声明式绑定，不只是表单回显

常见绑定：

```jsp
<select data-mars="TaskDao.taskType"></select>
<form data-mars="WeeklyDao.record" data-mars-prefix="weekly."></form>
<div data-template="template-files" data-mars="FileDao.fileList"></div>
<tbody data-mars="WeeklyDao.weeklyProject" data-template="project-items"></tbody>
```

需要识别的不只是 `form`，还包括：

- `select`
- `div`
- `tbody`
- `table`
- 带 `data-template` 的片段区域

## 5. `data-mars-prefix` 决定字段组织方式

示例：

```jsp
<form data-mars-prefix="weekly.">
  <input name="weekly.TITLE">
</form>
```

后端常见读取：

```java
getJSONObject("weekly")
```

或：

```java
getParam("weekly")
```

前缀不一致通常会直接导致：

- 回显失败
- 保存字段丢失
- 主键或外键没传到后端

## 6. `@WebControl` 类型判断矩阵

### `Types.RECORD`

适合：

- 编辑页回显
- 详情页单条数据
- 单条统计块

常见后端：

- `queryForRecord(sql, params)`
- `queryForRecord(model)`

### `Types.DICT`

适合：

- 下拉字典
- 选择器字典
- 固定枚举或合同/项目/部门字典

常见后端：

- `getDictByQuery(...)`
- `getDictById(...)`

### `Types.PAGE`

适合：

- 明确分页的列表
- 与 `initTable` 配合的大表格

常见后端：

- `queryForPageList(...)`

### `Types.LIST`

适合：

- 普通列表
- 不一定严格分页的数组型结果

常见后端：

- `queryForList(...)`
- 部分模块也会用 `queryForPageList(...)`

### `Types.TEMPLATE`

适合：

- 模板片段
- 页面块数据
- 自由结构列表
- 首页卡片、树旁边块数据、子表片段

### `Types.TEXT`

适合：

- 单值文本
- 编号
- 标题
- 某个运行时字符串

### `Types.TREE`

适合：

- 树结构

### `Types.OTHER`

适合：

- 前面几类都不合适的特殊结果

结论：

- 先看相邻 DAO 的既有 type
- 不要把 `PAGE`、`LIST`、`TEMPLATE` 混着用

## 7. Servlet 返回结构矩阵

### `EasyResult`

最常见，用于：

- 新增
- 修改
- 删除
- 批量处理
- 业务动作

前端通常按：

- `result.state`
- `result.msg`
- `result.data`

### `JSONObject`

适合：

- 少量工具型接口
- 非标准返回但仍是 JSON 对象

### `void + renderJson/renderHtml/renderText`

适合：

- 直接返回 JSON
- 返回纯文本状态
- 返回 HTML 片段

### `void + 输出流`

适合：

- 导出
- 文件下载
- PDF 合并
- 图片或其他二进制输出

## 8. 收参方式矩阵

### 页面整体 JSON

```java
JSONObject params = getJSONObject();
```

适合：

- 前端直接拼对象提交
- 自定义表单或弹层

### 带前缀模型

```java
getJSONObject("product")
```

适合：

- `data-mars-prefix="product."`

### 单参数读取

```java
getJsonPara("templateId")
```

适合：

- 简单动作
- 删除、启停、排序

### 数组提交

```java
getJSONArray()
```

适合：

- 批量保存
- 批量更新

### `getModel(Class, prefix)`

适合：

- 已有 ActiveRecord / Model 风格模块

## 9. 数据访问三件套

Mars 这套仓库里最核心的数据访问组合，不是完整 ORM 体系，而是下面三样：

- `EasySQL`：拼 SQL
- `EasyRecord`：承接单条记录
- `EasyQuery`：真正执行查询和更新

### `EasySQL`

适合：

- DAO 查询
- 动态筛选
- 分页、排序、`IN`、`LIKE`

常见方法：

- `append(value, "and field = ?")`
- `appendLike(value, "and field like ?")`
- `appendRLike(value, "and field like ?")`
- `appendIn(array, "and field")`
- `append("order by xxx")`

### `EasyRecord`

适合：

- 新增
- 更新
- 单条模型承接

常见方法：

- `new EasyRecord("table", "pk")`
- `setColumns(getJSONObject("prefix"))`
- `setPrimaryValues(id)`
- `set("FIELD", value)`

### `EasyQuery`

常见入口：

- `getQuery()`
- `getMainQuery()`

常见能力：

- `save(record)`
- `update(record)`
- `executeUpdate(sql, params...)`
- `queryForRow(...)`
- `queryForList(...)`
- `queryForInt(...)`
- `queryForString(...)`

### 怎么选

- 只查：`EasySQL` + `queryForXxx`
- 改一条记录：`EasyRecord` + `save/update`
- 改状态、删记录、批量改：`executeUpdate`
- 查计数、最大值、编号：`queryForInt/queryForString`

## 10. 前端提交流程矩阵

### 主流路径：普通 JSON 直传

```js
var data = form.getJSONObject("#editForm");
ajax.remoteCall(url, data, callback);
```

适合：

- 常规表单保存
- 与 Servlet 写接口直接对接

## 11. 选择器 / 弹层 / 子表单

常见页面部件：

- `singleUser`
- `multiUser`
- `singleProject`
- `popup.layerShow(...)`
- `renderTpl(...)`
- `data-template`

涉及这些部件时，不要只看表单字段，还要确认：

- 隐藏字段存 ID
- 文本框存名称
- 保存前是否要做拼装

## 12. 配置与上下文

### 平台级、环境级

```java
ServerContext.getProperties(...)
```

### 应用级

```java
AppContext.getContext(Constants.APP_NAME).getProperty(...)
```

涉及配置变更时，要额外判断：

- 是否只改库
- 是否还要刷新缓存
- 是否要重新加载上下文
- 是否要同步远端节点

## 12.1 `getQuery()`

- `getQuery()`：当前应用数据源

## 13. 历史包袱识别

以下内容在仓库里真实存在，但不建议新代码继续复制：

- `printStackTrace()`
- 直接打整份请求 JSON
- 返回结构不统一的旧接口
- 直接字符串拼接 SQL 前缀或排序字段时缺少约束

补充判断：

- `appendLike/append/appendIn` 这类参数化拼接优先保留
- 如果看到直接拼接动态排序字段、表名、前缀，要额外确认来源是否安全

使用原则：

- 可以参考入口、参数名、字段名、表名、调用顺序
- 不建议继承坏味道本身

## 14. 优先参考的完整链路类型

推荐优先找这些样板：

- 列表 + 弹层编辑 + DAO + Servlet
- 表单回显 + 附件 + 保存
- 分页表格 + 排序 + 双击详情
- 上传 + 文件预览
- 启停 / 排序 / 删除这类轻动作接口
- 导出 / 下载 / 纯文本状态接口
