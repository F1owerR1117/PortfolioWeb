# Portfolio — 个人作品集网站

基于 Node.js + Express + SQL.js (SQLite in-memory) 的 SPA 个人作品集管理系统。

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
db/init.js             # sql.js 初始化 + 表结构 + 迁移 + XP 系统
middleware/
  auth.js              # requireAuth / requireAdmin / requireNotBanned
  upload.js            # multer 配置（通用上传/声音上传）
  zoneAccess.js        # 基于等级的分区访问控制
routes/                # 18 个路由文件，按功能拆分
  auth.js / posts.js / comments.js / notifications.js / ...
  music.js / bookmarks.js / reports.js / levels.js / ...
public/
  index.html           # SPA 入口
  css/style.css        # 完整样式（亮/暗主题、响应式）
  js/                  # 6 个前端 JS 模块
    utils.js           # 工具函数: Toast/音频/裁剪/模态框/格式化
    api.js             # 统一 fetch 封装，所有 API 方法
    music.js           # 底部音乐播放器模块
    components.js      # 所有页面渲染组件（~1800行）
    router.js          # 前端哈希路由
    app.js             # 主应用初始化/导航/主题/轮询
```

## 技术要点

### 数据库 (sql.js)
- 在内存中运行，每 2 秒持久化到 `database.db`
- `run(sql, params)` / `get(sql, params)` / `all(sql, params)` 同步查询
- 所有 ALTER TABLE 迁移使用 try-catch 包裹避免重复执行
- 种子数据仅在表为空时写入

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
- `App.updateNav()` 在每次页面切换后刷新导航栏

### 后端 API 前缀
| 路由文件 | 挂载点 | 示例 |
|---------|--------|------|
| authRoutes | `/api/auth` | POST `/api/auth/login` |
| postsRoutes | `/api/posts` | GET `/api/posts?category=work` |
| musicRoutes | `/api` | POST `/api/music/upload` |
| bookmarksRoutes | `/api` | GET `/api/bookmarks/collections` |
| levelsRoutes | `/api` | GET `/api/zone-access/:zone` |

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
- 全局错误处理: `server.js` 的 Express error handler

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
