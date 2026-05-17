// Shared utilities for Components
var ComponentsShared = {
  _initLevelCache: async function() {
    if (this._levelConfigCache) return;
    try { var d = await API.getLevelConfig(); this._levelConfigCache = d.configs || [];
      var map = {}; (this._levelConfigCache || []).forEach(function(c) { map[c.level] = { name: c.name || '', icon: c.title_icon || '', bg: c.bg_image || '' }; });
      this._levelConfigMap = map;
    } catch(e) {}
  },

  _getLevelLabel: function(level) {
    var cfg = this._levelConfigMap[level || 1];
    if (cfg && cfg.name) return { name: cfg.name, icon: cfg.icon || '', bg: cfg.bg || '' };
    return { name: 'Lv.' + (level || 1), icon: '', bg: '' };
  },

  _renderLevelBadge: function(level) {
    var cfg = this._levelConfigMap[level || 1];
    if (cfg && cfg.name) {
      var bgStyle = cfg.icon ? 'background-image:url(' + cfg.icon + ');background-size:cover;background-position:center;position:relative;overflow:hidden;' : '';
      var iconHtml = cfg.icon ? '<span style="position:absolute;inset:0;background:rgba(0,0,0,0.35);border-radius:8px;"></span>' : '';
      return '<span class="lvl-badge-sm" style="' + bgStyle + 'background-color:var(--primary);">' + iconHtml + '<span style="position:relative;z-index:1;">⭐</span><span style="position:relative;z-index:1;font-weight:700;">LV.' + (level || 1) + '</span><span style="position:relative;z-index:1;">' + escapeHtml(cfg.name) + '</span></span>';
    }
    return '<span class="lvl-badge-sm">⭐ Lv.' + (level || 1) + '</span>';
  },

  renderLoading: function() { if (!this._levelConfigCache) this._initLevelCache(); document.getElementById('app').innerHTML = '<div class="loading-screen"><div class="spinner"></div><p>加载中...</p></div>'; },

  _extractCommentParam: function(path) {
    var qm = typeof path === 'string' ? path.indexOf('?') : -1;
    if (qm < 0) return null;
    try { var params = new URLSearchParams(path.substring(qm + 1)); var cid = params.get('comment'); return cid ? parseInt(cid) : null; } catch(e) { return null; }
  },

  _isButtonDisabled: function(btn) { return btn && btn.disabled; },
  _disableButton: function(btn, text) { if (btn) { btn.disabled = true; btn.textContent = text; } },
  _enableButton: function(btn, text) { if (btn) { btn.disabled = false; btn.textContent = text; } },

  _applyCollapse: function() {
    document.querySelectorAll('.content-block .text-content').forEach(function(el) { if (el.textContent.length > 150) Components._makeCollapsible(el, el.textContent, 'char', 150); });
    document.querySelectorAll(".content-block pre code").forEach(function(el) { var lns = el.textContent.split("\n"); if (lns.filter(function(x,i){return i<lns.length-1||x.length>0;}).length > 5) Components._makeCollapsible(el, lns, "code", 5); });
    document.querySelectorAll('.comment-content').forEach(function(el) { if (el.textContent.length > 100) Components._makeCollapsible(el, el.textContent, 'char', 100); });
  },

  _updateFriendRequestBadge: function() {
    // Update friend request badge in navigation
    try {
      API.getFriendRequests().then(function(d) {
        var count = (d.requests || []).length;
        var badge = document.getElementById('friend-request-badge');
        if (badge) {
          badge.textContent = count;
          badge.style.display = count > 0 ? '' : 'none';
        }
      }).catch(function() {});
    } catch(e) {}
  },

  _makeCollapsible: function(el, data, type, limit) {
    if (el.dataset.collapseDone) return; el.dataset.collapseDone = '1';
    var full = el.innerHTML, t = document.createElement('span');
    t.style.cssText = 'cursor:pointer;color:var(--primary);font-size:12px;margin-left:4px;';
    if (type === 'char') { el.innerHTML = escapeHtml(data.substring(0, limit)) + '...'; t.textContent = '\u5c55\u5f00'; }
    else { el.innerHTML = escapeHtml(data.slice(0, limit).join('\\n')) + '\n...'; t.textContent = '\u5c55\u5f00\u5168\u90e8\u4ee3\u7801'; }
    t.addEventListener('click', function() { el.innerHTML = full; t.remove(); }); el.appendChild(t);
  }
};
