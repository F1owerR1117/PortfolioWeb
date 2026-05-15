const Components = {
  currentPage: 1, hasMore: false, isLoading: false, currentPost: null,
  editorBlocks: [], editorMode: null, editorPostId: null, _editorCategory: "work",
  _avatarState: null, _highlightCommentId: null, allPosts: [],
  _searchQuery: "", _activeTag: null, _sortMode: "latest", _currentCategory: null,
  _commentPage: 1, _commentPageSize: 30, _tagCategory: "all",
  currentReports: [], _musicTab: "songs", _currentBookmarkColId: null,
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
      (this._levelConfigCache || []).forEach(function(c) { map[c.level] = { name: c.name || "", icon: c.title_icon || "" }; });
      this._levelConfigMap = map;
    } catch(e) {}
  },

  _getLevelLabel(level) {
    var cfg = this._levelConfigMap[level || 1];
    if (cfg && cfg.name) return { name: cfg.name, icon: cfg.icon || "" };
    return { name: "Lv." + (level || 1), icon: "" };
  },

  _renderLevelBadge(level) {
    var cfg = this._levelConfigMap[level || 1];
    if (cfg && cfg.name) {
      return "<span class=\"lvl-badge-sm\">" + (cfg.icon ? "<img src=\"" + cfg.icon + "\" class=\"lvl-icon\"> " : "") + escapeHtml(cfg.name) + "</span>";
    }
    return "<span class=\"lvl-badge-sm\">Lv." + (level || 1) + "</span>";
  },

  renderLoading() { if (!this._levelConfigCache) this._initLevelCache(); document.getElementById("app").innerHTML = "<div class=\"loading-screen\"><div class=\"spinner\"></div><p>加载中...</p></div>"; },

  _extractCommentParam(path) {
    var qm = typeof path === "string" ? path.indexOf("?") : -1;
    if (qm < 0) return null;
    try {
      var params = new URLSearchParams(path.substring(qm + 1));
      var cid = params.get("comment");
      return cid ? parseInt(cid) : null;
    } catch(e) { return null; }
  },

  async _updateFriendRequestBadge() {
    if (!App.user) return;
    try {
      var d = await API.getFriendRequestCount();
      var badge = document.getElementById("friend-request-badge");
      if (!badge) return;
      if (d.count > 0) { badge.textContent = d.count > 99 ? "99+" : d.count; badge.style.display = "inline"; }
      else { badge.style.display = "none"; }
    } catch (e) {}
  },

};
