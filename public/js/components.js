const Components = {
  currentPage: 1, hasMore: false, isLoading: false, currentPost: null,
  editorBlocks: [], editorMode: null, editorPostId: null, _editorCategory: 'work', _deletedBlockIds: [],
  _avatarState: null, _highlightCommentId: null, allPosts: [],
  _searchQuery: '', _activeTag: null, _sortMode: 'latest', _currentCategory: null,
  _commentPage: 1, _commentPageSize: 30, _tagCategory: 'all',
  currentReports: [], _musicTab: 'songs', _currentBookmarkColId: null,
  _levelConfigCache: null, _levelConfigMap: {},
  _onlinePollTimer: null, _chatOnlineTimer: null, _chatPollTimer: null,
  _chatLastMsgId: 0, _savedExpanded: null,

  async _initLevelCache() {
    if (this._levelConfigCache) return;
    try { const d = await API.getLevelConfig(); this._levelConfigCache = d.configs || [];
      var map = {}; (this._levelConfigCache || []).forEach(function(c) { map[c.level] = { name: c.name || '', icon: c.title_icon || '' }; });
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
    if (cfg && cfg.name) return '<span class="lvl-badge-sm">' + (cfg.icon ? '<img src="' + cfg.icon + '" class="lvl-icon"> ' : '') + escapeHtml(cfg.name) + '</span>';
    return '<span class="lvl-badge-sm">Lv.' + (level || 1) + '</span>';
  },

  renderLoading() { if (!this._levelConfigCache) this._initLevelCache(); document.getElementById('app').innerHTML = '<div class="loading-screen"><div class="spinner"></div><p>加载中...</p></div>'; },

  _extractCommentParam(path) {
    var qm = typeof path === 'string' ? path.indexOf('?') : -1;
    if (qm < 0) return null;
    try { var params = new URLSearchParams(path.substring(qm + 1)); var cid = params.get('comment'); return cid ? parseInt(cid) : null; } catch(e) { return null; }
  },

  renderAuth() {
    const app = document.getElementById('app');
    app.innerHTML = '<div class="page-fade-in"><div class="auth-page"><div class="auth-card"><h1 class="auth-title">📂 作品集</h1><p class="auth-subtitle">登录以浏览作品</p><div class="auth-tabs" id="auth-tabs"><button class="auth-tab active" data-tab="login">登录</button><button class="auth-tab" data-tab="register">注册</button></div><div id="auth-form">' + this._renderLoginForm() + '</div></div></div></div>';
    document.querySelectorAll('.auth-tab').forEach(tab => {
      tab.addEventListener('click', () => { playClickSound(); document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active')); tab.classList.add('active'); document.getElementById('auth-form').innerHTML = tab.dataset.tab === 'login' ? Components._renderLoginForm() : Components._renderRegisterForm(); Components._bindAuthForms(); });
    });
    this._bindAuthForms();
  },
  _renderLoginForm() { return '<form id="login-form"><div class="form-group"><label class="form-label">用户名</label><input class="form-input" name="username" type="text" placeholder="输入用户名" required autocomplete="username"></div><div class="form-group"><label class="form-label">密码</label><input class="form-input" name="password" type="password" placeholder="输入密码" required autocomplete="current-password"></div><button type="submit" class="btn btn-primary btn-block" id="login-btn">登录</button></form>'; },
  _renderRegisterForm() { return '<form id="register-form"><div class="form-group"><label class="form-label">用户名</label><input class="form-input" name="username" type="text" placeholder="3-20个字符" required autocomplete="username"></div><div class="form-group"><label class="form-label">密码</label><input class="form-input" name="password" type="password" placeholder="至少6位" required autocomplete="new-password"></div><div class="form-group"><label class="form-checkbox"><input type="checkbox" name="is-admin" id="is-admin-checkbox"><span>注册为管理员</span></label></div><div class="form-group" id="admin-secret-group" style="display:none;"><label class="form-label">管理员注册秘钥</label><input class="form-input" name="admin-secret" type="password" placeholder="请输入管理员秘钥"><span class="form-hint">请联系网站管理员获取注册秘钥</span></div><button type="submit" class="btn btn-primary btn-block" id="register-btn">注册</button></form>'; },
  _bindAuthForms() {
    var lf = document.getElementById('login-form'), rf = document.getElementById('register-form'), ac = document.getElementById('is-admin-checkbox');
    if (ac) ac.addEventListener('change', function() { document.getElementById('admin-secret-group').style.display = ac.checked ? 'block' : 'none'; });
    if (lf) lf.addEventListener('submit', async function(e) { e.preventDefault(); var b = document.getElementById('login-btn'); if (Components._isButtonDisabled(b)) return; Components._disableButton(b, '登录中...'); try { var d = await API.login(lf.username.value.trim(), lf.password.value); showToast('登录成功', 'success'); App.setUser(d.user); Router.navigate('#/works'); } catch (err) { showToast(err.message, 'error'); } finally { Components._enableButton(b, '登录'); } });
    if (rf) rf.addEventListener('submit', async function(e) { e.preventDefault(); var b = document.getElementById('register-btn'); if (Components._isButtonDisabled(b)) return; Components._disableButton(b, '注册中...'); try { var role = ac && ac.checked ? 'admin' : 'user'; var secret = ac && ac.checked ? rf['admin-secret'].value.trim() : undefined; var d = await API.register(rf.username.value.trim(), rf.password.value, role, secret); showToast('注册成功', 'success'); App.setUser(d.user); Router.navigate('#/works'); } catch (err) { showToast(err.message, 'error'); } finally { Components._enableButton(b, '注册'); } });
  },

  async renderTagManager() { this._tagCategory = 'all'; this.renderLoading(); try { await this._renderTagList(); } catch (err) { showToast(err.message, 'error'); Router.navigate('#/works'); } },

  async _renderTagList() {
    const app = document.getElementById('app'), isAdmin = App.user && App.user.role === 'admin';
    const tags = (await API.getTags(this._tagCategory === 'all' ? '' : this._tagCategory)).tags || [];
    app.innerHTML = '<div class="page-fade-in"><div class="settings-page"><div class="settings-card"><h2 style="font-size:22px;font-weight:700;margin-bottom:8px;">🏷️ 标签管理</h2><div class="sort-bar" style="margin-bottom:12px;"><button class="sort-btn ' + (this._tagCategory === 'all' ? 'active' : '') + '" data-tag-cat="all">📋 全部</button><button class="sort-btn ' + (this._tagCategory === 'work' ? 'active' : '') + '" data-tag-cat="work">📂 作品区</button><button class="sort-btn ' + (this._tagCategory === 'chat' ? 'active' : '') + '" data-tag-cat="chat">💬 聊天区</button></div><div class="search-bar" style="margin-bottom:16px;"><input class="search-input" id="tag-search" type="text" placeholder="搜索标签..." autocomplete="off"></div><div id="tag-list" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;">' + tags.map(t => '<span class="tag-manager-item"><span class="tag-manager-name">' + escapeHtml(t.name) + '</span><span class="tag-manager-count">' + t.count + ' 帖</span>' + (isAdmin ? '<span class="tag-manager-remove" data-id="' + t.id + '" data-name="' + escapeHtml(t.name) + '">&times;</span>' : '') + '</span>').join('') + '</div><div class="tag-add-row" style="display:flex;gap:8px;margin-top:12px;"><input class="form-input" id="new-tag-input" type="text" placeholder="新标签名称..." style="flex:1;"><button class="btn btn-primary" id="add-tag-btn">添加</button></div></div></div></div>';
    document.querySelectorAll('.sort-btn[data-tag-cat]').forEach(b => b.addEventListener('click', () => { playClickSound(); this._tagCategory = b.dataset.tagCat; this._renderTagList(); }));
    document.getElementById('add-tag-btn').addEventListener('click', async () => { const n = document.getElementById('new-tag-input').value.trim(); if (!n) { showToast('请输入标签名', 'error'); return; } try { await API.createTag(n); showToast('已添加', 'success'); this._renderTagList(); } catch (err) { showToast(err.message, 'error'); } });
    if (isAdmin) document.getElementById('tag-list').addEventListener('click', async (e) => { const rb = e.target.closest('.tag-manager-remove'); if (!rb) return; if (!(await showConfirm('确定删除？'))) return; try { await API.deleteTag(parseInt(rb.dataset.id)); showToast('已删除', 'success'); this._renderTagList(); } catch (err) { showToast(err.message, 'error'); } });
  },

  renderPostList(category) {
    this._currentCategory = category || null; this.currentPage = 1; this.hasMore = false; this.allPosts = []; this._searchQuery = ''; this._activeTag = null; this._sortMode = 'latest';
    this._initLevelCache();
    const isAdmin = App.user && App.user.role === 'admin', isWork = !category || category === 'work';
    document.getElementById('app').innerHTML = '<div class="page-fade-in"><div class="page-header"><h1 class="page-title">' + (isWork ? '📂 作品区' : '💬 聊天区') + '</h1><div style="display:flex;gap:8px;align-items:center;">' + ((isWork ? isAdmin : true) ? '<button class="btn btn-primary" id="create-post-btn">' + (isWork ? '✏️ 发布作品' : '✏️ 发帖') + '</button>' : '') + '</div></div>' + (isAdmin ? '<div class="admin-batch-bar"><label class="form-checkbox" style="font-size:13px;"><input type="checkbox" id="select-all-posts"> 全选</label><button class="btn btn-danger btn-sm" id="delete-selected-btn" disabled>🗑️ 删除选中 (<span id="selected-count">0</span>)</button></div>' : '') + '<div class="search-bar"><input class="search-input" id="post-search" type="text" placeholder="搜索标题或简介..."></div><div class="sort-bar"><button class="sort-btn active" data-sort="latest">⏰ 最新</button><button class="sort-btn" data-sort="views">🔥 最热</button></div><div class="tag-filter-bar" id="tag-filter-bar" style="display:none;"><span class="tag-filter-label">🏷️ 标签：</span><button class="tag-chip active" data-tag="">全部</button></div><div class="post-grid" id="post-grid"></div><div class="load-more-wrap" id="load-more-wrap" style="display:none;"><button class="btn btn-outline" id="load-more-btn">加载更多</button></div><div class="empty-state" id="empty-state" style="display:none;"><div class="empty-state-icon">📭</div><p class="empty-state-text">' + (isWork ? '暂无作品' : '暂无帖子') + '</p></div></div>';
    let st; document.getElementById('post-search').addEventListener('input', () => { clearTimeout(st); st = setTimeout(() => { this._searchQuery = document.getElementById('post-search').value.trim().toLowerCase(); this._applyFilters(); }, 200); });
    document.querySelectorAll('.sort-btn').forEach(b => b.addEventListener('click', () => { playClickSound(); document.querySelectorAll('.sort-btn').forEach(x => x.classList.remove('active')); b.classList.add('active'); this._sortMode = b.dataset.sort; this._applyFilters(); }));
    document.getElementById('tag-filter-bar').addEventListener('click', (e) => { if (e.target.classList.contains('tag-chip')) { playClickSound(); document.querySelectorAll('#tag-filter-bar .tag-chip').forEach(t => t.classList.remove('active')); e.target.classList.add('active'); this._activeTag = e.target.dataset.tag || null; this._applyFilters(); } });
    if (document.getElementById('create-post-btn')) document.getElementById('create-post-btn').addEventListener('click', () => { playClickSound(); Router.navigate(isWork ? '#/create' : '#/create/chat'); });
    document.getElementById('load-more-btn').addEventListener('click', () => { playClickSound(); this._loadMorePosts(); });
    const sa = document.getElementById('select-all-posts'), db = document.getElementById('delete-selected-btn');
    if (sa && db) {
      sa.addEventListener('change', () => { document.querySelectorAll('.post-select-checkbox').forEach(cb => cb.checked = sa.checked); this._updateDeleteSelectedBtn(); });
      db.addEventListener('click', async () => { const sel = []; document.querySelectorAll('.post-select-checkbox:checked').forEach(cb => sel.push(parseInt(cb.dataset.postId))); if (sel.length === 0) return; if (!(await showConfirm('确定删除选中的 ' + sel.length + ' 个帖子？'))) return; this.currentPage = 1; try { await API.adminBatchDeletePosts(sel); showToast('成功删除 ' + sel.length + ' 个帖子', 'success'); await this._loadPosts(true); } catch (err) { showToast(err.message, 'error'); } finally { this._updateDeleteSelectedBtn(); } });
      document.getElementById('post-grid').addEventListener('change', (e) => { if (e.target.classList.contains('post-select-checkbox')) this._updateDeleteSelectedBtn(); });
    }
    this._loadPosts();
  },

  _applyFilters() {
    const g = document.getElementById('post-grid'); if (!g) return;
    let f = [...this.allPosts];
    if (this._searchQuery) f = f.filter(p => p.title.toLowerCase().includes(this._searchQuery) || (p.description || '').toLowerCase().includes(this._searchQuery));
    if (this._activeTag) f = f.filter(p => p.tags ? p.tags.split(',').map(t => t.trim()).filter(Boolean).includes(this._activeTag) : false);
    f.sort((a, b) => this._sortMode === 'views' ? (b.views || 0) - (a.views || 0) : new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));
    g.innerHTML = '';
    if (f.length === 0) { document.getElementById('empty-state').style.display = 'block'; return; }
    document.getElementById('empty-state').style.display = 'none';
    f.forEach(p => g.appendChild(this._createPostCard(p)));
    if (document.getElementById('select-all-posts')) document.getElementById('select-all-posts').checked = false;
    this._updateDeleteSelectedBtn();
  },

  _createPostCard(post) {
    const c = document.createElement('div'); c.className = 'post-card';
    const badges = []; if (post.is_sticky) badges.push('📌'); if (post.is_featured) badges.push('⭐'); if (post.is_locked) badges.push('🔒');
    const ia = App.user && App.user.role === 'admin';
    c.innerHTML = '<div class="post-card-img" style="' + (post.cover_url ? "background-image:url('" + post.cover_url + "');background-size:cover;background-position:center;" : '') + '">' + (post.cover_url ? '' : '📄') + '<div class="post-card-overlay">🔍 查看详情</div><span class="category-badge ' + (post.category === 'chat' ? 'chat' : 'work') + '">' + (post.category === 'chat' ? '💬 聊天' : '📂 作品') + '</span></div><div class="post-card-body">' + (ia ? '<label class="post-select-wrap"><input type="checkbox" class="post-select-checkbox" data-post-id="' + post.id + '"></label>' : '') + '<div class="post-card-title">' + (badges.length ? badges.join(' ') + ' ' : '') + escapeHtml(post.title) + '</div><div class="post-card-desc">' + escapeHtml(post.description || '暂无简介') + '</div><div class="post-card-footer"><div class="post-card-tags">' + (post.tags ? post.tags.split(',').map(t => '<span class="tag-chip" style="cursor:default;">' + escapeHtml(t.trim()) + '</span>').join('') : '') + '</div><div style="display:flex;gap:8px;align-items:center;flex-shrink:0;"><span style="font-size:13px;color:var(--text-light);">👍 ' + (post.like_count || 0) + '</span><span style="font-size:13px;color:var(--text-light);">👎 ' + (post.dislike_count || 0) + '</span><span class="post-card-views">👁 ' + (post.views || 0) + '</span></div></div><div class="post-card-date">' + formatDate(post.created_at) + '</div></div>';
    c.addEventListener('click', (e) => { if (e.target.closest('.post-select-wrap')) return; playClickSound(); Router.navigate('#/posts/' + post.id); });
    return c;
  },

  _updateDeleteSelectedBtn() { const d = document.getElementById('delete-selected-btn'), ce = document.getElementById('selected-count'); if (!d || !ce) return; const c = document.querySelectorAll('.post-select-checkbox:checked').length; ce.textContent = c; d.disabled = c === 0; },

  async _updateTagFilterBar() {
    const bar = document.getElementById('tag-filter-bar'); if (!bar) return;
    try { const tags = (await API.getTags(this._currentCategory)).tags || []; if (tags.length === 0) { bar.style.display = 'none'; return; } bar.style.display = 'flex'; const ac = bar.querySelector('.tag-chip'); bar.innerHTML = ''; bar.appendChild(ac); tags.forEach(t => { const c = document.createElement('button'); c.className = 'tag-chip'; if (this._activeTag === t.name) c.classList.add('active'); c.dataset.tag = t.name; c.textContent = t.name; bar.appendChild(c); }); } catch (e) { bar.style.display = 'none'; }
  },

  async _loadPosts(isFullRefresh) {
    try {
      const d = await API.getPosts(this.currentPage, 9, this._currentCategory);
      this.hasMore = d.pagination.hasMore;
      if (isFullRefresh || this.currentPage === 1) { this.allPosts = d.posts; }
      else { const ids = new Set(this.allPosts.map(p => p.id)); d.posts.forEach(p => { if (!ids.has(p.id)) this.allPosts.push(p); }); }
      if (d.posts.length === 0 && this.allPosts.length === 0) { document.getElementById('empty-state').style.display = 'block'; return; }
      this._updateTagFilterBar(); this._applyFilters();
      const lw = document.getElementById('load-more-wrap'), lb = document.getElementById('load-more-btn');
      if (lw && lb) { lw.style.display = this.hasMore ? 'block' : 'none'; if (this.hasMore) { lb.textContent = '加载更多 (' + (d.pagination.totalPages - this.currentPage) + ' 页剩余)'; lb.disabled = false; } }
    } catch (err) { showToast(err.message, 'error'); }
  },

  async _loadMorePosts() { if (this.isLoading || !this.hasMore) return; this.isLoading = true; const b = document.getElementById('load-more-btn'); b.disabled = true; b.textContent = '加载中...'; this.currentPage++; await this._loadPosts(); this.isLoading = false; },

  async renderPostDetail(postId) {
    this.renderLoading();
    try {
      const d = await API.getPost(postId), post = d.post, blocks = d.blocks, isAdmin = App.user && App.user.role === 'admin';
      const tags = (post.tags || '').split(',').map(t => t.trim()).filter(Boolean);
      document.getElementById('app').innerHTML = '<div class="page-fade-in"><div class="post-detail"><div class="post-detail-cover" style="' + (post.cover_url ? "background-image:url('" + post.cover_url + "');background-size:cover;background-position:center;" : '') + '">' + (post.cover_url ? '' : '📄') + '</div><div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;"><div><h1 class="post-detail-title">' + escapeHtml(post.title) + '</h1><div class="post-detail-meta">作者：<a href="#/users/' + post.created_by + '" class="user-link">' + escapeHtml(post.author) + '</a>' + this._renderLevelBadge((post.author_level || 1)) + ' · ' + formatDate(post.created_at) + (post.updated_at !== post.created_at ? '（编辑于 ' + formatDate(post.updated_at) + '）' : '') + ' · 👁 ' + (post.views || 0) + ' 次浏览</div>' + (tags.length ? '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px;">' + tags.map(t => '<span class="tag-chip" style="cursor:default;">' + escapeHtml(t) + '</span>').join('') + '</div>' : '') + '</div>' + (isAdmin ? '<div style="display:flex;gap:8px;flex-shrink:0;flex-wrap:wrap;"><button class="btn btn-outline btn-sm" id="edit-post-btn">✏ 编辑</button><button class="btn btn-danger btn-sm" id="delete-post-btn">🗑 删除</button><button class="btn btn-sm ' + (post.is_sticky ? 'btn-primary' : 'btn-outline') + '" id="sticky-toggle-btn">📌 ' + (post.is_sticky ? '已置顶' : '置顶') + '</button><button class="btn btn-sm ' + (post.is_featured ? 'btn-primary' : 'btn-outline') + '" id="featured-toggle-btn">⭐ ' + (post.is_featured ? '已精华' : '精华') + '</button><button class="btn btn-sm ' + (post.is_locked ? 'btn-primary' : 'btn-outline') + '" id="lock-toggle-btn">🔒 ' + (post.is_locked ? '已锁定' : '锁定') + '</button></div>' : '') + '</div>' +
        '<div class="reaction-bar" id="reaction-bar" data-post-id="' + post.id + '"><button class="reaction-btn like-btn' + (d.user_reaction === 'like' ? ' active' : '') + '" data-type="like">👍 <span id="like-count">' + (post.like_count || 0) + '</span></button><button class="reaction-btn dislike-btn' + (d.user_reaction === 'dislike' ? ' active' : '') + '" data-type="dislike">👎 <span id="dislike-count">' + (post.dislike_count || 0) + '</span></button><button id="bookmark-btn" style="background:none;border:none;cursor:pointer;font-size:18px;padding:4px 8px;border-radius:6px;position:relative;" title="收藏">📖</button><button id="report-post-btn" style="background:none;border:none;cursor:pointer;font-size:16px;padding:4px 8px;border-radius:6px;color:var(--text-light);">🚩</button></div>' +
        (post.is_featured ? '<div class="featured-badge">⭐ 精华帖</div>' : '') + (post.description ? '<p class="post-detail-desc">' + escapeHtml(post.description) + '</p>' : '') +
        '<div class="content-blocks" id="content-blocks">' + (blocks.length === 0 ? '<div class="empty-state"><p>暂无内容</p></div>' : '') + '</div>' +
        '<div class="comments-section" id="comments-section"><h2 class="comments-title">💬 评论</h2>' + (post.is_locked ? '<div style="padding:12px 16px;background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text-secondary);margin-bottom:16px;">🔒 该帖子已被锁定，无法回复</div>' : '<div class="comment-form-wrap"><textarea class="form-textarea" id="comment-input" placeholder="写下你的评论..." rows="3"></textarea><button class="btn btn-primary" id="submit-comment-btn">发布评论</button></div>') + '<div class="comments-list" id="comments-list"><div class="loading-screen" style="padding:40px;"><div class="spinner"></div><p>加载评论中...</p></div></div></div></div></div>';
      const bc = document.getElementById('content-blocks');
      blocks.forEach(b => {
        const el = document.createElement('div'); el.className = 'content-block';
        let h = '<div class="content-block-label">' + (b.type === 'text' ? '📝 文本' : b.type === 'image' ? '🖼 图片' : b.type === 'video' ? '🎬 视频' : '💻 代码') + '</div>';
        if (b.type === 'text') h += '<div class="text-content">' + escapeHtml(b.value) + '</div>';
        else if (b.type === 'image') h += (b.file_url || b.value) ? '<img src="' + (b.file_url || b.value) + '" alt="图片">' : '<span style="color:var(--text-light)">图片不可用</span>';
        else if (b.type === 'video') h += (b.file_url || b.value) ? '<video controls><source src="' + (b.file_url || b.value) + '"' + (b.file_mime_type ? ' type="' + b.file_mime_type + '"' : '') + '></video>' : '<span style="color:var(--text-light)">视频不可用</span>';
        else h += '<pre><code class="' + this._detectCodeLang(b.value) + '">' + escapeHtml(b.value || '') + '</code></pre>';
        el.innerHTML = h; bc.appendChild(el);
      });
      if (blocks.some(b => b.type === 'code')) loadHighlightJs().then(() => { document.querySelectorAll('pre code').forEach(el => { if (window.hljs) hljs.highlightElement(el); }); this._applyCollapse(); }); else this._applyCollapse();
      if (isAdmin) {
        document.getElementById('edit-post-btn').addEventListener('click', () => Router.navigate('#/edit/' + post.id));
        document.getElementById('delete-post-btn').addEventListener('click', async () => { if (!(await showConfirm('确定删除？'))) return; const b = document.getElementById('delete-post-btn'); b.disabled = true; b.textContent = '删除中...'; try { await API.deletePost(post.id); showToast('已删除', 'success'); var navTo = post.category === 'chat' ? '#/chats' : '#/works'; Router.navigate(navTo); } catch (err) { showToast(err.message, 'error'); b.disabled = false; b.textContent = '🗑 删除'; } });
      }
      this._bindReactionBar(postId);
      if (isAdmin) this._bindStatusToggles(postId);
      var _updateBmBtn = function(bookmarked) {
        var b = document.getElementById('bookmark-btn'); if (!b) return;
        b.textContent = bookmarked ? '📑' : '📖'; b.title = bookmarked ? '已收藏，点击管理' : '点击收藏';
      };
      API.checkBookmark(post.id).then(function(c) { _updateBmBtn((c.collection_ids||[]).length > 0); }).catch(function(){});
      document.getElementById('bookmark-btn')?.addEventListener('click', async function() { try { playClickSound(); var cols = (await API.getBookmarkCollections()).collections || []; var check = await API.checkBookmark(post.id); var sel = new Set((check.collection_ids || []).map(Number)); var ov = document.createElement('div'); ov.className = 'custom-modal-overlay'; ov.innerHTML = '<div class="custom-modal-dialog" style="max-width:420px;padding:20px 0;"><div style="padding:0 24px 16px;border-bottom:1px solid var(--border);"><div style="font-size:17px;font-weight:700;">📌 管理收藏</div></div><div style="padding:8px 0;max-height:320px;overflow-y:auto;">' + (cols.length ? cols.map(function(c) { var s = sel.has(c.id); return '<div class="picker-col-item" data-id="' + c.id + '" data-selected="' + (s ? '1' : '0') + '" style="padding:12px 24px;cursor:pointer;display:flex;align-items:center;gap:12px;"><span style="font-size:18px;width:24px;text-align:center;">' + (s ? '☑' : '☐') + '</span><div><div style="font-weight:600;font-size:14px;">' + escapeHtml(c.name) + '</div><div style="font-size:12px;color:var(--text-secondary);">' + (c.count || 0) + ' 个收藏</div></div></div>'; }).join('') : '<div style="padding:20px;text-align:center;color:var(--text-secondary);">暂无收藏夹，点击下方新建</div>') + '</div><div style="padding:12px 24px;border-top:1px solid var(--border);display:flex;gap:8px;justify-content:space-between;"><button class="btn btn-sm btn-outline" id="picker-new-col-btn">✚ 新建</button><div><button class="btn btn-sm btn-outline" id="picker-cancel-btn">取消</button><button class="btn btn-sm btn-primary" id="picker-confirm-btn" style="margin-left:8px;">保存</button></div></div></div>'; document.body.appendChild(ov); requestAnimationFrame(function(){ ov.classList.add('visible'); }); var cp = function(){ ov.classList.remove('visible'); ov.classList.add('closing'); setTimeout(function(){ if(ov.parentNode) ov.parentNode.removeChild(ov); }, 200); }; ov.querySelectorAll('.picker-col-item').forEach(function(it) { it.addEventListener('click', function() { var s = it.dataset.selected === '1'; it.dataset.selected = s ? '0' : '1'; it.style.borderLeft = s ? '' : '3px solid var(--primary)'; it.querySelector('span:first-child').textContent = s ? '☐' : '☑'; }); }); document.getElementById('picker-confirm-btn').addEventListener('click', async function() { var changed = 0, errors = 0; this.disabled = true; for (var i = 0; i < cols.length; i++) { var c = cols[i], el = ov.querySelector('.picker-col-item[data-id="' + c.id + '"]'); if (!el) continue; if ((el.dataset.selected === '1') !== sel.has(c.id)) { try { await API.toggleBookmark(post.id, c.id); changed++; } catch(e) { errors++; } } } cp(); if (errors > 0) showToast('部分操作失败（' + errors + ' 项），请重试', 'error'); else showToast(changed > 0 ? '已更新' : '未修改', 'success'); try { var c2 = await API.checkBookmark(post.id); _updateBmBtn((c2.collection_ids||[]).length > 0); } catch(e){} }); document.getElementById('picker-new-col-btn').addEventListener('click', async function() { var n = await showPrompt('新建收藏夹名称：', '', '我的收藏'); if (!n || !n.trim()) return; try { await API.createBookmarkCollection(n.trim()); showToast('已创建', 'success'); cp(); setTimeout(function() { document.getElementById('bookmark-btn').click(); }, 250); } catch(err) { showToast(err.message, 'error'); } }); document.getElementById('picker-cancel-btn').addEventListener('click', cp); ov.addEventListener('click', function(e) { if (e.target === ov) cp(); }); } catch(err) { showToast(err.message, 'error'); } });
      document.getElementById('report-post-btn')?.addEventListener('click', async () => { const r = await showPrompt('举报原因：', '', '违规内容'); if (!r || !r.trim()) return; try { await API.createReport('post', post.id, r.trim()); showToast('已提交', 'success'); } catch (err) { showToast(err.message, 'error'); } });
      await this._loadComments(postId); this._bindCommentForm(postId); this._bindCommentActions(postId);
      if (this._highlightCommentId) {
        var targetCommentId = this._highlightCommentId;
        setTimeout(() => {
          if (!this._expandToComment(targetCommentId)) { this._commentPage = 1; this._loadComments(postId).then(() => { this._expandToComment(targetCommentId); }); }
          this._highlightCommentId = null;
        }, 100);
      }
    } catch (err) { showToast(err.message, 'error'); this.renderPostList(); }
  },

  _detectCodeLang(code) { if (!code) return ''; const t = code.trim(); if (/^</.test(t)) return 'html'; if (/^{/.test(t) || /^}$/.test(t)) return 'json'; if (/^(import |export |const |let |var |function |=>)/.test(t)) return 'javascript'; if (/^(def |import |from |class )/.test(t)) return 'python'; if (/^(@|body |.class|#id|<!DOCTYPE)/.test(t)) return 'css'; return ''; },

  renderCreatePost(category) { this.editorMode = 'create'; this.editorPostId = null; this.editorBlocks = []; this._editorCategory = category === 'chat' ? 'chat' : 'work'; this._renderEditor(category === 'chat' ? '发布帖子' : '发布新作品', null, this._editorCategory); },
  async renderEditPost(postId) { this.editorMode = 'edit'; this.editorPostId = postId; this._deletedBlockIds = []; this.renderLoading(); try { const d = await API.getPost(postId); this.editorBlocks = (d.blocks || []).map(b => ({ _id: b.id, type: b.type, value: b.value || '', file_id: b.file_id || null, file_url: b.file_url || null, allow_preview: !!b.allow_preview, _tempId: Date.now() + '_' + Math.random().toString(36).substr(2, 5) })); this._renderEditor('编辑作品', d.post); } catch (err) { showToast(err.message, 'error'); Router.navigate('#/works'); } },

  async renderMyProfile() {
    this.renderLoading();
    try {
      var p = (await API.getMyProfile()).profile;
      var avatarUrl = p.avatar_url || '';
      var skills = (p.skills || []).slice();
      var self = this;
      var renderView = function() {
        var app = document.getElementById('app');
        app.innerHTML = '<div class="page-fade-in"><div class="about-page"><div class="about-card">' +
          '<div class="about-avatar">' + (avatarUrl ? '<img src="' + escapeHtml(avatarUrl) + '" alt="头像">' : '👤') + '</div>' +
          '<h1 style="text-align:center;font-size:24px;font-weight:700;margin-bottom:4px;">' + escapeHtml(p.nickname || p.username) + '</h1>' +
          '<div style="text-align:center;font-size:13px;color:var(--text-secondary);margin-bottom:16px;">' + (p.nickname ? '<span style="font-size:12px;color:var(--text-light);">@' + escapeHtml(p.username) + '</span> · ' : '') + (p.role === 'admin' ? '管理员' : '用户') + ' · ' + self._renderLevelBadge((p.level || 1)) + ' · ' + (p.xp || 0) + 'XP · ' + (p.points || 0) + '分 · 加入于 ' + formatDate(p.created_at) + '</div>' +
          '<div class="about-bio">' + escapeHtml(p.bio || '暂无简介') + '</div>' +
          (skills.length > 0 ? '<h3 style="margin-top:24px;font-size:16px;font-weight:600;">🛠 技能</h3><div class="about-skills">' + skills.map(function(s) { return '<span class="about-skill-tag">' + escapeHtml(s) + '</span>'; }).join('') + '</div>' : '') +
          '<div style="text-align:center;margin-top:16px;display:flex;gap:8px;justify-content:center;"><button class="btn btn-outline btn-sm" id="toggle-edit-profile">✏ 编辑个人信息</button><button class="btn btn-outline btn-sm" id="preview-other-view">👁 他人视角</button></div>' +
          '</div></div></div>';
        document.getElementById('toggle-edit-profile').addEventListener('click', function() { playClickSound(); renderEdit(); });
        document.getElementById('preview-other-view')?.addEventListener('click', function() { playClickSound(); Components.renderUserProfile(App.user.id); });
      };
      var renderEdit = function() {
        var app = document.getElementById('app');
        app.innerHTML = '<div class="page-fade-in"><div class="about-page"><form id="profile-edit-form"><div class="about-card">' +
          '<h2 style="font-size:22px;font-weight:700;margin-bottom:16px;">✏ 编辑个人信息</h2>' +
          '<div class="form-group" style="text-align:center;"><label class="form-label">头像</label><div style="display:flex;align-items:center;gap:16px;justify-content:center;flex-wrap:wrap;">' +
          '<div class="about-avatar" id="edit-avatar-preview" style="width:80px;height:80px;margin:0;">' + (avatarUrl ? '<img src="' + escapeHtml(avatarUrl) + '" alt="头像">' : '👤') + '</div>' +
          '<div><button type="button" class="btn btn-outline btn-sm" id="edit-upload-avatar-btn">📁 上传头像</button><input type="file" id="edit-avatar-file-input" accept="image/jpeg,image/png,image/gif,image/webp" style="display:none;"><div style="font-size:12px;color:var(--text-light);margin-top:4px;">建议 1:1 方形图片</div></div></div></div>' +
          '<div class="form-group"><label class="form-label">昵称</label><input class="form-input" id="edit-nickname" value="' + escapeHtml(p.nickname || '') + '"></div>' +
          '<div class="form-group"><label class="form-label">个人简介</label><textarea class="form-textarea" id="edit-bio" rows="3">' + escapeHtml(p.bio || '') + '</textarea></div>' +
          '<div class="form-group"><label class="form-label">技能（回车添加）</label><div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:4px;" id="edit-skills-container">' + skills.map(function(s) { return '<span class="about-skill-tag" style="cursor:pointer;" data-skill="' + escapeHtml(s) + '">' + escapeHtml(s) + ' ✕</span>'; }).join('') + '</div><input class="form-input" id="edit-skill-input" placeholder="输入技能后回车" style="width:200px;"></div>' +
          '<div class="form-group"><label class="form-label">GitHub</label><input class="form-input" id="edit-github" value="' + escapeHtml((p.social && p.social.github) || '') + '"></div>' +
          '<div class="form-group"><label class="form-label">微博</label><input class="form-input" id="edit-weibo" value="' + escapeHtml((p.social && p.social.weibo) || '') + '"></div>' +
          '<div class="form-group"><label class="form-label">邮箱</label><input class="form-input" id="edit-email" value="' + escapeHtml((p.social && p.social.email) || '') + '"></div>' +
          '<div class="form-group"><label class="form-label">修改密码</label><input class="form-input" id="edit-curr-pw" type="password" placeholder="当前密码" style="margin-bottom:4px;"><input class="form-input" id="edit-new-pw" type="password" placeholder="新密码（至少6位）" style="margin-bottom:4px;"><button type="button" class="btn btn-sm btn-outline" id="edit-change-pw-btn">修改密码</button></div>' +
          '<div style="display:flex;gap:12px;margin-top:8px;"><button type="submit" class="btn btn-primary" id="edit-save-btn">💾 保存</button><button type="button" class="btn btn-outline" id="edit-cancel-btn">取消</button></div>' +
          '</div></form></div></div>';
        document.getElementById('edit-upload-avatar-btn').addEventListener('click', function() { document.getElementById('edit-avatar-file-input').click(); });
        document.getElementById('edit-avatar-file-input').addEventListener('change', async function(e) { var f = e.target.files[0]; if (!f) return; try { var croppedBlob = await openCropModal(f, 1); if (!croppedBlob) { this.value = ''; return; } var btn = document.getElementById('edit-upload-avatar-btn'); btn.disabled = true; btn.textContent = '⏳ 上传中...'; var result = await API.uploadAvatar(new File([croppedBlob], 'avatar.jpg', { type: 'image/jpeg' })); avatarUrl = result.avatar_url; var preview = document.getElementById('edit-avatar-preview'); preview.innerHTML = '<img src="' + escapeHtml(avatarUrl) + '?t=' + Date.now() + '" alt="头像">'; showToast('头像已更新', 'success'); btn.disabled = false; btn.textContent = '📁 更换头像'; } catch(err) { showToast(err.message, 'error'); } this.value = ''; });
        document.getElementById('edit-skill-input').addEventListener('keydown', function(e) { if (e.key !== 'Enter') return; var v = this.value.trim(); if (!v) return; skills.push(v); this.value = ''; document.getElementById('edit-skills-container').innerHTML = skills.map(function(s) { return '<span class="about-skill-tag" style="cursor:pointer;" data-skill="' + escapeHtml(s) + '">' + escapeHtml(s) + ' ✕</span>'; }).join(''); });
        document.getElementById('edit-skills-container').addEventListener('click', function(e) { var tag = e.target.closest('.about-skill-tag'); if (!tag) return; var idx = skills.indexOf(tag.dataset.skill); if (idx >= 0) skills.splice(idx, 1); tag.remove(); });
        document.getElementById('profile-edit-form').addEventListener('submit', async function(e) { e.preventDefault(); try { await API.updateMyProfile({ nickname: document.getElementById('edit-nickname').value, bio: document.getElementById('edit-bio').value, social: { github: document.getElementById('edit-github').value, weibo: document.getElementById('edit-weibo').value, email: document.getElementById('edit-email').value }, skills: skills, avatar_url: avatarUrl }); showToast('已保存', 'success'); p.nickname = document.getElementById('edit-nickname').value; p.bio = document.getElementById('edit-bio').value; p.skills = skills.slice(); renderView(); } catch(err) { showToast(err.message, 'error'); } });
        document.getElementById('edit-change-pw-btn').addEventListener('click', async function() { var cur = document.getElementById('edit-curr-pw').value, nw = document.getElementById('edit-new-pw').value; if (!cur || !nw) { showToast('请填写完整', 'error'); return; } try { await API.changePassword(cur, nw); showToast('密码已修改', 'success'); document.getElementById('edit-curr-pw').value = ''; document.getElementById('edit-new-pw').value = ''; } catch(err) { showToast(err.message, 'error'); } });
        document.getElementById('edit-cancel-btn').addEventListener('click', function() { renderView(); });
      };
      renderView();
    } catch (err) { showToast(err.message, 'error'); Router.navigate('#/works'); }
  },

  async renderUserProfile(userId) {
    this.renderLoading();
    try {
      const [pd, ps] = await Promise.all([API.getUserProfile(userId), API.getUserPosts(userId)]);
      const p = pd.profile, posts = ps.posts || [], currentUser = App.user, isOwn = currentUser && currentUser.id === userId;
      document.getElementById('app').innerHTML = '<div class="page-fade-in"><div class="about-page"><div class="about-card"><div class="about-avatar">' + (p.avatar_url ? '<img src="' + escapeHtml(p.avatar_url) + '" alt="头像">' : '👤') + '</div><h1 style="text-align:center;font-size:24px;font-weight:700;margin-bottom:4px;">' + escapeHtml(p.nickname || p.username) + '</h1><div style="text-align:center;font-size:13px;color:var(--text-secondary);margin-bottom:16px;">' + (p.nickname ? '<span style="font-size:12px;color:var(--text-light);">@' + escapeHtml(p.username) + '</span> · ' : '') + (p.role === 'admin' ? '管理员' : '用户') + ' · ' + this._renderLevelBadge(p.level || 1) + ' · ' + (p.xp || 0) + 'XP · ' + (p.points || 0) + '分 · 加入于 ' + formatDate(p.created_at) + (p.is_banned ? '<span style="margin-left:8px;color:var(--error);font-weight:600;">🚫 已禁言</span>' : '') + '</div><div class="about-bio">' + escapeHtml(p.bio || '暂无简介') + '</div>' + (p.skills && p.skills.length > 0 ? '<h3 style="margin-top:24px;font-size:16px;font-weight:600;">🛠 技能</h3><div class="about-skills">' + p.skills.map(s => '<span class="about-skill-tag">' + escapeHtml(s) + '</span>').join('') + '</div>' : '') + (p.social && (p.social.github || p.social.weibo || p.social.email) ? '<h3 style="margin-top:24px;font-size:16px;font-weight:600;">🔗 社交</h3><div class="about-social">' + (p.social.github ? '<a href="' + escapeHtml(p.social.github) + '" target="_blank" rel="noopener">🐙 GitHub</a>' : '') + (p.social.weibo ? '<a href="' + escapeHtml(p.social.weibo) + '" target="_blank" rel="noopener">📢 微博</a>' : '') + (p.social.email ? '<a href="mailto:' + escapeHtml(p.social.email) + '">✉️ ' + escapeHtml(p.social.email) + '</a>' : '') + '</div>' : '') + '<div style="text-align:center;margin-top:16px;display:flex;gap:8px;justify-content:center;" id="friend-action-area"><div class="spinner" style="width:20px;height:20px;border-width:2px;"></div></div>' +
        '<h3 style="margin-top:32px;font-size:16px;font-weight:600;">📂 作品</h3>' + (posts.length === 0 ? '<div class="empty-state"><p>暂无作品</p></div>' : '<div class="post-grid" id="user-post-grid">' + posts.map(function(pt) { return '<div class="post-card" data-post-id="' + pt.id + '"><div class="post-card-img" style="' + (pt.cover_url ? "background-image:url('" + pt.cover_url + "');background-size:cover;background-position:center;" : '') + '">' + (pt.cover_url ? '' : '📄') + '</div><div class="post-card-body"><div class="post-card-title">' + escapeHtml(pt.title) + '</div><div class="post-card-desc">' + escapeHtml(pt.description || '暂无简介') + '</div><div class="post-card-footer"><div class="post-card-views">👁 ' + (pt.views || 0) + '</div></div></div></div>'; }).join('') + '</div>') + '<div id="public-playlists-area"></div></div></div></div>';
      document.querySelectorAll('#user-post-grid .post-card')?.forEach(c => c.addEventListener('click', () => { playClickSound(); Router.navigate('#/posts/' + c.dataset.postId); }));
      if (currentUser) {
        API.getUserPublicPlaylists(userId).then(function(pd) { var pls = pd.playlists || []; var area = document.getElementById('public-playlists-area'); if (!area) return; if (pls.length === 0) { area.style.display = 'none'; return; } area.innerHTML = '<h3 style="margin-top:32px;font-size:16px;font-weight:600;">🎵 公开歌单</h3><div class="music-playlist-grid">' + pls.map(function(pl) { var pc = pl.cover_url ? '<img src="' + escapeHtml(pl.cover_url) + '" style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0;">' : '<span class="music-playlist-card-cover-icon">📋</span>'; return '<div class="music-playlist-card" data-pid="' + pl.id + '" style="cursor:pointer;"><div class="music-playlist-card-cover" style="position:relative;height:100px;">' + pc + '</div><div class="music-playlist-card-body"><div class="music-playlist-name">' + escapeHtml(pl.name) + '</div><div class="music-playlist-count"><span class="music-playlist-count-badge">' + (pl.song_count || 0) + ' 首</span></div></div></div>'; }).join('') + '</div>'; area.querySelectorAll('.music-playlist-card').forEach(function(card) { card.addEventListener('click', function() { Router.navigate('#/music/playlist/' + this.dataset.pid); }); }); }).catch(function() {});
        if (isOwn) { var fa = document.getElementById('friend-action-area'); if (fa) fa.innerHTML = '<span style="font-size:13px;color:var(--text-light);">这是你的个人主页（他人视角）</span>'; } else { this._checkAndRenderFriendButton(userId); }
      }
    } catch (err) { showToast(err.message, 'error'); this.renderPostList(); }
  },

  async _checkAndRenderFriendButton(userId) {
    try { const d = await API.getFriendshipStatus(userId), area = document.getElementById('friend-action-area'); if (!area) return; const labels = { friends: '<span style="font-size:13px;color:var(--success);font-weight:600;">✅ 已是好友</span>', request_sent: '<span style="font-size:13px;color:var(--text-light);">⏳ 好友申请已发送</span>', request_received: '<button class="btn btn-sm btn-primary" id="accept-friend-btn">✅ 接受好友申请</button>', none: '<button class="btn btn-sm btn-outline" id="add-friend-btn">➕ 添加好友</button>' }; area.innerHTML = labels[d.status] || ''; document.getElementById('add-friend-btn')?.addEventListener('click', async () => { try { await API.sendFriendRequest(userId); showToast('已发送', 'success'); Components._checkAndRenderFriendButton(userId); } catch (err) { showToast(err.message, 'error'); } }); const ab = document.getElementById('accept-friend-btn'); if (ab) { try { const rd = await API.getFriendRequests(); const r = (rd.requests || []).find(x => x.from_user_id === userId); if (r) ab.addEventListener('click', async () => { try { await API.approveFriendRequest(r.id); showToast('已添加', 'success'); Components._checkAndRenderFriendButton(userId); } catch (err) { showToast(err.message, 'error'); } }); } catch(e) {} } } catch (e) {}
  },

  async _loadComments(postId) { try { this._commentPage = 1; const d = await API.getComments(postId); this._renderComments(d.comments || [], postId); } catch (err) { const l = document.getElementById('comments-list'); if (l) l.innerHTML = '<div class="empty-state"><p>加载评论失败</p></div>'; } },

  _renderComments(comments, postId) {
    const list = document.getElementById('comments-list'); if (!list) return;
    if (comments.length === 0) { list.innerHTML = '<div class="empty-state" style="padding:20px;"><p style="font-size:14px;color:var(--text-light);">暂无评论</p></div>'; return; }
    var expandedSave = new Set(); list.querySelectorAll('.comment-nested').forEach(function(n) { if (n.style.display !== 'none') expandedSave.add(n.dataset.parent); });
    const userMap = {}, replies = {};
    comments.forEach(c => { userMap[c.id] = c.nickname || c.username; if (c.parent_id) { if (!replies[c.parent_id]) replies[c.parent_id] = []; replies[c.parent_id].push(c); } });
    Object.keys(replies).forEach(pid => { replies[pid].sort((a, b) => a.created_at.localeCompare(b.created_at)); });
    const topAll = comments.filter(c => !c.parent_id), totalPages = Math.ceil(topAll.length / this._commentPageSize) || 1;
    const pageTop = topAll.slice((this._commentPage - 1) * this._commentPageSize, this._commentPage * this._commentPageSize);
    function countAll(pid) { var t = (replies[pid] || []).length; (replies[pid] || []).forEach(function(k) { t += countAll(k.id); }); return t; }
    let html = '';
    pageTop.forEach(top => { var rc = replies[top.id] ? countAll(top.id) : 0; html += this._renderCommentItem(top, App.user, postId, 0, null, rc); if (replies[top.id] && replies[top.id].length > 0) { var defDisplay = expandedSave.has(String(top.id)) ? '' : 'display:none;'; html += '<div class="comment-nested" data-parent="' + top.id + '" style="' + defDisplay + '">'; (function rt(pid, d) { (replies[pid] || []).forEach(function(ch) { var crc = replies[ch.id] ? countAll(ch.id) : 0; html += Components._renderCommentItem(ch, App.user, postId, d, userMap[ch.parent_id] || null, crc); rt(ch.id, d + 1); }); })(top.id, 1); html += '</div>'; } });
    if (totalPages > 1) { html += '<div style="display:flex;justify-content:center;gap:6px;padding:16px 0;flex-wrap:wrap;"><button class="btn btn-sm btn-outline" data-cp="prev"' + (this._commentPage <= 1 ? ' disabled' : '') + '>上一页</button>'; for (let i = 1; i <= totalPages; i++) html += '<button class="btn btn-sm ' + (i === this._commentPage ? 'btn-primary' : 'btn-outline') + '" data-cp="' + i + '">' + i + '</button>'; html += '<button class="btn btn-sm btn-outline" data-cp="next"' + (this._commentPage >= totalPages ? ' disabled' : '') + '>下一页</button></div>'; }
    list.innerHTML = html;
    expandedSave.forEach(function(pid) { var n = list.querySelector('.comment-nested[data-parent="' + pid + '"]'); var btn = list.querySelector('.toggle-nested-btn[data-parent="' + pid + '"]'); if (n) n.style.display = ''; if (btn && n) { var c = n.querySelectorAll('.comment').length; btn.textContent = '🐾 收起 ' + c + ' 条回复'; } });
    list.querySelectorAll('[data-cp]').forEach(b => b.addEventListener('click', () => { const v = b.dataset.cp; if (v === 'prev' && this._commentPage > 1) this._commentPage--; else if (v === 'next' && this._commentPage < totalPages) this._commentPage++; else if (v !== 'prev' && v !== 'next') this._commentPage = parseInt(v); else return; this._renderComments(comments, postId); }));
    list.querySelectorAll('.toggle-nested-btn').forEach(t => t.addEventListener('click', function(e) { e.stopPropagation(); var n = list.querySelector('.comment-nested[data-parent="' + this.dataset.parent + '"]'); if (!n) return; var h = n.style.display === 'none'; n.style.display = h ? '' : 'none'; var c = n.querySelectorAll('.comment').length; this.textContent = h ? '🐾 收起 ' + c + ' 条回复' : '🐾 ' + c + ' 条回复'; }));
    this._applyCollapse();
  },

  _renderCommentItem(comment, currentUser, postId, depth, replyToName, replyCount) {
    const canModify = currentUser && (currentUser.id === comment.user_id || currentUser.role === 'admin');
    var toggleBtn = replyCount > 0 ? '<button type="button" class="comment-action-btn toggle-nested-btn" data-parent="' + comment.id + '" style="cursor:pointer;">🐾 ' + replyCount + ' 条回复</button>' : '';
    return '<div class="comment' + (depth > 0 ? ' comment-reply' : '') + '" data-comment-id="' + comment.id + '" data-depth="' + depth + '"><div class="comment-avatar" data-user-id="' + comment.user_id + '" style="cursor:pointer;">' + (comment.avatar_url ? '<img src="' + escapeHtml(comment.avatar_url) + '" alt="头像">' : escapeHtml((comment.nickname || comment.username).charAt(0).toUpperCase())) + '</div><div class="comment-body"><div class="comment-header"><span class="comment-author" data-user-id="' + comment.user_id + '" style="cursor:pointer;">' + escapeHtml(comment.nickname || comment.username) + '</span>' + this._renderLevelBadge((comment.user_level || 1)) + '' + (replyToName ? '<span class="comment-reply-to">回复 @' + escapeHtml(replyToName) + '</span>' : '') + (comment.user_id === postId ? '<span class="comment-author-badge">作者</span>' : '') + '<span class="comment-date">' + formatDate(comment.created_at) + '</span>' + (comment.updated_at !== comment.created_at ? '<span class="comment-edited">（已编辑）</span>' : '') + '</div><div class="comment-content">' + escapeHtml(comment.content) + '</div><div class="comment-actions"><button type="button" class="comment-action-btn reply-btn">回复</button>' + (canModify ? '<button type="button" class="comment-action-btn edit-btn">编辑</button><button type="button" class="comment-action-btn delete-btn">删除</button>' : '') + toggleBtn + '</div><div class="comment-edit-form" style="display:none;"><textarea class="form-textarea edit-textarea" rows="2">' + escapeHtml(comment.content) + '</textarea><div style="display:flex;gap:8px;margin-top:8px;"><button type="button" class="btn btn-primary btn-sm save-edit-btn">保存</button><button type="button" class="btn btn-outline btn-sm cancel-edit-btn">取消</button></div></div><div class="reply-form" style="display:none;"><textarea class="form-textarea reply-textarea" rows="2" placeholder="回复 ' + escapeHtml(comment.username) + '..."></textarea><div style="display:flex;gap:8px;margin-top:8px;"><button type="button" class="btn btn-primary btn-sm submit-reply-btn">回复</button><button type="button" class="btn btn-outline btn-sm cancel-reply-btn">取消</button></div></div></div></div>';
  },

  _bindCommentForm(postId) {
    const input = document.getElementById('comment-input'), btn = document.getElementById('submit-comment-btn');
    if (!input || !btn) return; const nb = btn.cloneNode(true); btn.parentNode.replaceChild(nb, btn);
    const submit = async () => { const c = input.value.trim(); if (!c) { showToast('请输入评论', 'warning'); return; } if (this._isButtonDisabled(nb)) return; this._disableButton(nb, '发布中...'); try { var result = await API.createComment(postId, c); input.value = ''; showToast('已发布', 'success'); App.refreshLevel(); var newCommentId = result.comment ? result.comment.id : null; const d = await API.getComments(postId); this._renderComments(d.comments || [], postId); if (newCommentId) { setTimeout(function() { Components._expandToComment(newCommentId); }, 100); } } catch (err) { showToast(err.message, 'error'); } finally { this._enableButton(nb, '发布评论'); } };
    nb.addEventListener('click', submit);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); submit(); } });
  },

  _bindCommentActions(postId) {
    const list = document.getElementById('comments-list');
    if (!list || list.dataset.commentsBound === 'true') return;
    list.dataset.commentsBound = 'true';
    list.addEventListener('click', async (e) => {
      const pt = e.target.closest('[data-user-id]');
      if (pt && (pt.classList.contains('comment-avatar') || pt.classList.contains('comment-author'))) { playClickSound(); Router.navigate('#/users/' + pt.dataset.userId); return; }
      const ce = e.target.closest('.comment'); if (!ce) return; const cid = parseInt(ce.dataset.commentId); if (isNaN(cid)) return;
      if (e.target.classList.contains('reply-btn')) { playClickSound(); list.querySelectorAll('.reply-form').forEach(f => f.style.display = 'none'); const rf = ce.querySelector('.reply-form'); if (rf) { rf.style.display = rf.style.display === 'none' ? 'block' : 'none'; if (rf.style.display === 'block') rf.querySelector('.reply-textarea').focus(); } return; }
      if (e.target.classList.contains('edit-btn')) { playClickSound(); list.querySelectorAll('.comment-edit-form').forEach(f => f.style.display = 'none'); const ef = ce.querySelector('.comment-edit-form'), ct = ce.querySelector('.comment-content'); if (ef && ct) { ct.style.display = 'none'; ef.style.display = 'block'; ef.querySelector('.edit-textarea').focus(); } return; }
      if (e.target.classList.contains('delete-btn')) { if (!(await showConfirm('确定删除？'))) return; try { await API.deleteComment(cid); showToast('已删除', 'success'); const d = await API.getComments(postId); this._renderComments(d.comments || [], postId); } catch (err) { showToast(err.message, 'error'); } return; }
      if (e.target.classList.contains('save-edit-btn')) { const c = ce.querySelector('.comment-edit-form .edit-textarea').value.trim(); if (!c) { showToast('不能为空', 'warning'); return; } try { await API.updateComment(cid, c); showToast('已更新', 'success'); const d = await API.getComments(postId); this._renderComments(d.comments || [], postId); } catch (err) { showToast(err.message, 'error'); } return; }
      if (e.target.classList.contains('cancel-edit-btn')) { const ef = ce.querySelector('.comment-edit-form'), ct = ce.querySelector('.comment-content'); if (ef && ct) { ef.style.display = 'none'; ct.style.display = 'block'; } return; }
      if (e.target.classList.contains('submit-reply-btn')) { const c = ce.querySelector('.reply-form .reply-textarea').value.trim(); if (!c) { showToast('不能为空', 'warning'); return; } try { var r = await API.createComment(postId, c, cid); var nid = r.comment ? r.comment.id : null; showToast('回复成功', 'success'); App.refreshLevel(); const d = await API.getComments(postId); this._renderComments(d.comments || [], postId); if (nid) { setTimeout(function() { Components._expandToComment(nid); }, 100); } } catch (err) { showToast(err.message, 'error'); } return; }
      if (e.target.classList.contains('cancel-reply-btn')) { const rf = ce.querySelector('.reply-form'); if (rf) rf.style.display = 'none'; }
    });
  },

  _isButtonDisabled(btn) { return btn && btn.disabled; },
  _disableButton(btn, text) { if (btn) { btn.disabled = true; btn.textContent = text; } },
  _enableButton(btn, text) { if (btn) { btn.disabled = false; btn.textContent = text; } },

  _applyCollapse() {
    document.querySelectorAll('.content-block .text-content').forEach(el => { if (el.textContent.length > 150) this._makeCollapsible(el, el.textContent, 'char', 150); });
    document.querySelectorAll(".content-block pre code").forEach(el => { var lns = el.textContent.split("\n"); if (lns.filter(function(x,i){return i<lns.length-1||x.length>0;}).length > 5) Components._makeCollapsible(el, lns, "code", 5); });
    document.querySelectorAll('.comment-content').forEach(el => { if (el.textContent.length > 100) this._makeCollapsible(el, el.textContent, 'char', 100); });
  },

    _makeCollapsible(el, data, type, limit) {
    if (el.dataset.collapseDone) return; el.dataset.collapseDone = '1';
    const full = el.innerHTML, t = document.createElement('span');
    t.style.cssText = 'cursor:pointer;color:var(--primary);font-size:12px;margin-left:4px;';
    if (type === 'char') { el.innerHTML = escapeHtml(data.substring(0, limit)) + '...'; t.textContent = '\u5c55\u5f00'; }
    else { el.innerHTML = escapeHtml(data.slice(0, limit).join('\\n')) + '\n...'; t.textContent = '\u5c55\u5f00\u5168\u90e8\u4ee3\u7801'; }
    t.addEventListener('click', () => { el.innerHTML = full; t.remove(); }); el.appendChild(t);
  },

  _bindReactionBar(postId) {
    document.getElementById('reaction-bar')?.addEventListener('click', async (e) => {
      const btn = e.target.closest('.reaction-btn'); if (!btn) return; playClickSound();
      try { const r = await API.setReaction(postId, btn.classList.contains('active') ? null : btn.dataset.type); if (btn.dataset.type === 'like') App.refreshLevel(); document.getElementById('like-count').textContent = r.like_count; document.getElementById('dislike-count').textContent = r.dislike_count; document.querySelectorAll('.reaction-btn').forEach(b => b.classList.remove('active')); if (r.type) document.querySelector('.reaction-btn[data-type="' + r.type + '"]').classList.add('active'); } catch (err) { showToast(err.message, 'error'); }
    });
  },

  _bindStatusToggles(postId) {
    document.getElementById('sticky-toggle-btn')?.addEventListener('click', async function() { try { await API.setPostStatus(postId, { sticky: !this.textContent.includes('已置顶') }); showToast('已更新', 'success'); Components.renderPostDetail(postId); } catch(err) { showToast(err.message, 'error'); } });
    document.getElementById('featured-toggle-btn')?.addEventListener('click', async function() { try { await API.setPostStatus(postId, { featured: !this.textContent.includes('已精华') }); showToast('已更新', 'success'); Components.renderPostDetail(postId); } catch(err) { showToast(err.message, 'error'); } });
    document.getElementById('lock-toggle-btn')?.addEventListener('click', async function() { try { await API.lockPost(postId, !this.textContent.includes('已锁定')); showToast('已更新', 'success'); Components.renderPostDetail(postId); } catch(err) { showToast(err.message, 'error'); } });
  },

  _expandToComment(commentId) {
    var el = document.querySelector('[data-comment-id="' + commentId + '"]');
    if (!el) return false;
    var p = el.parentElement;
    while (p) { if (p.classList.contains('comment-nested')) { p.style.display = ''; var pid = p.dataset.parent; var toggle = document.querySelector('.toggle-nested-btn[data-parent="' + pid + '"]'); if (toggle) { var count = p.querySelectorAll('.comment').length; toggle.textContent = '🐾 收起 ' + count + ' 条回复'; } } p = p.parentElement; }
    el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.style.background = 'rgba(37,99,235,0.08)'; setTimeout(function() { if (el) el.style.background = ''; }, 2000); return true;
  },

  async renderNotifications() {
    this.renderLoading();
    try {
      var n = (await API.getNotifications()).notifications || [];
      var labels = { reply: '回复了你的评论', comment: '评论了你的帖子', sticky: '帖子被置顶', featured: '帖子被设为精华', locked: '帖子被锁定', post_deleted: '帖子被删除', friend_request: '请求添加好友', friend_approved: '通过了你的好友申请', message: '发送了私信', bookmark: '收藏了你的帖子', playlist_collect: '收藏了你的歌单', banned: '你已被禁言' };
      var icons = { reply: '💬', comment: '💬', sticky: '📌', featured: '⭐', locked: '🔒', post_deleted: '🗑️', friend_request: '👥', friend_approved: '✅', message: '✉️', bookmark: '🔖', playlist_collect: '📋', banned: '🚫' };
      var unreadCount = n.filter(function(x) { return !x.is_read; }).length;
      var getNotifNav = function(x) {
        var nav = null, toastMsg = null; var postDeleted = x.post_deleted ? true : false; var navToPosts = postDeleted ? null : (x.post_id ? '#/posts/' + x.post_id : null);
        switch (x.type) { case 'reply': if (postDeleted) { toastMsg = '原帖已被删除'; break; } nav = navToPosts; break; case 'comment': case 'sticky': case 'featured': case 'locked': case 'bookmark': if (postDeleted) { toastMsg = '原帖已被删除'; break; } nav = navToPosts; break; case 'post_deleted': toastMsg = '帖子已被删除'; break; case 'message': nav = '#/chat/' + x.actor_id; break; case 'friend_request': case 'friend_approved': nav = '#/friends'; break; case 'playlist_collect': toastMsg = '有人收藏了你的歌单'; break; case 'banned': toastMsg = '你已被禁言'; break; default: nav = '#/works'; }
        return { nav: nav, toast: toastMsg };
      };
      var groups = {};
      n.forEach(function(x) { var g = getDateGroup(x.created_at); if (!groups[g]) groups[g] = []; groups[g].push(x); });
      var sortedGroups = Object.keys(groups).sort(function(a,b) { var o = ['今天','昨天','本周']; return o.indexOf(a) >=0 && o.indexOf(b) >=0 ? o.indexOf(a)-o.indexOf(b) : a.localeCompare(b); });
      document.getElementById('app').innerHTML = '<div class="page-fade-in"><div class="notif-page-wrap"><div class="notif-header-card"><div class="notif-title-row"><h2>🔔 通知' + (unreadCount > 0 ? '<span class="count-badge">' + unreadCount + ' 条未读</span>' : '') + '</h2>' + (unreadCount > 0 ? '<button class="btn btn-sm btn-outline" id="mark-all-read-btn">全部已读</button>' : '') + '</div></div>' + (n.length === 0 ? '<div class="notif-empty"><div class="notif-empty-icon">🔔</div><div class="notif-empty-text">暂无通知</div></div>' : '<div class="notif-list">' + sortedGroups.map(function(g) { var items = groups[g]; return '<div class="notif-date-group">' + g + '</div>' + items.map(function(x) { var navInfo = getNotifNav(x); var accentClass = x.type; return '<div class="notif-card' + (x.is_read ? '' : ' unread') + '" data-id="' + x.id + '" data-type="' + x.type + '" data-post-id="' + (x.post_id || '') + '" data-comment-id="' + (x.comment_id || '') + '" data-actor-id="' + (x.actor_id || '') + '" data-post-deleted="' + (x.post_deleted || 0) + '" data-nav="' + (navInfo.nav || '') + '"><div class="notif-accent ' + accentClass + '"></div><div class="notif-card-body"><div class="notif-icon-circle ' + accentClass + '">' + (icons[x.type] || '🔔') + '</div><div class="notif-content"><div><span class="notif-actor">' + escapeHtml(x.actor_name) + '</span><span class="notif-action-label">' + (labels[x.type] || x.type) + '</span></div>' + (x.post_title ? '<div class="notif-post-title' + (x.post_deleted ? ' deleted' : '') + '">' + escapeHtml(x.post_title) + '</div>' : '') + (x.reply_content ? '<div class="notif-reply-preview">' + escapeHtml(x.reply_content) + '</div>' : '') + '<div class="notif-meta-row"><span class="notif-time">' + formatRelativeTime(x.created_at) + '</span>' + (navInfo.nav ? '<span class="notif-action-hint">点击查看 →</span>' : '') + '</div></div>' + (x.is_read ? '' : '<div class="notif-right-col"><span class="notif-unread-dot"></span></div>') + '</div></div>'; }).join(''); }).join('') + '</div>') + '</div></div>';
      document.querySelectorAll('.notif-card').forEach(function(i) { i.addEventListener('click', async function() { var id = parseInt(this.dataset.id); if (id) try { await API.markAsRead(id); } catch(e) {} var type = this.dataset.type; var commentId = this.dataset.commentId ? parseInt(this.dataset.commentId) : null; var postDeleted = this.dataset.postDeleted === '1'; var navTo = this.dataset.nav; if (type === 'reply' && commentId && !postDeleted && navTo) { navTo = navTo.split('?')[0] + '?comment=' + commentId; } if (navTo) { Router.navigate(navTo); } else { switch (type) { case 'post_deleted': showToast('该帖子已被管理员删除', 'info'); break; case 'banned': showToast('你已被管理员禁言', 'error'); break; case 'playlist_collect': showToast('有人收藏了你的歌单', 'info'); break; default: Components.renderNotifications(); } } }); });
      document.getElementById('mark-all-read-btn')?.addEventListener('click', async function() { try { await API.markAllAsRead(); showToast('已全部标记已读', 'success'); var b = document.getElementById('unread-badge'); if (b) { b.style.display = 'none'; } Components.renderNotifications(); } catch (err) { showToast(err.message, 'error'); } });
    } catch (err) { showToast(err.message, 'error'); Router.navigate('#/works'); }
  },

  async renderBookmarks() {
    this.renderLoading();
    try {
      var cols = (await API.getBookmarkCollections()).collections || [], curId = this._currentBookmarkColId, bms = [], pag = {};
      if (curId) { var bd = await API.getBookmarks(curId); bms = bd.bookmarks || []; pag = bd.pagination || {}; }
      document.getElementById('app').innerHTML = '<div class="page-fade-in"><div class="settings-page"><div class="settings-card"><h2 style="font-size:22px;font-weight:700;margin-bottom:16px;">🔖 收藏夹</h2><div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px;" id="bm-col-list">' + (cols.map(function(c) { return '<button class="btn btn-sm ' + (c.id === curId ? 'btn-primary' : 'btn-outline') + '" data-col-id="' + c.id + '">' + escapeHtml(c.name) + ' (' + (c.count || 0) + ')</button>'; }).join('') || '<span style="color:var(--text-secondary);">暂无收藏夹</span>') + '</div><div style="display:flex;gap:8px;"><input class="form-input" id="new-col-name" placeholder="新收藏夹名称" style="flex:1;"><button class="btn btn-primary" id="create-col-btn">创建</button></div>' + (curId ? '<button class="btn btn-outline btn-sm" id="del-col-btn" style="color:var(--error);margin-top:12px;">删除当前收藏夹</button>' : '') + '</div>' + (curId ? '<div class="settings-card" style="margin-top:16px;"><h3 style="font-size:18px;font-weight:700;margin-bottom:12px;">收藏的帖子</h3>' + (bms.length === 0 ? '<p style="color:var(--text-secondary);">暂无收藏</p>' : bms.map(function(b) { return '<div class="shop-item" style="cursor:pointer;" data-pid="' + b.post_id + '"><div class="shop-item-info"><div class="shop-item-name">' + escapeHtml(b.post_title || '无标题') + '</div><div class="shop-item-desc">' + escapeHtml(b.author || '') + '</div></div></div>'; }).join('')) + (pag.totalPages > 1 ? '<div style="display:flex;justify-content:center;gap:4px;padding:12px 0;"><button class="btn btn-sm btn-outline" data-bp="prev">上一页</button><span style="padding:4px 8px;">' + pag.page + '/' + pag.totalPages + '</span><button class="btn btn-sm btn-outline" data-bp="next">下一页</button></div>' : '') + '</div>' : '') + '</div></div>';
      document.querySelectorAll('[data-col-id]').forEach(b => b.addEventListener('click', function() { Components._currentBookmarkColId = parseInt(this.dataset.colId); Components.renderBookmarks(); }));
      document.getElementById('create-col-btn').addEventListener('click', async function() { var n = document.getElementById('new-col-name').value.trim(); if (!n) { showToast('请输入名称', 'error'); return; } try { await API.createBookmarkCollection(n); showToast('已创建', 'success'); Components.renderBookmarks(); } catch(err) { showToast(err.message, 'error'); } });
      document.getElementById('del-col-btn')?.addEventListener('click', async function() { if (!(await showConfirm('确定删除？'))) return; try { await API.deleteBookmarkCollection(curId); Components._currentBookmarkColId = null; Components.renderBookmarks(); } catch(err) { showToast(err.message, 'error'); } });
      document.querySelectorAll('[data-pid]').forEach(i => i.addEventListener('click', function() { Router.navigate('#/posts/' + this.dataset.pid); }));
    } catch (err) { showToast(err.message, 'error'); Router.navigate('#/works'); }
  },

  async renderMusicLibrary() {
    this._musicTab = 'songs'; this.renderLoading();
    try {
      const [songData, plData] = await Promise.all([API.getMySongs(), API.getMyPlaylists()]);
      const songs = songData.songs || []; const playlists = plData.playlists || [];
      var app = document.getElementById('app');
      var renderSongs = function() {
        document.getElementById('music-content').innerHTML = '<div class="music-toolbar" style="display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap;"><input class="search-input" id="song-search" type="text" placeholder="搜索歌曲..." style="flex:1;min-width:150px;"><button class="btn btn-primary btn-sm" id="upload-song-btn">🎵 上传歌曲</button></div><div class="admin-batch-bar" id="song-batch-bar" style="display:none;margin-bottom:8px;"><label class="form-checkbox" style="font-size:13px;"><input type="checkbox" id="select-all-songs"> 全选</label><button class="btn btn-danger btn-sm" id="delete-selected-songs-btn" disabled>🗑️ 删除选中 (<span id="selected-songs-count">0</span>)</button></div><div class="music-song-list"' + (songs.length === 0 ? '><div class="empty-state" style="padding:40px;"><div class="empty-state-icon">🎵</div><p class="empty-state-text">暂无歌曲，点击上方按钮上传</p></div>' : '>' + songs.map(function(s, i) { var isPlaying = MusicPlayer.currentSong && MusicPlayer.currentSong.id === s.id; return '<div class="music-song-item' + (isPlaying ? ' playing' : '') + '" data-song-id="' + s.id + '" data-index="' + i + '"><label class="post-select-wrap" style="position:absolute;top:4px;left:4px;z-index:2;display:none;" id="song-cb-' + s.id + '"><input type="checkbox" class="song-select-checkbox" data-song-id="' + s.id + '"></label><div class="music-song-cover">' + (s.cover_url ? '<img src="' + escapeHtml(s.cover_url) + '" alt="">' : '&#9835;') + '</div><div class="music-song-info"><div class="music-song-name-row">' + escapeHtml(s.name) + (isPlaying ? ' <span class="music-song-playing">♫ 播放中</span>' : '') + '</div>' + (s.artist ? '<div class="music-song-artist-row">' + escapeHtml(s.artist) + '</div>' : '') + '</div><div class="music-song-actions" style="opacity:1;"><button class="btn btn-sm btn-outline edit-song-btn" data-song-id="' + s.id + '" title="编辑" style="margin-right:2px;">✏️</button><button class="btn btn-sm btn-outline song-cover-btn" data-song-id="' + s.id + '" title="更换封面" style="margin-right:2px;">🖼</button><button class="btn btn-sm btn-outline add-to-playlist-btn" data-song-id="' + s.id + '" title="添加到歌单" style="margin-right:2px;">📋</button><button class="btn btn-sm btn-outline delete-song-btn" data-song-id="' + s.id + '" style="color:var(--error);">🗑</button></div></div>'; }).join('') + '</div>');
        document.getElementById('song-search')?.addEventListener('input', function() { var q = this.value.trim().toLowerCase(); document.querySelectorAll('.music-song-item').forEach(function(item) { var name = item.querySelector('.music-song-name-row')?.textContent?.toLowerCase() || ''; item.style.display = (!q || name.includes(q)) ? '' : 'none'; }); });
        // Upload button
        document.getElementById('upload-song-btn')?.addEventListener('click', function() { var fi = document.createElement('input'); fi.type = 'file'; fi.accept = 'audio/mpeg,audio/mp3,audio/wav,audio/ogg,.mp3,.wav,.ogg'; fi.click(); fi.addEventListener('change', async function() { if (!fi.files || !fi.files[0]) return; var file = fi.files[0]; var defaultName = file.name.replace(/\.[^.]+$/, ''); var name = await showPrompt('歌曲名称：', defaultName, '输入歌曲名称'); if (!name || !name.trim()) return; var artist = await showPrompt('艺术家（可选）：', '', '可选'); if (!artist) artist = ''; var btn = document.getElementById('upload-song-btn'); if (btn) { btn.disabled = true; btn.textContent = '⏳ 上传中...'; } var fd = new FormData(); fd.append('song', file); fd.append('name', name.trim()); if (artist.trim()) fd.append('artist', artist.trim()); var xhr = new XMLHttpRequest(); xhr.open('POST', '/api/music/upload', true); xhr.withCredentials = true; xhr.upload.onprogress = function(e) { if (e.lengthComputable && btn) { btn.textContent = '⏳ ' + Math.round(e.loaded/e.total*100) + '%'; } }; xhr.onload = function() { if (btn) { btn.disabled = false; btn.textContent = '🎵 上传歌曲'; } if (xhr.status >= 200 && xhr.status < 300) { try { var xd = JSON.parse(xhr.responseText); showToast('✅ ' + (xd.message || '上传成功'), 'success'); } catch(e) { showToast('✅ 上传成功', 'success'); } Components.renderMusicLibrary(); } else { try { var xed = JSON.parse(xhr.responseText); showToast(xed.error || '上传失败', 'error'); } catch(e) { showToast('上传失败', 'error'); } } }; xhr.onerror = function() { showToast('网络错误', 'error'); if (btn) { btn.disabled = false; btn.textContent = '🎵 上传歌曲'; } }; xhr.ontimeout = function() { showToast('上传超时', 'error'); if (btn) { btn.disabled = false; btn.textContent = '🎵 上传歌曲'; } }; xhr.timeout = 60000; xhr.send(fd); }); });
        // Song click
        document.querySelectorAll('.music-song-item').forEach(function(item) { item.addEventListener('click', function(e) { if (e.target.closest('button') || e.target.closest('.post-select-wrap')) return; var idx = parseInt(item.dataset.index); if (idx >= 0) MusicPlayer.playQueue(songs, idx, '全部歌曲'); }); });
        // Batch delete
        function updateSongDelBtn() { var c = document.querySelectorAll('.song-select-checkbox:checked').length; var btn = document.getElementById('delete-selected-songs-btn'); var cnt = document.getElementById('selected-songs-count'); if (btn && cnt) { btn.disabled = c === 0; cnt.textContent = c; } }
        var sBar = document.getElementById('song-batch-bar'); if (sBar && songs.length > 0) { sBar.style.display = 'flex'; document.querySelectorAll('.song-select-checkbox').forEach(function(cb) { cb.closest('label').style.display = 'block'; }); }
        document.getElementById('select-all-songs')?.addEventListener('change', function() { var checked = this.checked; document.querySelectorAll('.song-select-checkbox').forEach(function(cb) { cb.checked = checked; }); updateSongDelBtn(); });
        document.querySelectorAll('.song-select-checkbox').forEach(function(cb) { cb.addEventListener('change', updateSongDelBtn); });
        document.getElementById('delete-selected-songs-btn')?.addEventListener('click', async function() { var sel = []; document.querySelectorAll('.song-select-checkbox:checked').forEach(function(cb) { sel.push(parseInt(cb.dataset.songId)); }); if (sel.length === 0) return; if (!(await showConfirm('确定删除选中的 ' + sel.length + ' 首歌曲？'))) return; var btn = this; btn.disabled = true; btn.textContent = '删除中...'; var errs = 0; for (var i = 0; i < sel.length; i++) { try { await API.deleteSong(sel[i]); } catch(e) { errs++; } } showToast(errs > 0 ? '部分删除失败 (' + errs + ' 项)' : '✅ 已删除 ' + sel.length + ' 首歌曲', errs > 0 ? 'error' : 'success'); Components.renderMusicLibrary(); });
        // Edit song
        document.querySelectorAll('.edit-song-btn').forEach(function(btn) { btn.addEventListener('click', function(e) { e.stopPropagation(); var songId = parseInt(btn.dataset.songId); var song = songs.find(function(s) { return s.id === songId; }); if (!song) return; (async function() { var name = await showPrompt('歌曲名称：', song.name, '输入歌曲名称'); if (name === null) return; if (!name.trim()) { showToast('名称不能为空', 'error'); return; } var artist = await showPrompt('艺术家：', song.artist || '', '可选'); if (artist === null) return; try { await API.updateSong(songId, { name: name.trim(), artist: artist.trim() }); showToast('✅ 已更新', 'success'); Components.renderMusicLibrary(); } catch(err) { showToast(err.message, 'error'); } })(); }); });
        // Cover change
        document.querySelectorAll('.song-cover-btn').forEach(function(btn) { btn.addEventListener('click', function(e) { e.stopPropagation(); var songId = parseInt(btn.dataset.songId); var fi = document.createElement('input'); fi.type = 'file'; fi.accept = '.jpg,.jpeg,.png'; fi.addEventListener('change', async function() { if (!fi.files || !fi.files[0]) return; btn.textContent = '⏳'; try { var cropped = await openCropModal(fi.files[0], 1); if (!cropped) { btn.textContent = '🖼'; return; } var r = await API.uploadMusicCover(new File([cropped], 'cover.jpg', { type: 'image/jpeg' })); await API.updateSong(songId, { cover_url: r.cover_url }); showToast('✅ 封面已更新', 'success'); Components.renderMusicLibrary(); } catch(err) { showToast(err.message, 'error'); btn.textContent = '🖼'; } }); fi.click(); }); });
        // Add to playlist
        document.querySelectorAll('.add-to-playlist-btn').forEach(function(btn) { btn.addEventListener('click', function(e) { e.stopPropagation(); Components._showPlaylistSelector(parseInt(btn.dataset.songId)); }); });
        // Delete song
        document.querySelectorAll('.delete-song-btn').forEach(function(btn) { btn.addEventListener('click', async function(e) { e.stopPropagation(); if (!(await showConfirm('确定删除此歌曲？'))) return; try { await API.deleteSong(parseInt(btn.dataset.songId)); showToast('已删除', 'success'); Components.renderMusicLibrary(); } catch(err) { showToast(err.message, 'error'); } }); });
      };
      var renderPlaylists = function() {
        document.getElementById('music-content').innerHTML = '<div style="display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap;"><button class="btn btn-primary btn-sm" id="create-playlist-btn">📋 新建歌单</button></div><div class="admin-batch-bar" id="playlist-batch-bar" style="display:none;margin-bottom:8px;"><label class="form-checkbox" style="font-size:13px;"><input type="checkbox" id="select-all-playlists"> 全选</label><button class="btn btn-danger btn-sm" id="delete-selected-playlists-btn" disabled>🗑️ 删除选中 (<span id="selected-playlists-count">0</span>)</button></div><div class="music-playlist-grid"' + (playlists.length === 0 ? '><div class="empty-state" style="padding:40px;"><div class="empty-state-icon">📋</div><p class="empty-state-text">暂无歌单</p></div>' : '>' + playlists.map(function(p) { var pc = p.cover_url ? '<img src="' + escapeHtml(p.cover_url) + '" style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0;">' : '<span class="music-playlist-card-cover-icon">📋</span>'; return '<div class="music-playlist-card" data-pid="' + p.id + '" style="position:relative;"><label class="post-select-wrap" style="position:absolute;top:4px;left:4px;z-index:2;display:none;" id="pl-cb-' + p.id + '"><input type="checkbox" class="playlist-select-checkbox" data-pid="' + p.id + '"></label><div class="music-playlist-card-cover" style="position:relative;">' + pc + '</div><div class="music-playlist-card-body"><div class="music-playlist-name">' + escapeHtml(p.name) + '</div><div class="music-playlist-count"><span class="music-playlist-count-badge">' + (p.song_count || 0) + ' 首</span></div></div></div>'; }).join('') + '</div>');
        document.getElementById('create-playlist-btn')?.addEventListener('click', async function() { var n = await showPrompt('输入歌单名称：', '', '我的歌单'); if (!n || !n.trim()) return; try { var result = await API.createPlaylist(n.trim()); var plId = result.playlist ? result.playlist.id : null; var addCover = await showConfirm('是否添加封面图片？', '添加封面', '跳过'); if (addCover && plId) { var fi = document.createElement('input'); fi.type = 'file'; fi.accept = '.jpg,.jpeg,.png'; fi.click(); await new Promise(function(resolve) { fi.onchange = resolve; }); if (fi.files && fi.files[0]) { var cropped = await openCropModal(fi.files[0], 1); if (cropped) { var ur = await API.uploadMusicCover(new File([cropped], 'cover.jpg', { type: 'image/jpeg' })); await API.updatePlaylist(plId, { cover_url: ur.cover_url }); } } } showToast('✅ 歌单已创建', 'success'); Components.renderMusicLibrary(); } catch(err) { showToast(err.message, 'error'); } });
        document.querySelectorAll('.music-playlist-card').forEach(function(card) { card.addEventListener('click', function(e) { if (e.target.closest('.post-select-wrap')) return; Router.navigate('#/music/playlist/' + card.dataset.pid); }); });
        function updatePlDelBtn() { var c = document.querySelectorAll('.playlist-select-checkbox:checked').length; var btn = document.getElementById('delete-selected-playlists-btn'); var cnt = document.getElementById('selected-playlists-count'); if (btn && cnt) { btn.disabled = c === 0; cnt.textContent = c; } }
        var pBar = document.getElementById('playlist-batch-bar'); if (pBar && playlists.length > 0) { pBar.style.display = 'flex'; document.querySelectorAll('.playlist-select-checkbox').forEach(function(cb) { cb.closest('label').style.display = 'block'; }); }
        document.getElementById('select-all-playlists')?.addEventListener('change', function() { var checked = this.checked; document.querySelectorAll('.playlist-select-checkbox').forEach(function(cb) { cb.checked = checked; }); updatePlDelBtn(); });
        document.querySelectorAll('.playlist-select-checkbox').forEach(function(cb) { cb.addEventListener('change', updatePlDelBtn); });
        document.getElementById('delete-selected-playlists-btn')?.addEventListener('click', async function() { var sel = []; document.querySelectorAll('.playlist-select-checkbox:checked').forEach(function(cb) { sel.push(parseInt(cb.dataset.pid)); }); if (sel.length === 0) return; if (!(await showConfirm('确定删除选中的 ' + sel.length + ' 个歌单？'))) return; var btn = this; btn.disabled = true; btn.textContent = '删除中...'; for (var i = 0; i < sel.length; i++) { try { await API.deletePlaylist(sel[i]); } catch(e) {} } showToast('✅ 已删除 ' + sel.length + ' 个歌单', 'success'); Components.renderMusicLibrary(); });
      };
      app.innerHTML = '<div class="page-fade-in"><div class="music-page"><div class="music-page-hero"><div class="music-page-hero-icon">🎵</div><h1>我的音乐</h1><p>' + songs.length + ' 首歌曲 · ' + playlists.length + ' 个歌单</p></div><div class="music-tabs-modern"><button class="music-tab-modern' + (this._musicTab === 'songs' ? ' active' : '') + '" id="music-tab-songs">🎵 我的歌曲</button><button class="btn btn-sm ' + (this._musicTab === 'playlists' ? 'btn-primary' : 'btn-outline') + '" id="music-tab-playlists">📋 我的歌单' + (playlists.length > 0 ? '<span class="count-badge">' + playlists.length + '</span>' : '') + '</button></div><div id="music-content"></div></div></div>';
      document.getElementById('music-tab-songs').onclick = function() { Components._musicTab = 'songs'; renderSongs(); };
      document.getElementById('music-tab-playlists').onclick = function() { Components._musicTab = 'playlists'; renderPlaylists(); };
      if (this._musicTab === 'songs') renderSongs(); else if (this._musicTab === 'playlists') renderPlaylists();
    } catch (err) { showToast(err.message, 'error'); Router.navigate('#/works'); }
  },

  async renderPlaylistDetail(playlistId) {
    this.renderLoading();
    try {
      let data, isPublicView = false;
      try { data = await API.getPlaylist(playlistId); } catch(e) { data = await API.viewPublicPlaylist(playlistId); isPublicView = true; }
      const pl = data.playlist, songs = pl.songs || [], currentSong = MusicPlayer.currentSong;
      var plCoverHtml = pl.cover_url ? '<img src="' + escapeHtml(pl.cover_url) + '" style="width:64px;height:64px;border-radius:12px;object-fit:cover;box-shadow:0 4px 12px rgba(0,0,0,0.3);">' : '<div class="music-playlist-header-icon" style="font-size:48px;">📋</div>';
      document.getElementById('app').innerHTML = '<div class="page-fade-in"><div class="music-page"><div class="music-playlist-header-gradient" style="gap:16px;">' + plCoverHtml + '<div class="music-playlist-header-info"><div class="music-playlist-header-name">' + escapeHtml(pl.name) + '</div><div class="music-playlist-header-meta">' + songs.length + ' 首歌曲' + (pl.is_public ? ' · 🌍 公开' : ' · 🔒 私密') + '</div></div><div class="music-playlist-header-actions">' + (songs.length > 0 ? '<button class="btn btn-primary" id="play-all-btn">▶ 播放全部</button>' : '') + (!isPublicView ? '<button class="btn btn-outline" id="toggle-public-btn" style="margin-right:4px;">' + (pl.is_public ? '🔒 设为私密' : '🌍 设为公开') + '</button><button class="btn btn-outline" id="change-cover-btn" style="margin-right:4px;">🖼 封面</button><button class="btn btn-outline" id="edit-playlist-btn" style="margin-right:4px;">✏️ 编辑</button><button class="btn btn-outline" id="add-songs-btn">+ 添加歌曲</button>' : '') + '</div></div><button class="btn btn-outline btn-sm" id="back-to-music" style="margin-bottom:16px;">← 返回</button>' +
        (songs.length === 0 ? '<div class="empty-state"><div class="empty-state-icon">📋</div><p class="empty-state-text">歌单中暂无歌曲</p></div>' : '<div class="music-song-list">' + songs.map(function(s) { return '<div class="music-song-item' + (currentSong && currentSong.id === s.id ? ' playing' : '') + '" data-song-id="' + s.id + '"><div class="music-song-cover">' + (s.cover_url ? '<img src="' + escapeHtml(s.cover_url) + '" alt="">' : '&#9835;') + '</div><div class="music-song-info"><div class="music-song-name-row">' + escapeHtml(s.name) + (currentSong && currentSong.id === s.id ? ' <span class="music-song-playing">♫ 播放中</span>' : '') + '</div>' + (s.artist ? '<div class="music-song-artist-row">' + escapeHtml(s.artist) + '</div>' : '') + '</div><div class="music-song-actions">' + (!isPublicView ? '<button class="btn btn-sm btn-outline remove-from-playlist-btn" data-song-id="' + s.id + '" style="color:var(--error);">移除</button>' : '') + '</div></div>'; }).join('') + '</div>') + '</div></div>';
      document.getElementById('back-to-music').onclick = function() { if (isPublicView) window.history.back(); else { Components._musicTab = 'playlists'; Router.navigate('#/music'); } };
      document.getElementById('play-all-btn')?.addEventListener('click', function() { if (songs.length > 0) MusicPlayer.playQueue(songs, 0, '歌单: ' + pl.name); });
      document.getElementById('toggle-public-btn')?.addEventListener('click', async function() { var isPub = !!pl.is_public; try { var r = await API.setPlaylistPublic(playlistId, !isPub); showToast(r.message || '已更新', 'success'); Components.renderPlaylistDetail(playlistId); } catch(err) { showToast(err.message, 'error'); } });
      document.getElementById('change-cover-btn')?.addEventListener('click', function() { var fi = document.createElement('input'); fi.type = 'file'; fi.accept = '.jpg,.jpeg,.png'; fi.addEventListener('change', async function() { if (!fi.files || !fi.files[0]) return; var btn = document.getElementById('change-cover-btn'); if (btn) btn.textContent = '⏳'; try { var cropped = await openCropModal(fi.files[0], 1); if (!cropped) { if (btn) btn.textContent = '🖼 封面'; return; } var r = await API.uploadMusicCover(new File([cropped], 'cover.jpg', { type: 'image/jpeg' })); await API.updatePlaylist(playlistId, { cover_url: r.cover_url }); showToast('✅ 封面已更新', 'success'); Components.renderPlaylistDetail(playlistId); } catch(err) { showToast(err.message, 'error'); if (btn) btn.textContent = '🖼 封面'; } }); fi.click(); });
      document.getElementById('edit-playlist-btn')?.addEventListener('click', function() { (async function() { var name = await showPrompt('歌单名称：', pl.name, '输入歌单名称'); if (name === null) return; if (!name.trim()) { showToast('名称不能为空', 'error'); return; } try { await API.updatePlaylist(playlistId, { name: name.trim() }); showToast('已更新', 'success'); Components.renderPlaylistDetail(playlistId); } catch(err) { showToast(err.message, 'error'); } })(); });
      document.getElementById('add-songs-btn')?.addEventListener('click', function() { Components._showSongSelector(playlistId, new Set(songs.map(function(s) { return s.id; }))); });
      document.querySelectorAll('.music-song-item').forEach(function(item) { item.addEventListener('click', function(e) { if (e.target.closest('button')) return; var id = parseInt(item.dataset.songId), idx = songs.findIndex(function(s) { return s.id === id; }); if (idx >= 0) MusicPlayer.playQueue(songs, idx, '歌单: ' + pl.name); }); });
      if (!isPublicView) { document.querySelectorAll('.remove-from-playlist-btn').forEach(function(btn) { btn.addEventListener('click', async function(e) { e.stopPropagation(); if (!(await showConfirm('确定移除此歌曲？'))) return; try { await API.removeFromPlaylist(playlistId, parseInt(btn.dataset.songId)); showToast('已移除', 'success'); Components.renderPlaylistDetail(playlistId); } catch(err) { showToast(err.message, 'error'); } }); }); }
    } catch (err) { showToast(err.message, 'error'); Router.navigate('#/music'); }
  },

  async _showSongSelector(playlistId, existingIds) {
    existingIds = existingIds || new Set();
    try { var d = await API.getMySongs(), allSongs = d.songs || [], selectedIds = new Set(existingIds); var ov = document.createElement('div'); ov.className = 'custom-modal-overlay'; var renderList = function(filter) { var listDiv = ov.querySelector('#selector-song-list') || ov; var items = allSongs.filter(function(s) { return !filter || s.name.toLowerCase().includes(filter) || (s.artist || '').toLowerCase().includes(filter); }); listDiv.innerHTML = '<div style="padding:8px 0;max-height:300px;overflow-y:auto;">'; if (items.length === 0) { listDiv.innerHTML += '<div style="padding:20px;text-align:center;color:var(--text-secondary);">无匹配歌曲</div>'; } else { items.forEach(function(s) { var checked = selectedIds.has(s.id) ? ' checked' : ''; var artistHtml = s.artist ? '<span style="color:var(--text-light);font-size:12px;"> - ' + escapeHtml(s.artist) + '</span>' : ''; listDiv.innerHTML += '<div class="selector-song-item" style="display:flex;align-items:center;padding:8px 24px;gap:8px;cursor:pointer;"><input type="checkbox" class="selector-checkbox" value="' + s.id + '"' + checked + '><span>' + escapeHtml(s.name) + '</span>' + artistHtml + '</div>'; }); } listDiv.innerHTML += '</div>'; listDiv.querySelectorAll('.selector-checkbox').forEach(function(cb) { cb.addEventListener('change', function() { var id = parseInt(cb.value); if (cb.checked) selectedIds.add(id); else selectedIds.delete(id); }); }); }; ov.innerHTML = '<div class="custom-modal-dialog" style="max-width:450px;"><div style="padding:16px 24px;border-bottom:1px solid var(--border);"><div style="font-size:17px;font-weight:700;">📋 选择歌曲</div></div><div style="padding:8px 24px;"><input class="form-input" id="selector-search" type="text" placeholder="搜索歌曲..." style="width:100%;"></div><div id="selector-song-list"></div><div style="padding:12px 24px;border-top:1px solid var(--border);display:flex;gap:8px;justify-content:flex-end;"><button class="btn btn-sm btn-outline" id="selector-cancel-btn">取消</button><button class="btn btn-sm btn-primary" id="confirm-selector-btn">确认添加</button></div></div>'; document.body.appendChild(ov); requestAnimationFrame(function() { ov.classList.add('visible'); }); renderList(''); document.getElementById('selector-search').addEventListener('input', function() { renderList(this.value.trim().toLowerCase()); }); document.getElementById('confirm-selector-btn').addEventListener('click', async function() { var ids = [...selectedIds].filter(function(id) { return !existingIds.has(id); }); if (ids.length === 0) { showToast('请选择新歌曲', 'warning'); return; } var btn = this; btn.disabled = true; btn.textContent = '添加中...'; try { var r = await API.batchAddToPlaylist(playlistId, ids); showToast(r.message || '已添加', 'success'); ov.classList.remove('visible'); ov.classList.add('closing'); setTimeout(function() { if (ov.parentNode) ov.parentNode.removeChild(ov); }, 200); Components.renderPlaylistDetail(playlistId); } catch(err) { showToast(err.message, 'error'); } btn.disabled = false; btn.textContent = '确认添加'; }); document.getElementById('selector-cancel-btn').addEventListener('click', function() { ov.classList.remove('visible'); ov.classList.add('closing'); setTimeout(function() { if (ov.parentNode) ov.parentNode.removeChild(ov); }, 200); }); } catch(err) { showToast(err.message, 'error'); }
  },

  async _showPlaylistSelector(songId) {
    try { var d = await API.getMyPlaylists(); var playlists = d.playlists || []; var ov = document.createElement('div'); ov.className = 'custom-modal-overlay'; ov.innerHTML = '<div class="custom-modal-dialog" style="max-width:420px;padding:16px 0;"><div style="padding:0 20px 12px;border-bottom:1px solid var(--border);"><div style="font-size:17px;font-weight:700;">📋 添加到歌单</div></div><div id="playlist-selector-list" style="padding:8px 0;max-height:300px;overflow-y:auto;">' + (playlists.length === 0 ? '<div style="padding:20px;text-align:center;color:var(--text-secondary);">暂无歌单</div>' : playlists.map(function(p) { return '<div class="playlist-sel-item" data-pid="' + p.id + '" data-selected="0" style="padding:10px 20px;cursor:pointer;display:flex;align-items:center;gap:10px;"><span class="pl-sel-box" style="width:22px;height:22px;border:2px solid var(--border);border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;">☐</span><div style="flex:1;min-width:0;"><div style="font-weight:600;font-size:14px;">' + escapeHtml(p.name) + '</div><div style="font-size:12px;color:var(--text-light);">' + (p.song_count || 0) + ' 首</div></div></div>'; }).join('')) + '</div><div style="padding:12px 20px;border-top:1px solid var(--border);display:flex;gap:8px;justify-content:flex-end;"><button class="btn btn-sm btn-outline" id="pl-sel-cancel">取消</button><button class="btn btn-sm btn-primary" id="pl-sel-confirm">确认添加</button></div></div>'; document.body.appendChild(ov); requestAnimationFrame(function() { ov.classList.add('visible'); }); var sel = {}; ov.querySelectorAll('.playlist-sel-item').forEach(function(item) { item.addEventListener('click', function() { var pid = this.dataset.pid; var isOn = this.dataset.selected === '1'; this.dataset.selected = isOn ? '0' : '1'; this.style.borderLeft = isOn ? '' : '3px solid var(--primary)'; this.querySelector('.pl-sel-box').textContent = isOn ? '☐' : '☑'; sel[pid] = !isOn; }); }); var closePl = function() { ov.classList.remove('visible'); ov.classList.add('closing'); setTimeout(function() { if (ov.parentNode) ov.parentNode.removeChild(ov); }, 200); }; document.getElementById('pl-sel-cancel').addEventListener('click', closePl); document.getElementById('pl-sel-confirm').addEventListener('click', async function() { var pids = Object.keys(sel).filter(function(p) { return sel[p]; }); if (pids.length === 0) { showToast('请选择歌单', 'warning'); return; } var btn = this; btn.disabled = true; btn.textContent = '添加中...'; var count = 0; try { for (var i = 0; i < pids.length; i++) { await API.addToPlaylist(parseInt(pids[i]), songId); count++; } showToast('✅ 已添加到 ' + count + ' 个歌单', 'success'); closePl(); } catch(err) { showToast(err.message, 'error'); } btn.disabled = false; btn.textContent = '确认添加'; }); ov.addEventListener('click', function(e) { if (e.target === ov) closePl(); }); } catch(err) { showToast(err.message, 'error'); }
  },

  async renderFriends() {
    this.renderLoading();
    try {
      var friends = (await API.getFriends()).friends || []; var requests = (await API.getFriendRequests()).requests || [];
      var app = document.getElementById('app');
      var buildFriendHtml = function(f) {
        var avatarHtml = f.avatar_url ? '<img src="' + escapeHtml(f.avatar_url) + '" style="width:100%;height:100%;object-fit:cover;" alt="">' : escapeHtml((f.nickname || f.username).charAt(0).toUpperCase());
        var online = f.is_online ? true : false;
        return '<div class="friend-item" style="display:flex;align-items:center;gap:12px;padding:12px 16px;border:1px solid var(--border);border-radius:8px;margin-bottom:6px;"><div style="position:relative;flex-shrink:0;cursor:pointer;" class="friend-avatar-click" data-uid="' + f.friend_id + '"><div style="width:44px;height:44px;border-radius:50%;overflow:hidden;background:var(--primary);color:#fff;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:600;">' + avatarHtml + '</div><span class="friend-online-dot" style="position:absolute;bottom:0;right:0;width:12px;height:12px;border-radius:50%;border:2px solid var(--bg-card);background:' + (online ? '#22c55e' : '#94a3b8') + ';"></span></div><div style="flex:1;min-width:0;cursor:pointer;" class="friend-avatar-click" data-uid="' + f.friend_id + '"><div style="font-weight:600;font-size:14px;">' + escapeHtml(f.nickname || f.username) + '</div><div style="font-size:12px;color:var(--text-secondary);">@' + escapeHtml(f.username) + '</div></div><div style="display:flex;gap:4px;flex-shrink:0;"><button class="btn btn-sm btn-outline chat-friend-btn" data-id="' + f.friend_id + '">💬 私信</button><button class="btn btn-sm btn-outline remove-friend-btn" data-id="' + f.friend_id + '" style="color:var(--error);">移除</button></div></div>';
      };
      app.innerHTML = '<div class="page-fade-in"><div class="settings-page"><div class="settings-card"><h2 style="font-size:22px;font-weight:700;margin-bottom:16px;">👥 好友</h2>' + (requests.length > 0 ? '<div style="margin-bottom:16px;"><h3 style="font-size:16px;font-weight:600;margin-bottom:8px;">📩 好友申请 (' + requests.length + ')</h3>' + requests.map(function(r) { return '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border:1px solid var(--border);border-radius:8px;margin-bottom:8px;"><div style="display:flex;align-items:center;gap:8px;cursor:pointer;" class="friend-avatar-click" data-uid="' + r.from_user_id + '">' + (r.avatar_url ? '<img src="' + escapeHtml(r.avatar_url) + '" style="width:36px;height:36px;border-radius:50%;object-fit:cover;">' : '<div style="width:36px;height:36px;border-radius:50%;background:var(--primary);color:#fff;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:600;">' + escapeHtml((r.nickname || r.username).charAt(0).toUpperCase()) + '</div>') + '<span>' + escapeHtml(r.nickname || r.username) + '</span></div><div style="display:flex;gap:4px;"><button class="btn btn-sm btn-primary approve-request" data-id="' + r.id + '">接受</button><button class="btn btn-sm btn-outline reject-request" data-id="' + r.id + '" style="color:var(--error);">拒绝</button></div></div>'; }).join('') + '</div>' : '') + '<h3 style="font-size:16px;font-weight:600;margin-bottom:8px;">我的好友 (' + friends.length + ')</h3>' + (friends.length === 0 ? '<p style="color:var(--text-secondary);">暂无好友</p>' : '<div id="friends-list">' + friends.map(buildFriendHtml).join('') + '</div>') + '</div></div></div>';
      document.querySelectorAll('.friend-avatar-click').forEach(function(el) { el.addEventListener('click', function() { Router.navigate('#/users/' + this.dataset.uid); }); });
      document.querySelectorAll('.approve-request').forEach(function(b) { b.addEventListener('click', async function() { try { await API.approveFriendRequest(parseInt(b.dataset.id)); showToast('已添加', 'success'); Components.renderFriends(); } catch(err) { showToast(err.message, 'error'); } }); });
      document.querySelectorAll('.reject-request').forEach(function(b) { b.addEventListener('click', async function() { try { await API.rejectFriendRequest(parseInt(b.dataset.id)); showToast('已拒绝', 'success'); Components.renderFriends(); } catch(err) { showToast(err.message, 'error'); } }); });
      document.querySelectorAll('.chat-friend-btn').forEach(function(b) { b.addEventListener('click', function() { Router.navigate('#/chat/' + b.dataset.id); }); });
      document.querySelectorAll('.remove-friend-btn').forEach(function(b) { b.addEventListener('click', async function() { if (!(await showConfirm('确定删除好友？'))) return; try { await API.removeFriend(parseInt(b.dataset.id)); showToast('已删除', 'success'); Components.renderFriends(); } catch(err) { showToast(err.message, 'error'); } }); });
      var updateOnlineDots = async function() { try { var od = await API.getFriendOnlineStatus(); document.querySelectorAll('.friend-online-dot').forEach(function(dot) { var uid = parseInt(dot.dataset.uid); dot.style.background = (od.online && od.online[uid]) ? '#22c55e' : '#94a3b8'; }); } catch(e) {} };
      if (friends.length > 0) { if (Components._onlinePollTimer) clearInterval(Components._onlinePollTimer); Components._onlinePollTimer = setInterval(updateOnlineDots, 30000); }
    } catch (err) { showToast(err.message, 'error'); Router.navigate('#/works'); }
  },

  _renderEditor(title, post, category) {
    var isEdit = !!post, self = this;
    var cat = category || (post ? post.category : 'work');
    var editorHtml = '<div class="page-fade-in"><div class="post-editor" style="max-width:800px;margin:0 auto;padding:20px 16px;">' +
      '<h2 style="font-size:22px;font-weight:700;margin-bottom:20px;">' + escapeHtml(title) + '</h2>' +
      '<div class="form-group"><label class="form-label">标题 <span style="color:var(--error);">*</span></label><input class="form-input" id="editor-title" value="' + escapeHtml(post ? post.title : '') + '" placeholder="请输入标题"></div>' +
      '<div class="form-group"><label class="form-label">简介</label><textarea class="form-textarea" id="editor-desc" rows="2" placeholder="简要描述">' + escapeHtml(post ? (post.description || '') : '') + '</textarea></div>' +
      '<div class="form-group"><label class="form-label">标签（逗号分隔）</label><input class="form-input" id="editor-tags" value="' + escapeHtml(post ? (post.tags || '') : '') + '" placeholder="例如: javascript,nodejs"></div>' +
      '<div class="form-group"><label class="form-label">封面图片</label><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;"><button class="btn btn-sm btn-outline" id="editor-upload-cover-btn">📁 选择图片</button><input type="file" id="editor-cover-file" accept="image/jpeg,image/png,image/gif,image/webp" style="display:none;"><span id="editor-cover-name" style="font-size:13px;color:var(--text-secondary);">' + (post && post.cover_url ? '已有封面' : '未选择') + '</span><button class="btn btn-sm btn-outline" id="editor-remove-cover-btn"' + (post && post.cover_url ? '' : ' style="display:none;"') + '>✕ 移除</button></div></div>' +
      '<div class="form-group" id="editor-cover-preview"' + (post && post.cover_url ? '' : ' style="display:none;"') + '>' + (post && post.cover_url ? '<img src="' + post.cover_url + '" style="max-width:200px;max-height:120px;border-radius:8px;object-fit:cover;">' : '') + '</div>' +
      '<div class="form-group" style="' + (cat === 'chat' ? '' : 'display:none;') + '"><label class="form-label">分类</label><select class="form-input" id="editor-category"><option value="work"' + (cat === 'work' ? ' selected' : '') + '>📂 作品区</option><option value="chat"' + (cat === 'chat' ? ' selected' : '') + '>💬 聊天区</option></select></div>' +
      '<div style="margin:20px 0;"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;"><h3 style="font-size:16px;font-weight:600;">📝 内容块</h3><div style="display:flex;gap:4px;"><button class="btn btn-sm btn-outline add-block-btn" data-type="text">➕ 文本</button><button class="btn btn-sm btn-outline add-block-btn" data-type="image">🖼 图片</button><button class="btn btn-sm btn-outline add-block-btn" data-type="video">🎬 视频</button><button class="btn btn-sm btn-outline add-block-btn" data-type="code">💻 代码</button></div></div>' +
      '<div id="editor-blocks-list">' + self._renderEditorBlocks() + '</div></div>' +
      '<div style="display:flex;gap:12px;margin-top:24px;padding-top:20px;border-top:1px solid var(--border);"><button class="btn btn-primary" id="editor-save-btn">💾 ' + (isEdit ? '保存修改' : '发布') + '</button><button class="btn btn-outline" id="editor-cancel-btn">取消</button></div></div></div>';
    document.getElementById('app').innerHTML = editorHtml;
    this._bindEditorEvents(isEdit, post);
  },

  _renderEditorBlocks() {
    if (!this.editorBlocks || this.editorBlocks.length === 0) {
      return '<div class="empty-state" style="padding:20px;"><p style="color:var(--text-light);font-size:14px;">暂无内容，点击上方按钮添加块</p></div>';
    }
    var h = '';
    for (var i = 0; i < this.editorBlocks.length; i++) {
      var b = this.editorBlocks[i];
      h += '<div class="editor-block" data-index="' + i + '" style="border:1px solid var(--border);border-radius:8px;padding:12px;margin-bottom:8px;background:var(--bg-card);">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;"><span class="editor-block-type" style="font-weight:600;font-size:13px;color:var(--text-secondary);">' +
        (b.type === 'text' ? '📝 文本' : b.type === 'image' ? '🖼 图片' : b.type === 'video' ? '🎬 视频' : '💻 代码') +
        '</span><div style="display:flex;gap:4px;">' +
        '<button class="btn btn-sm btn-outline editor-move-up-btn" data-index="' + i + '"' + (i === 0 ? ' disabled' : '') + '>↑</button>' +
        '<button class="btn btn-sm btn-outline editor-move-down-btn" data-index="' + i + '"' + (i === this.editorBlocks.length - 1 ? ' disabled' : '') + '>↓</button>' +
        '<button class="btn btn-sm btn-outline editor-remove-block-btn" data-index="' + i + '" style="color:var(--error);">✕</button></div></div>' +
        this._renderEditorBlockContent(b, i) + '</div>';
    }
    return h;
  },

  _renderEditorBlockContent(b, i) {
    if (b.type === 'text') {
      return '<textarea class="form-textarea editor-block-input" data-index="' + i + '" rows="4" placeholder="输入文本内容..." style="font-family:inherit;">' + escapeHtml(b.value || '') + '</textarea>';
    } else if (b.type === 'image') {
      var preview = b.file_url ? '<div style="margin-bottom:8px;"><img src="' + b.file_url + '" style="max-width:200px;max-height:150px;border-radius:6px;object-fit:cover;"></div>' : '';
      return '<div>' + preview + '<div style="display:flex;gap:8px;align-items:center;"><button class="btn btn-sm btn-outline editor-upload-btn" data-index="' + i + '">📁 选择图片</button><input type="file" class="editor-file-input" data-index="' + i + '" accept="image/jpeg,image/png,image/gif,image/webp" style="display:none;"><input class="form-input editor-block-url" data-index="' + i + '" type="text" placeholder="或输入图片URL" value="' + escapeHtml(b.value || '') + '" style="flex:1;"><label style="font-size:12px;color:var(--text-secondary);display:flex;align-items:center;gap:4px;"><input type="checkbox" class="editor-allow-preview" data-index="' + i + '"' + (b.allow_preview ? ' checked' : '') + '> 允许预览</label></div></div>';
    } else if (b.type === 'video') {
      var vPreview = b.file_url ? '<div style="margin-bottom:8px;"><video controls style="max-width:300px;max-height:150px;"><source src="' + b.file_url + '"></video></div>' : '';
      return '<div>' + vPreview + '<div style="display:flex;gap:8px;align-items:center;"><button class="btn btn-sm btn-outline editor-upload-btn" data-index="' + i + '">📁 选择视频</button><input type="file" class="editor-file-input" data-index="' + i + '" accept="video/mp4,video/webm,video/ogg" style="display:none;"><input class="form-input editor-block-url" data-index="' + i + '" type="text" placeholder="或输入视频URL" value="' + escapeHtml(b.value || '') + '" style="flex:1;"></div></div>';
    } else if (b.type === 'code') {
      return '<div class="form-group" style="margin-bottom:4px;"><select class="form-input editor-code-lang" data-index="' + i + '" style="width:150px;font-size:13px;"><option value="">自动检测</option><option value="javascript"' + (b.language === 'javascript' ? ' selected' : '') + '>JavaScript</option><option value="python"' + (b.language === 'python' ? ' selected' : '') + '>Python</option><option value="html"' + (b.language === 'html' ? ' selected' : '') + '>HTML</option><option value="css"' + (b.language === 'css' ? ' selected' : '') + '>CSS</option><option value="json"' + (b.language === 'json' ? ' selected' : '') + '>JSON</option><option value="bash"' + (b.language === 'bash' ? ' selected' : '') + '>Bash</option></select></div><textarea class="form-textarea editor-block-input code-input" data-index="' + i + '" rows="6" placeholder="输入代码..." style="font-family:monospace;">' + escapeHtml(b.value || '') + '</textarea>';
    }
    return '';
  },

  _bindEditorEvents(isEdit, post) {
    var self = this, coverFileId = post ? (post.cover_file_id || null) : null;
    // Cancel
    document.getElementById('editor-cancel-btn').addEventListener('click', function() { Router.navigate(isEdit ? '#/posts/' + post.id : '#/works'); });
    // Add block
    document.querySelectorAll('.add-block-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        playClickSound();
        var type = this.dataset.type;
        self.editorBlocks.push({ type: type, value: '', file_id: null, file_url: null, allow_preview: true, _tempId: Date.now() + '_' + Math.random().toString(36).substr(2, 5) });
        document.getElementById('editor-blocks-list').innerHTML = self._renderEditorBlocks();
        self._reBindEditorBlockEvents();
      });
    });
    this._reBindEditorBlockEvents();
    // Cover upload
    document.getElementById('editor-upload-cover-btn').addEventListener('click', function() { document.getElementById('editor-cover-file').click(); });
    document.getElementById('editor-cover-file').addEventListener('change', async function() {
      var f = this.files && this.files[0];
      if (!f) return;
      try {
        var cropped = await openCropModal(f, 16/9);
        if (!cropped) return;
        var result = await API.uploadFile(new File([cropped], 'cover.jpg', { type: 'image/jpeg' }));
        coverFileId = result.file.id;
        var previewDiv = document.getElementById('editor-cover-preview');
        previewDiv.style.display = 'block';
        previewDiv.innerHTML = '<img src="' + result.file.url + '" style="max-width:200px;max-height:120px;border-radius:8px;object-fit:cover;">';
        document.getElementById('editor-cover-name').textContent = '已选择封面';
        document.getElementById('editor-remove-cover-btn').style.display = '';
      } catch (err) { showToast(err.message, 'error'); }
    });
    document.getElementById('editor-remove-cover-btn').addEventListener('click', function() {
      coverFileId = null;
      document.getElementById('editor-cover-preview').style.display = 'none';
      document.getElementById('editor-cover-preview').innerHTML = '';
      document.getElementById('editor-cover-name').textContent = '未选择';
      this.style.display = 'none';
    });
    // Save
    document.getElementById('editor-save-btn').addEventListener('click', async function() {
      var btn = this;
      if (self._isButtonDisabled(btn)) return;
      var title = document.getElementById('editor-title').value.trim();
      if (!title) { showToast('请输入标题', 'warning'); document.getElementById('editor-title').focus(); return; }
      var desc = document.getElementById('editor-desc').value.trim();
      var tags = document.getElementById('editor-tags').value.trim();
      var category = document.getElementById('editor-category') ? document.getElementById('editor-category').value : (post ? post.category : 'work');
      self._syncEditorBlocks();
      if (self.editorBlocks.length === 0) { showToast('请至少添加一个内容块', 'warning'); return; }
      var blocks = self.editorBlocks.map(function(b) { var ob = { type: b.type, value: b.value || '', file_id: b.file_id || null, allow_preview: !!b.allow_preview }; if (b._id) ob.id = b._id; return ob; });
      self._disableButton(btn, '发布中...');
      try {
        var data = { title: title, description: desc, tags: tags, category: category, blocks: blocks };
        if (coverFileId) data.cover_file_id = coverFileId;
        if (isEdit) { data.deleted_block_ids = self._deletedBlockIds; await API.updatePost(post.id, data); showToast('已更新', 'success'); Router.navigate('#/posts/' + post.id); }
        else { var result = await API.createPost(data); showToast('已发布', 'success'); App.refreshLevel(); Router.navigate('#/posts/' + (result.id || result.post?.id)); }
      } catch (err) { showToast(err.message, 'error'); }
      finally { self._enableButton(btn, isEdit ? '💾 保存修改' : '💾 发布'); }
    });
  },

  _reBindEditorBlockEvents() {
    var self = this;
    // Remove block
    document.querySelectorAll('.editor-remove-block-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var idx = parseInt(this.dataset.index);
        if (isNaN(idx)) return;
        var removed = self.editorBlocks[idx];
        if (removed && removed._id) self._deletedBlockIds.push(removed._id);
        self.editorBlocks.splice(idx, 1);
        document.getElementById('editor-blocks-list').innerHTML = self._renderEditorBlocks();
        self._reBindEditorBlockEvents();
      });
    });
    // Move up
    document.querySelectorAll('.editor-move-up-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var idx = parseInt(this.dataset.index);
        if (idx <= 0) return;
        var tmp = self.editorBlocks[idx];
        self.editorBlocks[idx] = self.editorBlocks[idx - 1];
        self.editorBlocks[idx - 1] = tmp;
        document.getElementById('editor-blocks-list').innerHTML = self._renderEditorBlocks();
        self._reBindEditorBlockEvents();
      });
    });
    // Move down
    document.querySelectorAll('.editor-move-down-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var idx = parseInt(this.dataset.index);
        if (idx >= self.editorBlocks.length - 1) return;
        var tmp = self.editorBlocks[idx];
        self.editorBlocks[idx] = self.editorBlocks[idx + 1];
        self.editorBlocks[idx + 1] = tmp;
        document.getElementById('editor-blocks-list').innerHTML = self._renderEditorBlocks();
        self._reBindEditorBlockEvents();
      });
    });
    // Upload file for image/video blocks
    document.querySelectorAll('.editor-upload-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var fi = this.nextElementSibling;
        if (fi && fi.classList.contains('editor-file-input')) fi.click();
      });
    });
    document.querySelectorAll('.editor-file-input').forEach(function(input) {
      input.addEventListener('change', async function() {
        var f = this.files && this.files[0];
        if (!f) return;
        var idx = parseInt(this.dataset.index);
        if (isNaN(idx)) return;
        try {
          var result = await API.uploadFile(f);
          self.editorBlocks[idx].file_id = result.file.id;
          self.editorBlocks[idx].file_url = result.file.url;
          self.editorBlocks[idx].value = result.file.url;
          document.getElementById('editor-blocks-list').innerHTML = self._renderEditorBlocks();
          self._reBindEditorBlockEvents();
        } catch (err) { showToast(err.message, 'error'); }
      });
    });
    // Block input changes (sync on blur for textareas)
    document.querySelectorAll('.editor-block-input').forEach(function(textarea) {
      textarea.addEventListener('input', function() {
        var idx = parseInt(this.dataset.index);
        if (!isNaN(idx) && self.editorBlocks[idx]) self.editorBlocks[idx].value = this.value;
      });
    });
    document.querySelectorAll('.editor-block-url').forEach(function(input) {
      input.addEventListener('input', function() {
        var idx = parseInt(this.dataset.index);
        if (!isNaN(idx) && self.editorBlocks[idx]) self.editorBlocks[idx].value = this.value;
      });
    });
    document.querySelectorAll('.editor-code-lang').forEach(function(sel) {
      sel.addEventListener('change', function() {
        var idx = parseInt(this.dataset.index);
        if (!isNaN(idx) && self.editorBlocks[idx]) self.editorBlocks[idx].language = this.value;
      });
    });
    document.querySelectorAll('.editor-allow-preview').forEach(function(cb) {
      cb.addEventListener('change', function() {
        var idx = parseInt(this.dataset.index);
        if (!isNaN(idx) && self.editorBlocks[idx]) self.editorBlocks[idx].allow_preview = this.checked;
      });
    });
  },

  _syncEditorBlocks() {
    // Read all current values from the DOM into editorBlocks
    var self = this;
    document.querySelectorAll('.editor-block-input').forEach(function(el) {
      var idx = parseInt(el.dataset.index);
      if (!isNaN(idx) && self.editorBlocks[idx]) self.editorBlocks[idx].value = el.value;
    });
    document.querySelectorAll('.editor-block-url').forEach(function(el) {
      var idx = parseInt(el.dataset.index);
      if (!isNaN(idx) && self.editorBlocks[idx]) self.editorBlocks[idx].value = el.value;
    });
  },

  async renderChat(friendId) {
    this.renderLoading();
    try {
      var d = await API.getMessages(friendId), messages = d.messages || [];
      var fp = (await API.getUserProfile(friendId)).profile;
      var friendAvatar = fp.avatar_url ? '<img src="' + escapeHtml(fp.avatar_url) + '" style="width:36px;height:36px;border-radius:50%;object-fit:cover;cursor:pointer;" class="friend-chat-profile" data-uid="' + friendId + '">' : '<div style="width:36px;height:36px;border-radius:50%;background:var(--primary);color:#fff;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:600;cursor:pointer;" class="friend-chat-profile" data-uid="' + friendId + '">' + escapeHtml((fp.nickname || fp.username).charAt(0).toUpperCase()) + '</div>';
      var onlineDot = fp.is_banned ? '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#ef4444;margin-left:6px;" title="已禁言"></span>' : '<span class="chat-online-dot" data-uid="' + friendId + '" style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#94a3b8;margin-left:6px;" title="离线"></span>';
      document.getElementById('app').innerHTML = '<div class="page-fade-in"><div class="chat-page"><div class="chat-header"><button class="btn btn-sm btn-outline" id="back-to-friends">← 返回</button>' + friendAvatar + '<div class="chat-header-info"><span style="font-weight:600;cursor:pointer;" class="friend-chat-profile" data-uid="' + friendId + '">' + escapeHtml(fp.nickname || fp.username) + '</span>' + onlineDot + '</div></div>' + '<div class="chat-messages" id="chat-messages" style="height:400px;overflow-y:auto;padding:16px;background:var(--bg);border-radius:8px;margin:12px 0;">' + (messages.length === 0 ? '<p style="text-align:center;color:var(--text-secondary);padding:40px;">暂无消息</p>' : messages.map(function(m) { var isMe = m.from_user_id === App.user.id; return '<div style="display:flex;justify-content:' + (isMe ? 'flex-end' : 'flex-start') + ';margin-bottom:10px;"><div style="max-width:70%;padding:8px 14px;border-radius:12px;background:' + (isMe ? 'var(--primary)' : 'var(--bg-card)') + ';color:' + (isMe ? '#fff' : 'var(--text)') + ';border:1px solid var(--border);"><div style="font-size:13px;line-height:1.4;">' + escapeHtml(m.content) + '</div><div style="font-size:10px;margin-top:4px;opacity:0.6;text-align:' + (isMe ? 'right' : 'left') + ';">' + formatDate(m.created_at) + '</div></div></div>'; }).join('')) + '</div><div class="chat-input" style="display:flex;gap:8px;"><textarea class="form-textarea" id="chat-input" rows="2" placeholder="输入消息..." style="flex:1;"></textarea><button class="btn btn-primary" id="send-msg-btn" style="align-self:flex-end;">发送</button></div></div></div>';
      var msgDiv = document.getElementById('chat-messages'); if (msgDiv) msgDiv.scrollTop = msgDiv.scrollHeight;
      document.getElementById('back-to-friends').onclick = function() { Router.navigate('#/friends'); };
      document.querySelectorAll('.friend-chat-profile').forEach(function(el) { el.addEventListener('click', function() { Router.navigate('#/users/' + this.dataset.uid); }); });
      var updateChatOnline = async function() { try { var od = await API.getFriendOnlineStatus(); var dot = document.querySelector('.chat-online-dot'); if (dot && od.online) { dot.style.background = od.online[friendId] ? '#22c55e' : '#94a3b8'; dot.title = od.online[friendId] ? '在线' : '离线'; } } catch(e) {} };
      updateChatOnline(); if (Components._chatOnlineTimer) clearInterval(Components._chatOnlineTimer); Components._chatOnlineTimer = setInterval(updateChatOnline, 30000);
      Components._chatLastMsgId = messages.length > 0 ? messages[messages.length - 1].id : 0;
      if (Components._chatPollTimer) clearInterval(Components._chatPollTimer);
      Components._chatPollTimer = setInterval(async function() {
        try { var fresh = await API.getMessages(friendId); var all = fresh.messages || []; var newOnes = []; for (var mi = 0; mi < all.length; mi++) { if (all[mi].id > Components._chatLastMsgId) newOnes.push(all[mi]); } if (newOnes.length > 0) { Components._chatLastMsgId = newOnes[newOnes.length - 1].id; var container = document.getElementById('chat-messages'); if (container) { var emptyP = container.querySelector('p'); if (emptyP) emptyP.remove(); newOnes.forEach(function(msg) { var me = msg.from_user_id === App.user.id; var el = document.createElement('div'); el.style.cssText = 'display:flex;justify-content:' + (me ? 'flex-end' : 'flex-start') + ';margin-bottom:10px;'; el.innerHTML = '<div style="max-width:70%;padding:8px 14px;border-radius:12px;background:' + (me ? 'var(--primary)' : 'var(--bg-card)') + ';color:' + (me ? '#fff' : 'var(--text)') + ';border:1px solid var(--border);"><div style="font-size:13px;line-height:1.4;">' + escapeHtml(msg.content) + '</div><div style="font-size:10px;margin-top:4px;opacity:0.6;text-align:' + (me ? 'right' : 'left') + ';">' + formatDate(msg.created_at) + '</div></div>'; container.appendChild(el); }); container.scrollTop = container.scrollHeight; } } } catch(e) {}
      }, 3000);
      document.getElementById('send-msg-btn').addEventListener('click', async function() { var input = document.getElementById('chat-input'), c = input.value.trim(); if (!c) return; var btn = this; btn.disabled = true; btn.textContent = '发送中...'; try { var sendResult = await API.sendMessage(friendId, c); if (sendResult && sendResult.id) Components._chatLastMsgId = sendResult.id; input.value = ''; var container = document.getElementById('chat-messages'); if (container) { var emptyP = container.querySelector('p'); if (emptyP) emptyP.remove(); var el = document.createElement('div'); el.style.cssText = 'display:flex;justify-content:flex-end;margin-bottom:10px;'; el.innerHTML = '<div style="max-width:70%;padding:8px 14px;border-radius:12px;background:var(--primary);color:#fff;border:1px solid var(--border);"><div style="font-size:13px;line-height:1.4;">' + escapeHtml(c) + '</div><div style="font-size:10px;margin-top:4px;opacity:0.6;text-align:right;">刚刚</div></div>'; container.appendChild(el); container.scrollTop = container.scrollHeight; } } catch(err) { showToast(err.message, 'error'); } finally { btn.disabled = false; btn.textContent = '发送'; } });
      document.getElementById('chat-input').addEventListener('keydown', function(e) { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); document.getElementById('send-msg-btn').click(); } });
    } catch (err) { showToast(err.message, 'error'); Router.navigate('#/friends'); }
  },
};
