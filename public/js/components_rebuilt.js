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
    return { name: 'Lv.' + (level || 1), icon: '' };
  },

  _renderLevelBadge(level) {
    var cfg = this._levelConfigMap[level || 1];
    if (cfg && cfg.name) {
      return '<span class="lvl-badge-sm">' + (cfg.icon ? '<img src="' + cfg.icon + '" class="lvl-icon"> ' : '') + escapeHtml(cfg.name) + '</span>';
    }
    return '<span class="lvl-badge-sm">Lv.' + (level || 1) + '</span>';
  },

  renderLoading() { if (!this._levelConfigCache) this._initLevelCache(); document.getElementById('app').innerHTML = '<div class="loading-screen"><div class="spinner"></div><p>加载中...</p></div>'; ,

// ===== Auth =====
renderAuth() {
  const app = document.getElementById('app');
  app.innerHTML = '<div class="page-fade-in"><div class="auth-page"><div class="auth-card"><h1 class="auth-title">📂 作品集</h1><p class="auth-subtitle">登录以浏览作品</p><div class="auth-tabs" id="auth-tabs"><button class="auth-tab active" data-tab="login">登录</button><button class="auth-tab" data-tab="register">注册</button></div><div id="auth-form">' + this._renderLoginForm() + '</div></div></div></div>';
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => { playClickSound(); document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active')); tab.classList.add('active'); document.getElementById('auth-form').innerHTML = tab.dataset.tab === 'login' ? this._renderLoginForm() : this._renderRegisterForm(); this._bindAuthForms(); });
  });
  this._bindAuthForms();
},
_renderLoginForm() { return '<form id="login-form"><div class="form-group"><label class="form-label">用户名</label><input class="form-input" name="username" type="text" placeholder="输入用户名" required autocomplete="username"></div><div class="form-group"><label class="form-label">密码</label><input class="form-input" name="password" type="password" placeholder="输入密码" required autocomplete="current-password"></div><button type="submit" class="btn btn-primary btn-block" id="login-btn">登录</button></form>'; },
_renderRegisterForm() { return '<form id="register-form"><div class="form-group"><label class="form-label">用户名</label><input class="form-input" name="username" type="text" placeholder="3-20个字符" required autocomplete="username"></div><div class="form-group"><label class="form-label">密码</label><input class="form-input" name="password" type="password" placeholder="至少6位" required autocomplete="new-password"></div><div class="form-group"><label class="form-checkbox"><input type="checkbox" name="is-admin" id="is-admin-checkbox"><span>注册为管理员</span></label></div><div class="form-group" id="admin-secret-group" style="display:none;"><label class="form-label">管理员注册秘钥</label><input class="form-input" name="admin-secret" type="password" placeholder="请输入管理员秘钥"><span class="form-hint">请联系网站管理员获取注册秘钥</span></div><button type="submit" class="btn btn-primary btn-block" id="register-btn">注册</button></form>'; },
_bindAuthForms() {
  const lf = document.getElementById('login-form'), rf = document.getElementById('register-form'), ac = document.getElementById('is-admin-checkbox');
  if (ac) ac.addEventListener('change', () => { document.getElementById('admin-secret-group').style.display = ac.checked ? 'block' : 'none'; });
  if (lf) lf.addEventListener('submit', async (e) => { e.preventDefault(); const b = document.getElementById('login-btn'); if (this._isButtonDisabled(b)) return; this._disableButton(b, '登录中...'); try { const d = await API.login(lf.username.value.trim(), lf.password.value); showToast('登录成功', 'success'); App.setUser(d.user); Router.navigate('#/works'); } catch (err) { showToast(err.message, 'error'); } finally { this._enableButton(b, '登录'); } });
  if (rf) rf.addEventListener('submit', async (e) => { e.preventDefault(); const b = document.getElementById('register-btn'); if (this._isButtonDisabled(b)) return; this._disableButton(b, '注册中...'); try { const role = ac && ac.checked ? 'admin' : 'user'; const secret = ac && ac.checked ? rf['admin-secret'].value.trim() : undefined; const d = await API.register(rf.username.value.trim(), rf.password.value, role, secret); showToast('注册成功', 'success'); App.setUser(d.user); Router.navigate('#/works'); } catch (err) { showToast(err.message, 'error'); } finally { this._enableButton(b, '注册'); } });
},

// ===== Tag Manager =====
async renderTagManager() { this._tagCategory = 'all'; this.renderLoading(); try { await this._renderTagList(); } catch (err) { showToast(err.message, 'error'); Router.navigate('#/works'); } },

async _renderTagList() {
  const app = document.getElementById('app'), isAdmin = App.user && App.user.role === 'admin';
  const tags = (await API.getTags(this._tagCategory === 'all' ? '' : this._tagCategory)).tags || [];
  app.innerHTML = '<div class="page-fade-in"><div class="settings-page"><div class="settings-card"><h2 style="font-size:22px;font-weight:700;margin-bottom:8px;">🏷️ 标签管理</h2><div class="sort-bar" style="margin-bottom:12px;"><button class="sort-btn ' + (this._tagCategory === 'all' ? 'active' : '') + '" data-tag-cat="all">📋 全部</button><button class="sort-btn ' + (this._tagCategory === 'work' ? 'active' : '') + '" data-tag-cat="work">📂 作品区</button><button class="sort-btn ' + (this._tagCategory === 'chat' ? 'active' : '') + '" data-tag-cat="chat">💬 聊天区</button></div><div class="search-bar" style="margin-bottom:16px;"><input class="search-input" id="tag-search" type="text" placeholder="搜索标签..." autocomplete="off"></div><div id="tag-list" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;">' + tags.map(t => '<span class="tag-manager-item"><span class="tag-manager-name">' + escapeHtml(t.name) + '</span><span class="tag-manager-count">' + t.count + ' 帖</span>' + (isAdmin ? '<span class="tag-manager-remove" data-id="' + t.id + '" data-name="' + escapeHtml(t.name) + '">&times;</span>' : '') + '</span>').join('') + '</div><div class="tag-add-row"><input class="form-input" id="new-tag-input" type="text" placeholder="新标签名称..." style="flex:1;"><button class="btn btn-primary" id="add-tag-btn">添加</button></div></div></div></div>';
  document.querySelectorAll('.sort-btn[data-tag-cat]').forEach(b => b.addEventListener('click', () => { playClickSound(); this._tagCategory = b.dataset.tagCat; this._renderTagList(); }));
  document.getElementById('add-tag-btn').addEventListener('click', async () => { const n = document.getElementById('new-tag-input').value.trim(); if (!n) { showToast('请输入标签名', 'error'); return; } try { await API.createTag(n); showToast('已添加', 'success'); this._renderTagList(); } catch (err) { showToast(err.message, 'error'); } });
  if (isAdmin) document.getElementById('tag-list').addEventListener('click', async (e) => { const rb = e.target.closest('.tag-manager-remove'); if (!rb) return; if (!(await showConfirm('确定删除？'))) return; try { await API.deleteTag(parseInt(rb.dataset.id)); showToast('已删除', 'success'); this._renderTagList(); } catch (err) { showToast(err.message, 'error'); } });
},

// ===== Stubs for methods needed by router =====
renderPostList(category) { this._currentCategory = category || null; this.allPosts = []; document.getElementById('app').innerHTML = '<div class="page-fade-in"><div class="page-header"><h1 class="page-title">' + (category === 'chat' ? '💬 聊天区' : '📂 作品区') + '</h1></div><p style="text-align:center;padding:40px;color:var(--text-secondary);">帖子列表功能重建中...</p></div>'; },
async renderPostDetail(postId) { this.renderLoading(); try { var d = await API.getPost(postId); document.getElementById('app').innerHTML = '<div class="page-fade-in"><div class="post-detail"><h1>' + escapeHtml(d.post.title) + '</h1><p>' + escapeHtml(d.post.description || '') + '</p></div></div>'; } catch(err) { showToast(err.message, 'error'); Router.navigate('#/works'); } },
renderCreatePost(category) { showToast('发帖功能重建中', 'info'); Router.navigate(category === 'chat' ? '#/chats' : '#/works'); },
async renderEditPost(postId) { showToast('编辑功能重建中', 'info'); Router.navigate('#/works'); },
async renderMyProfile() { this.renderLoading(); try { var p = (await API.getMyProfile()).profile; document.getElementById('app').innerHTML = '<div class="page-fade-in"><div class="about-page"><div class="about-card"><h2>' + escapeHtml(p.nickname || p.username) + '</h2><p>' + escapeHtml(p.bio || '') + '</p></div></div></div>'; } catch(err) { showToast(err.message, 'error'); Router.navigate('#/works'); } },
async renderUserProfile(userId) { this.renderLoading(); try { var p = (await API.getUserProfile(userId)).profile; document.getElementById('app').innerHTML = '<div class="page-fade-in"><div class="about-page"><div class="about-card"><h2>' + escapeHtml(p.nickname || p.username) + '</h2><p>' + escapeHtml(p.bio || '') + '</p></div></div></div>'; } catch(err) { showToast(err.message, 'error'); Router.navigate('#/works'); } },
async renderNotifications() { showToast('通知功能重建中', 'info'); Router.navigate('#/works'); },
async renderBookmarks() { showToast('收藏功能重建中', 'info'); Router.navigate('#/works'); },
async renderMusicLibrary() { this.renderLoading(); try { var d = await API.getMySongs(); document.getElementById('app').innerHTML = '<div class="page-fade-in"><p style="padding:40px;text-align:center;">音乐功能重建中 (' + (d.songs||[]).length + ' 首歌曲)</p></div>'; } catch(err) { showToast(err.message, 'error'); Router.navigate('#/works'); } },
async renderPlaylistDetail(playlistId) { showToast('歌单功能重建中', 'info'); Router.navigate('#/music'); },
async renderFriends() { showToast('好友功能重建中', 'info'); Router.navigate('#/works'); },
async renderChat(friendId) { showToast('聊天功能重建中', 'info'); Router.navigate('#/works'); },
async renderSettings() { Router.navigate('#/profile'); },
async renderAdminUsers() { showToast('用户管理重建中', 'info'); Router.navigate('#/works'); },
async renderAdminStats() { showToast('统计功能重建中', 'info'); Router.navigate('#/works'); },
async renderAdminReports() { showToast('举报管理重建中', 'info'); Router.navigate('#/works'); },
async renderAdminLevels() { showToast('等级管理重建中', 'info'); Router.navigate('#/works'); },

// ===== Utility methods =====
_isButtonDisabled(btn) { return btn && btn.disabled; },
_disableButton(btn, text) { if (btn) { btn.disabled = true; btn.textContent = text; } },
_enableButton(btn, text) { if (btn) { btn.disabled = false; btn.textContent = text; } },
_detectCodeLang(code) { if (!code) return ''; try { if (/^</.test(code)) return 'html'; if (/^{/.test(code)) return 'json'; if (/^(import|export|const|let|var|function|=>)/.test(code)) return 'javascript'; } catch(e) {} return ''; },
_expandToComment(commentId) { return false; },
_applyCollapse() {},
_makeCollapsible() {},
_bindReactionBar() {},
_bindStatusToggles() {},
_loadComments() {},
_renderComments() {},
_renderCommentItem() { return ''; },
_bindCommentForm() {},
_bindCommentActions() {},
_applyFilters() {},
_createPostCard() { return document.createElement('div'); },
_updateDeleteSelectedBtn() {},
_updateTagFilterBar() {},
_loadPosts() {},
_loadMorePosts() {},
_updateFriendRequestBadge() {},
};