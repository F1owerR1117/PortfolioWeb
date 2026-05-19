📋 对话时间轴

---

## 1. 求职招聘区功能开发
- 完善求职招聘区双栏布局、筛选系统、身份申请系统
- 管理员通知系统（举报通知 + 身份申请通知）
- 帖子编辑/删除作者权限开放
- 精华帖筛选（⭐ 精华按钮）
- 数据库性能索引 10 条

## 2. 主题系统重构（3 轮风格迭代）

### 第 1 轮：删除亮色/暗色 → 纯深色默认 + 终端切换
- 删除旧的 `[data-theme="light"]` 和 `[data-theme="dark"]` 规则
- 默认改为深色主题（`#0a0a0f`），终端主题（`⌨️`）作为可选切换
- 文字对比度修复（text-secondary 0.4→0.55，text-light 0.25→0.4）

### 第 2 轮：手账风格预览（只生成了 HTML，未部署）
- `style-notebook.html` — 便签纸、胶带、回形针风格

### 第 3 轮：应用手账风格（用户决定只用终端）
- 创建了 `notebook.css`（后来删除）
- 用户要求仅保留终端风格
- **删除了 `terminal.css`（误删组件样式）→ 重建**

## 3. 多风格预览生成（未部署，仅 HTML）
- `style-medieval.html` — 中世纪卷轴
- `style-cyberpunk.html` — 赛博朋克
- `style-swiss.html` — 瑞士平面设计
- `style-dreamcore.html` — 梦核
- `style-leather.html` — 牛皮手帐
- `style-inkwash.html` — 水墨丹青
- `style-bento.html` — Apple Bento Box
- `style-lol.html` — 英雄联盟

## 4. 字体大小优化
- 查找所有 ≤11px 的 font-size，统一提升 2px
- **踩坑：** PowerShell `Set-Content` 编码损坏 JS 中文 → 从 git 恢复后用 Node.js 重做
- 修改了 11 个文件（style.css、nav.css、posts-shared.css、comments.css、profile.css、terminal.css、app.js、profile.js、postList.js、admin-users.js、music.js）

## 5. 音乐区样式不一致修复
- 问题：✏️ 🖼 📋 🗑 按钮 hover 不一致
- 原因：改错了地方（改了 `.btn-outline`，但实际用的是 `.act-btn`）
- 修复：统一 `.act-btn:hover`、`.tab-btn` hover 样式
- 额外修复：`.tabs` 的 `border-bottom` 移除（绿光泄露）
- 额外修复：删除重复的 `music-playlist-header-actions .btn-outline`（modals.css + style.css）
- **踩坑：** `base.css` 的 `:root` 缺了 `--bg-focus-glow`、`--text-on-bg-dim`、`--bg-press` 三个变量，导致全站多个组件样式失效

## 6. 已生成的预览文件（previews/）
| 文件 | 说明 |
|------|------|
| `snap-login.html` | 打响指火焰动画登录页 |
| `system-ui-overview.html` | 系统界面总览 |
| `font-size-fix.html` | 字体优化方案 |
| `music-ui-fix.html` | 音乐区 UI 修复方案 |
| `old-dark-theme.html` | 旧版暗色主题预览 |
| `style-*.html` | 8 种不同风格预览 |

## 7. 数据库/上传问题排查
- better-sqlite3 WAL 实时写盘 → 零数据丢失（已替换 sql.js）
- uploads/ 0 字节文件 → stop_job 在上传中途杀死进程导致
