# API 参考文档

所有 API 端点均挂载在 `/api` 下。认证通过 Cookie Session 实现（`credentials: 'include'`）。

## 目录

- [认证 Auth](#认证-auth)
- [帖子 Posts](#帖子-posts)
- [评论 Comments](#评论-comments)
- [用户 Users](#用户-users)
- [好友 Friends](#好友-friends)
- [消息 Messages](#消息-messages)
- [通知 Notifications](#通知-notifications)
- [文件 Files](#文件-files)
- [上传 Upload](#上传-upload)
- [标签 Tags](#标签-tags)
- [收藏 Bookmarks](#收藏-bookmarks)
- [音乐 Music](#音乐-music)
- [举报 Reports](#举报-reports)
- [等级 Levels](#等级-levels)
- [管理 Admin](#管理-admin)
- [站点 Site](#站点-site)
- [设置 Settings](#设置-settings)
- [反应 Reactions](#反应-reactions)

---

## 认证 Auth

挂载: `/api/auth`

**速率限制**: 10 次/分钟/IP

### POST /api/auth/register
注册新用户。

```json
{ "username": "string", "password": "string", "role": "user|admin", "adminSecret": "string(可选)" }
```
- 用户名: 3-20 个字符
- 密码: 6-128 位，必须包含字母和数字
- `role=admin` 需提供 `adminSecret` 匹配 `.env` 中的 `ADMIN_SECRET`
- 响应: `{ "message": "注册成功", "user": { id, username, role } }`
- 注册成功后自动登录，生成新 session

### POST /api/auth/login
登录。

```json
{ "username": "string", "password": "string" }
```
- 登录前销毁该用户的所有旧会话（单会话强制执行）
- 生成新 session ID（防止会话固定攻击）
- 响应: `{ "message": "登录成功", "user": { id, username, role } }`

### POST /api/auth/logout
登出，销毁当前会话。

### GET /api/auth/me
获取当前登录用户信息。

```
响应: {
  user: { id, username, role, level, xp, points, is_banned, banned_until, ban_reason }
}
```

### PUT /api/auth/password
修改密码。

```json
{ "currentPassword": "string", "newPassword": "string" }
```
- 新密码: 6-128 位，必须包含字母和数字

### GET /api/auth/profile
获取当前用户的个人资料（含昵称、简介、头像、社交链接、技能）。

### PUT /api/auth/profile
更新当前用户的个人资料。

```json
{ "nickname": "string", "bio": "string", "avatar_url": "string", "social": {}, "skills": [] }
```
- 昵称: 最多 50 个字符
- 简介: 最多 500 个字符
- avatar_url: 必须以 `/api/file/avatar/` 开头，不含 `..` 或 `\`

---

## 帖子 Posts

挂载: `/api/posts`

### GET /api/posts
获取帖子列表（分页）。

| 参数 | 类型 | 说明 |
|------|------|------|
| page | int | 页码，默认 1 |
| limit | int | 每页数量，默认 9，最大 50 |
| category | string | 分类筛选: `work` 或 `chat` |

### GET /api/posts/:id
获取单个帖子详情。

- 自动增加浏览计数（防重复）
- 返回内容包括帖子和关联的 `content_blocks`
- 普通用户仅能看到 `allow_preview=1` 的内容块
- 管理员可看到所有内容块

### POST /api/posts
创建帖子。

```json
{
  "title": "string",
  "description": "string(可选)",
  "cover_url": "string(可选)",
  "cover_file_id": "int(可选)",
  "tags": "string(可选，逗号分隔)",
  "category": "work|chat",
  "blocks": [{ "type": "text|image|video|code", "value": "string", "file_id": "int", "allow_preview": bool }]
}
```
- `category=work` 仅管理员可发布
- `category=chat` 所有已登录用户可发布

### PUT /api/posts/:id
更新帖子（管理员）。

```json
{ "title": "...", "description": "...", "tags": "...", "blocks": [...], "deleted_block_ids": [...] }
```

### DELETE /api/posts/:id
软删除帖子（管理员）。

### PATCH /api/posts/:id/lock
切换帖子锁定状态（管理员）。

```json
{ "isLocked": true|false }
```
- 锁定后用户无法添加新评论

### PATCH /api/posts/:id/status
设置帖子置顶/精华状态（管理员）。

```json
{ "sticky": true|false, "featured": true|false }
```

---

## 评论 Comments

挂载: `/api/posts/:postId/comments` 和 `/api/comments`

### GET /api/posts/:postId/comments
获取帖子的所有评论（嵌套结构）。

### POST /api/posts/:postId/comments
发表评论或回复。

```json
{ "content": "string", "parent_id": "int(可选，回复时指定父评论ID)" }
```

### PUT /api/comments/:id
编辑评论。

```json
{ "content": "string" }
```

### DELETE /api/comments/:id
删除评论（递归删除子评论）。

---

## 用户 Users

挂载: `/api/users`

### GET /api/users/:id/profile
获取指定用户的公开资料。

### GET /api/users/:id/posts
获取指定用户发布的帖子（分页）。

### GET /api/users/:id/public-playlists
获取指定用户的公开播放列表。

### GET /api/users/search
搜索用户。

| 参数 | 说明 |
|------|------|
| q | 关键词匹配用户名或昵称 |

---

## 好友 Friends

### POST /api/friend-request
发送好友请求。

```json
{ "to_user_id": "int" }
```

### GET /api/friend-requests
获取收到的好友请求列表。

### GET /api/friend-requests/count
获取未处理的好友请求数量。

### POST /api/friend-request/:id/approve
批准好友请求。

### POST /api/friend-request/:id/reject
拒绝好友请求。

### GET /api/friends
获取好友列表。

### DELETE /api/friends/:id
删除好友。

### GET /api/friendship-status/:userId
获取与指定用户的好友状态。

```
响应: { "status": "none" | "request_sent" | "request_received" | "friends" }
```

### GET /api/friends/online
获取好友在线状态。

---

## 消息 Messages

### GET /api/messages/:friendId
获取与指定好友的聊天记录。

### POST /api/messages
发送私信。

```json
{ "to_user_id": "int", "content": "string" }
```

### GET /api/messages/unread/count
获取未读消息数量。

---

## 通知 Notifications

挂载: `/api/notifications`

### GET /api/notifications
获取通知列表（最近 50 条，未读优先）。

### GET /api/notifications/unread-count
获取未读通知数量。

### PUT /api/notifications/:id/read
标记单条通知为已读。

### PUT /api/notifications/read-all
标记所有通知为已读。

---

## 文件 Files

挂载: `/api/file`

### GET /api/file/:id
获取文件内容。
- 权限控制: 管理员可访问任何文件；普通用户仅限访问已授权文件
- 图片/视频直接返回二进制内容
- 代码文件返回 JSON `{ "content": "...", "mime_type": "..." }`

### GET /api/file/avatar/:filename
获取头像文件。

### GET /api/file/sound/click.mp3
获取自定义点击音效。

---

## 上传 Upload

挂载: `/api/upload`

### POST /api/upload
上传文件。

| 参数 | 说明 |
|------|------|
| file | 文件，multipart/form-data |

支持的格式:
- 图片: jpg/png/gif/webp (最大 5MB)
- 视频: mp4 (最大 50MB)
- 代码: txt/py/css/json (最大 1MB)
- **注意**: .html 和 .js 文件已被禁止上传（防止 XSS 攻击）

### POST /api/user/avatar
上传头像。

| 参数 | 说明 |
|------|------|
| avatar | 头像图片，multipart/form-data |

---

## 标签 Tags

挂载: `/api/tags`

### GET /api/tags
获取标签列表。

| 参数 | 说明 |
|------|------|
| category | 分类筛选（可选） |

### POST /api/tags
创建标签（管理员）。

```json
{ "name": "string" }
```

### DELETE /api/tags/:id
删除标签（管理员）。

---

## 收藏 Bookmarks

挂载: `/api/bookmarks`

### GET /api/bookmarks/collections
获取当前用户的所有收藏夹。

### POST /api/bookmarks/collections
创建收藏夹。

```json
{ "name": "string" }
```

### DELETE /api/bookmarks/collections/:id
删除收藏夹（同时删除其中的收藏记录）。

### GET /api/bookmarks
获取收藏的帖子列表。

| 参数 | 说明 |
|------|------|
| collection_id | 收藏夹 ID |
| page | 页码 |
| limit | 每页数量 |

### POST /api/bookmarks
切换帖子收藏状态。

```json
{ "post_id": "int", "collection_id": "int" }
```
- 若已收藏则取消收藏，未收藏则添加收藏

### DELETE /api/bookmarks/:id
删除单个收藏记录。

### DELETE /api/bookmarks/batch
批量删除收藏记录。

```json
{ "ids": [int, ...] }
```
- 仅删除当前用户拥有的收藏

### GET /api/bookmarks/check/:postId
检查帖子已被收藏到哪些收藏夹。

---

## 音乐 Music

挂载: `/api/music`

### POST /api/music/upload
上传歌曲（管理员）。

| 参数 | 说明 |
|------|------|
| song | 音频文件，multipart/form-data |
| name | 歌曲名称 |
| artist | 艺术家（可选） |

支持格式: mp3/wav/ogg (最大 500KB)

### GET /api/music/songs
获取当前用户的歌曲列表。

| 参数 | 说明 |
|------|------|
| search | 搜索关键词 |

### PUT /api/music/songs/:id
更新歌曲信息。

```json
{ "name": "string", "artist": "string", "cover_url": "string" }
```

### DELETE /api/music/songs/:id
删除歌曲。

### GET /api/music/songs/:id/stream
流式播放歌曲（支持 Range 请求头，实现进度拖动）。

### POST /api/music/upload-cover
上传音乐封面图片。

### GET /api/music/playlists
获取当前用户的播放列表。

### POST /api/music/playlists
创建播放列表。

```json
{ "name": "string" }
```

### PUT /api/music/playlists/:id
更新播放列表信息。

```json
{ "name": "string", "cover_url": "string" }
```

### DELETE /api/music/playlists/:id
删除播放列表。

### GET /api/music/playlists/:id
获取播放列表详情（含歌曲列表）。

### POST /api/music/playlists/:id/songs
向播放列表添加歌曲。

```json
{ "song_ids": [int, ...] }  // 批量添加
{ "song_id": int }           // 单个添加
```

### DELETE /api/music/playlists/:id/songs
从播放列表移除歌曲。

```json
{ "song_ids": [int, ...] }
```

### DELETE /api/music/playlists/:id/songs/:songId
从播放列表移除单首歌曲。

---

## 播放列表分享

挂载: `/api/playlists`

### PUT /api/playlists/:id/public
切换播放列表公开/私有。

```json
{ "is_public": true|false }
```

### GET /api/playlists/:id/public-view
公开查看播放列表（无需登录）。

### POST /api/playlists/:id/collect
收藏/取消收藏公开播放列表。

### GET /api/playlists/collected
获取当前用户收藏的播放列表。

---

## 举报 Reports

挂载: `/api/reports`

### POST /api/reports
提交举报。

```json
{ "target_type": "post|user", "target_id": "int", "reason": "string" }
```
- 重复举报检测: 同一用户的同一目标未处理举报仅允许一次

### GET /api/admin/reports
管理员获取举报列表。

| 参数 | 说明 |
|------|------|
| status | 状态筛选: pending/resolved/dismissed |
| page | 页码 |
| limit | 每页数量 |

### PUT /api/admin/reports/:id
管理员处理举报。

```json
{ "status": "resolved|dismissed" }
```

---

## 等级 Levels

### GET /api/levels/me
获取当前用户的等级信息（含下一级进度）。

### GET /api/zone-access/:zone
检查用户是否有权访问指定分区。

### GET /api/admin/levels/config
管理员获取等级配置列表。

### PUT /api/admin/levels/config
管理员更新等级配置。

```json
{ "configs": [{ "level": 1, "name": "...", "xp_required": 0, "zones": "[...]", "title_icon": "...", "bg_image": "..." }] }
```

### GET /api/admin/levels/users
管理员获取用户等级列表（分页）。

### PUT /api/admin/levels/users/:userId
管理员手动设置用户等级/XP。

```json
{ "level": 5, "xp": 500 }
```

---

## 管理 Admin

挂载: `/api/admin`

### GET /api/admin/users
管理员获取用户列表（分页+搜索）。

### PATCH /api/admin/users/:userId/ban
管理员禁言/解禁用户。

```json
{ "isBanned": true, "banDuration": "int(小时，可选)", "banReason": "string(可选)" }
```
- `banDuration` 不传或 null 为永久禁言
- 不可禁言自己

### DELETE /api/admin/posts/batch
管理员批量删除帖子。

```json
{ "postIds": [int, ...] }
```

### GET /api/admin/stats
获取分区统计数据和待处理举报数。

---

## 站点 Site

挂载: `/api/site`

### GET /api/site/about
获取关于页面内容。

### PUT /api/site/about
更新关于页面内容（管理员）。

```json
{ "content": { "title": "...", "bio": "...", "avatar_url": "...", "skills": [], "social": {} } }
```

---

## 设置 Settings

挂载: `/api/settings`

### GET /api/settings/sound
获取声音设置。

### PUT /api/settings/sound
更新音量设置（管理员）。

```json
{ "volume": 0.5 }
```

### POST /api/settings/sound/upload
上传自定义点击音效（管理员）。

| 参数 | 说明 |
|------|------|
| sound_file | MP3 文件，最大 500KB |

---

## 反应 Reactions

挂载: `/api/posts/:postId/reaction`

### POST /api/posts/:postId/reaction
设置点赞/点踩。

```json
{ "type": "like|dislike|null" }
```
- `type=null` 取消反应
- 帖子作者收到点赞时获得 XP 奖励

---

## 响应格式

### 成功响应
```json
{ "message": "操作成功", ... }
```

### 错误响应
```json
{ "error": "错误描述" }
```
HTTP 状态码: 400/403/404/500

### 分页响应
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "hasMore": true
  }
}
```
