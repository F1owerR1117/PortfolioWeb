# 架构文档

## 系统架构

```
┌─────────────────────────────────────────────────┐
│                  浏览器 (Browser)                 │
│   SPA: index.html → utils.js → api.js →         │
│         music.js → components/*.js → router.js  │
│         → app.js                               │
└──────────────────────┬──────────────────────────┘
         │  fetch('/api/...')  │ 哈希路由 #/xxx
         ▼                   ▲
┌─────────────────────────────────────────────────┐
│            Express 服务器 (Node.js)              │
│  ┌───────────┐  ┌────────────────────────────┐  │
│  │ Middleware │  │      Routes (18 files)     │  │
│  │ auth.js    │  │  auth  posts  comments     │  │
│  │ upload.js  │  │  users  friends  music     │  │
│  │ zoneAccess │  │  bookmarks  reports  ...   │  │
│  │ helmet     │  └──────────┬─────────────────┘  │
│  │ rateLimit  │             │                     │
│  └───────────┘  ┌──────────▼─────────────────┐  │
│                 │      Services (4 files)      │  │
│                 │  Auth  Post  Notification    │  │
│                 │  File                        │  │
│                 └──────────┬─────────────────┘  │
│                            │                     │
│  ┌─────────────────────────▼──────────────────┐  │
│  │        db/init.js (sql.js - SQLite)         │  │
│  │  同步 API: run() / get() / all() / addXP() │  │
│  │  每 2 秒持久化到 database.db                │  │
│  └────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

## 数据流

### 请求生命周期

```
1. 用户操作 → hashchange → Router._handlePath()
2. → Components.renderXxx() 调用 API.get/postXxx()
3. → API.request() 执行 fetch('/api/...')
4. → Express 匹配路由 → 中间件链 (helmet → rateLimit → auth → route)
5. → 路由处理函数 → Service → Model → db 查询 → JSON 响应
6. → Components 解析 JSON → 渲染 HTML → 绑定事件
7. → App.refreshLevel() 更新 XP/等级
```

### 请求示例：查看帖子详情

```
浏览器端:
  Router.navigate('#/posts/40')
  → Components.renderPostDetail(40)
  → API.getPost(40) → fetch('GET /api/posts/40')

服务器端:
  helmet (安全头)
  → rateLimit (速率限制)
  → requireAuth (检查 session)
  → GET /api/posts/:id 处理函数
  → PostService.getDetail(40)
  → Post.findById(40) → db.get('SELECT * FROM posts WHERE id=40')
  → Post.getBlocks(40) → db.all('SELECT * FROM content_blocks WHERE post_id=40')
  → 返回 { post: {...}, blocks: [...], user_reaction: 'like' }

浏览器端:
  → 渲染 HTML: 标题、内容块、评论区
  → bindReactionBar(), bindCommentForm()
```

## 技术要点

### 数据库 (sql.js)
- **同步 API**: `run(sql, params)` / `get(sql, params)` / `all(sql, params)`
- **内存运行**，每 2 秒写入 `database.db`
- **迁移策略**: ALTER TABLE 用 try-catch 包裹，幂等执行
- **种子数据**: 仅在表为空时写入

### 会话管理
- 自定义 `SQLiteSessionStore`，继承 `session.Store`
- 单会话强制执行：登录时销毁该用户所有旧会话
- 会话存活期：24 小时
- Cookie 名称: `portfolio_sid` (非默认 `connect.sid`)
- 登录/注册时调用 `session.regenerate()` 防止会话固定

### 安全机制

| 机制 | 说明 |
|------|------|
| helmet | 安全响应头 (X-Frame-Options, X-Content-Type-Options 等) |
| express-rate-limit | 登录接口 10次/分钟限制 |
| CSRF 防护 | Origin/Referer 头验证 |
| 密码策略 | 6-128位，必须包含字母和数字 |
| 异步 bcrypt | 密码哈希不阻塞事件循环 |
| 输入验证 | 昵称50字、简介500字、评论2000字 |
| 文件上传 | 禁止 .html/.js 上传，防止 XSS |
| 文件访问 | 默认拒绝，仅授权文件可访问 |
| 路径遍历 | avatar_url 验证，阻止 `..` 和 `/` |

### 路由挂载规则

```js
app.use('/api/auth', authRoutes);     // 前缀挂载 → 路由路径不含前缀
app.use('/api', commentsRoutes);       // 裸挂载 → 路由路径含完整路径
```

两种挂载模式共存。前缀挂载的路径自动拼接 `/api/auth`；裸挂载的路径需包含完整路由。

### 认证中间件链

| 中间件 | 作用 |
|--------|------|
| `requireAuth` | 必须登录，写 session.last_seen |
| `requireAdmin` | 必须为 admin 角色 |
| `requireNotBanned` | 未被禁言（含过期检查） |
| `optionalAuth` | 可选认证，传递用户信息但不强制 |
| `requireZoneAccess` | 检查用户等级是否满足分区要求 |

### XP 经验值系统

| 操作 | XP 奖励 |
|------|---------|
| 发布帖子 | +20 |
| 发布评论 | +10 |
| 收到点赞 | +2 |
| 帖子被加精 | +50 |
| 收到回复 | +5 |
| 升到新等级 | 自动触发升级 |

`addXP()` 函数在 XP 超过等级阈值时自动升级。等级存储在 `level_config` 表中，
包含等级名称、图标、背景图、所需 XP 和可访问的分区列表。

### 文件存储

- 物理文件: `uploads/` 目录，UUID 文件名
- 元数据: `files` 表追踪原始名、MIME 类型、大小、路径
- 垃圾回收: `deleteFileIfUnused()` 在帖子更新时清理孤立文件
- 权限控制: `file.js` 路由检查文件所属块是否有 `allow_preview` 权限
- 默认拒绝: 未关联内容的文件返回 403

### 通知系统

所有可通知操作:
- 评论/回复帖子
- 点赞/点踩  
- 好友请求（发送/接受）
- 私信
- 帖子被加精/置顶
- 帖子被锁定
- 用户被禁言
- 帖子被收藏
- 帖子被删除
- 播放列表被收藏

前端每 30 秒轮询 `/api/notifications/unread-count`。
点击通知可跳转到帖子详情并自动滚动到对应评论位置。

## 目录详细说明

### server.js
- Express 应用入口
- 配置: session、静态文件、body parser (10kb 限制)
- 安全: helmet、rateLimit、CSRF 防护
- 自定义 SQLiteSessionStore 实现
- 挂载全部 18 个路由文件
- 全局错误处理中间件
- 启动服务器监听 `:3000`

### config.js
- 统一配置管理，从 `.env` 读取环境变量
- 端口、密钥、数据库路径、上传目录、日志目录
- Session 配置 (cookie 名称、有效期、安全标志)

### logger.js
- Winston 日志系统
- 控制台输出 (彩色)
- 文件输出: `logs/combined.log` (全部) + `logs/error.log` (仅错误)
- 日志文件最大 5MB，保留 3 个

### db/init.js
- 初始化 sql.js（启用 WAL 模式、外键）
- 创建全部 20+ 张表
- 执行兼容性迁移（ALTER TABLE + try-catch）
- 写入种子数据
- 导出: `run()`, `get()`, `getFirst()`, `all()`, `addXP()`

### public/js/ 模块加载顺序

```
1. utils.js                — 工具函数 (toast/模态框/日期/音频)
2. api.js                  — API 封装 (70+ 方法)
3. music.js                — 音乐播放器
4. components/shared.js    — 共享工具方法
5. components/*.js          — 12 个功能组件
6. components/index.js     — 聚合所有组件
7. router.js               — 哈希路由
8. app.js                  — 初始化/导航/主题/轮询
```

### 数据库表清单

| 表名 | 用途 |
|------|------|
| users | 用户账户 (角色/等级/禁言/XP) |
| user_profiles | 用户资料 (昵称/简介/头像/社交链接) |
| sessions | 会话存储 |
| settings | 系统设置 (声音/迁移标记) |
| site_info | 关于页面内容 |
| posts | 帖子 (分类/封面/标签/视图/锁定) |
| content_blocks | 帖子内容块 (文本/图片/视频/代码) |
| comments | 评论 (嵌套结构) |
| tags | 标签定义 |
| post_tags | 帖子-标签关联 |
| post_reactions | 点赞/点踩 |
| post_views | 浏览记录 |
| files | 上传文件元数据 |
| notifications | 通知 |
| friend_requests | 好友请求 |
| friends | 好友关系 |
| messages | 私信 |
| level_config | 等级配置 |
| songs | 音乐歌曲 |
| playlists | 播放列表 |
| playlist_songs | 播放列-歌曲关联 |
| playlist_collections | 收藏的播放列表 |
| bookmark_collections | 收藏夹 |
| post_bookmarks | 帖子收藏 |
| reports | 举报记录 |
| zone_stats | 分区数据统计 |
