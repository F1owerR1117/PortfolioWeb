# 项目编码规范 · CONVENTIONS.md

> **使用方式：每次给 AI 发 prompt 时，第一句引用本文件。**
>
> 示例：`请严格遵守 CONVENTIONS.md 中的规范，帮我实现 XXX 功能。`

---

## 1. 导入规则

### ✅ 正确

```js
// 文件顶部，按顺序：Node 内置 → npm 包 → 项目模块
const fs = require('fs');
const path = require('path');

const express = require('express');
const bcrypt = require('bcryptjs');

const { run, get, getFirst, all } = require('../db/init');
const PostService = require('../services/PostService');
const { requireAuth } = require('../middleware/auth');
```

### ❌ 禁止

- **禁止在函数体内写 `require`**——所有 require 必须在文件顶部
- 禁止 `const { get } = require('../db/init')` 出现在 if/for/function 内部
- 禁止 `require('../db/init').get(...)` 这种链式写法

**唯一例外**：`db/seeds.js` 内部的 `require('bcryptjs')` 可以保留在函数内（因为 seed 只在首次初始化时运行）。

---

## 2. 数据库访问分层

```
routes/     →  只调用 services，不直接操作数据库
services/   →  调用 models + db/init 的查询辅助函数
models/     →  封装 SQL 语句，只被 services 调用
db/init.js  →  只提供 run() / get() / getFirst() / all() / forceSave()
```

### 规则

- **路由文件禁止直接写 SQL**。需要数据 → 调 service 或 model
- **需要多条同类数据时用 GROUP BY 合并**，禁止在循环中逐条 COUNT
- **所有写操作（INSERT/UPDATE/DELETE）后不需要手动 forceSave()**——better-sqlite3 每次写入实时落盘
- **需要立即持久化时调用 forceSave()**（如 migrations、seeds）

---

## 3. 数据库迁移规范

迁移文件：`db/migrations.js`

- 每个迁移块必须有版本号（当前最新 `schema_version = 20`）
- 新增迁移放在文件末尾 `ADD NEW MIGRATIONS ABOVE THIS LINE` 上方
- 版本号递增（21, 22, 23...）
- **ALTER TABLE ADD COLUMN 必须用 try/catch 容错重复列名**：
  ```js
  try { run("ALTER TABLE xxx ADD COLUMN yyy ..."); }
  catch (e) { if (!/duplicate column name/i.test(e.message)) throw e; }
  ```
- 表重建（DROP + CREATE + INSERT + RENAME）必须包在 `PRAGMA foreign_keys = OFF` / `ON` 中
- 迁移执行后调用 `setVersion(N); forceSave();`

---

## 4. 错误处理规范

### 统一模式

```js
// Service 层：throw 带 status 的对象
throw { status: 404, message: '帖子不存在' };

// Route 层：catch 后统一处理
} catch (err) {
  const status = err.status || 500;
  logger.error('[Module] Action error:', err.message || err);
  res.status(status).json({ error: err.message || '操作失败' });
}
```

- 不要在 service 里写 `res.status().json()`——那是 route 的职责
- 不要在 route 里写业务判断——那是 service 的职责
- `middleware/errorHandler.js` 已有 `AppError` 类，优先使用：`throw new AppError('消息', 状态码)`

---

## 5. 前端架构规范

### 组件文件职责单一

| 文件 | 负责 | 禁止 |
|------|------|------|
| `app.js` | 初始化、认证状态、导航、主题 | 禁止写页面渲染逻辑 |
| `router.js` | 路由匹配 → 调用 Components 方法 | 禁止写 HTML |
| `api.js` | HTTP 请求封装 | 禁止操作 DOM |
| `music.js` | 播放器状态 + 底部播放栏 UI | 禁止写歌单/歌曲列表页面 |
| `components/*.js` | 各页面渲染 | 每个文件一个 `ComponentsXxx` 对象 |

### DOM 更新原则

- **优先局部更新**，避免全量 innerHTML 替换
- 编辑一条数据 → 改对应元素的 textContent / src / className
- 删除一条数据 → 移除对应 DOM 节点（可加动画）
- 新增一条数据 → 追加 DOM 节点（或全量刷新，因为需要后端返回的 ID）
- 只有**列表结构变化**（排序、筛选、分页）或**跨页面导航**才允许全量重渲染

### 全局对象

- `App` — 应用状态（user, theme）
- `Components` — 所有页面渲染方法（通过 Object.assign 合并各 ComponentsXxx）
- `Router` — 前端路由
- `API` — HTTP 请求
- `MusicPlayer` — 播放器状态

不要新增全局对象。新功能加到对应的已有对象上。

---

## 6. 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| Service 文件 | PascalCase | `PostService.js`, `AuthService.js` |
| Model 文件 | PascalCase | `Post.js`, `User.js` |
| Route 文件 | camelCase | `posts.js`, `auth.js` |
| Middleware 文件 | camelCase | `auth.js`, `upload.js` |
| 数据库函数 | camelCase，动词在前 | `getFirst()`, `addXP()`, `forceSave()` |
| 路由处理函数 | 匿名或箭头 | —— |
| 前端组件方法 | `render` + 名词 | `renderPostList()`, `renderMusicLibrary()` |
| 前端内部方法 | `_` 前缀 | `_renderSongList()`, `_bindEvents()` |

---

## 7. 代码风格

- 使用 `var` / `const`（保持与现有代码一致——ES5 兼容，不依赖构建工具）
- 缩进：2 空格
- 字符串：优先单引号，SQL 用双引号或模板字符串
- 条件判断：使用 `===` / `!==`
- 数组遍历：使用 `for (var i = 0; ...)` 或 `.forEach()`，不要用 `for...of`（ES5 兼容）
- 前端 `innerHTML` 拼接时，用户输入必须经过 `escapeHtml()` 处理

---

## 8. 安全规则（新增代码也必须遵守）

- 所有用户输入在拼入 SQL 前必须用参数化查询（`?` 占位符）
- 所有用户输入在拼入 HTML 前必须经过 `escapeHtml()`
- 文件上传必须校验 MIME 类型 + 扩展名双重白名单
- Session cookie 必须 `httpOnly: true, sameSite: 'lax'`
- 密码必须 bcrypt 加密
- 不信任 `req.body` 中的任何字段，必须校验类型和范围

---

## 9. 已有模块清单（新增功能前先确认是否已存在）

### 后端

| 文件 | 职责 | 关键导出/路由 |
|------|------|-------------|
| `db/init.js` | 数据库连接/初始化 | `run, get, getFirst, all, forceSave` |
| `db/schema.js` | CREATE TABLE 语句 | `createTables(run)` |
| `db/migrations.js` | 版本化迁移 | `runMigrations(run, get, all, forceSave)` |
| `db/seeds.js` | 种子数据 | `seedData(...)` |
| `middleware/auth.js` | 认证中间件 | `requireAuth, requireAdmin, requireNotBanned, requireAuthorOrAdmin` |
| `middleware/upload.js` | 文件上传 | `generalUpload, soundUpload, attachmentUpload` |
| `middleware/zoneAccess.js` | 分区权限 | `requireZoneAccess, requireJobRole` |
| `middleware/errorHandler.js` | 错误处理 | `AppError, apiNotFound, errorHandler` |
| `middleware/requestLogger.js` | 请求日志 | —— |
| `services/AuthService.js` | 认证业务 | `register, login, changePassword, getCurrentUser` |
| `services/PostService.js` | 帖子业务 | `getList, getDetail, create, update, softDelete, setStatus, purchaseBlock, setLock` |
| `services/LevelService.js` | 等级/XP 业务 | `addXP(userId, amount)` |
| `services/FileService.js` | 文件业务 | `createFile, findById, deleteFile` |
| `services/NotificationService.js` | 通知业务 | —— |
| `services/LoginNoticeService.js` | 登录公告 | —— |
| `models/Post.js` | 帖子 SQL | `list, findById, create, update, softDelete, setStatus, setLock, getBlocks, syncTags...` |
| `models/User.js` | 用户 SQL | `findById, findByUsername, create, updatePassword, getProfile, ban, list, search...` |
| `models/Comment.js` | 评论 SQL | —— |
| `models/File.js` | 文件 SQL | `findById, isReferenced, delete...` |
| `models/Notification.js` | 通知 SQL | `create(...)` |
| `models/LoginNotice.js` | 登录公告 SQL | —— |
| `config.js` | 统一配置 | `port, sessionSecret, adminSecret, dbPath, uploadDir...` |
| `logger.js` | Winston 日志 | —— |

### 前端

| 文件 | 职责 |
|------|------|
| `public/js/app.js` | 应用初始化、认证、导航、通知轮询 |
| `public/js/router.js` | 哈希路由 |
| `public/js/api.js` | HTTP 请求封装 |
| `public/js/music.js` | 音乐播放器（状态 + 底部栏 UI） |
| `public/js/utils.js` | toast、escapeHtml、confirm、裁剪等工具函数 |
| `public/js/components/index.js` | 组件合并入口 |
| `public/js/components/shared.js` | 共享渲染辅助（导航、badge 等） |
| `public/js/components/postList.js` | 帖子列表 |
| `public/js/components/postDetail.js` | 帖子详情 |
| `public/js/components/postEditor.js` | 帖子编辑器 |
| `public/js/components/auth.js` | 登录/注册页 |
| `public/js/components/profile.js` | 个人主页 |
| `public/js/components/comments.js` | 评论系统 |
| `public/js/components/notifications.js` | 通知列表 |
| `public/js/components/friends.js` | 好友系统 |
| `public/js/components/chat.js` | 私信聊天 |
| `public/js/components/bookmarks.js` | 收藏夹 |
| `public/js/components/musicLibrary.js` | 音乐库页面（歌曲列表 + 歌单） |
| `public/js/components/admin.js` | 管理后台导航 |
| `public/js/components/admin-stats.js` | 📊 系统概览仪表盘 |
| `public/js/components/admin-users.js` | 用户管理 |
| `public/js/components/admin-reports.js` | 举报处理 |
| `public/js/components/admin-tags.js` | 标签管理 |
| `public/js/components/admin-applications.js` | 身份审核 |
| `public/js/components/ads.js` | 广告栏 |

---

## 10. API 响应格式

所有 API 响应统一为 JSON：

```json
// 成功
{ "message": "操作成功", "postId": 1 }
{ "posts": [...], "pagination": { "page": 1, "total": 42 } }
{ "zones": [...], "total_users": 5 }

// 失败
{ "error": "错误描述" }
```

- 列表接口必须返回 `pagination` 对象（page, limit, total, totalPages, hasMore）
- POST 创建成功返回 201，其余成功返回 200
- 401 = 未登录，403 = 无权限，404 = 不存在，409 = 冲突，500 = 服务器错误

---

## 11. 测试和验证

- 修改代码后，运行 `node -e "require('./db/init').initDatabase().then(()=>{console.log('DB OK');process.exit(0)}).catch(e=>{console.error(e);process.exit(1)})"` 验证数据库初始化
- 新增迁移后，确保第二次运行不执行任何迁移块（幂等性验证）
- 新增路由后，确保 `server.js` 中已注册路由挂载
- 新增前端组件文件后，确保 `public/index.html` 中已添加 `<script>` 标签
