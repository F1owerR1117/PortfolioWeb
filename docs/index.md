# Portfolio 作品集网站 — 文档

## 项目概述

基于 **Node.js + Express + SQL.js (SQLite in-memory)** 的全栈单页面应用（SPA），
集作品展示、博客文章、社交互动、音乐播放于一体的个人作品集管理系统。

- **启动**: `npm start` → 访问 `http://localhost:3000`
- **默认管理员**: `admin` / `admin123`

## 文档目录

| 文档 | 说明 |
|------|------|
| [架构文档](architecture.md) | 系统架构、技术栈、数据流、目录结构 |
| [API 参考](api-reference.md) | 全部后端 API 端点及参数说明 |
| [用户指南](user-guide.md) | 功能使用说明和操作指南 |
| [更新日志](CHANGELOG.md) | 版本历史与变更记录 |

## 快速入门

```bash
cp .env.example .env   # 配置环境变量（仅首次）
npm install            # 安装依赖（仅首次）
npm start              # 启动开发服务器
```

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端框架 | Express 4.21 |
| 数据库 | sql.js 1.10 (SQLite WASM, 同步 API) |
| 会话管理 | express-session + 自定义 SQLite 存储 |
| 认证 | bcryptjs 密码哈希 + session |
| 文件上传 | multer 1.4 (50MB 限制) |
| 安全 | helmet + express-rate-limit |
| 日志 | winston (console + 文件双输出) |
| 前端 | 原生 JS SPA (无框架) |
| 富文本 | Cropper.js 图片裁剪 |
| 代码高亮 | highlight.js (动态加载) |

## 核心功能

- **作品/帖子管理**: 发布、编辑、置顶、精华、锁定
- **附件系统**: 等级锁定、积分解锁/下载、替换/删除
- **评论系统**: 嵌套回复、编辑、删除
- **用户系统**: 注册、登录、头像、个人信息、等级
- **好友系统**: 添加好友、在线状态、私信
- **音乐播放器**: 歌曲上传、播放列表、公开分享
- **收藏夹**: 收藏帖子、管理收藏夹
- **举报系统**: 举报用户/帖子、管理员处理
- **通知系统**: 实时通知、未读计数
- **等级系统**: XP 经验值、等级权限、分区访问
- **广告系统**: 左右侧广告栏、动态宽度、管理员管理
- **登录公告**: 弹窗通知、图文展示
- **管理面板**: 用户管理、禁言、批量删除、数据统计

## 文件结构

```
server.js              # Express 入口 + 会话存储
config.js              # 统一配置管理（从 .env 读取）
logger.js              # Winston 日志系统
db/init.js             # sql.js 初始化 + 表结构
middleware/
  auth.js              # 认证中间件
  upload.js            # 文件上传配置
  zoneAccess.js        # 分区访问控制
  errorHandler.js      # 全局错误处理
  requestLogger.js     # API 请求日志
models/                # 数据访问层
  User.js / Post.js / Comment.js / Notification.js / File.js
services/              # 业务逻辑层
  AuthService.js / PostService.js / NotificationService.js
  FileService.js / LoginNoticeService.js
routes/                # 20 个路由文件
  auth.js, posts.js, comments.js, notifications.js, ...
  friends.js, music.js, bookmarks.js, reports.js, ...
  admin.js, levels.js, tags.js, reactions.js, ...
  ads.js, loginNotices.js, site.js, settings.js, ...
public/
  index.html           # SPA 入口
  css/style.css        # 完整样式 (亮/暗主题)
  js/
    utils.js           # 工具函数
    api.js             # API 请求封装
    music.js           # 音乐播放器
    components/        # 拆分后的组件（14个文件）
      shared.js        # 共享工具方法
      auth.js / postList.js / postDetail.js / postEditor.js
      profile.js / notifications.js / bookmarks.js
      musicLibrary.js / friends.js / chat.js / admin.js
      ads.js / index.js
    router.js          # 前端路由
    app.js             # 应用初始化
logs/                  # 日志文件目录
  combined.log         # 全部日志
  error.log            # 仅错误日志
docs/
  index.md             # 本文档索引
  architecture.md      # 架构文档
  api-reference.md     # API 参考
  user-guide.md        # 用户指南
  CHANGELOG.md         # 更新日志
scripts/
  snapshot.sh          # 快照备份
  rollback.sh          # 回滚脚本
```
	