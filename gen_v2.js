const fs = require('fs');
const src = fs.readFileSync('public/js/components.js', 'utf8');

// Split into top-level items, preserving EXACT code
function splitTopLevel(str) {
  const items = []; let depth = 0, cur = '', s = false, sc = '', t = false;
  for (let i = 0; i < str.length; i++) {
    const c = str[i], p = i > 0 ? str[i - 1] : '';
    if ((c === "'" || c === '"') && !t) { if (!s) { s = true; sc = c; } else if (c === sc && p !== '\\') s = false; }
    if (c === '`' && !s) t = !t;
    if (!s && !t) { if (c === '{' || c === '(' || c === '[') depth++; if (c === '}' || c === ')' || c === ']') depth--; }
    cur += c;
    if (depth === 1 && c === ',' && !s && !t) { items.push(cur.slice(0, -1)); cur = ''; }
  }
  if (cur.trim()) items.push(cur);
  return items;
}

const body = src.substring(src.indexOf('{') + 1, src.lastIndexOf('}'));
const items = splitTopLevel(body);

// Method comments
const mComments = {
  renderLoading: '显示加载动画',
  renderAuth: '渲染登录/注册页面',
  _renderLoginForm: '登录表单HTML',
  _renderRegisterForm: '注册表单HTML',
  _bindAuthForms: '绑定登录/注册提交事件',
  renderTagManager: '标签管理页面',
  _renderTagList: '标签列表（含分区筛选）',
  renderPostList: '作品列表页面',
  _applyFilters: '搜索/标签/排序筛选',
  _createPostCard: '创建作品卡片DOM',
  _updateDeleteSelectedBtn: '更新批量删除按钮',
  _updateTagFilterBar: '更新标签筛选栏',
  _loadPosts: '从API加载帖子',
  _loadMorePosts: '加载更多帖子',
  renderPostDetail: '作品详情页面',
  _detectCodeLang: '检测代码语言',
  renderCreatePost: '新建帖子页面',
  renderEditPost: '编辑帖子页面',
  _renderEditor: '通用编辑器',
  _renderEditorBlocks: '渲染内容块列表',
  _renderBlockEditor: '单个内容块编辑器',
  _bindBlockEvents: '绑定内容块事件',
  _bindRemoveFile: '移除文件按钮事件',
  _bindEditorEvents: '绑定编辑器事件',
  _isButtonDisabled: '检查按钮禁用状态',
  _disableButton: '禁用+修改文字',
  _enableButton: '启用+恢复文字',
  renderMyProfile: '我的个人主页',
  renderUserProfile: '用户个人主页',
  _checkAndRenderFriendButton: '检查好友状态',
  _loadComments: '加载评论列表',
  _renderComments: '渲染评论（分页+折叠）',
  _renderCommentItem: '渲染单条评论',
  _bindCommentForm: '绑定评论表单',
  _bindCommentActions: '绑定评论操作',
  renderNotifications: '通知列表页面',
  renderBookmarks: '收藏夹页面',
  renderMusicLibrary: '音乐库页面',
  renderPlaylistDetail: '歌单详情页面',
  _showSongSelector: '歌曲选择弹窗',
  renderFriends: '好友列表页面',
  renderChat: '私信聊天页面',
  renderSettings: '设置页面',
  renderAdminUsers: '用户管理页面',
  renderAdminStats: '区域统计页面',
  renderAdminReports: '举报管理页面',
  renderAdminLevels: '等级管理页面',
  _applyCollapse: '内容折叠',
  _makeCollapsible: '添加折叠元素',
  _bindReactionBar: '点赞/点踩事件',
  _bindStatusToggles: '置顶/精华/锁定切换',
  _initLevelCache: '初始化等级缓存',
  _getLevelLabel: '获取等级名称',
  _renderLevelBadge: '渲染等级徽章'
};

const pComments = {
  currentPage: '页码', hasMore: '是否有下一页', isLoading: '加载中',
  currentPost: '当前帖子', editorBlocks: '内容块', editorMode: '编辑模式',
  editorPostId: '帖子ID', _editorCategory: '分区', _avatarState: '裁剪状态',
  _highlightCommentId: '高亮评论', allPosts: '帖子缓存', _searchQuery: '搜索词',
  _activeTag: '标签', _sortMode: '排序', _currentCategory: '分区筛选',
  _commentPage: '评论页码', _commentPageSize: '每页条数', _tagCategory: '标签分区',
  currentReports: '举报缓存', _musicTab: '音乐标签', _currentBookmarkColId: '收藏夹ID',
  _levelConfigCache: '等级缓存原始', _levelConfigMap: '等级名称映射'
};

// Generate output
const out = [];
out.push('// ============================================================');
out.push('// Components Module');
out.push('// 个人作品集前端页面渲染器');
out.push('// 包含所有页面的渲染、事件绑定和交互逻辑');
out.push('// ============================================================');
out.push('');
out.push('const Components = {');
out.push('');

for (const raw of items) {
  const item = raw.trim();
  if (!item) continue;
  const nm = item.match(/^\s*(?:async\s+)?([a-zA-Z_$]\w*)/);
  const name = nm ? nm[1] : '';

  const isSimple = /^\s*[a-zA-Z_$]\w*\s*:\s*(null|true|false|\d+)\s*$/.test(item) ||
    /^\s*[a-zA-Z_$]\w*\s*:\s*'[^']*'\s*$/.test(item) ||
    /^\s*[a-zA-Z_$]\w*\s*:\s*"[^"]*"\s*$/.test(item) ||
    /^\s*[a-zA-Z_$]\w*\s*:\s*\[\s*\]\s*$/.test(item) ||
    /^\s*[a-zA-Z_$]\w*\s*:\s*\{\s*\}\s*$/.test(item);

  if (isSimple && pComments[name]) {
    out.push('  /** ' + pComments[name] + ' */');
    out.push('  ' + item + (item.endsWith(',') ? '' : ','));
    continue;
  }

  // Method or complex property
  if (mComments[name]) {
    out.push('');
    out.push('  /**');
    out.push('   * ' + mComments[name]);
    out.push('   */');
  }

  out.push('  ' + item + ',');
}

out.push('};');
out.push('');

const result = out.join('\n');
fs.writeFileSync('public/js/components_formatted.js', result, 'utf8');

const lines = result.split('\n').length;
console.log('Output:', result.length, 'bytes,', lines, 'lines,', items.length, 'items');

// Syntax check
require('child_process').execSync('node --check public/js/components_formatted.js', { timeout: 5000 });
console.log('✅ Syntax OK');
