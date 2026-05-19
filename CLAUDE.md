# Portfolio — 个人作品集网站

基于 Node.js + Express + better-sqlite3 (SQLite) 的 SPA 个人作品集管理系统。

## 启动

```bash
cp .env.example .env   # 仅首次
npm install            # 仅首次
npm start              # 启动，访问 http://localhost:3000
```

默认管理员: `admin` / `admin123`

## 架构

```
server.js              # Express 入口 + SQLite Session Store
config.js              # 统一配置管理（从 .env 读取）
logger.js              # Winston 日志系统（console + 文件双输出）
db/init.js             # better-sqlite3 初始化 + 查询辅助函数
db/schema.js           # CREATE TABLE 语句
db/migrations.js       # 版本化迁移 (v1-v20)
db/seeds.js            # 种子数据
middleware/
  auth.js              # requireAuth / requireAdmin / requireNotBanned
  upload.js            # multer 配置（通用上传/声音上传）
  zoneAccess.js        # 基于等级的分区访问控制
  errorHandler.js      # 全局错误处理中间件 + AppError 类
  requestLogger.js     # API 请求日志中间件
models/                # 数据访问层（封装 SQL 查询）
  User.js / Post.js / Comment.js / Notification.js / File.js
services/              # 业务逻辑层（封装复杂业务）
  AuthService.js       # 注册、登录、修改密码
  PostService.js       # 帖子 CRUD、内容块管理（含附件购买）
  LevelService.js      # XP/升级/积分（从 db/init 独立）
  NotificationService.js / FileService.js / LoginNoticeService.js
routes/                # 20 个路由文件，按功能拆分
  auth.js / posts.js / comments.js / notifications.js / ...
  music.js / bookmarks.js / reports.js / levels.js / ...
  ads.js / loginNotices.js / site.js / settings.js / ...
public/
  index.html           # SPA 入口
  css/style.css        # 完整样式（亮/暗主题、响应式）
  js/                  # 前端模块
    utils.js           # 工具函数: Toast/音频/裁剪/模态框/格式化
    api.js             # 统一 fetch 封装，所有 API 方法
    music.js           # 底部音乐播放器模块
    components/        # 拆分后的组件（14个文件）
      shared.js        # 共享工具方法
      auth.js / postList.js / postDetail.js / postEditor.js
      profile.js / notifications.js / bookmarks.js
      musicLibrary.js / friends.js / chat.js / admin.js
      ads.js           # 左右侧广告栏组件
      index.js         # 聚合所有子模块
    router.js          # 前端哈希路由
    app.js             # 主应用初始化/导航/主题/轮询
logs/                  # 日志文件目录
  combined.log         # 全部日志
  error.log            # 仅错误日志
docs/                  # 文档目录
  index.md / architecture.md / api-reference.md / user-guide.md
scripts/               # 工具脚本
  snapshot.sh / rollback.sh
```

## 技术要点

### 数据库 (better-sqlite3)
- 原生 C 扩展，WAL 模式实时写盘，零数据丢失
- `run(sql, params)` / `get(sql, params)` / `getFirst(sql, params)` / `all(sql, params)` 同步查询
- 迁移使用 `schema_version` 版本追踪，仅执行未运行块，ALTER TABLE 幂等
- 种子数据仅在表为空时写入
- XP/升级逻辑在 `services/LevelService.js`

### 路由挂载规则
```js
app.use('/api/auth', authRoutes);     // 前缀挂载
app.use('/api', commentsRoutes);       // 裸挂载，路由路径包含 /comments/...
```
- 前缀挂载的路径不包含前缀；裸挂载的路径需包含完整路径
- 通用路由 (`app.use('/api', ...)`) 按顺序匹配，无匹配则跳过

### 前端 SPA
- 哈希路由 (`#/works`, `#/posts/123`, `#/chat/456?comment=789`)
- `Components` 对象包含所有页面渲染方法（renderXxx）
- `Router._handlePath()` 在每次路由切换时清理定时器
- `App.updateNav()` 在每次页面切换后刷新导航栏，构建侧边菜单

### 侧边菜单
- 登录后动态创建，含 5 个核心项（作品区、聊天区、音乐、收藏夹、公告）
- 管理员额外显示折叠的"后台管理"入口，内含 7 个管理子项
- 点击 `▶` 箭头展开/收起，导航到管理页面时自动展开
- 分区锁定状态通过 `_checkZoneLocks()` 异步检测

### 后端 API 前缀
| 路由文件 | 挂载点 | 示例 |
|---------|--------|------|
| authRoutes | `/api/auth` | POST `/api/auth/login` |
| postsRoutes | `/api/posts` | GET `/api/posts?category=work` |
| musicRoutes | `/api` | POST `/api/music/upload` |
| bookmarksRoutes | `/api` | GET `/api/bookmarks/collections` |
| levelsRoutes | `/api` | GET `/api/zone-access/:zone` |
| adsRoutes | `/api` | GET `/api/ads` |
| loginNoticesRoutes | `/api` | GET `/api/login-notices` |

### 附件系统
内容块支持附件文件，三级权限控制:
1. **等级锁定** (`min_level_view`): 低于等级不可查看
2. **积分解锁** (`unlock_points`): 支付积分解锁查看
3. **积分下载** (`download_points`): 支付积分获得下载权限

购买记录写 `attachment_purchases` 表。编辑帖子时支持替换/删除附件，旧文件自动清理。

### 标签迁移
post_tags 迁移仅在首次运行时执行（通过 settings 表 `tag_migration_done` 标记 + `post_tags` 表为空双重检测）

## 代码规范

### 前端 JS 风格
- 使用 `var` 而非 `const/let`（全项目统一）
- 事件监听使用 `addEventListener`，部分使用 `onclick` 赋值
- 所有 API 请求通过 `API.request()` 方法（基于 fetch）
- 模态框使用 `showConfirm()` / `showPrompt()` / `openCropModal()`
- 通知使用 `showToast(message, type, duration)`

### 后端 JS 风格
- Express 路由使用 `router.get/post/put/patch/delete`
- 所有路由函数包裹在 try-catch 中
- 中间件链: `requireAuth` → `requireAdmin` / `requireNotBanned`
- 文件上传使用 multer，自定义 fileFilter

### 错误处理
- 后端: 所有路由 catch 块返回 `res.status(500).json({ error })`
- 前端: API 请求失败抛 `Error(data.error)`，组件 catch 显示 toast
- 全局错误处理: `middleware/errorHandler.js` 的 Express error handler
- 日志: 使用 `logger.error/info/warn` 替代 `console.log`，输出到控制台和文件

## 常见操作

### 添加新路由
1. 在 `routes/` 创建文件，exports router
2. 在 `server.js` require 并 app.use 挂载
3. 在 `public/js/api.js` 添加对应 API 方法

### 添加新页面
1. 在 `Components` 添加 renderXxx 方法
2. 在 `Router._handlePath()` 添加路由分支
3. 可选: 在导航栏/侧边菜单添加入口

## 重启服务器

修改后需重启:
```bash
# 先查杀旧进程再启动
netstat -ano | grep ":3000 " | grep LISTEN | awk '{print $5}' | while read p; do wmic process where processid=$p delete > /dev/null 2>&1; done
node server.js
```

## 快照备份与回滚

项目自带 git 版本控制，使用快照机制防止代码丢失。

### 创建快照（在操作前执行）

```bash
# 方式 1: 双击 snapshot.bat (Windows)
# 方式 2: 命令行
bash scripts/snapshot.sh
bash scripts/snapshot.sh "可选的备注信息"
```

每次创建快照会自动提交所有变更，生成一个可追溯的历史版本。

### 回滚到之前的版本

```bash
# 交互模式
bash scripts/rollback.sh

# 查看所有快照
bash scripts/rollback.sh list

# 回滚到指定版本
bash scripts/rollback.sh <commit-hash>
```

支持三种回滚方式:
- **硬回滚**: 完全恢复到快照状态（会丢失未提交变更）
- **软回滚**: 保留当前变更，可重新整理后再次提交
- **单文件恢复**: 只恢复指定文件到快照版本

### 建议工作流

1. 每次让我修改代码前，先运行 `bash scripts/snapshot.sh "修改前的状态"`
2. 修改完成后，再运行一次 `bash scripts/snapshot.sh "本次修改内容"`
3. 如果修改有问题，用 `bash scripts/rollback.sh` 回滚到步骤 1 的快照
