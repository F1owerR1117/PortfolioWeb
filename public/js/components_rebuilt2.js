// ===== Components Module =====
const Components = {
  currentPage: 1, hasMore: false, isLoading: false, currentPost: null,
  editorBlocks: [], editorMode: null, editorPostId: null, _editorCategory: 'work',
  _avatarState: null, _highlightCommentId: null, allPosts: [],
  _searchQuery: '', _activeTag: null, _sortMode: 'latest', _currentCategory: null,
  _commentPage: 1, _commentPageSize: 30, _tagCategory: 'all',
  currentReports: [], _musicTab: 'songs', _currentBookmarkColId: null,
  _levelConfigCache: null,
  _levelConfigMap: {},
  _onlinePollTimer: null,
  _chatOnlineTimer: null,
  _chatPollTimer: null,
  _chatLastMsgId: 0,
  _savedExpanded: null,

  async _initLevelCache() {
    if (this._levelConfigCache) return;
    try {
      const d = await API.getLevelConfig();
      this._levelConfigCache = d.configs || [];
      var map = {};
      (this._levelConfigCache || []).forEach(function(c) { map[c.level] = { name: c.name || '', icon: c.title_icon || '' }; });
      this._levelConfigMap = map;
    } catch(e) {}
  },

  _getLevelLabel(level) {
    var cfg = this._levelConfigMap[level || 1];
    if (cfg && cfg.name) return { name: cfg.name, icon: cfg.icon || '' };
    return { name: 'Lv.' + (level || 1), icon: '' ,
renderAuth() { showToast("登录页面正在重构", "info"); },
_renderLoginForm() { return ""; },
_renderRegisterForm() { return ""; },
_bindAuthForms() {},
async renderTagManager() { showToast("标签功能重建中", "info"); },
async _renderTagList() {},
renderPostList(category) { document.getElementById("app").innerHTML = "<p>帖子功能重建中</p>"; },
async renderPostDetail(postId) { showToast("帖子详情重建中", "info"); Router.navigate("#/works"); },
renderCreatePost(category) { showToast("发帖功能重建中", "info"); },
async renderEditPost(postId) { showToast("编辑功能重建中", "info"); },
async renderMyProfile() { showToast("个人主页重建中", "info"); },
async renderUserProfile(userId) { showToast("用户主页重建中", "info"); },
async renderNotifications() { showToast("通知重建中", "info"); },
async renderBookmarks() { showToast("收藏重建中", "info"); },
async renderMusicLibrary() { showToast("音乐功能重建中", "info"); },
async renderPlaylistDetail(playlistId) { showToast("歌单重建中", "info"); },
async renderFriends() { showToast("好友功能重建中", "info"); },
async renderChat(friendId) { showToast("聊天重建中", "info"); },
async renderSettings() { Router.navigate("#/profile"); },
async renderAdminUsers() { showToast("用户管理重建中", "info"); },
async renderAdminStats() { showToast("统计重建中", "info"); },
async renderAdminReports() { showToast("举报管理重建中", "info"); },
async renderAdminLevels() { showToast("等级管理重建中", "info"); },
_isButtonDisabled(btn) { return btn && btn.disabled; },
_disableButton(btn, text) { if (btn) { btn.disabled = true; btn.textContent = text; } },
_enableButton(btn, text) { if (btn) { btn.disabled = false; btn.textContent = text; } },
_detectCodeLang(code) { return ""; },
_expandToComment(commentId) { return false; },
_applyCollapse() {},
_makeCollapsible() {},
_bindReactionBar() {},
_bindStatusToggles() {},
_loadComments() {},
_renderComments() {},
_renderCommentItem() { return ""; },
_bindCommentForm() {},
_bindCommentActions() {},
_applyFilters() {},
_createPostCard() { return document.createElement("div"); },
_updateDeleteSelectedBtn() {},
_updateTagFilterBar() {},
_loadPosts() {},
_loadMorePosts() {},
};
  },

  _renderLevelBadge(level) {
    var cfg = this._levelConfigMap[level || 1];
    if (cfg && cfg.name) {
      return '<span class="lvl-badge-sm">' + (cfg.icon ? '<img src="' + cfg.icon + '" class="lvl-icon"> ' : '') + escapeHtml(cfg.name) + '</span>';
    }
    return '<span class="lvl-badge-sm">Lv.' + (level || 1) + '</span>';
  },

  renderLoading() { if (!this._levelConfigCache) this._initLevelCache(); document.getElementById('app').innerHTML = '<div class="loading-screen"><div class="spinner"></div><p>加载中...</p></div>'; },