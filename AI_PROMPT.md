
# AI Prompt: 复现个人作品集网站 (Portfolio)

> 使用以下提示词可让 AI 完整复刻本项目——一个基于 Node.js + Express + SQL.js (SQLite) 的个人作品集管理系统，前后端分离的 SPA 应用。

---

## 项目概述

你是一个全栈工程师，需要创建一个完整的个人作品集网站。项目使用 **Node.js + Express** 作为后端，**sql.js（浏览器版 SQLite）** 作为数据库，前端为 **纯 JavaScript SPA（无框架）**。项目包含用户系统（管理员/普通用户）、作品（帖子）管理、评论/通知/好友/私信、音乐播放器、等级系统、收藏夹、举报系统等功能。

## 目录结构

```
portfolio/
├── server.js                 # 服务入口，Express + Session + SQLite Session Store
├── package.json              # 依赖管理
├── .env.example              # 环境变量模板
├── .env                      # 环境变量（从 .env.example 复制）
├── database.db               # SQLite 数据库文件（运行时自动生成）
├── db/
│   └── init.js               # 数据库初始化 + 查询辅助函数 + XP 系统
├── middleware/
│   ├── auth.js               # 认证中间件（requireAuth / requireAdmin / requireNotBanned）
│   ├── upload.js             # 文件上传中间件（multer）
│   └── zoneAccess.js         # 分区访问控制中间件（基于等级）
├── routes/
│   ├── auth.js               # 认证路由（注册/登录/登出/改密）
│   ├── posts.js              # 帖子路由（CRUD + 置顶/精华/锁定 + 文件回收）
│   ├── upload.js             # 文件上传路由
│   ├── file.js               # 文件访问路由（权限控制）
│   ├── settings.js           # 设置路由（提示音上传/音量）
│   ├── comments.js           # 评论路由（嵌套评论 + 通知）
│   ├── notifications.js      # 通知路由
│   ├── site.js               # 关于页面路由
│   ├── users.js              # 用户资料路由（个人资料/搜索/他人资料）
│   ├── friends.js            # 好友/私信路由（好友请求/消息）
│   ├── tags.js               # 标签路由
│   ├── reactions.js          # 点赞/点踩路由
│   ├── avatar.js             # 头像上传路由
│   ├── admin.js              # 管理员路由（用户管理/批量删除/禁言）
│   ├── music.js              # 音乐路由（歌曲上传/歌单/公开歌单/收藏）
│   ├── bookmarks.js          # 收藏夹路由
│   ├── reports.js            # 举报系统 + 区域统计路由
│   └── levels.js             # 等级系统路由
├── public/
│   ├── index.html            # SPA 入口 HTML
│   ├── css/
│   │   └── style.css         # 全局样式（亮色/暗色主题、响应式）
│   └── js/
│       ├── app.js            # 主应用（初始化、认证、导航、主题、轮询）
│       ├── api.js            # API 请求封装
│       ├── components.js     # 所有页面渲染组件
│       ├── music.js          # 音乐播放器模块
│       ├── router.js         # 前端哈希路由
│       └── utils.js          # 工具函数（Toast、音效、模态框、裁剪、格式化）
└── uploads/                  # 上传文件目录（运行时自动创建）
    ├── sounds/               # 提示音文件
    ├── music/                # 音乐文件
    └── music_covers/         # 音乐封面（可选）
```

---

## 第一步：安装依赖

创建 `package.json`：

```json
{
  "name": "portfolio",
  "version": "1.0.0",
  "description": "Personal Portfolio Website",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "express-session": "^1.17.3",
    "bcryptjs": "^2.4.3",
    "multer": "^1.4.5-lts.1",
    "dotenv": "^16.3.1",
    "uuid": "^9.0.0",
    "mime-types": "^2.1.35",
    "sql.js": "^1.10.0"
  }
}
```

运行 `npm install`。

---

## 第二步：环境变量

创建 `.env.example`（复制为 `.env` 使用）：

```
ADMIN_SECRET=AdminKey123
SESSION_SECRET=change-this-to-a-random-secret
PORT=3000
DB_PATH=./database.db
```

---

## 第三步：数据库层 — `db/init.js`

使用 sql.js 的内存数据库，周期性持久化到磁盘。

**关键数据结构：**
- **users**: id, username, password(bcrypt), role('user'|'admin'), created_at, is_banned, banned_until, ban_reason, level, xp, points, coins
- **posts**: id, title, description, cover_url, cover_file_id, tags, views, category('work'|'chat'), like_count, dislike_count, is_sticky, is_featured, is_locked, created_by(FK→users), deleted_at(软删除), created_at, updated_at
- **content_blocks**: id, post_id(FK), type('text'|'image'|'video'|'code'), value, file_id, allow_preview(0/1), sort_order
- **files**: id, filename, original_name, mime_type, filepath, size
- **comments**: id, post_id(FK), parent_id(self-FK), user_id(FK), content, deleted_at, created_at, updated_at
- **notifications**: id, user_id, actor_id, type, post_id(nullable), comment_id, parent_comment_id, is_read
- **sessions**: sid, data, expires_at, user_id（用于单设备登录强制下线）
- **tags / post_tags**: 多对多标签关系
- **post_reactions**: user_id + post_id 唯一索引，type('like'|'dislike')
- **user_profiles**: user_id(PK), bio, avatar_url, social(JSON), nickname, skills(JSON)
- **friend_requests**: from_user_id, to_user_id, status('pending'|'approved'|'rejected')
- **friends**: user_id, friend_id（双向记录）
- **messages**: from_user_id, to_user_id, content, is_read
- **level_config**: level(PK), xp_required, zones(JSON), name, title_icon, bg_image
- **songs**: id, user_id, name, artist, cover_url, file_url, duration
- **playlists / playlist_songs**: 歌单与歌曲关联
- **playlist_collections**: 用户收藏公开歌单
- **bookmark_collections / post_bookmarks**: 收藏夹与收藏帖子关联
- **reports**: reporter_id, target_type('post'|'user'), target_id, reason, status('pending'|'resolved'|'dismissed')
- **post_views**: user_id + post_id 唯一索引，防止重复计数
- **settings**: key-value 存储（sound_url, sound_volume）
- **site_info**: key-value 存储（about JSON）
- **zone_stats**: 区域统计（works/chat 的帖子数和回复数）

**实现要点：**

1. 使用 `initSqlJs()` 初始化 sql.js
2. 如果 `database.db` 存在则加载，否则新建
3. 启用 WAL 模式和外键约束
4. 创建所有表，含兼容性迁移（ALTER TABLE ADD COLUMN 用 try-catch 包裹）
5. 种子数据：管理员账号 `admin / admin123`、2个演示帖子、20级等级配置、默认 about 内容
6. 种子数据包括声音设置默认值
7. 导出的辅助函数：
   - `run(sql, params)` — 执行 SQL 并返回 `{ lastID, changes }`
   - `get(sql, params)` / `getFirst(sql, params)` — 查单行
   - `all(sql, params)` — 查多行
   - `forceSave()` — 立即持久化
   - `addXP(userId, amount)` — 增加经验值并处理升级
8. 每 2 秒自动保存一次，进程退出时也保存

---

## 第四步：中间件 — `middleware/auth.js`

三个中间件函数：
- `requireAuth`: 检查 session.userId，未登录返回 401
- `requireAdmin`: 检查 session.role === 'admin'，否则 403
- `requireNotBanned`: 查询用户 is_banned 字段，支持限时禁言（自动解封）和永久禁言，被禁言返回 403
- `optionalAuth`: 空函数，占位

---

## 第五步：中间件 — `middleware/upload.js`

使用 multer 配置文件上传：
- **通用上传**（图片/视频/代码）：存储到 `./uploads/`，UUID 文件名，最大 50MB，mime+扩展名双重校验
- **声音上传**：存储到 `./uploads/sounds/click.mp3`，仅 MP3，最大 500KB
- **类型白名单**: 图片(jpg/png/gif/webp)、视频(mp4)、代码(txt/js/py/html/css/json)

---

## 第六步：中间件 — `middleware/zoneAccess.js`

分区访问控制中间件，基于用户等级：
1. 管理员始终可访问
2. 查询用户在 level_config 表中的 zones 权限
3. 如果用户等级对应的 zones 不包含目标 zone，返回 403

---

## 第七步：服务入口 — `server.js`

1. 加载 dotenv
2. 创建 Express 应用
3. 自定义 `SQLiteSessionStore`（实现 express-session 的 Store 接口），会话存储在 sessions 表中，支持 `destroyByUserId`（单设备登录）
4. Session 配置: 7天过期, httpOnly, sameSite: 'lax'
5. 静态文件服务（public 目录）
6. 挂载所有路由：
   - `/api/auth` → authRoutes
   - `/api/posts` → postsRoutes
   - `/api/upload` → uploadRoutes
   - `/api/file` → fileRoutes
   - `/api/settings` → settingsRoutes
   - `/api` → commentsRoutes / notificationsRoutes / userRoutes / friendsRoutes / reactionsRoutes / avatarRoutes / adminRoutes / bookmarksRoutes / reportsRoutes / levelsRoutes
   - `/api/tags` → tagsRoutes
   - `/api/site` → siteRoutes
   - `/api` → musicRoutes
7. 所有未匹配的 GET 请求返回 `public/index.html`（SPA 回退）
8. 全局错误处理
9. 启动时创建上传目录（`./uploads`, `./uploads/sounds`, `./uploads/music`, `./uploads/music_covers`）
10. 初始化数据库后监听端口

---

## 第八步：路由 — 逐个实现

### `routes/auth.js`
- **POST /register**: 用户名3-20字符、密码≥6位、检查重复、管理员注册需秘钥、bcrypt 加密、自动登录（销毁旧会话）
- **POST /login**: 验证用户名密码、单设备登录强制下线
- **POST /logout**: 销毁 session
- **GET /me**: 返回当前用户信息（含禁言/等级状态）
- **PUT /password**: 修改密码（需当前密码验证）

### `routes/posts.js`
- **GET /**: 分页列表（支持 category 筛选），按 is_sticky DESC, updated_at DESC 排序，含作者等级信息
- **GET /:id**: 单帖详情 + 内容块（普通用户仅能看 allow_preview=1），赞踩数，用户反应，浏览次数（post_views 表防重复）
- **POST /**: 发帖（work 类仅管理员，chat 类所有用户），支持标签同步到 post_tags 表，发帖奖励 20 XP
- **PUT /:id**: 更新帖子（管理员），支持 blocks 增删改、文件回收（引用计数）
- **PATCH /:id/status**: 置顶/精华切换（管理员），精华奖励 50 XP
- **DELETE /:id**: 软删除（管理员），通知作者
- **PATCH /:id/lock**: 锁定/解锁帖子
- **deleteFileIfUnused(fileId, excludePostId)**: 助手函数，检查文件引用计数后删除物理文件

### `routes/upload.js`
- **POST /**: 上传文件（multer），保存到 files 表，返回 file.id/url，代码文件读取内容返回

### `routes/file.js`
- **GET /avatar/:filename**: 公开访问头像文件，防路径穿越
- **GET /:fileId**: 权限控制文件访问，管理员可访问任何文件，普通用户仅能访问 preview-allowed 块关联的文件或帖子封面或歌曲封面

### `routes/settings.js`
- **GET /sound**: 获取声音设置
- **POST /sound/upload**: 上传提示音（管理员）
- **PUT /sound**: 更新音量（管理员）
- **GET /sound/file**: 提供提示音文件流

### `routes/comments.js`
- **GET /posts/:postId/comments**: 获取评论列表（含用户等级/昵称/头像）
- **POST /posts/:postId/comments**: 发布评论/回复（检查帖子是否锁定），创建通知，奖励 10 XP，回复奖励原作者 5 XP
- **PUT /comments/:id**: 编辑评论（作者或管理员）
- **DELETE /comments/:id**: 级联删除评论及其所有回复

### `routes/notifications.js`
- **GET /notifications**: 通知列表（含帖子标题、回复内容预览，已删除帖子标记）
- **GET /notifications/unread-count**: 未读通知数
- **PUT /notifications/:id/read**: 标记已读
- **PUT /notifications/read-all**: 全部标记已读

### `routes/site.js`
- **GET /about**: 获取关于页面信息
- **PUT /about**: 更新关于页面信息（管理员）

### `routes/users.js`
- **GET /auth/profile**: 当前用户完整资料（含昵称/头像/社交/技能）
- **PUT /auth/profile**: 更新个人资料（upsert user_profiles）
- **GET /users/search**: 搜索用户（模糊匹配用户名/昵称）
- **GET /users/:id/profile**: 他人公开资料
- **GET /users/:id/posts**: 他人帖子列表

### `routes/friends.js`
- **POST /friend-request**: 发送好友申请（查重、防自加）
- **GET /friend-requests**: 收到的待处理申请
- **POST /friend-request/:id/approve**: 通过（双向添加 friends 记录）
- **POST /friend-request/:id/reject**: 拒绝
- **GET /friends**: 好友列表
- **DELETE /friends/:id**: 删除好友（双向删除）
- **GET /friendship-status/:userId**: 查询关系状态（self/friends/request_sent/request_received/none）
- **GET /friend-requests/count**: 待处理申请数（用于徽章）
- **GET /messages/:friendId**: 聊天消息（需是好友），自动标记已读
- **POST /messages**: 发送消息（需是好友）
- **GET /messages/unread/count**: 未读消息数

### `routes/tags.js`
- **GET /**: 标签列表（支持 category 筛选），含使用计数
- **POST /**: 创建标签
- **DELETE /:id**: 删除标签（管理员）

### `routes/reactions.js`
- **POST /posts/:postId/reaction**: 点赞/点踩/取消，更新计数器，通知作者，like 奖励 2 XP

### `routes/avatar.js`
- **POST /user/avatar**: 上传头像（multer，5MB 限制），自动删除旧头像文件

### `routes/admin.js`
- **GET /admin/users**: 用户列表（分页+搜索）
- **PATCH /admin/users/:userId/ban**: 禁言/解禁（支持限时和永久），创建通知
- **DELETE /admin/posts/batch**: 批量软删除帖子

### `routes/music.js`
- **POST /music/upload**: 上传歌曲
- **POST /music/upload-cover**: 上传歌曲封面
- **GET /music/songs**: 当前用户歌曲列表
- **DELETE /music/songs/:id**: 删除歌曲（清理文件和封面）
- **GET /music/stream/:filename**: 音频流（支持 Range 请求实现拖放进度）
- **GET /music/playlists**: 歌单列表（含歌曲数）
- **POST /music/playlists**: 创建歌单
- **PUT /music/playlists/:id**: 更新歌单
- **DELETE /music/playlists/:id**: 删除歌单
- **GET /music/playlists/:id**: 歌单详情（含歌曲）
- **POST /music/playlists/:id/songs**: 添加歌曲（支持单曲和批量）
- **DELETE /music/playlists/:id/songs**: 批量移除歌曲
- **DELETE /music/playlists/:id/songs/:songId**: 移除单曲
- **PUT /playlists/:id/public**: 公开/私密切换
- **GET /users/:userId/public-playlists**: 用户公开歌单
- **GET /playlists/:id/public-view**: 浏览公开歌单（+1 浏览）
- **POST /playlists/:id/collect**: 收藏/取消收藏
- **GET /playlists/collected**: 我收藏的歌单

### `routes/bookmarks.js`
- **GET /bookmarks/collections**: 收藏夹列表
- **POST /bookmarks/collections**: 创建收藏夹
- **DELETE /bookmarks/collections/:id**: 删除收藏夹
- **GET /bookmarks**: 收藏帖子（分页）
- **POST /bookmarks**: 切换收藏状态
- **GET /bookmarks/check/:postId**: 检查收藏状态

### `routes/reports.js`
- **POST /reports**: 提交举报（去重检查）
- **GET /admin/reports**: 举报列表（管理员，分页+状态筛选）
- **PUT /admin/reports/:id**: 处理/驳回举报
- **GET /admin/stats**: 区域统计（作品区/聊天区帖子数和回复数）

### `routes/levels.js`
- **GET /levels/me**: 当前用户等级信息（含下一级 XP 需求、名称、图标、背景图）
- **GET /admin/levels/config**: 等级配置列表
- **PUT /admin/levels/config**: 更新等级配置（管理员）
- **GET /admin/levels/users**: 用户等级列表（管理员）
- **PUT /admin/levels/users/:id**: 修改用户等级/XP/积分（管理员），自动处理升级
- **GET /zone-access/:zone**: 检查分区访问权限

---

## 第九步：前端 — HTML 入口 `public/index.html`

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>个人作品集</title>
  <link rel="stylesheet" href="/css/style.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.6.1/cropper.min.css">
</head>
<body>
  <nav id="navbar" class="navbar">
    <div class="nav-inner">
      <div class="nav-brand"></div>
    </div>
    <div class="nav-links" id="nav-links"><!-- dynamically rendered --></div>
  </nav>
  <main id="app" class="container">
    <div class="loading-screen" id="loading-screen">
      <div class="spinner"></div>
      <p>加载中...</p>
    </div>
  </main>
  <div id="toast-container" class="toast-container"></div>
  <footer class="footer">
    <div class="footer-inner">
      <div class="footer-left">
        <label class="mute-toggle" title="点击音效静音">
          <input type="checkbox" id="mute-checkbox">
          <span class="mute-label">静音</span>
        </label>
      </div>
      <div class="footer-center" id="music-player-container" style="display:none;">
        <!-- Music player rendered by MusicPlayer module -->
      </div>
      <div class="footer-right">
        <span class="footer-text">个人作品集 &copy; 2024</span>
      </div>
    </div>
  </footer>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.6.1/cropper.min.js"></script>
  <script src="/js/utils.js"></script>
  <script src="/js/api.js"></script>
  <script src="/js/music.js"></script>
  <script src="/js/components.js"></script>
  <script src="/js/router.js"></script>
  <script src="/js/app.js"></script>
</body>
</html>
```

---

## 第十步：前端 CSS — `public/css/style.css`

完整约 3552 行的 CSS，要点如下：

1. **CSS 变量**: 主色 `#2563eb`、亮色/暗色主题变量（`--bg`, `--bg-card`, `--bg-nav`, `--text`, `--text-secondary`, `--border` 等）
2. **暗色模式**: `[data-theme="dark"]` 覆盖所有变量
3. **重置样式**: box-sizing, body 字体栈（含 Noto Sans SC）
4. **导航栏**: sticky, 深色背景 (`#1e293b`), 圆角按钮, 等级显示组件（含进度条/XPBadge）
5. **禁言横幅**: 红色 banner 滑入动画
6. **页面容器**: 最大 1200px
7. **加载动画**: spinner + fadeIn 动画
8. **按钮**: `.btn` 多层级（primary/danger/outline/sm/block）
9. **表单**: input/textarea/select 统一样式 + checkbox
10. **认证页面**: 居中卡片 + 选项卡切换
11. **作品网格**: 3列响应式卡片（hover 上浮效果）
12. **标签系统**: `.tag-chip` 可筛选标签条
13. **关于页面**: 头像圆形、技能标签、社交链接、编辑区
14. **作品详情**: 封面、内容块、评论区域
15. **编辑器**: 内容块拖拽排序、文件上传区、类型选择
16. **设置页面**: 列表式布局
17. **Toast**: 底部固定、滑入动画、多类型（success/error/warning/info）
18. **通知列表**: 未读高亮、徽章
19. **评论系统**: 嵌套缩进（1-6层）、回复表单、操作按钮
20. **好友/聊天**: 双栏布局、消息气泡、好友列表
21. **侧边菜单**: 滑入式、遮罩层、锁定项
22. **音乐播放器**: footer 嵌入式或全页模式、进度条、音量、播放模式
23. **模态框/裁剪**: Cropper.js 集成、自定义 confirm/prompt 对话框
24. **管理员页面**: 表格布局、批量操作、状态徽章
25. **响应式**: 4个断点（900/768/600/480px），手机适配
26. **自定义滚动条**

---

## 第十一步：前端 JavaScript 模块

### `public/js/utils.js`
1. **showToast(message, type, duration)**: Toast 通知（slideIn/slideOut 动画）
2. **音频系统**: WebAudioContext + Audio 对象，点击解锁音频
3. **playClickSound()**: 播放提示音（自定义 mp3 或 Web Audio beep），受静音开关控制
4. **loadSoundSettings()**: 从 /api/settings/sound 加载提示音设置
5. **formatDate(dateStr)**: SQLite UTC 时间 → 本地格式 "YYYY-MM-DD HH:mm"
6. **DOM 辅助**: `$()`, `$$()`, `createEl()`
7. **escapeHtml(str)**: XSS 防护
8. **loadHighlightJs()**: 懒加载 highlight.js
9. **文件类型检测**: `getFileTypeCategory()`, `validateFileSize()`
10. **formatFileSize(bytes)**: 文件大小格式化
11. **openCropModal(imageFile, aspectRatio)**: Cropper.js 裁剪弹窗，返回裁剪后的 Blob
12. **showConfirm(message) / showPrompt(message, defaultValue)**: 自定义模态框替代原生 confirm/prompt，带动画和键盘支持

### `public/js/api.js`
封装所有 fetch 请求的 API 对象：
- 统一的 `request(method, path, bodyOrFormData)`，自动处理 JSON/FormData
- 强制 `credentials: 'include'`
- 所有 API 方法按功能分组：Auth、Posts、Upload、Comments、Notifications、SoundSettings、SiteInfo、UserProfile、Friends、Messages、Tags、Reactions、Avatar、Admin、Music、Bookmarks、Reports、Levels、ZoneAccess

### `public/js/music.js`
完整的音乐播放器模块（`MusicPlayer` 对象）：
- Audio 元素管理、播放队列、播放模式（顺序/循环/单曲）
- 播放/暂停/上一首/下一首/进度拖放/音量控制
- 状态持久化到 localStorage（恢复播放队列）
- Footer 内 UI 渲染（封面、歌名、控制按钮、进度条）
- 播放列表实时同步指示器

### `public/js/router.js`
前端哈希路由（`Router` 对象）：
- 监听 `hashchange` 事件
- 路由表：`/works`, `/chats`, `/tags`, `/music`, `/music/playlist/:id`, `/friends`, `/chat/:id`, `/notifications`, `/profile`, `/users/:id`, `/login`, `/posts/:id`, `/create`, `/create/chat`, `/edit/:id`, `/settings`, `/bookmarks`, `/admin/stats`, `/admin/reports`, `/admin/users`, `/admin/levels`
- 未登录重定向到登录页，管理员路由权限检查

### `public/js/app.js`
主应用（`App` 对象）：
- 初始化：隐藏加载屏、解锁音频、初始化音乐播放器、加载声音设置、检查主题、检查认证、更新导航、初始化路由
- 主题切换（亮色/暗色）
- 导航渲染（登录状态 vs 未登录状态）：等级显示、好友按钮、通知按钮、设置、退出、汉堡菜单
- 侧边菜单创建和锁区检测
- 通知轮询（30秒间隔）
- 禁言横幅渲染（含倒计时）
- 等级刷新

### `public/js/components.js`
核心页面渲染组件（`Components` 对象），约 899 行。所有方法如下：

**基础属性**: currentPage, hasMore, isLoading, currentPost, editorBlocks, editorMode, editorPostId, _editorCategory, _avatarState, _highlightCommentId, allPosts, _searchQuery, _activeTag, _sortMode, _currentCategory, _commentPage, _commentPageSize, _tagCategory, currentReports, _musicTab, _currentBookmarkColId, _levelConfigCache, _levelConfigMap

**方法（按功能分组）**:

1. **等级缓存**: `_initLevelCache()` / `_getLevelLabel(level)` / `_renderLevelBadge(level)`
2. **通用**: `renderLoading()` — 加载动画
3. **认证**: `renderAuth()` — 登录/注册页面，含选项卡切换
4. **标签管理**: `renderTagManager()` / `_renderTagList()` — 分区筛选、搜索、增删标签
5. **作品列表**: `renderPostList(category)` — 网格布局、搜索框、排序、标签筛选、全选批量删除、分页加载
6. **作品详情**: `renderPostDetail(postId)` — 封面、内容块渲染、表情互动、书签管理、举报、评论、代码高亮、折叠
7. **编辑器**: `renderCreatePost(category)` / `renderEditPost(postId)` / `_renderEditor()` / `_renderEditorBlocks()` / `_renderBlockEditor()` / `_bindBlockEvents()` / `_bindEditorEvents()` — 内容块增删改排序、文件上传裁剪、封面裁剪
8. **个人主页**: `renderMyProfile()` / `renderUserProfile(userId)` — 头像、技能、等级、作品列表、好友按钮
9. **评论系统**: `_loadComments()` / `_renderComments()` / `_renderCommentItem()` / `_bindCommentForm()` / `_bindCommentActions()` — 分页嵌套评论、回复/编辑/删除
10. **通知**: `renderNotifications()` — 类型标签、标记已读
11. **收藏夹**: `renderBookmarks()` — 收藏夹管理、帖子列表、分页
12. **音乐库**: `renderMusicLibrary()` / `renderPlaylistDetail(playlistId)` / `_showSongSelector()` — 歌曲列表、歌单网格、上传表单（含封面裁剪）、播放队列、歌曲搜索
13. **好友/聊天**: `renderFriends()` / `renderChat(friendId)` — 好友申请、好友列表、私信
14. **设置**: `renderSettings()` — 昵称/简介/技能/社交链接/密码修改
15. **管理员**:
    - `renderAdminUsers()` — 用户管理、搜索分页、禁言解禁
    - `renderAdminStats()` — 区域统计仪表盘
    - `renderAdminReports()` — 举报处理（锁定/删除/禁言）
    - `renderAdminLevels()` — 等级配置编辑器（XP/名称/图标/背景图/分区权限）+ 用户等级管理
16. **工具方法**: `_applyCollapse()` / `_makeCollapsible()` — 内容折叠、`_bindReactionBar()` — 赞踩、`_bindStatusToggles()` — 置顶/精华/锁定切换

---

## 第十二步：启动

```bash
# 复制环境变量
cp .env.example .env

# 安装依赖
npm install

# 启动
npm start

# 访问 http://localhost:3000
# 默认管理员: admin / admin123
```

---

## 项目功能总结

| 功能 | 说明 |
|------|------|
| 用户系统 | 注册/登录/登出，管理员/普通用户，单设备登录 |
| 作品管理 | CRUD，内容块（文本/图片/视频/代码），预览权限控制 |
| 评论系统 | 嵌套回复，分页，编辑/删除，通知作者 |
| 标签系统 | 标签创建/删除，帖子关联，分区筛选 |
| 点赞/点踩 | 切换式互动，计数器，通知作者 |
| 通知系统 | 回复/评论/置顶/精华/锁定/删除/好友/收藏等通知 |
| 好友系统 | 好友申请/审批/删除 |
| 私信 | 好友间即时消息 |
| 音乐播放器 | 上传歌曲/封面，创建歌单，播放队列，进度控制 |
| 等级系统 | XP 升级，分区权限控制，等级管理 |
| 书签/收藏 | 收藏夹管理，帖子收藏 |
| 举报系统 | 举报帖子/用户，管理员处理 |
| 提示音 | 自定义上传，音量控制，静音开关 |
| 暗色模式 | 主题切换，localStorage 持久化 |
| 头像上传 | Cropper.js 裁剪上传 |
| 代码高亮 | highlight.js 懒加载 |
| 管理员面板 | 用户管理/禁言、批量删帖、区域统计、举报管理、等级配置 |
| 响应式 | 手机/平板/桌面适配 |
