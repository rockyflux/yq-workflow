# Mars 代码示例

本文件按开发场景组织，优先提供可直接复用的样板，而不是抽象定义。

## 1. 列表页：`initTable + queryData + toolbar`

```jsp
<form autocomplete="off" onsubmit="return false;" class="form-inline" id="searchForm">
  <input name="status" type="hidden" value="2"/>
  <button type="button" class="btn btn-sm btn-default" onclick="list.query()">搜索</button>
  <table class="layui-hide" id="myApplyTaskTable"></table>
</form>

<script type="text/x-jsrender" id="rowBar">
  <a class="layui-btn layui-btn-normal layui-btn-xs" lay-event="list.edit">编辑</a>
</script>
```

```js
var list = {
  initTable: function() {
    $("#searchForm").initTable({
      mars: "TaskDao.myTaskList",
      id: "myApplyTaskTable",
      limit: 30,
      toolbar: "#taskBar",
      cols: [[
        { title: "序号", type: "numbers" },
        { field: "TASK_NAME", title: "任务名称", event: "list.detail" }
      ]]
    });
  },
  query: function() {
    $("#searchForm").queryData({ id: "myApplyTaskTable", jumpOne: true });
  }
};
```

适用场景：

- 搜索表单 + 大表格
- 工具栏按钮
- 行事件、双击事件、排序

## 2. 编辑页：`data-mars + prefix + remoteCall`

```jsp
<form id="editForm" data-mars="WeeklyDao.record" data-mars-prefix="weekly.">
  <input type="hidden" name="weekly.WEEKLY_ID"/>
  <input type="text" name="weekly.TITLE"/>
</form>
```

```js
$("#editForm").render({
  success: function(result) {
    var record = result["WeeklyDao.record"];
  }
});

var data = form.getJSONObject("#editForm");
data["draft"] = 1;
ajax.remoteCall("${ctxPath}/servlet/weekly?action=add", data, function(result) {
  if (result.state == 1) {
    layer.msg(result.msg);
  }
});
```

适用场景：

- 普通新增 / 编辑表单
- 详情页复用回显

## 3. 弹层编辑：列表页 + `webcall record` + Servlet 保存

```js
openEditById: function(templateId) {
  ajax.remoteCall("${ctxPath}/webcall?action=ResumeEmailTemplateDao.record", { templateId: templateId }, function(result) {
    if (result.data) {
      TemplateMgr.openEdit(result.data);
    }
  });
}
```

```js
save: function() {
  var data = {
    templateId: $("#templateId").val(),
    menuName: $("#menuName").val(),
    mailSubject: $("#mailSubject").val(),
    mailBody: $("#mailBody").val()
  };
  ajax.remoteCall("${ctxPath}/servlet/resumeEmailTemplate?action=update", data, function(result) {
    if (result.state == 1) {
      TemplateMgr.query();
    }
  });
}
```

适用场景：

- 管理后台配置页
- 表格操作列 + 右侧弹层编辑

## 4. DAO：`RECORD`

```java
@WebControl(name = "record", type = Types.RECORD)
public JSONObject record() {
    return queryForRecord(
        "select * from yq_resume_email_template where template_id = ? and is_deleted = 0",
        new Object[]{param.getString("templateId")}
    );
}
```

适用场景：

- 编辑页回显
- 详情页单条数据

## 5. DAO：`DICT`

```java
@WebControl(name = "dict", type = Types.DICT)
public JSONObject dict() {
    return getDictById(this.getMethodParam(0).toString());
}
```

对应前端写法：

```jsp
<select data-mars="EhrDao.dict(S001)"></select>
```

适用场景：

- 固定字典类型
- 页面声明式传参

## 6. DAO：`PAGE`

```java
@WebControl(name = "selectDept", type = Types.PAGE)
public JSONObject selectDept() {
    EasySQL sql = new EasySQL();
    sql.append("select * from easi_dept where 1=1");
    sql.appendLike(param.getString("deptName"), "and dept_path_name like ?");
    return queryForPageList(sql.getSQL(), sql.getParams());
}
```

适用场景：

- 标准分页表格
- 与 `initTable` 对接

## 7. DAO：`LIST`

```java
@WebControl(name = "enabledList", type = Types.LIST)
public JSONObject enabledList() {
    EasySQL sql = getEasySQL("select * from yq_resume_email_template where 1=1");
    sql.append(0, "and is_deleted = ?");
    sql.append(1, "and is_enabled = ?");
    sql.append("order by sort_no asc");
    return queryForList(sql.getSQL(), sql.getParams());
}
```

适用场景：

- 普通数组结果
- 下游自己渲染列表

## 8. DAO：`TEMPLATE`

```java
@WebControl(name = "formList", type = Types.TEMPLATE)
public JSONObject formList() {
    EasySQL sql = getEasySQL("select * from yq_flow_form where 1=1");
    sql.append("order by create_time desc");
    return queryForList(sql.getSQL(), sql.getParams());
}
```

适用场景：

- 模板片段
- 非标准分页块

## 9. DAO：`TEXT`

```java
@WebControl(name = "bxTitle", type = Types.TEXT)
public JSONObject bxTitle() {
    return getText(getStaffInfo().getUserName() + getStaffInfo().getStaffNo() + "费用报销单");
}
```

适用场景：

- 标题
- 编号
- 单值文本

## 10. DAO：`TREE`

```java
@WebControl(name = "getTree", type = Types.TREE)
public JSONObject getTree() {
    return queryForList("SELECT PLATFORM_TYPE_ID,P_PLATFORM_TYPE_ID,PLATFORM_TYPE_NAME FROM YQ_BUSINESS_PLATFORM_TYPE ORDER BY IDX_ORDER", new Object[]{});
}
```

适用场景：

- 树选择器
- 树页面

## 10.1 `EasySQL`：动态查询的标准写法

```java
EasySQL sql = getEasySQL("select * from yq_resume_email_template where 1=1");
sql.appendLike(param.getString("menuName"), "and menu_name like ?");
sql.append(param.getString("isEnabled"), "and is_enabled = ?");
sql.append("order by sort_no asc, create_time desc");
return queryForPageList(sql.getSQL(), sql.getParams());
```

适用场景：

- 搜索页
- 列表页
- 条件很多的 DAO 查询

## 10.2 `EasySQL`：`appendIn`

```java
EasySQL sql = new EasySQL("delete from yq_resume_follow where 1=1");
sql.appendIn(followIds.split(","), "and follow_id");
getQuery().executeUpdate(sql.getSQL(), sql.getParams());
```

适用场景：

- 批量删除
- 批量筛选
- 多状态、多 ID 查询

## 10.3 `EasySQL`：范围和排序

```java
if (StringUtils.notBlank(beginDate)) {
  sql.append(beginDate.replaceAll("-", ""), "and DK_DATE >= ?");
}
if (StringUtils.notBlank(endDate)) {
  sql.append(endDate.replaceAll("-", ""), "and DK_DATE <= ?");
}
if (StringUtils.notBlank(sortName)) {
  sql.append("order by ").append(sortName).append(sortType);
} else {
  sql.append("order by DK_DATE desc");
}
```

适用场景：

- 时间范围查询
- 报表页
- 动态排序

使用提醒：

- 动态排序字段要确认来源可信

## 10.4 `EasyRecord`：表单整包映射

```java
EasyRecord record = new EasyRecord("yq_resume_follow", "follow_id");
record.setColumns(getJSONObject("follow"));
record.set("create_time", EasyDate.getCurrentDateString());
record.set("follow_by", getUserId());
record.setPrimaryValues(RandomKit.uniqueStr());
getQuery().save(record);
```

适用场景：

- 标准新增表单
- 前缀字段和表字段高度一致

## 10.5 `EasyRecord`：先建模型再补字段

```java
EasyRecord model = getModel("contacts");
model.set("CREATE_TIME", EasyDate.getCurrentDateString());
model.set("UPDATE_TIME", EasyDate.getCurrentDateString());
model.set("CREATE_USER_ID", getUserId());
getQuery().save(model);
```

适用场景：

- 统一封装了 `getModel(prefix)` 的模块
- 同一模块多处复用

## 10.6 `EasyQuery`：查单条

```java
EasySQL sql = new EasySQL();
sql.append("select * from yq_project where 1=1");
sql.append(projectId, "and project_id = ?");
JSONObject result = getQuery().queryForRow(sql.getSQL(), sql.getParams(), new JSONMapperImpl());
return getJsonResult(result);
```

适用场景：

- 复杂 `RECORD`
- 要自己控制返回包装

## 10.7 `EasyQuery`：查列表

```java
List<JSONObject> list = getQuery().queryForList(
  "select t2.module_name,t1.* from yq_project_module_version t1,yq_project_module t2 where t1.module_id = t2.module_id and t1.version_id = ?",
  new Object[]{versionId},
  new JSONMapperImpl()
);
```

适用场景：

- 需要 `List<JSONObject>` 继续加工
- DAO 内聚合多个查询结果

## 10.8 `EasyQuery`：查数值和字符串

```java
int count = getQuery().queryForInt("select count(1) from yq_project_plan where project_id = ? and plan_state > 0", projectId);
String userNames = getQuery().queryForString("select group_concat(t1.user_name) from yq_ops_security_do t1 where t1.security_id = ?", new Object[]{securityId});
```

适用场景：

- 存在性检查
- 聚合值
- 编号生成
- 统计值

## 10.9 `EasyQuery`：状态切换、批量更新、删除

```java
getQuery().executeUpdate(
  "update yq_resume_email_template set is_enabled = ?, update_time = ?, update_by = ? where template_id = ?",
  "1".equals(isEnabled) ? 1 : 0,
  EasyDate.getCurrentDateString(),
  getUserName(),
  templateId
);
```

适用场景：

- 启停
- 删除
- 批量处理
- 非整表单更新

## 11. Servlet：`EasyRecord + getJSONObject(prefix)`

```java
public EasyResult actionForAdd() {
    EasyRecord record = new EasyRecord("yq_product", "product_id");
    record.setColumns(getJSONObject("product"));
    record.setPrimaryValues(RandomKit.uuid());
    getQuery().save(record);
    return EasyResult.ok();
}
```

适用场景：

- 简单增删改
- 前缀式表单

## 12. Servlet：`getJSONObject() + 手工字段映射`

```java
public EasyResult actionForAdd() {
    JSONObject params = getJSONObject();
    EasyRecord record = new EasyRecord("yq_resume_email_template", "template_id");
    record.setPrimaryValues(RandomKit.uniqueStr());
    record.set("menu_name", params.getString("menuName"));
    record.set("mail_subject", params.getString("mailSubject"));
    getQuery().save(record);
    return EasyResult.ok();
}
```

适用场景：

- 页面字段和库字段不完全一致
- 保存前需要手工组装数据

## 13. Servlet：轻动作接口

```java
public EasyResult actionForToggleEnabled() {
    String templateId = getJsonPara("templateId");
    String isEnabled = getJsonPara("isEnabled");
    getQuery().executeUpdate(
        "update yq_resume_email_template set is_enabled = ? where template_id = ?",
        "1".equals(isEnabled) ? 1 : 0,
        templateId
    );
    return EasyResult.ok();
}
```

适用场景：

- 启停
- 排序
- 删除
- 单字段状态切换

## 14. Servlet：`void + renderJson`

```java
public void actionForGetUserInfo() {
    String userId = getJsonPara("userId");
    if (StringUtils.isBlank(userId)) {
        renderJson(new StaffModel());
    } else {
        renderJson(StaffService.getService().getStaffInfo(userId));
    }
}
```

适用场景：

- 工具型接口
- 直接回 JSON

## 15. Servlet：`void + renderText`

```java
public void actionForSyncProject() {
    ZendaoService.getService().syncProject();
    renderText("ok");
}
```

适用场景：

- 任务触发
- 运维或同步动作

## 16. Servlet：流输出

```java
public void actionForPdfMerge() {
    HttpServletResponse response = getResponse();
    // response 输出 PDF
}
```

适用场景：

- 导出
- 下载
- 文件流返回

## 17. 配置读取

```java
String profile = ServerContext.getProperties("PROFILE_ACTIVE", "prod");
String basePath = AppContext.getContext(Constants.APP_NAME).getProperty("basePath", "/home/data/");
```

适用场景：

- 平台级参数
- 应用级路径、开关、系统名

## 18. 反模式提醒

下面这些代码在仓库里能看到，但不要继续复制：

```java
e.printStackTrace();
```

```java
LogEngine.getLogger("cust-mars-access").info(request.toJSONString());
```

使用原则：

- 参考它的调用链
- 不继承它的坏味道
- `EasySQL` 尽量走参数化拼接，不要把不可信输入直接拼进 SQL
