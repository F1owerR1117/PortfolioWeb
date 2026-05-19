# Portfolio — 全栈个人作品集管理系统 · 技术评审文档

> **用途**：供外部 AI 或工程师全面了解本项目架构，进行技术评审。
> **无需访问源码**：本文档包含完整的架构图、数据库设计、API 概览、安全策略和已知权衡。

---

## 1. 项目概述

一个**单人全栈开发**的个人作品集/社交平台，集作品展示、社区互动、音乐播放、等级系统于一体。

- **代码规模**：~11,000 行 JavaScript / CSS
- **开发方式**：AI 辅助（需求 → AI 生成 → 人工验证），无框架依赖
- **运行方式**：`npm start`，单进程 Node.js，无需外部数据库服务

| 维度 | 数据 |
|------|------|
| 后端文件 | 20 个路由 + 6 个 Service + 6 个 Model + 5 个中间件 |
| 前端文件 | 15 个组件 + 5 个核心模块 |
| 数据库表 | 27 张 |
| API 端点 | 70+ |
| CSS 规模 | ~3,500 行（20 个组件化文件） |

---

## 2. 技术栈

| 层级 | 技术 | 版本 | 说明 |
|------|------|------|------|
| 运行时 | Node.js | 24.x | |
| 后端框架 | Express | 4.18 | |
| 数据库驱动 | **better-sqlite3** | 12.x | 原生 C 扩展，WAL 模式，同步 API，实时写盘 |
| 密码哈希 | bcryptjs | 2.4 | 异步，10 rounds |
| 会话管理 | express-session | 1.17 | 自定义 SQLite Session Store |
| 文件上传 | multer | 1.4 | MIME + 扩展名双重校验 |
| 安全头 | helmet | 8.1 | |
| 限流 | express-rate-limit | 8.5 | 登录 10次/分钟，API 100次/分钟 |
| 日志 | winston | 3.19 | console + 文件双输出，5MB 轮转 |
| 前端 | **Vanilla JS** | ES5 | 无框架，无构建工具，纯手写 SPA |
| 前端路由 | 哈希路由 | — | `#/works`, `#/posts/:id` 等 |
| 图片裁剪 | Cropper.js | 1.6 | CDN 加载 |

### 为什么选这些技术

- **better-sqlite3 替代 sql.js**：旧方案将整个数据库加载到内存，每 2 秒全量序列化写盘，存在 2 秒数据丢失窗口。better-sqlite3 是原生 C 扩展，WAL 模式实时写盘，零丢失，且 API 同为同步风格，迁移成本可控。
- **Vanilla JS 替代 React/Vue**：本项目由 AI 辅助生成代码。对 AI 而言，生成 50 行 vanilla JS 的正确率高于生成 50 行 React + JSX + hooks。无构建步骤也意味着零配置、即时预览。
- **手写 CSS 替代 Tailwind**：项目已有完善的 CSS 变量系统、主题切换、响应式断点。AI 生成 `class="btn btn-primary"` 比生成 10 个原子类更可靠。

---

## 3. 系统架构

```
┌─────────────────────────────────────────────────┐
│                  浏览器 (Browser)                 │
│   SPA: index.html → utils.js → api.js →         │
│         music.js → components/*.js → router.js  │
│         → app.js                                │
│  主题: 深色主题 (CSS 变量驱动)                        │
└──────────────────────┬──────────────────────────┘
         │  fetch('/api/...')  │ 哈希路由 #/xxx
         ▼                   ▲
┌─────────────────────────────────────────────────┐
│            Express 服务器 (Node.js)              │
│  ┌───────────┐  ┌────────────────────────────┐  │
│  │ Middleware │  │      Routes (20 files)     │  │
│  │ helmet     │  │  auth  posts  comments     │  │
│  │ rateLimit  │  │  users  friends  music     │  │
│  │ CSRF       │  │  bookmarks  reports  ads   │  │
│  │ auth.js    │  │  admin  levels  tags       │  │
│  │ zoneAccess │  │  loginNotices  site        │  │
│  │ upload.js  │  │  applications  upload      │  │
│  └───────────┘  └──────────┬─────────────────┘  │
│                 ┌──────────▼─────────────────┐  │
│                 │      Services (6 files)      │  │
│                 │  Auth  Post  Level           │  │
│                 │  Notification  File  Login   │  │
│                 └──────────┬─────────────────┘  │
│                 ┌──────────▼─────────────────┐  │
│                 │      Models (6 files)        │  │
│                 │  User  Post  Comment  File   │  │
│                 │  Notification  LoginNotice   │  │
│                 └──────────┬─────────────────┘  │
│  ┌─────────────────────────▼──────────────────┐  │
│  │        db/init.js (better-sqlite3)          │  │
│  │  run() / get() / getFirst() / all()         │  │
│  │  WAL 模式实时写盘，零数据丢失                │  │
│  └────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

### 分层规则（CONVENTIONS.md 强制执行）

```
routes/     →  只调用 services，不写 SQL
services/   →  调用 models + db/init 查询辅助
models/     →  封装 SQL，被 services 调用
db/init.js  →  只提供 run/get/getFirst/all，不包含业务逻辑
```

### 请求生命周期（以查看帖子详情为例）

```
浏览器:
  Router.navigate('#/posts/40')
  → Components.renderPostDetail(40)
  → API.getPost(40) → fetch('GET /api/posts/40')

服务器:
  helmet → rateLimit → requireAuth → CSRF check
  → GET /api/posts/:id handler
  → PostService.getDetail(40)
  → Post.findById(40) → db.get('SELECT * FROM posts WHERE id=40')
  → Post.getBlocks(40) → db.all('SELECT * FROM content_blocks WHERE post_id=40')
  → 返回 { post, blocks, user_reaction }

浏览器:
  → 渲染 HTML → 绑定事件 → App.refreshLevel()
```

---

## 4. 数据库设计

### 引擎

better-sqlite3 12.x，WAL 模式，`synchronous = NORMAL`，8MB 缓存。

### 表清单（27 张）

| 表名 | 用途 | 关键字段 |
|------|------|----------|
| `users` | 用户账户 | username, password(bcrypt), role(admin/user), level, xp, points, is_banned |
| `user_profiles` | 用户资料 | nickname, bio, avatar_url, social(JSON), skills(JSON) |
| `sessions` | 会话存储 | sid, data, expires_at, user_id |
| `settings` | 系统设置 | key-value（含 schema_version 迁移追踪） |
| `site_info` | 关于页面 | key-value（about JSON） |
| `posts` | 帖子 | title, category(work/chat/music/job), tags, views, is_sticky, is_featured, is_locked, deleted_at(软删除) |
| `content_blocks` | 内容块 | type(text/image/video/code), value, file_id, allow_preview, attachment_* 字段 |
| `attachment_purchases` | 附件购买 | block_id, user_id, type(unlock/download), points_paid |
| `comments` | 评论 | post_id, parent_id(自引用嵌套), user_id, content |
| `tags` / `post_tags` | 标签 | 多对多 |
| `post_reactions` | 点赞/点踩 | user_id+post_id 唯一索引 |
| `post_views` | 浏览记录 | user_id+post_id 唯一索引 |
| `files` | 文件元数据 | filename, original_name, mime_type, filepath, size |
| `notifications` | 通知 | user_id, actor_id, type, post_id, comment_id, is_read |
| `friend_requests` | 好友申请 | from_user_id, to_user_id, status(pending/approved/rejected) |
| `friends` | 好友关系 | user_id, friend_id（双向） |
| `messages` | 私信 | from_user_id, to_user_id, content, is_read |
| `level_config` | 等级配置 | level(PK), xp_required, zones(JSON), name, title_icon, bg_image |
| `songs` | 歌曲 | user_id, name, artist, cover_url, file_url, duration |
| `playlists` | 歌单 | user_id, name, cover_url, is_public |
| `playlist_songs` | 歌单-歌曲 | playlist_id, song_id, sort_order |
| `playlist_collections` | 歌单收藏 | user_id+playlist_id 唯一索引 |
| `bookmark_collections` | 收藏夹 | user_id, name |
| `post_bookmarks` | 帖子收藏 | user_id+post_id+collection_id 唯一索引 |
| `reports` | 举报 | reporter_id, target_type(post/user), target_id, reason, status |
| `ads` | 广告 | title, image_file_id, link_url, position(left/right), display_pages |
| `login_notices` | 登录公告 | title, content, image_url, link_url, is_active |
| `job_applications` | 求职身份申请 | user_id, role(employer/seeker), status(pending/approved/rejected) |
| `zone_stats` | 分区统计 | zone_name, post_count, reply_count |

### 迁移系统

- `schema_version` 存储在 `settings` 表，当前版本 v20
- 新增迁移在 `db/migrations.js` 末尾递增版本号
- ALTER TABLE 幂等容错（`duplicate column name` 自动跳过）
- 表重建操作包裹在 `PRAGMA foreign_keys = OFF/ON` 中

---

## 5. API 概览（70+ 端点）

| 模块 | 前缀 | 主要端点 | 认证 |
|------|------|----------|------|
| 认证 | `/api/auth` | register, login, logout, me, password, profile | 混合 |
| 帖子 | `/api/posts` | CRUD, 置顶/精华, 锁定, 附件购买/下载 | 需登录 |
| 评论 | `/api/posts/:id/comments` | 列表/创建/编辑/删除 | 需登录 |
| 通知 | `/api/notifications` | 列表, 未读数, 标记已读 | 需登录 |
| 好友 | `/api` | 请求/审批/删除, 好友列表, 私信 | 需登录 |
| 音乐 | `/api/music` | 上传/流播放, 歌单 CRUD, 公开分享/收藏 | 需登录 |
| 收藏 | `/api/bookmarks` | 收藏夹 CRUD, 收藏/取消 | 需登录 |
| 标签 | `/api/tags` | 列表/创建/删除 | 需登录 |
| 等级 | `/api/levels` | 我的等级, 分区访问检查, 管理配置 | 需登录 |
| 管理 | `/api/admin` | 用户管理, 禁言, 批量删除, 统计数据 | 管理员 |
| 举报 | `/api/reports` | 提交举报, 管理处理 | 混合 |
| 广告 | `/api/ads` | 获取广告, 管理 CRUD | 混合 |
| 登录公告 | `/api/login-notices` | 获取未读, 管理 CRUD | 混合 |
| 求职 | `/api/applications` | 身份申请, 管理员审核 | 混合 |
| 文件 | `/api/file` | 权限控制文件访问 | 需登录 |
| 上传 | `/api/upload` | 通用/附件上传 | 需登录 |
| 设置 | `/api/settings` | 声音上传/音量 | 管理员 |

### 响应规范

- 成功：`{ message, ...data }` 或 `{ items, pagination: { page, total, hasMore } }`
- 失败：`{ error: "描述" }`，HTTP 状态码 400/401/403/404/409/500
- 列表接口统一返回 `pagination` 对象

---

## 6. 前端架构

### 模块加载顺序

```
1. utils.js            — toast, escapeHtml, confirm, prompt, 裁剪, 音频
2. api.js              — 70+ API 方法，统一 fetch 封装
3. music.js            — 音乐播放器（首次 innerHTML，后续局部 DOM 更新）
4. components/shared.js — 共享工具 + 等级缓存
5. components/index.js  — Object.assign 聚合 15 个组件
6. components/*.js      — 各页面渲染
7. router.js            — 哈希路由
8. app.js               — 初始化/认证/导航/通知轮询
```

### 全局对象

| 对象 | 职责 |
|------|------|
| `App` | 用户状态、导航渲染、通知轮询、禁言横幅 |
| `Components` | 所有页面渲染方法（通过 Object.assign 合并） |
| `Router` | 哈希路由匹配 → 调用 Components 方法 |
| `API` | HTTP 请求封装，credentials: 'include' |
| `MusicPlayer` | 播放器状态、播放队列、底部播放栏 UI |

### DOM 更新策略

- **局部更新优先**：编辑歌名 → `textContent`；删除歌曲 → `row.remove()`；换封面 → `img.src`
- **全量渲染**仅用于：列表排序/筛选变化、跨页面导航、新数据需要服务端 ID

### CSS 架构

- CSS 变量系统（`--bg`, `--text`, `--primary` 等）
- 20 个组件化文件（`admin.css`, `music.css`, `posts-detail.css` 等）
- 响应式 4 断点（900/768/600/480px）
- 终端主题可选切换

---

## 7. 安全策略

| 机制 | 实现 |
|------|------|
| 会话安全 | 自定义 cookie 名 `portfolio_sid`；httpOnly + sameSite:lax；登录时 regenerate 防 fixation；单设备登录（destroyByUserId） |
| 密码 | bcrypt 10 rounds；6-128 位必须含字母+数字 |
| CSRF | Origin/Referer 头验证（POST/PUT/DELETE/PATCH） |
| XSS | 前端 `escapeHtml()` 包裹所有用户输入；上传禁止 .html/.js 文件 |
| 限流 | 登录 10次/分钟，API 100次/分钟 |
| 文件上传 | MIME + 扩展名双重白名单；UUID 文件名防碰撞；路径遍历防护 |
| 安全头 | helmet（CSP 关闭以兼容 SPA） |
| 密钥 | SESSION_SECRET 无默认值，未设置则拒绝启动 |

---

## 8. XP 等级系统

| 操作 | XP |
|------|-----|
| 发帖 | +20 |
| 评论 | +10 |
| 收到点赞 | +2 |
| 帖子加精 | +50 |
| 收到回复 | +5 |

20 个等级，XP 阈值从 Lv.1(0) 到 Lv.20(40,000)。等级配置含名称、图标、背景图、可访问分区列表。管理员可动态配置。

---

## 9. 近期架构优化（2026-05）

| 优化项 | 说明 |
|--------|------|
| **数据库替换** | sql.js → better-sqlite3，去掉内存序列化/定时保存，WAL 实时写盘 |
| **addXP 抽离** | 从 `db/init.js` 移至 `services/LevelService.js`，db 层回归纯基础设施 |
| **迁移版本化** | 20 个迁移块 + `schema_version` 追踪，幂等执行 |
| **动态 require 清理** | 30 个文件中 45+ 处函数体内 `require()` 全部提至文件顶部 |
| **requireAuthorOrAdmin** | 新增中间件，消除 posts PUT/DELETE 重复权限检查 |
| **音乐库重构** | 200 行巨型函数 → 8 个独立函数，编辑/删除/改封面改为局部 DOM 更新 |
| **播放器优化** | `_renderPlayer()` 首次 innerHTML，后续只更新歌名/封面/按钮 |
| **系统概览重写** | 10 次 DB 查询 → 2 次 GROUP BY；前端 4 分区展示 + 今日新增数据 |
| **安全加固** | SESSION_SECRET 强制设置；XP 不再写入 session；Cookie secure 标记 |
| **CONVENTIONS.md** | 11 类编码规范 + 全部模块清单，每次 AI prompt 引用 |
| **`/audit` 技能** | 5 类自动检查：动态 require / Route DB 直接访问 / XSS / N+1 / CONVENTIONS 合规 |

---

## 10. 已知权衡与待改进

### 有意为之的权衡

| 决策 | 理由 | 代价 |
|------|------|------|
| Vanilla JS 无框架 | AI 生成代码可靠性高，零构建 | 无组件化、无虚拟 DOM、全局变量 |
| better-sqlite3 同步 API | 简单直接，与旧 sql.js API 兼容 | 并发请求串行化（目前单用户无影响） |
| 手写 CSS 无 Tailwind | CSS 变量体系已成熟，AI 生成短类名更可靠 | 无 tree-shaking、无 JIT |
| ES5 兼容、无构建工具 | 零配置，即改即刷新 | 无模块化、无 minify、无 TypeScript |
| 路由层直接引用 db 查询辅助 | 简单路由不值得建 service 层 | 违反严格分层，19 个 route 文件直接 import db/init |

### 客观不足

| 问题 | 严重度 |
|------|--------|
| 零测试（无单元测试、无集成测试） | 高 |
| 前端路由 30+ 分支 if-else 链 | 中 |
| `app.js` 的 `updateNav()` 150 行做 5 件事 | 中 |
| 无 CI/CD、无 linting、无代码格式化 | 低 |
| CSS 可能有僵尸类（未使用但保留的样式规则） | 低 |
| 单进程、无集群、无 Docker | 低（目前单用户场景无关） |

---

## 11. 快速启动

```bash
cp .env.example .env    # 编辑 SESSION_SECRET 为随机字符串
npm install
npm start               # http://localhost:3000
```

默认管理员：`admin` / `admin123`

---

## 12. 文档索引

| 文件 | 内容 |
|------|------|
| `README.md` | 项目入口说明 |
| `CONVENTIONS.md` | 编码规范（AI 辅助开发必读） |
| `AI_PROMPT.md` | AI 复刻项目的完整上下文 |
| `docs/architecture.md` | 详细架构文档 |
| `docs/api-reference.md` | 全部 API 端点及参数 |
| `docs/user-guide.md` | 功能使用指南 |
| `docs/CHANGELOG.md` | 版本历史 |
| `.reasonix/skills/audit.md` | 一键代码审计技能 |
