// Post list component
var ComponentsPostList = {
  renderPostList: function(category) {
    this._currentCategory = category || null; this.currentPage = 1; this.hasMore = false; this.allPosts = []; this._searchQuery = ''; this._activeTag = null; this._sortMode = 'latest';
    this._initLevelCache();
    var isAdmin = App.user && App.user.role === 'admin', isWork = !category || category === 'work';
    document.getElementById('app').innerHTML = '<div class="page-fade-in"><div class="page-header"><h1 class="page-title">' + (isWork ? '📂 作品区' : '💬 聊天区') + '</h1><div style="display:flex;gap:8px;align-items:center;">' + ((isWork ? isAdmin : true) ? '<button class="btn btn-primary" id="create-post-btn">' + (isWork ? '✏️ 发布作品' : '✏️ 发帖') + '</button>' : '') + '</div></div>' + (isAdmin ? '<div class="admin-batch-bar"><label class="form-checkbox" style="font-size:13px;"><input type="checkbox" id="select-all-posts"> 全选</label><button class="btn btn-danger btn-sm" id="delete-selected-btn" disabled>🗑️ 删除选中 (<span id="selected-count">0</span>)</button></div>' : '') + '<div class="search-bar"><input class="search-input" id="post-search" type="text" placeholder="搜索标题或简介..."></div><div class="sort-bar"><button class="sort-btn active" data-sort="latest">⏰ 最新</button><button class="sort-btn" data-sort="views">🔥 最热</button></div><div class="tag-filter-bar" id="tag-filter-bar" style="display:none;"><span class="tag-filter-label">🏷️ 标签：</span><button class="tag-chip active" data-tag="">全部</button></div><div class="post-grid" id="post-grid"></div><div class="load-more-wrap" id="load-more-wrap" style="display:none;"><button class="btn btn-outline" id="load-more-btn">加载更多</button></div><div class="empty-state" id="empty-state" style="display:none;"><div class="empty-state-icon">📭</div><p class="empty-state-text">' + (isWork ? '暂无作品' : '暂无帖子') + '</p></div></div>';
    var st; document.getElementById('post-search').addEventListener('input', function() { clearTimeout(st); st = setTimeout(function() { Components._searchQuery = document.getElementById('post-search').value.trim().toLowerCase(); Components._applyFilters(); }, 200); });
    document.querySelectorAll('.sort-btn').forEach(function(b) { b.addEventListener('click', function() { playClickSound(); document.querySelectorAll('.sort-btn').forEach(function(x) { x.classList.remove('active'); }); b.classList.add('active'); Components._sortMode = b.dataset.sort; Components._applyFilters(); }); });
    document.getElementById('tag-filter-bar').addEventListener('click', function(e) { if (e.target.classList.contains('tag-chip')) { playClickSound(); document.querySelectorAll('#tag-filter-bar .tag-chip').forEach(function(t) { t.classList.remove('active'); }); e.target.classList.add('active'); Components._activeTag = e.target.dataset.tag || null; Components._applyFilters(); } });
    if (document.getElementById('create-post-btn')) document.getElementById('create-post-btn').addEventListener('click', function() { playClickSound(); Router.navigate(isWork ? '#/create' : '#/create/chat'); });
    document.getElementById('load-more-btn').addEventListener('click', function() { playClickSound(); Components._loadMorePosts(); });
    var sa = document.getElementById('select-all-posts'), db = document.getElementById('delete-selected-btn');
    if (sa && db) {
      sa.addEventListener('change', function() { document.querySelectorAll('.post-select-checkbox').forEach(function(cb) { cb.checked = sa.checked; }); Components._updateDeleteSelectedBtn(); });
      db.addEventListener('click', async function() { var sel = []; document.querySelectorAll('.post-select-checkbox:checked').forEach(function(cb) { sel.push(parseInt(cb.dataset.postId)); }); if (sel.length === 0) return; if (!(await showConfirm('确定删除选中的 ' + sel.length + ' 个帖子？'))) return; Components.currentPage = 1; try { await API.adminBatchDeletePosts(sel); showToast('成功删除 ' + sel.length + ' 个帖子', 'success'); await Components._loadPosts(true); } catch (err) { showToast(err.message, 'error'); } finally { Components._updateDeleteSelectedBtn(); } });
      document.getElementById('post-grid').addEventListener('change', function(e) { if (e.target.classList.contains('post-select-checkbox')) Components._updateDeleteSelectedBtn(); });
    }
    this._loadPosts();
  },

  _applyFilters: function() {
    var g = document.getElementById('post-grid'); if (!g) return;
    var f = this.allPosts.slice();
    if (this._searchQuery) f = f.filter(function(p) { return p.title.toLowerCase().includes(Components._searchQuery) || (p.description || '').toLowerCase().includes(Components._searchQuery); });
    if (this._activeTag) f = f.filter(function(p) { return p.tags ? p.tags.split(',').map(function(t) { return t.trim(); }).filter(Boolean).includes(Components._activeTag) : false; });
    f.sort(function(a, b) { return Components._sortMode === 'views' ? (b.views || 0) - (a.views || 0) : new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at); });
    g.innerHTML = '';
    if (f.length === 0) { document.getElementById('empty-state').style.display = 'block'; return; }
    document.getElementById('empty-state').style.display = 'none';
    f.forEach(function(p) { g.appendChild(Components._createPostCard(p)); });
    if (document.getElementById('select-all-posts')) document.getElementById('select-all-posts').checked = false;
    this._updateDeleteSelectedBtn();
  },

  _createPostCard: function(post) {
    var c = document.createElement('div'); c.className = 'post-card';
    var badges = []; if (post.is_sticky) badges.push('📌'); if (post.is_featured) badges.push('⭐'); if (post.is_locked) badges.push('🔒');
    var ia = App.user && App.user.role === 'admin';
    c.innerHTML = '<div class="post-card-img" style="' + (post.cover_url ? "background-image:url('" + post.cover_url + "');background-size:cover;background-position:center;" : '') + '">' + (post.cover_url ? '' : '📄') + '<div class="post-card-overlay">🔍 查看详情</div><span class="category-badge ' + (post.category === 'chat' ? 'chat' : 'work') + '">' + (post.category === 'chat' ? '💬 聊天' : '📂 作品') + '</span></div><div class="post-card-body">' + (ia ? '<label class="post-select-wrap"><input type="checkbox" class="post-select-checkbox" data-post-id="' + post.id + '"></label>' : '') + '<div class="post-card-title">' + (badges.length ? badges.join(' ') + ' ' : '') + escapeHtml(post.title) + '</div><div class="post-card-desc">' + escapeHtml(post.description || '暂无简介') + '</div><div class="post-card-footer"><div class="post-card-tags">' + (post.tags ? post.tags.split(',').map(function(t) { return '<span class="tag-chip" style="cursor:default;">' + escapeHtml(t.trim()) + '</span>'; }).join('') : '') + '</div><div style="display:flex;gap:8px;align-items:center;flex-shrink:0;"><span style="font-size:13px;color:var(--text-light);">👍 ' + (post.like_count || 0) + '</span><span style="font-size:13px;color:var(--text-light);">👎 ' + (post.dislike_count || 0) + '</span><span class="post-card-views">👁 ' + (post.views || 0) + '</span></div></div><div class="post-card-date">' + formatDate(post.created_at) + '</div></div>';
    c.addEventListener('click', function(e) { if (e.target.closest('.post-select-wrap')) return; playClickSound(); Router.navigate('#/posts/' + post.id); });
    return c;
  },

  _updateDeleteSelectedBtn: function() { var d = document.getElementById('delete-selected-btn'), ce = document.getElementById('selected-count'); if (!d || !ce) return; var c = document.querySelectorAll('.post-select-checkbox:checked').length; ce.textContent = c; d.disabled = c === 0; },

  _updateTagFilterBar: async function() {
    var bar = document.getElementById('tag-filter-bar'); if (!bar) return;
    try { var tags = (await API.getTags(this._currentCategory)).tags || []; if (tags.length === 0) { bar.style.display = 'none'; return; } bar.style.display = 'flex'; var ac = bar.querySelector('.tag-chip'); bar.innerHTML = ''; bar.appendChild(ac); tags.forEach(function(t) { var chip = document.createElement('button'); chip.className = 'tag-chip'; if (Components._activeTag === t.name) chip.classList.add('active'); chip.dataset.tag = t.name; chip.textContent = t.name; bar.appendChild(chip); }); } catch (e) { bar.style.display = 'none'; }
  },

  _loadPosts: async function(isFullRefresh) {
    try {
      var d = await API.getPosts(this.currentPage, 9, this._currentCategory);
      this.hasMore = d.pagination.hasMore;
      if (isFullRefresh || this.currentPage === 1) { this.allPosts = d.posts; }
      else { var ids = new Set(this.allPosts.map(function(p) { return p.id; })); d.posts.forEach(function(p) { if (!ids.has(p.id)) Components.allPosts.push(p); }); }
      if (d.posts.length === 0 && this.allPosts.length === 0) { document.getElementById('empty-state').style.display = 'block'; return; }
      this._updateTagFilterBar(); this._applyFilters();
      var lw = document.getElementById('load-more-wrap'), lb = document.getElementById('load-more-btn');
      if (lw && lb) { lw.style.display = this.hasMore ? 'block' : 'none'; if (this.hasMore) { lb.textContent = '加载更多 (' + (d.pagination.totalPages - this.currentPage) + ' 页剩余)'; lb.disabled = false; } }
    } catch (err) { showToast(err.message, 'error'); }
  },

  _loadMorePosts: async function() { if (this.isLoading || !this.hasMore) return; this.isLoading = true; var b = document.getElementById('load-more-btn'); b.disabled = true; b.textContent = '加载中...'; this.currentPage++; await this._loadPosts(); this.isLoading = false; },

  renderMyPosts: function() {
    this._initLevelCache();
    var self = this;
    this._myPostsPage = 1;
    this._myPostsList = [];
    this._myPostsHasMore = false;
    document.getElementById('app').innerHTML = '<div class="page-fade-in"><div class="page-header">' +
      '<h1 class="page-title">📂 我的作品</h1></div>' +
      '<div style="margin-bottom:16px;"><button class="btn btn-outline btn-sm" id="my-posts-back-btn">← 返回个人主页</button></div>' +
      '<div class="post-grid" id="my-posts-grid"></div>' +
      '<div class="load-more-wrap" id="my-posts-load-wrap" style="display:none;"><button class="btn btn-outline" id="my-posts-load-btn">加载更多</button></div>' +
      '<div class="empty-state" id="my-posts-empty" style="display:none;"><div class="empty-state-icon">📭</div><p>暂无作品</p></div></div>';
    document.getElementById('my-posts-back-btn').addEventListener('click', function() { playClickSound(); Router.navigate('#/profile'); });
    document.getElementById('my-posts-load-btn')?.addEventListener('click', function() { playClickSound(); self._loadMyPosts(false); });
    this._loadMyPosts(true);
  },

  _loadMyPosts: async function(reset) {
    if (reset) { this._myPostsPage = 1; this._myPostsList = []; }
    try {
      var data = await API.getUserPosts(App.user.id, this._myPostsPage, 9);
      var posts = data.posts || [];
      posts.forEach(function(p) { Components._myPostsList.push(p); });
      this._myPostsHasMore = data.pagination && data.pagination.hasMore;
      this._myPostsPage++;
      this._renderMyPostGrid();
    } catch (err) { showToast(err.message, 'error'); }
  },

  _renderMyPostGrid: function() {
    var grid = document.getElementById('my-posts-grid');
    var empty = document.getElementById('my-posts-empty');
    var loadWrap = document.getElementById('my-posts-load-wrap');
    if (!grid) return;
    if (this._myPostsList.length === 0) {
      grid.innerHTML = '';
      if (empty) empty.style.display = 'block';
      if (loadWrap) loadWrap.style.display = 'none';
      return;
    }
    if (empty) empty.style.display = 'none';
    grid.innerHTML = this._myPostsList.map(function(pt) {
      var badges = []; if (pt.is_sticky) badges.push('📌'); if (pt.is_featured) badges.push('⭐'); if (pt.is_locked) badges.push('🔒');
      return '<div class="post-card" data-post-id="' + pt.id + '">' +
        '<div class="post-card-img" style="' + (pt.cover_url ? "background-image:url('" + pt.cover_url + "');background-size:cover;background-position:center;" : '') + '">' +
        (pt.cover_url ? '' : '📄') + '</div>' +
        '<div class="post-card-body">' +
        '<div class="post-card-title">' + (badges.length ? badges.join(' ') + ' ' : '') + escapeHtml(pt.title) + '</div>' +
        '<div class="post-card-desc">' + escapeHtml(pt.description || '暂无简介') + '</div>' +
        '<div class="post-card-footer"><div class="post-card-tags">' + (pt.tags ? pt.tags.split(',').map(function(t) { return '<span class="tag-chip" style="cursor:default;">' + escapeHtml(t.trim()) + '</span>'; }).join('') : '') + '</div>' +
        '<div style="display:flex;gap:8px;align-items:center;flex-shrink:0;"><span style="font-size:13px;color:var(--text-light);">👍 ' + (pt.like_count || 0) + '</span><span style="font-size:13px;color:var(--text-light);">👎 ' + (pt.dislike_count || 0) + '</span><span class="post-card-views">👁 ' + (pt.views || 0) + '</span></div></div>' +
        '<div class="post-card-date">' + formatDate(pt.created_at) + '</div></div></div>';
    }).join('');
    grid.querySelectorAll('.post-card').forEach(function(c) {
      c.addEventListener('click', function() { playClickSound(); Router.navigate('#/posts/' + this.dataset.postId); });
    });
    if (loadWrap) {
      loadWrap.style.display = this._myPostsHasMore ? '' : 'none';
      var lb = document.getElementById('my-posts-load-btn');
      if (lb) lb.disabled = false;
    }
  }
};
