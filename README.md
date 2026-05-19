# 📂 个人作品集网站

基于 Node.js + Express + better-sqlite3 (SQLite) 的全栈个人作品集管理系统。

## 功能特性

- **用户系统**：注册/登录，管理员/普通用户，等级和积分
- **作品管理**：发布/编辑/删除帖子，多类型内容块（文本/图片/视频/代码/附件）
- **附件系统**：等级锁定、积分解锁、积分下载三级权限控制
- **评论系统**：嵌套回复、编辑/删除
- **好友/私信**：好友申请、在线状态、即时消息
- **音乐播放器**：上传歌曲、创建歌单、公开分享、底部播放栏
- **收藏夹**：创建收藏夹、收藏帖子
- **举报系统**：举报帖子/用户、管理员处理
- **等级系统**：XP 经验值、等级分区权限
- **管理面板**：用户管理、禁言、数据统计、等级配置
- **响应式设计**：适配手机/平板/桌面，暗色主题

## 环境变量配置

复制 `.env.example` 为 `.env` 并修改配置：

```bash
cp .env.example .env
```

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `SESSION_SECRET` | Session 密钥（⚠️ 必须修改） | 无默认值，未设置则拒绝启动 |
| `ADMIN_SECRET` | 管理员注册秘钥 | `AdminKey123` |
| `PORT` | 服务端口 | `3000` |
| `DB_PATH` | 数据库路径 | `./database.db` |
| `ALLOW_NEW_DB` | 允许创建新数据库 | 未设置则数据库不存在时拒绝启动 |

## 安装与启动

```bash
# 安装依赖
npm install

# 启动服务
npm start
```

访问 `http://localhost:3000`

## 默认管理员账号

- 用户名：`admin`
- 密码：`admin123`

> ⚠️ 首次启动时自动创建此账号，同时创建 2 个演示帖子以供测试。

## 测试账号

可在登录页面注册：
- **普通用户**：直接注册，无需秘钥
- **管理员**：勾选"注册为管理员"，需输入 `ADMIN_SECRET` 秘钥

## 项目结构

```
├── server.js              # Express 入口 + session 存储
├── config.js              # 统一配置管理
├── CONVENTIONS.md         # 编码规范（AI 辅助开发必读）
├── db/
│   ├── init.js            # better-sqlite3 初始化 + 查询辅助
│   ├── schema.js          # CREATE TABLE 语句
│   ├── migrations.js      # 版本化迁移 (v1-v20)
│   └── seeds.js           # 种子数据
├── middleware/
│   ├── auth.js            # 认证中间件 (含 requireAuthorOrAdmin)
│   ├── upload.js          # 文件上传 (multer)
│   ├── zoneAccess.js      # 分区访问控制
│   └── errorHandler.js    # 全局错误处理
├── services/
│   ├── AuthService.js     # 认证业务
│   ├── PostService.js     # 帖子业务
│   └── LevelService.js    # XP/升级/积分
├── routes/                # 20 个路由文件
├── public/
│   ├── index.html         # SPA 入口
│   ├── css/               # 20+ 组件化样式文件
│   └── js/
│       ├── app.js         # 主应用
│       ├── api.js         # API 封装
│       ├── router.js      # 哈希路由
│       ├── music.js       # 音乐播放器
│       ├── utils.js       # 工具函数
│       └── components/    # 15 个页面组件
```

## API 接口（精简）

完整文档见 [`docs/api-reference.md`](docs/api-reference.md)。

| 模块 | 路由前缀 | 主要端点 |
|------|---------|---------|
| 认证 | `/api/auth` | register, login, logout, me, password, profile |
| 帖子 | `/api/posts` | CRUD、置顶/精华、附件购买/下载 |
| 评论 | `/api/posts/:id/comments` | 列表、创建、编辑、删除 |
| 好友 | `/api` | 好友请求、好友列表、私信 |
| 音乐 | `/api/music` | 上传、歌单、公开分享、收藏 |
| 管理 | `/api/admin` | 用户管理、禁言、批量删除、数据统计 |
| 等级 | `/api/levels` | 等级信息、配置、分区访问 |
| 其他 | `/api` | 通知、标签、收藏、举报、广告、公告 |

## 内网穿透临时部署

使用 ngrok 将本地服务暴露到公网：

```bash
# 启动本地服务
npm start

# 另开终端，启动 ngrok
ngrok http 3000
```

访问 ngrok 提供的 URL 即可公网访问。注意免费版 ngrok 每次重启 URL 会变化。

## License

MIT
