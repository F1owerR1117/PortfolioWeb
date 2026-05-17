// Post list component
var ComponentsPostList = {
  _viewMode: localStorage.getItem('portfolio_post_view') || 'grid',

  renderPostList: function(category) {
    this._currentCategory = category || null; this.currentPage = 1; this.hasMore = false; this.allPosts = []; this._searchQuery = ''; this._activeTag = null; this._sortMode = 'latest';
    this._initLevelCache();
    var isAdmin = App.user && App.user.role === 'admin', isWork = !category || category === 'work', isJob = category === 'job';
    var vm = this._viewMode;
    document.getElementById('app').innerHTML = '<div class="page-fade-in"><div class="page-header"><h1 class="page-title">' + (isJob ? '💼 求职招聘区' : (isWork ? '📂 作品区' : '💬 聊天区')) + '</h1><div style="display:flex;gap:8px;align-items:center;"><div class="view-toggle" style="display:inline-flex;gap:2px;background:rgba(0,0,0,0.3);border:1px solid var(--border);border-radius:10px;padding:3px;"><button class="view-toggle-btn' + (vm === 'grid' ? ' active' : '') + '" data-view="grid" style="padding:7px 14px;border:none;border-radius:8px;background:' + (vm === 'grid' ? 'var(--bg-active)' : 'transparent') + ';color:' + (vm === 'grid' ? 'var(--primary)' : 'var(--text-secondary)') + ';font-size:13px;cursor:pointer;font-weight:' + (vm === 'grid' ? '600' : '400') + ';font-family:inherit;">▦ 卡片</button><button class="view-toggle-btn' + (vm === 'list' ? ' active' : '') + '" data-view="list" style="padding:7px 14px;border:none;border-radius:8px;background:' + (vm === 'list' ? 'var(--bg-active)' : 'transparent') + ';color:' + (vm === 'list' ? 'var(--primary)' : 'var(--text-secondary)') + ';font-size:13px;cursor:pointer;font-weight:' + (vm === 'list' ? '600' : '400') + ';font-family:inherit;">☰ 列表</button></div>' + ((isWork ? isAdmin : true) ? '<button class="btn btn-primary" id="create-post-btn">' + (isJob ? '💼 发布职位' : (isWork ? '✏️ 发布作品' : '✏️ 发帖')) + '</button>' : '') + '</div></div>' + (isAdmin ? '<div class="admin-batch-bar"><label class="form-checkbox" style="font-size:13px;"><input type="checkbox" id="select-all-posts"> 全选</label><button class="btn btn-danger btn-sm" id="delete-selected-btn" disabled>🗑️ 删除选中 (<span id="selected-count">0</span>)</button></div>' : '') + (isJob ? '<div class="job-filter-bar" style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap;">' + '<select id="job-filter-type" style="padding:7px 12px;border:1px solid var(--border);border-radius:8px;background:var(--bg-input);color:var(--text);font-size:12px;font-family:inherit;">' + '<option value="">💼 全部类型</option><option value="fulltime">全职</option><option value="parttime">兼职</option><option value="intern">实习</option></select>' + '<select id="job-filter-city" style="padding:7px 12px;border:1px solid var(--border);border-radius:8px;background:var(--bg-input);color:var(--text);font-size:12px;font-family:inherit;">' + '<option value="">📌 所有城市</option><option>北京</option><option>上海</option><option>深圳</option><option>杭州</option><option>远程</option></select>' + '<select id="job-filter-salary" style="padding:7px 12px;border:1px solid var(--border);border-radius:8px;background:var(--bg-input);color:var(--text);font-size:12px;font-family:inherit;">' + '<option value="">💰 薪资不限</option><option value="10">10K+</option><option value="20">20K+</option><option value="30">30K+</option></select></div>' : '') + '<div class="search-bar"><input class="search-input" id="post-search" type="text" placeholder="搜索标题或简介..."></div><div class="sort-bar"><button class="sort-btn active" data-sort="latest">⏰ 最新</button><button class="sort-btn" data-sort="views">🔥 最热</button></div><div class="tag-filter-bar" id="tag-filter-bar" style="display:none;"><span class="tag-filter-label">🏷️ 标签：</span><button class="tag-chip active" data-tag="">全部</button></div><div class="' + (vm === 'grid' ? 'post-grid' : 'post-list') + '" id="post-container" style="display:none;"></div><div class="load-more-wrap" id="load-more-wrap" style="display:none;"><button class="btn btn-outline" id="load-more-btn">加载更多</button></div><div class="empty-state" id="empty-state" style="display:none;"><div class="empty-state-icon">📭</div><p class="empty-state-text">' + (isJob ? '暂无招聘信息' : (isWork ? '暂无作品' : '暂无帖子')) + '</p></div></div>';
    var st; document.getElementById('post-search').addEventListener('input', function() { clearTimeout(st); st = setTimeout(function() { Components._searchQuery = document.getElementById('post-search').value.trim().toLowerCase(); Components._applyFilters(); }, 200); });
    document.querySelectorAll('#job-filter-type,#job-filter-city,#job-filter-salary').forEach(function(el){el.addEventListener('change',function(){Components._applyFilters();});}); document.querySelectorAll('.sort-btn').forEach(function(b) { b.addEventListener('click', function() { playClickSound(); document.querySelectorAll('.sort-btn').forEach(function(x) { x.classList.remove('active'); }); b.classList.add('active'); Components._sortMode = b.dataset.sort; Components._applyFilters(); }); });
    document.getElementById('tag-filter-bar').addEventListener('click', function(e) { if (e.target.classList.contains('tag-chip')) { playClickSound(); document.querySelectorAll('#tag-filter-bar .tag-chip').forEach(function(t) { t.classList.remove('active'); }); e.target.classList.add('active'); Components._activeTag = e.target.dataset.tag || null; Components._applyFilters(); } });
    if (document.getElementById('create-post-btn')) document.getElementById('create-post-btn').addEventListener('click', function() { playClickSound(); Router.navigate(isJob ? '#/create/job' : (isWork ? '#/create' : '#/create/chat')); });
    document.querySelectorAll('.view-toggle-btn').forEach(function(btn) { btn.addEventListener('click', function() { var mode = this.dataset.view; if (mode === Components._viewMode) return; Components._viewMode = mode; localStorage.setItem('portfolio_post_view', mode); document.querySelectorAll('.view-toggle-btn').forEach(function(b) { b.style.background = 'transparent'; b.style.color = 'var(--text-secondary)'; b.style.fontWeight = '400'; }); this.style.background = 'var(--bg-active)'; this.style.color = 'var(--primary)'; this.style.fontWeight = '600'; var c = document.getElementById('post-container'); if (c) { c.style.display = 'none'; c.className = mode === 'grid' ? 'post-grid' : 'post-list'; Components._applyFilters(); } }); });
    document.getElementById('job-apply-btn')?.addEventListener('click', function() { showToast('请先在个人主页提交身份申请', 'info'); Router.navigate('#/profile').then(function() { showToast('申请已提交', 'success'); document.getElementById('job-apply-btn')?.remove(); }).catch(function(err) { showToast(err.message, 'error'); }); });
    if (isJob) {
      API.getJobStats().then(function(d) {
        var s = d.salary || {}; var cities = d.cities || []; var skills = d.skills || [];
        var sidebar = document.getElementById('post-container');
        if (sidebar) {
          sidebar.insertAdjacentHTML('beforebegin', '<div class="job-stats-bar" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin-bottom:16px;padding:16px;background:var(--bg-card);border:1px solid var(--border);border-radius:12px;">' +
            '<div style="text-align:center;"><div style="font-size:18px;font-weight:700;color:var(--primary);">' + (s.total_jobs || 0) + '</div><div style="font-size:11px;color:var(--text-secondary);">💼 招聘职位</div></div>' +
            (s.avg_salary_min ? '<div style="text-align:center;"><div style="font-size:18px;font-weight:700;">' + Math.round(s.avg_salary_min/1000) + 'K-'+ Math.round(s.avg_salary_max/1000) + 'K</div><div style="font-size:11px;color:var(--text-secondary);">💰 平均薪资</div></div>' : '') +
            (cities[0] ? '<div style="text-align:center;"><div style="font-size:18px;font-weight:700;">' + escapeHtml(cities[0].city) + '</div><div style="font-size:11px;color:var(--text-secondary);">📌 最热门城市</div></div>' : '') +
            (skills[0] ? '<div style="text-align:center;"><div style="font-size:18px;font-weight:700;color:var(--primary);">' + escapeHtml(skills[0].name) + '</div><div style="font-size:11px;color:var(--text-secondary);">🌟 最热门技能</div></div>' : '') +
            '</div>');
        }
      }).catch(function(){});
    }
    document.getElementById('load-more-btn').addEventListener('click', function() { playClickSound(); Components._loadMorePosts(); });
    var sa = document.getElementById('select-all-posts'), db = document.getElementById('delete-selected-btn');
    if (sa && db) {
      sa.addEventListener('change', function() { document.querySelectorAll('.post-select-checkbox').forEach(function(cb) { cb.checked = sa.checked; }); Components._updateDeleteSelectedBtn(); });
      db.addEventListener('click', async function() { var sel = []; document.querySelectorAll('.post-select-checkbox:checked').forEach(function(cb) { sel.push(parseInt(cb.dataset.postId)); }); if (sel.length === 0) return; if (!(await showConfirm('确定删除选中的 ' + sel.length + ' 个帖子？'))) return; Components.currentPage = 1; try { await API.adminBatchDeletePosts(sel); showToast('成功删除 ' + sel.length + ' 个帖子', 'success'); await Components._loadPosts(true); } catch (err) { showToast(err.message, 'error'); } finally { Components._updateDeleteSelectedBtn(); } });
      document.getElementById('post-container').addEventListener('change', function(e) { if (e.target.classList.contains('post-select-checkbox')) Components._updateDeleteSelectedBtn(); });
    }
    this._loadPosts();
  },

  _applyFilters: function() {
    var g = document.getElementById('post-container'); if (!g) return;
    var f = this.allPosts.slice();
    if (this._searchQuery) f = f.filter(function(p) { return p.title.toLowerCase().includes(Components._searchQuery) || (p.description || '').toLowerCase().includes(Components._searchQuery); });
    if (this._activeTag) f = f.filter(function(p) { return p.tags ? p.tags.split(',').map(function(t) { return t.trim(); }).filter(Boolean).includes(Components._activeTag) : false; });
    f.sort(function(a, b) { return Components._sortMode === 'views' ? (b.views || 0) - (a.views || 0) : new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at); });
    g.innerHTML = '';
    if (f.length === 0) { document.getElementById('empty-state').style.display = 'block'; g.style.display = 'none'; return; }
    document.getElementById('empty-state').style.display = 'none';
    g.style.display = '';
    if (Components._currentCategory === 'job') { var jt=document.getElementById('job-filter-type'); var jc=document.getElementById('job-filter-city'); var js2=document.getElementById('job-filter-salary'); if(jt&&jt.value)f=f.filter(function(p){return p.job_type===jt.value;}); if(jc&&jc.value)f=f.filter(function(p){return(p.job_location_city||'').toLowerCase().indexOf(jc.value.toLowerCase())>=0;}); if(js2&&js2.value){var mn=parseInt(js2.value)*1000;f=f.filter(function(p){return parseInt(p.job_salary_min||0)>=mn;});} } f.forEach(function(p) { g.appendChild(Components._viewMode === 'grid' ? Components._createPostCard(p) : Components._createPostRow(p)); });
    if (document.getElementById('select-all-posts')) document.getElementById('select-all-posts').checked = false;
    this._updateDeleteSelectedBtn();
  },

  _createPostCard: function(post) {
    var c = document.createElement('div'); c.className = 'post-card';
    var badges = []; if (post.is_sticky) badges.push('📌'); if (post.is_featured) badges.push('⭐'); if (post.is_locked) badges.push('🔒');
    var ia = App.user && (App.user.role === 'admin' || App.user.id === post.created_by);
    c.innerHTML = '<div class="post-card-img" style="' + (post.cover_url ? "background-image:url('" + post.cover_url + "');background-size:cover;background-position:center;" : '') + '">' + (post.cover_url ? '' : '📄') + '<div class="post-card-overlay">🔍 查看详情</div><span class="category-badge ' + (post.category === 'chat' ? 'chat' : 'work') + '">' + (post.category === 'chat' ? '💬 聊天' : '📂 作品') + '</span></div><div class="post-card-body">' + (ia ? '<label class="post-select-wrap"><input type="checkbox" class="post-select-checkbox" data-post-id="' + post.id + '"></label>' : '') + '<div class="post-card-title">' + (badges.length ? badges.join(' ') + ' ' : '') + escapeHtml(post.title) + '</div><div class="post-card-desc">' + escapeHtml(post.description || '暂无简介') + '</div><div class="post-card-footer"><div class="post-card-tags">' + (post.tags ? post.tags.split(',').map(function(t) { return '<span class="tag">' + escapeHtml(t.trim()) + '</span>'; }).join('') : '') + '</div><div class="stats"><span class="stat">👍 ' + (post.like_count || 0) + '</span><span class="stat">👁 ' + (post.views || 0) + '</span></div></div><div class="post-card-date">' + formatDate(post.created_at) + '</div></div>';
    c.addEventListener('click', function(e) { if (e.target.closest('.post-select-wrap')) return; playClickSound(); Router.navigate('#/posts/' + post.id); });
    return c;
  },

  _createPostRow: function(post) {
    var r = document.createElement('div'); r.className = 'post-row';
    var ia = App.user && (App.user.role === 'admin' || App.user.id === post.created_by);
    var badgesHtml = (post.is_sticky ? '<span class="post-row-badge sticky">📌</span>' : '') + (post.is_featured ? '<span class="post-row-badge featured">⭐</span>' : '') + (post.is_locked ? '<span class="post-row-badge locked">🔒</span>' : '');
    var thumbHtml = post.cover_url ? '<img src="' + escapeHtml(post.cover_url) + '" alt="">' : (post.category === 'chat' ? '💬' : '📄');
    var catTag = post.category === 'chat' ? '💬' : '📂';
    r.innerHTML = (ia ? '<label class="post-select-wrap" style="display:flex;align-items:center;padding:0 0 0 6px;flex-shrink:0;"><input type="checkbox" class="post-select-checkbox" data-post-id="' + post.id + '"></label>' : '') + '<div class="post-row-img">' + thumbHtml + '<span class="category-tag">' + catTag + '</span></div><div class="post-row-body"><div class="post-row-title">' + badgesHtml + escapeHtml(post.title) + '</div><div class="post-row-meta"><span class="post-row-tags">' + (post.tags ? post.tags.split(',').map(function(t) { return '<span class="post-row-tag">' + escapeHtml(t.trim()) + '</span>'; }).join('') : '') + '</span></div></div><div class="post-row-stats">👍 ' + (post.like_count || 0) + ' · 👁 ' + (post.views || 0) + '</div><div class="post-row-date">' + formatDate(post.created_at) + '</div>';
    r.addEventListener('click', function(e) { if (e.target.closest('.post-select-wrap')) return; playClickSound(); Router.navigate('#/posts/' + post.id); });
    return r;
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

  _myViewMode: localStorage.getItem('portfolio_my_post_view') || 'grid',

  renderMyPosts: function() {
    this._initLevelCache();
    var self = this;
    this._myPostsPage = 1;
    this._myPostsList = [];
    this._myPostsHasMore = false;
    this._mySearchQuery = '';
    var vm = this._myViewMode;
    var isAdmin = App.user && App.user.role === 'admin';
    document.getElementById('app').innerHTML = '<div class="page-fade-in"><div class="page-header">' +
      '<h1 class="page-title">📂 我的作品</h1></div>' +
      '<div style="margin-bottom:12px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;"><button class="btn btn-outline btn-sm" id="my-posts-back-btn">← 返回个人主页</button>' +
      '<div class="view-toggle" style="display:inline-flex;gap:2px;background:rgba(0,0,0,0.3);border:1px solid var(--border);border-radius:10px;padding:3px;"><button class="view-toggle-btn' + (vm === 'grid' ? ' active' : '') + '" data-view="grid" style="padding:7px 14px;border:none;border-radius:8px;background:' + (vm === 'grid' ? 'var(--bg-active)' : 'transparent') + ';color:' + (vm === 'grid' ? 'var(--primary)' : 'var(--text-secondary)') + ';font-size:13px;cursor:pointer;font-weight:' + (vm === 'grid' ? '600' : '400') + ';font-family:inherit;">▦ 卡片</button><button class="view-toggle-btn' + (vm === 'list' ? ' active' : '') + '" data-view="list" style="padding:7px 14px;border:none;border-radius:8px;background:' + (vm === 'list' ? 'var(--bg-active)' : 'transparent') + ';color:' + (vm === 'list' ? 'var(--primary)' : 'var(--text-secondary)') + ';font-size:13px;cursor:pointer;font-weight:' + (vm === 'list' ? '600' : '400') + ';font-family:inherit;">☰ 列表</button></div></div>' +
      '<div class="admin-batch-bar" id="my-posts-batch-bar" style="display:none;"><label class="form-checkbox" style="font-size:13px;"><input type="checkbox" id="my-select-all-posts"> 全选</label><button class="btn btn-danger btn-sm" id="my-delete-selected-btn" disabled>🗑️ 删除选中 (<span id="my-selected-count">0</span>)</button></div>' +
      '<div class="search-bar"><input class="search-input" id="my-posts-search" type="text" placeholder="搜索标题或简介..."></div>' +
      '<div class="' + (vm === 'grid' ? 'post-grid' : 'post-list') + '" id="my-posts-container" style="display:none;"></div>' +
      '<div class="load-more-wrap" id="my-posts-load-wrap" style="display:none;"><button class="btn btn-outline" id="my-posts-load-btn">加载更多</button></div>' +
      '<div class="empty-state" id="my-posts-empty" style="display:none;"><div class="empty-state-icon">📭</div><p>暂无作品</p></div></div>';
    document.getElementById('my-posts-back-btn').addEventListener('click', function() { playClickSound(); Router.navigate('#/profile'); });
    document.getElementById('my-posts-load-btn')?.addEventListener('click', function() { playClickSound(); self._loadMyPosts(false); });
    document.querySelectorAll('.view-toggle-btn').forEach(function(btn) { btn.addEventListener('click', function() { var mode = this.dataset.view; if (mode === Components._myViewMode) return; Components._myViewMode = mode; localStorage.setItem('portfolio_my_post_view', mode); document.querySelectorAll('.view-toggle-btn').forEach(function(b) { b.style.background = 'transparent'; b.style.color = 'var(--text-secondary)'; b.style.fontWeight = '400'; }); this.style.background = 'var(--bg-active)'; this.style.color = 'var(--primary)'; this.style.fontWeight = '600'; var c = document.getElementById('my-posts-container'); if (c) { c.style.display = 'none'; c.className = mode === 'grid' ? 'post-grid' : 'post-list'; Components._renderMyPostGrid(); } }); });
    var st; document.getElementById('my-posts-search')?.addEventListener('input', function() { clearTimeout(st); st = setTimeout(function() { Components._mySearchQuery = this.value.trim().toLowerCase(); Components._renderMyPostGrid(); }.bind(this), 200); });
    // 批量删除
    var bb = document.getElementById('my-posts-batch-bar');
    if (bb && App.user) { bb.style.display = 'flex'; }
    function updateMyDelBtn() { var c = document.querySelectorAll('#my-posts-container .post-select-checkbox:checked').length; var btn = document.getElementById('my-delete-selected-btn'); var cnt = document.getElementById('my-selected-count'); if (btn && cnt) { btn.disabled = c === 0; cnt.textContent = c; } }
    document.getElementById('my-select-all-posts')?.addEventListener('change', function() { var checked = this.checked; document.querySelectorAll('#my-posts-container .post-select-checkbox').forEach(function(cb) { cb.checked = checked; }); updateMyDelBtn(); });
    document.getElementById('my-delete-selected-btn')?.addEventListener('click', async function() { var sel = []; document.querySelectorAll('#my-posts-container .post-select-checkbox:checked').forEach(function(cb) { sel.push(parseInt(cb.dataset.postId)); }); if (sel.length === 0) return; if (!(await showConfirm('确定删除选中的 ' + sel.length + ' 个帖子？'))) return; var btn = this; btn.disabled = true; btn.textContent = '⏳ 删除中...'; var errors = 0; for (var i = 0; i < sel.length; i++) { try { await API.deletePost(sel[i]); } catch(e) { errors++; } } if (errors > 0) showToast('部分删除失败（' + errors + ' 项）', 'error'); else { showToast('成功删除 ' + sel.length + ' 个帖子', 'success'); } Components._loadMyPosts(true); btn.disabled = false; btn.textContent = '🗑️ 删除选中'; });
    document.getElementById('my-posts-container')?.addEventListener('change', function(e) { if (e.target.classList.contains('post-select-checkbox')) updateMyDelBtn(); });
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
    var grid = document.getElementById('my-posts-container');
    var empty = document.getElementById('my-posts-empty');
    var loadWrap = document.getElementById('my-posts-load-wrap');
    if (!grid) return;

    var filtered = this._myPostsList;
    var sq = this._mySearchQuery;
    if (sq) {
      filtered = filtered.filter(function(p) { return p.title.toLowerCase().includes(sq) || (p.description || '').toLowerCase().includes(sq); });
    }

    if (filtered.length === 0) {
      grid.innerHTML = '';
      if (empty) empty.style.display = 'block';
      if (loadWrap) loadWrap.style.display = 'none';
      grid.style.display = 'none';
      return;
    }
    if (empty) empty.style.display = 'none';
    grid.style.display = '';

    grid.innerHTML = '';
    var vm = this._myViewMode;
    filtered.forEach(function(pt) { grid.appendChild(vm === 'grid' ? Components._createPostCard(pt) : Components._createPostRow(pt)); });
    if (loadWrap) {
      loadWrap.style.display = this._myPostsHasMore && filtered.length >= 9 ? '' : 'none';
      var lb = document.getElementById('my-posts-load-btn');
      if (lb) lb.disabled = false;
    }
  }
};
