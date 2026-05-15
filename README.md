# 📂 个人作品集网站

基于 Node.js + Express + SQLite 的个人作品集管理系统，支持管理员发布作品和普通用户浏览。

## 功能特性

- **用户系统**：注册/登录，支持普通用户和管理员两种身份
- **作品管理**（管理员）：发布、编辑、删除作品，支持多类型内容块
- **内容块**：文本、图片、视频、代码，支持拖拽排序和预览权限控制
- **文件上传**：图片/视频/代码文件上传，权限校验的文件访问
- **声音管理**：自定义按钮提示音，音量调节
- **响应式设计**：适配手机/平板/桌面

## 环境变量配置

复制 `.env.example` 为 `.env` 并修改配置：

```bash
cp .env.example .env
```

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `ADMIN_SECRET` | 管理员注册秘钥 | `AdminKey123` |
| `SESSION_SECRET` | Session 密钥 | 修改为随机字符串 |
| `PORT` | 服务端口 | `3000` |
| `DB_PATH` | 数据库路径 | `./database.db` |

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
├── server.js              # 服务入口
├── .env.example           # 环境变量示例
├── package.json
├── db/
│   └── init.js            # 数据库初始化
├── middleware/
│   ├── auth.js            # 认证中间件
│   └── upload.js          # 文件上传中间件 (multer)
├── routes/
│   ├── auth.js            # 认证路由
│   ├── posts.js           # 作品路由
│   ├── file.js            # 文件访问路由
│   ├── settings.js        # 设置路由
│   └── upload.js          # 上传路由
├── uploads/               # 上传文件存储
│   └── sounds/            # 提示音文件
└── public/
    ├── index.html          # SPA 入口
    ├── css/
    │   └── style.css       # 样式文件
    └── js/
        ├── app.js          # 主应用
        ├── api.js          # API 请求封装
        ├── components.js   # 视图渲染组件
        ├── router.js       # 前端路由
        └── utils.js        # 工具函数
```

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/register` | 注册 |
| POST | `/api/auth/login` | 登录 |
| POST | `/api/auth/logout` | 退出 |
| GET | `/api/auth/me` | 获取当前用户 |
| GET | `/api/posts` | 作品列表（分页） |
| GET | `/api/posts/:id` | 作品详情 |
| POST | `/api/posts` | 创建作品（管理员） |
| PUT | `/api/posts/:id` | 更新作品（管理员） |
| DELETE | `/api/posts/:id` | 删除作品（管理员） |
| POST | `/api/upload` | 文件上传（管理员） |
| GET | `/api/file/:fileId` | 文件访问（权限校验） |
| GET | `/api/settings/sound` | 获取声音设置 |
| PUT | `/api/settings/sound` | 更新音量（管理员） |
| POST | `/api/settings/sound/upload` | 上传提示音（管理员） |
| GET | `/api/site/about` | 获取关于页面信息 |
| PUT | `/api/site/about` | 更新关于页面信息（管理员） |
| GET | `/api/posts/:postId/comments` | 获取评论列表 |
| POST | `/api/posts/:postId/comments` | 发布评论 |
| PUT | `/api/comments/:id` | 编辑评论（作者或管理员） |
| DELETE | `/api/comments/:id` | 删除评论（作者或管理员） |
| GET | `/api/notifications` | 获取通知列表 |
| GET | `/api/notifications/unread-count` | 获取未读通知数 |
| PUT | `/api/notifications/:id/read` | 标记通知已读 |
| PUT | `/api/notifications/read-all` | 全部标记已读 |

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
