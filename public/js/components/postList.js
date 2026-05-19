// Post list component
var ComponentsPostList = {
  _viewMode: localStorage.getItem('portfolio_post_view') || 'grid',

  renderPostList: function(category) {
    this._currentCategory = category || null; this.currentPage = 1; this.hasMore = false; this.allPosts = []; this._searchQuery = ''; this._activeTag = null; this._sortMode = 'latest'; this._searchTimer = null;
    this._initLevelCache();
    var isAdmin = App.user && App.user.role === 'admin', isWork = !category || category === 'work', isJob = category === 'job';
    var vm = this._viewMode;
    if (isJob) {
      this._renderJobZoneHtml(vm, isAdmin);
      this._bindJobZoneEvents(isAdmin);
      this._loadJobSidebar();
      this._loadPosts();
      return;
    }
    document.getElementById('app').innerHTML = '<div class="page-fade-in"><div class="page-header"><h1 class="page-title">' + (isWork ? '📂 作品区' : '💬 聊天区') + '</h1><div style="display:flex;gap:8px;align-items:center;"><div class="view-toggle" style="display:inline-flex;gap:2px;background:rgba(0,0,0,0.3);border:1px solid var(--border);border-radius:10px;padding:3px;"><button class="view-toggle-btn' + (vm === 'grid' ? ' active' : '') + '" data-view="grid" style="padding:7px 14px;border:none;border-radius:8px;background:' + (vm === 'grid' ? 'var(--bg-active)' : 'transparent') + ';color:' + (vm === 'grid' ? 'var(--primary)' : 'var(--text-secondary)') + ';font-size:13px;cursor:pointer;font-weight:' + (vm === 'grid' ? '600' : '400') + ';font-family:inherit;">▦ 卡片</button><button class="view-toggle-btn' + (vm === 'list' ? ' active' : '') + '" data-view="list" style="padding:7px 14px;border:none;border-radius:8px;background:' + (vm === 'list' ? 'var(--bg-active)' : 'transparent') + ';color:' + (vm === 'list' ? 'var(--primary)' : 'var(--text-secondary)') + ';font-size:13px;cursor:pointer;font-weight:' + (vm === 'list' ? '600' : '400') + ';font-family:inherit;">☰ 列表</button></div>' + ((isWork ? isAdmin : true) ? '<button class="btn btn-primary" id="create-post-btn">' + (isWork ? '✏️ 发布作品' : '✏️ 发帖') + '</button>' : '') + '</div></div>' + (isAdmin ? '<div class="admin-batch-bar"><label class="form-checkbox" style="font-size:13px;"><input type="checkbox" id="select-all-posts"> 全选</label><button class="btn btn-danger btn-sm" id="delete-selected-btn" disabled>🗑️ 删除选中 (<span id="selected-count">0</span>)</button></div>' : '') + '<div class="search-bar"><input class="search-input" id="post-search" type="text" placeholder="搜索标题或简介..."></div><div class="sort-bar"><button class="sort-btn active" data-sort="latest">⏰ 最新</button><button class="sort-btn" data-sort="views">🔥 最热</button><button class="sort-btn featured-btn" data-sort="featured">⭐ 精华</button></div><div class="tag-filter-bar" id="tag-filter-bar" style="display:none;"><span class="tag-filter-label">🏷️ 标签：</span><button class="tag-chip active" data-tag="">全部</button></div><div class="' + (vm === 'grid' ? 'post-grid' : 'post-list') + '" id="post-container" style="display:none;"></div><div class="load-more-wrap" id="load-more-wrap" style="display:none;"><button class="btn btn-outline" id="load-more-btn">加载更多</button></div><div class="empty-state" id="empty-state" style="display:none;"><div class="empty-state-icon">📭</div><p class="empty-state-text">' + (isWork ? '暂无作品' : '暂无帖子') + '</p></div></div>';
    var st; document.getElementById('post-search').addEventListener('input', function() { clearTimeout(st); st = setTimeout(function() { Components._searchQuery = document.getElementById('post-search').value.trim().toLowerCase(); Components._applyFilters(); }, 200); });
    document.querySelectorAll('#job-filter-type,#job-filter-city,#job-filter-salary').forEach(function(el){el.addEventListener('change',function(){Components.currentPage = 1; Components.allPosts = []; Components._loadPosts(true);});}); document.querySelectorAll('.sort-btn').forEach(function(b) { b.addEventListener('click', function() { playClickSound(); document.querySelectorAll('.sort-btn').forEach(function(x) { x.classList.remove('active'); }); b.classList.add('active'); Components._sortMode = b.dataset.sort; if (Components._sortMode === 'featured') { Components._featuredOnly = true; Components.currentPage = 1; Components.allPosts = []; Components._loadPosts(true); } else { if (Components._featuredOnly) { Components._featuredOnly = false; Components.currentPage = 1; Components.allPosts = []; Components._loadPosts(true); } else { Components._applyFilters(); } } }); });
    document.getElementById('tag-filter-bar').addEventListener('click', function(e) { if (e.target.classList.contains('tag-chip')) { playClickSound(); document.querySelectorAll('#tag-filter-bar .tag-chip').forEach(function(t) { t.classList.remove('active'); }); e.target.classList.add('active'); Components._activeTag = e.target.dataset.tag || null; Components._applyFilters(); } });
    if (document.getElementById('create-post-btn')) document.getElementById('create-post-btn').addEventListener('click', function() { playClickSound(); Router.navigate(isJob ? '#/create/job' : (isWork ? '#/create' : '#/create/chat')); });
    document.querySelectorAll('.view-toggle-btn').forEach(function(btn) { btn.addEventListener('click', function() { var mode = this.dataset.view; if (mode === Components._viewMode) return; Components._viewMode = mode; localStorage.setItem('portfolio_post_view', mode); document.querySelectorAll('.view-toggle-btn').forEach(function(b) { b.style.background = 'transparent'; b.style.color = 'var(--text-secondary)'; b.style.fontWeight = '400'; }); this.style.background = 'var(--bg-active)'; this.style.color = 'var(--primary)'; this.style.fontWeight = '600'; var c = document.getElementById('post-container'); if (c) { c.style.display = 'none'; c.className = mode === 'grid' ? 'post-grid' : 'post-list'; Components._applyFilters(); } }); });

    if (isJob) {
      API.getJobStats().then(function(d) {
        var s = d.salary || {}; var cities = d.cities || []; var skills = d.skills || [];
        var container = document.getElementById('post-container');
        if (container) {
          var cityList = cities.slice(0, 3).map(function(c) { return escapeHtml(c.city); }).join(' · ');
          var skillTags = skills.slice(0, 5).map(function(sk) { return '<span style="display:inline-block;padding:2px 8px;margin:2px;border-radius:4px;background:rgba(163,230,53,0.1);color:#a3e635;font-size:10px;">' + escapeHtml(sk.name) + '</span>'; }).join('');
          container.insertAdjacentHTML('beforebegin',
            '<div class="job-stats-bar" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:16px;padding:16px 20px;background:var(--bg-card);border:1px solid var(--border);border-radius:12px;">' +
            '<div style="text-align:center;"><div style="font-size:20px;font-weight:700;color:var(--primary);">' + (s.total_jobs || 0) + '</div><div style="font-size:11px;color:var(--text-secondary);margin-top:2px;">💼 招聘职位</div></div>' +
            (s.avg_salary_min ? '<div style="text-align:center;"><div style="font-size:18px;font-weight:700;">' + Math.round(s.avg_salary_min/1000) + 'K~' + Math.round(s.avg_salary_max/1000) + 'K</div><div style="font-size:11px;color:var(--text-secondary);margin-top:2px;">💰 平均薪资</div></div>' : '<div style="text-align:center;"><div style="font-size:18px;font-weight:700;color:var(--text-muted);">-</div><div style="font-size:11px;color:var(--text-secondary);margin-top:2px;">💰 平均薪资</div></div>') +
            (cities[0] ? '<div style="text-align:center;"><div style="font-size:18px;font-weight:700;">' + escapeHtml(cities[0].city) + '</div><div style="font-size:11px;color:var(--text-secondary);margin-top:2px;">📌 最热城市</div></div>' : '') +
            (s.remote_count > 0 ? '<div style="text-align:center;"><div style="font-size:18px;font-weight:700;color:#60a5fa;">' + s.remote_count + '</div><div style="font-size:11px;color:var(--text-secondary);margin-top:2px;">🌐 远程岗位</div></div>' : '') +
            '</div>' +
            (cityList ? '<div style="grid-column:1/-1;font-size:11px;color:var(--text-secondary);padding:4px 0 0;border-top:1px solid var(--border);margin-top:2px;"><span style="color:var(--text-muted);">热门城市：</span>' + cityList + '</div>' : '') +
            (skillTags ? '<div style="grid-column:1/-1;font-size:11px;color:var(--text-secondary);"><span style="color:var(--text-muted);">热门技能：</span>' + skillTags + '</div>' : '')
          );
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

  _renderJobZoneHtml: function(vm, isAdmin) {
    var self = this;
    document.getElementById('app').innerHTML =
      '<div class="page-fade-in">' +
      // Hero card
      '<div class="job-hero" style="background:linear-gradient(135deg,rgba(23,23,23,.95),rgba(41,37,36,.9));border:1px solid var(--border);border-radius:16px;padding:20px 24px;margin-bottom:16px;display:flex;align-items:center;gap:14px;">' +
        '<div style="font-size:40px;flex-shrink:0;">💼</div>' +
        '<div style="flex:1;min-width:0;">' +
          '<div style="font-size:20px;font-weight:700;">求职招聘区</div>' +
          '<div style="font-size:12px;color:var(--text-secondary);margin-top:2px;">发布求职/招聘信息 · 连接人才与机会</div>' +
        '</div>' +
      '</div>' +
      // Identity hint (hidden by default, shown for non-approved users)
      '<div class="job-identity-hint" id="job-identity-hint" style="display:none;background:var(--bg-active);border:1px solid rgba(163,230,53,.1);border-radius:10px;padding:12px 16px;margin-bottom:12px;align-items:center;gap:10px;">' +
        '<span style="font-size:20px;">🔑</span>' +
        '<div style="flex:1;font-size:12px;color:var(--text-secondary);">你需要申请身份后才能发帖</div>' +
        '<button class="btn btn-primary btn-sm" id="job-identity-apply-btn">立即申请</button>' +
      '</div>' +
      // Two-column layout
      '<div style="display:grid;grid-template-columns:1fr 280px;gap:20px;align-items:start;">' +
        // Left column: main content
        '<div class="job-main">' +
          // Toolbar row
          '<div style="display:flex;gap:8px;align-items:center;margin-bottom:12px;flex-wrap:wrap;">' +
            '<div class="view-toggle" style="display:inline-flex;gap:2px;background:rgba(0,0,0,0.3);border:1px solid var(--border);border-radius:10px;padding:3px;">' +
              '<button class="view-toggle-btn' + (vm === 'grid' ? ' active' : '') + '" data-view="grid" style="padding:7px 14px;border:none;border-radius:8px;background:' + (vm === 'grid' ? 'var(--bg-active)' : 'transparent') + ';color:' + (vm === 'grid' ? 'var(--primary)' : 'var(--text-secondary)') + ';font-size:13px;cursor:pointer;font-weight:' + (vm === 'grid' ? '600' : '400') + ';font-family:inherit;">▦ 卡片</button>' +
              '<button class="view-toggle-btn' + (vm === 'list' ? ' active' : '') + '" data-view="list" style="padding:7px 14px;border:none;border-radius:8px;background:' + (vm === 'list' ? 'var(--bg-active)' : 'transparent') + ';color:' + (vm === 'list' ? 'var(--primary)' : 'var(--text-secondary)') + ';font-size:13px;cursor:pointer;font-weight:' + (vm === 'list' ? '600' : '400') + ';font-family:inherit;">☰ 列表</button>' +
            '</div>' +
            '<button class="btn btn-primary" id="create-post-btn">✏️ 发布帖子</button>' +
          '</div>' +
          // Admin batch bar
          (isAdmin ? '<div class="admin-batch-bar" style="margin-bottom:10px;"><label class="form-checkbox" style="font-size:13px;"><input type="checkbox" id="select-all-posts"> 全选</label><button class="btn btn-danger btn-sm" id="delete-selected-btn" disabled>🗑️ 删除选中 (<span id="selected-count">0</span>)</button></div>' : '') +
          // Filter bar
          '<div class="job-filter-bar" style="display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap;">' +
            '<select id="job-filter-role" style="padding:7px 12px;border:1px solid var(--border);border-radius:8px;background:var(--bg-input);color:var(--text);font-size:12px;font-family:inherit;">' +
              '<option value="">📋 全部</option><option value="employer">💼 招聘</option><option value="seeker">🔍 求职</option></select>' +
            '<select id="job-filter-type" style="padding:7px 12px;border:1px solid var(--border);border-radius:8px;background:var(--bg-input);color:var(--text);font-size:12px;font-family:inherit;">' +
              '<option value="">💼 全部类型</option><option value="fulltime">全职</option><option value="parttime">兼职</option><option value="intern">实习</option><option value="project">项目</option></select>' +
            '<select id="job-filter-city" style="padding:7px 12px;border:1px solid var(--border);border-radius:8px;background:var(--bg-input);color:var(--text);font-size:12px;font-family:inherit;">' +
              '<option value="">📌 所有城市</option><option>北京</option><option>上海</option><option>深圳</option><option>杭州</option><option>远程</option></select>' +
            '<select id="job-filter-salary" style="padding:7px 12px;border:1px solid var(--border);border-radius:8px;background:var(--bg-input);color:var(--text);font-size:12px;font-family:inherit;">' +
              '<option value="">💰 薪资不限</option><option value="10">10K+</option><option value="20">20K+</option><option value="30">30K+</option></select>' +
          '</div>' +
          // Search + Sort
          '<div class="search-bar"><input class="search-input" id="post-search" type="text" placeholder="搜索标题或简介..."></div>' +
          '<div class="sort-bar"><button class="sort-btn active" data-sort="latest">⏰ 最新</button><button class="sort-btn" data-sort="views">🔥 最热</button><button class="sort-btn featured-btn" data-sort="featured">⭐ 精华</button></div>' +
          // Tag filter
          '<div class="tag-filter-bar" id="tag-filter-bar" style="display:none;"><span class="tag-filter-label">🏷️ 标签：</span><button class="tag-chip active" data-tag="">全部</button></div>' +
          // Post container
          '<div class="' + (vm === 'grid' ? 'post-grid' : 'post-list') + '" id="post-container" style="display:none;"></div>' +
          '<div class="load-more-wrap" id="load-more-wrap" style="display:none;"><button class="btn btn-outline" id="load-more-btn">加载更多</button></div>' +
          '<div class="empty-state" id="empty-state" style="display:none;"><div class="empty-state-icon">📭</div><p class="empty-state-text">暂无招聘信息</p></div>' +
        '</div>' +
        // Right column: sidebar
        '<div class="job-sidebar" id="job-sidebar">' +
          // Identity panel (populated by _loadJobSidebar)
          '<div id="job-sidebar-identity"></div>' +
          // Admin applications (populated by _loadJobSidebar)
          (isAdmin ? '<div id="job-sidebar-admin"></div>' : '') +
          // Stats panel (populated by _loadJobSidebar)
          '<div id="job-sidebar-stats"></div>' +
        '</div>' +
      '</div>' +
      '</div>';
  },

  _bindJobZoneEvents: function(isAdmin) {
    var self = this;
    document.getElementById('post-search').addEventListener('input', function() { clearTimeout(self._searchTimer); self._searchTimer = setTimeout(function() { self._searchQuery = document.getElementById('post-search').value.trim().toLowerCase(); self._applyFilters(); }, 200); });
    document.querySelectorAll('#job-filter-role,#job-filter-type,#job-filter-city,#job-filter-salary').forEach(function(el){el.addEventListener('change',function(){self.currentPage = 1; self.allPosts = []; var pc = document.getElementById('post-container'); if (pc) { pc.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-secondary);">⏳ 加载中...</div>'; pc.style.display = ''; } self._loadPosts(true);});});
    document.querySelectorAll('.sort-btn').forEach(function(b) { b.addEventListener('click', function() { playClickSound(); document.querySelectorAll('.sort-btn').forEach(function(x) { x.classList.remove('active'); }); b.classList.add('active'); self._sortMode = b.dataset.sort; if (self._sortMode === 'featured') { self._featuredOnly = true; self.currentPage = 1; self.allPosts = []; self._loadPosts(true); } else { if (self._featuredOnly) { self._featuredOnly = false; self.currentPage = 1; self.allPosts = []; self._loadPosts(true); } else { self._applyFilters(); } } }); });
    document.getElementById('tag-filter-bar').addEventListener('click', function(e) { if (e.target.classList.contains('tag-chip')) { playClickSound(); document.querySelectorAll('#tag-filter-bar .tag-chip').forEach(function(t) { t.classList.remove('active'); }); e.target.classList.add('active'); self._activeTag = e.target.dataset.tag || null; self._applyFilters(); } });
    if (document.getElementById('create-post-btn')) document.getElementById('create-post-btn').addEventListener('click', function() { playClickSound(); Router.navigate('#/create/job'); });
    document.querySelectorAll('.view-toggle-btn').forEach(function(btn) { btn.addEventListener('click', function() { var mode = this.dataset.view; if (mode === self._viewMode) return; self._viewMode = mode; localStorage.setItem('portfolio_post_view', mode); document.querySelectorAll('.view-toggle-btn').forEach(function(b) { b.style.background = 'transparent'; b.style.color = 'var(--text-secondary)'; b.style.fontWeight = '400'; }); this.style.background = 'var(--bg-active)'; this.style.color = 'var(--primary)'; this.style.fontWeight = '600'; var c = document.getElementById('post-container'); if (c) { c.style.display = 'none'; c.className = mode === 'grid' ? 'post-grid' : 'post-list'; self._applyFilters(); } }); });
    document.getElementById('load-more-btn').addEventListener('click', function() { playClickSound(); self._loadMorePosts(); });
    var sa = document.getElementById('select-all-posts'), db = document.getElementById('delete-selected-btn');
    if (sa && db) {
      sa.addEventListener('change', function() { document.querySelectorAll('.post-select-checkbox').forEach(function(cb) { cb.checked = sa.checked; }); self._updateDeleteSelectedBtn(); });
      db.addEventListener('click', async function() { var sel = []; document.querySelectorAll('.post-select-checkbox:checked').forEach(function(cb) { sel.push(parseInt(cb.dataset.postId)); }); if (sel.length === 0) return; if (!(await showConfirm('确定删除选中的 ' + sel.length + ' 个帖子？'))) return; self.currentPage = 1; try { await API.adminBatchDeletePosts(sel); showToast('成功删除 ' + sel.length + ' 个帖子', 'success'); await self._loadPosts(true); } catch (err) { showToast(err.message, 'error'); } finally { self._updateDeleteSelectedBtn(); } });
      document.getElementById('post-container').addEventListener('change', function(e) { if (e.target.classList.contains('post-select-checkbox')) self._updateDeleteSelectedBtn(); });
    }
  },

  _loadJobSidebar: function() {
    var self = this;
    var isAdmin = App.user && App.user.role === 'admin';

    // Load identity panel
    var identityEl = document.getElementById('job-sidebar-identity');
    if (identityEl) {
      API.getMyProfile().then(function(d) {
        var p = d.profile || {};
        if (p.job_role_approved) {
          var roleLabel = p.job_role === 'employer' ? '💼 招聘者' : '🔍 求职者';
          identityEl.innerHTML = '<div class="job-sidebar-card"><h4>🔑 身份认证</h4>' +
            '<div style="display:flex;align-items:center;gap:8px;padding:8px 0;">' +
            '<span style="font-size:24px;">✅</span>' +
            '<div><div style="font-size:13px;font-weight:600;">' + roleLabel + ' 已认证</div>' +
            (p.job_rating ? '<div style="font-size:11px;color:var(--text-secondary);">⭐ ' + p.job_rating + ' 信誉 · ✅ ' + (p.job_completed || 0) + ' 次完成</div>' : '') +
            '</div></div></div>';
        } else {
          identityEl.innerHTML = '<div class="job-sidebar-card"><h4>🔑 身份认证</h4>' +
            '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:10px;">发帖需要申请身份，审核通过后即可发布</div>' +
            '<button class="btn btn-primary btn-sm" id="sidebar-apply-btn" style="width:100%;">📋 立即申请身份</button></div>';
          // Show identity hint banner
          var hint = document.getElementById('job-identity-hint');
          if (hint) hint.style.display = 'flex';
          // Shared apply function — asks role then reason
          var doApply = async function() {
            var roleInput = await showPrompt('请选择身份类型', '求职者', '输入「招聘者」或「求职者」');
            if (roleInput === null) return;
            var role = roleInput.trim();
            if (role.indexOf('招聘') >= 0 || role === 'employer') role = 'employer';
            else if (role.indexOf('求职') >= 0 || role === 'seeker') role = 'seeker';
            else { showToast('请输入「招聘者」或「求职者」', 'error'); return; }
            var reason = await showPrompt('申请' + (role === 'employer' ? '招聘者' : '求职者') + '身份', '', '请简单说明申请原因（可选）');
            if (reason === null) return;
            try { await API.submitApplication(role, reason || ''); showToast('申请已提交，等待管理员审核', 'success'); self._loadJobSidebar(); } catch(e) { showToast(e.message, 'error'); }
          };
          // Bind both buttons
          setTimeout(function() {
            document.getElementById('sidebar-apply-btn')?.addEventListener('click', doApply);
            document.getElementById('job-identity-apply-btn')?.addEventListener('click', doApply);
          }, 100);
        }
      }).catch(function() {
        if (identityEl) identityEl.innerHTML = '';
      });
    }

    // Load admin applications panel
    var adminEl = document.getElementById('job-sidebar-admin');
    if (adminEl && isAdmin) {
      API.getApplications('pending').then(function(d) {
        var apps = (d.applications || []).slice(0, 3);
        if (apps.length === 0) {
          adminEl.innerHTML = '<div class="job-sidebar-card"><h4>🛂 待审核申请</h4><div style="font-size:12px;color:var(--text-secondary);padding:8px 0;">暂无待审核申请</div></div>';
          return;
        }
        var html = '<div class="job-sidebar-card"><h4>🛂 待审核申请 <span style="font-size:11px;color:var(--text-muted);">' + apps.length + ' 条</span></h4>';
        apps.forEach(function(a) {
          var roleBadge = a.role === 'employer' ? '<span style="display:inline-block;padding:2px 6px;border-radius:4px;font-size:10px;background:rgba(245,158,11,.1);color:#f59e0b;">💼 招聘者</span>' : '<span style="display:inline-block;padding:2px 6px;border-radius:4px;font-size:10px;background:rgba(96,165,250,.1);color:#60a5fa;">🔍 求职者</span>';
          html += '<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border);">' +
            '<div style="width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,#a3e635,#65a30d);color:#0a0a0f;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;">' + escapeHtml(a.username.charAt(0).toUpperCase()) + '</div>' +
            '<div style="flex:1;min-width:0;"><div style="font-size:12px;font-weight:600;">' + escapeHtml(a.username) + '</div><div style="font-size:10px;color:var(--text-secondary);">' + roleBadge + '</div></div>' +
            '<div style="display:flex;gap:4px;flex-shrink:0;">' +
            '<button class="sidebar-review-btn" data-id="' + a.id + '" data-action="approved" style="width:24px;height:24px;border:none;border-radius:6px;background:linear-gradient(135deg,#a3e635,#65a30d);color:#0a0a0f;font-size:12px;cursor:pointer;">✅</button>' +
            '<button class="sidebar-review-btn" data-id="' + a.id + '" data-action="rejected" style="width:24px;height:24px;border:none;border-radius:6px;background:rgba(239,68,68,.1);color:#ef4444;font-size:12px;cursor:pointer;border:1px solid rgba(239,68,68,.15);">❌</button>' +
            '</div></div>';
        });
        html += '<a href="#/admin/applications" style="display:block;text-align:center;font-size:11px;color:var(--primary);padding-top:8px;">查看全部 →</a></div>';
        adminEl.innerHTML = html;
        // Bind review buttons
        adminEl.querySelectorAll('.sidebar-review-btn').forEach(function(b) {
          b.addEventListener('click', async function(e) {
            e.stopPropagation();
            var id = parseInt(this.dataset.id), action = this.dataset.action;
            try { await API.reviewApplication(id, action); showToast(action === 'approved' ? '已批准' : '已拒绝', 'success'); self._loadJobSidebar(); } catch(err) { showToast(err.message, 'error'); }
          });
        });
      }).catch(function() { if (adminEl) adminEl.innerHTML = ''; });
    }

    // Load stats panel
    var statsEl = document.getElementById('job-sidebar-stats');
    if (statsEl) {
      API.getJobStats().then(function(d) {
        var s = d.salary || {}; var cities = d.cities || [];
        var topCity = cities[0] ? escapeHtml(cities[0].city) : '-';
        var avgMin = s.avg_salary_min ? Math.round(s.avg_salary_min / 1000) + 'K' : '-';
        var avgMax = s.avg_salary_max ? Math.round(s.avg_salary_max / 1000) + 'K' : '-';
        statsEl.innerHTML = '<div class="job-sidebar-card"><h4>📊 分区统计</h4>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">' +
          '<div style="text-align:center;padding:10px 6px;background:var(--bg);border-radius:8px;"><div style="font-size:18px;font-weight:700;color:var(--primary);">' + (s.total_jobs || 0) + '</div><div style="font-size:10px;color:var(--text-secondary);margin-top:2px;">💼 招聘职位</div></div>' +
          '<div style="text-align:center;padding:10px 6px;background:var(--bg);border-radius:8px;"><div style="font-size:18px;font-weight:700;color:#60a5fa;">' + (s.remote_count || 0) + '</div><div style="font-size:10px;color:var(--text-secondary);margin-top:2px;">🌐 远程岗位</div></div>' +
          '<div style="text-align:center;padding:10px 6px;background:var(--bg);border-radius:8px;"><div style="font-size:18px;font-weight:700;">' + topCity + '</div><div style="font-size:10px;color:var(--text-secondary);margin-top:2px;">📌 热门城市</div></div>' +
          '<div style="text-align:center;padding:10px 6px;background:var(--bg);border-radius:8px;"><div style="font-size:18px;font-weight:700;">' + avgMin + '~' + avgMax + '</div><div style="font-size:10px;color:var(--text-secondary);margin-top:2px;">💰 平均薪资</div></div>' +
          '</div></div>';
      }).catch(function() { if (statsEl) statsEl.innerHTML = ''; });
    }
  },

  _applyFilters: function() {
    var g = document.getElementById('post-container'); if (!g) return;
    var f = this.allPosts.slice();
    if (this._searchQuery) f = f.filter(function(p) { return p.title.toLowerCase().includes(Components._searchQuery) || (p.description || '').toLowerCase().includes(Components._searchQuery); });
    if (this._activeTag) f = f.filter(function(p) { return p.tags ? p.tags.split(',').map(function(t) { return t.trim(); }).filter(Boolean).includes(Components._activeTag) : false; });
    f.sort(function(a, b) { if ((a.is_sticky || 0) !== (b.is_sticky || 0)) return (b.is_sticky || 0) - (a.is_sticky || 0); return Components._sortMode === 'views' ? (b.views || 0) - (a.views || 0) : new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at); });
    g.innerHTML = '';
    if (f.length === 0) { document.getElementById('empty-state').style.display = 'block'; g.style.display = 'none'; return; }
    document.getElementById('empty-state').style.display = 'none';
    g.style.display = '';
    f.forEach(function(p) { g.appendChild(Components._viewMode === 'grid' ? Components._createPostCard(p) : Components._createPostRow(p)); });
    if (document.getElementById('select-all-posts')) document.getElementById('select-all-posts').checked = false;
    this._updateDeleteSelectedBtn();
  },

  _createPostCard: function(post, showCheckbox) {
    var c = document.createElement('div'); c.className = 'post-card';
    var badges = []; if (post.is_sticky) badges.push('📌'); if (post.is_featured) badges.push('⭐'); if (post.is_locked) badges.push('🔒');
    var ia = showCheckbox || (App.user && App.user.role === 'admin');
    var checkboxHtml = ia ? '<label class="post-select-wrap"><input type="checkbox" class="post-select-checkbox" data-post-id="' + post.id + '"></label>' : '';
    var catBadgeClass = post.category === 'chat' ? 'chat' : post.category === 'job' ? (post.author_job_role === 'seeker' ? 'seeker' : 'job') : 'work';
    var catBadgeText = post.category === 'chat' ? '💬 聊天' : post.category === 'job' ? (post.author_job_role === 'seeker' ? '🔍 求职' : '💼 招聘') : '📂 作品';
    var jobMetaHtml = post.category === 'job' ? Components._buildJobMetaHtml(post) : '';
    c.innerHTML = '<div class="post-card-img" style="' + (post.cover_url ? "background-image:url('" + post.cover_url + "');background-size:cover;background-position:center;" : '') + '">' + (post.cover_url ? '' : '📄') + '<div class="post-card-overlay">🔍 查看详情</div><span class="category-badge ' + catBadgeClass + '">' + catBadgeText + '</span></div><div class="post-card-body">' + checkboxHtml + '<div class="post-card-title">' + (badges.length ? badges.join(' ') + ' ' : '') + escapeHtml(post.title) + '</div>' + jobMetaHtml + '<div class="post-card-desc">' + escapeHtml(post.description || '暂无简介') + '</div><div class="post-card-footer"><div class="post-card-tags">' + (post.tags ? post.tags.split(',').map(function(t) { return '<span class="tag">' + escapeHtml(t.trim()) + '</span>'; }).join('') : '') + '</div><div class="stats"><span class="stat">👍 ' + (post.like_count || 0) + '</span><span class="stat">👁 ' + (post.views || 0) + '</span></div></div><div class="post-card-date">' + formatDate(post.created_at) + '</div></div>';
    c.addEventListener('click', function(e) { if (e.target.closest('.post-select-wrap')) return; playClickSound(); Router.navigate('#/posts/' + post.id); });
    return c;
  },

  _createPostRow: function(post, showCheckbox) {
    var r = document.createElement('div'); r.className = 'post-row';
    var ia = showCheckbox || (App.user && App.user.role === 'admin');
    var rowCheckboxHtml = ia ? '<label class="post-select-wrap" style="display:flex;align-items:center;padding:0 0 0 6px;flex-shrink:0;"><input type="checkbox" class="post-select-checkbox" data-post-id="' + post.id + '"></label>' : '';
    var badgesHtml = (post.is_sticky ? '<span class="post-row-badge sticky">📌</span>' : '') + (post.is_featured ? '<span class="post-row-badge featured">⭐</span>' : '') + (post.is_locked ? '<span class="post-row-badge locked">🔒</span>' : '');
    var thumbHtml = post.cover_url ? '<img src="' + escapeHtml(post.cover_url) + '" alt="">' : (post.category === 'chat' ? '💬' : post.category === 'job' ? '💼' : '📄');
    var catTag = post.category === 'chat' ? '💬' : post.category === 'job' ? (post.author_job_role === 'seeker' ? '🔍' : '💼') : '📂';
    var jobRowMeta = post.category === 'job' ? Components._buildJobRowMeta(post) : '';
    r.innerHTML = rowCheckboxHtml + '<div class="post-row-img">' + thumbHtml + '<span class="category-tag">' + catTag + '</span></div><div class="post-row-body"><div class="post-row-title">' + badgesHtml + escapeHtml(post.title) + '</div>' + jobRowMeta + '<div class="post-row-meta"><span class="post-row-tags">' + (post.tags ? post.tags.split(',').map(function(t) { return '<span class="post-row-tag">' + escapeHtml(t.trim()) + '</span>'; }).join('') : '') + '</span></div></div><div class="post-row-stats">👍 ' + (post.like_count || 0) + ' · 👁 ' + (post.views || 0) + '</div><div class="post-row-date">' + formatDate(post.created_at) + '</div>';
    r.addEventListener('click', function(e) { if (e.target.closest('.post-select-wrap')) return; playClickSound(); Router.navigate('#/posts/' + post.id); });
    return r;
  },

  _updateDeleteSelectedBtn: function() { var d = document.getElementById('delete-selected-btn'), ce = document.getElementById('selected-count'); if (!d || !ce) return; var c = document.querySelectorAll('.post-select-checkbox:checked').length; ce.textContent = c; d.disabled = c === 0; },

  _buildJobMetaHtml: function(post) {
    var parts = [];
    var jobTypeLabels = { fulltime: '全职', parttime: '兼职', intern: '实习', project: '项目' };
    if (post.job_type) parts.push('<span class="job-meta-tag job-type">' + (jobTypeLabels[post.job_type] || post.job_type) + '</span>');
    var locTypeLabels = { remote: '🌐 远程', office: '🏢 办公室', hybrid: '🔄 混合' };
    if (post.job_location_type) parts.push('<span class="job-meta-tag job-loc-type">' + (locTypeLabels[post.job_location_type] || post.job_location_type) + '</span>');
    if (post.job_location_city) parts.push('<span class="job-meta-tag job-city">📍 ' + escapeHtml(post.job_location_city) + '</span>');
    var salaryHtml = '';
    if (post.job_salary_min || post.job_salary_max) {
      var min = post.job_salary_min ? (parseInt(post.job_salary_min) >= 1000 ? Math.round(post.job_salary_min / 1000) + 'K' : post.job_salary_min) : '?';
      var max = post.job_salary_max ? (parseInt(post.job_salary_max) >= 1000 ? Math.round(post.job_salary_max / 1000) + 'K' : post.job_salary_max) : '?';
      salaryHtml = '<span class="job-meta-tag job-salary">💰 ' + min + '~' + max + '</span>';
      parts.push(salaryHtml);
    }
    if (post.author_job_rating > 0) parts.push('<span class="job-meta-tag job-rating">⭐ ' + post.author_job_rating + '</span>');
    return parts.length > 0 ? '<div class="job-card-meta" style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px;font-size:11px;">' + parts.join('') + '</div>' : '';
  },

  _buildJobRowMeta: function(post) {
    var parts = [];
    var jobTypeLabels = { fulltime: '全职', parttime: '兼职', intern: '实习', project: '项目' };
    if (post.job_type) parts.push('<span style="color:var(--primary);">' + (jobTypeLabels[post.job_type] || post.job_type) + '</span>');
    if (post.job_location_city) parts.push('📍 ' + escapeHtml(post.job_location_city));
    if (post.job_salary_min) {
      var minK = parseInt(post.job_salary_min) >= 1000 ? Math.round(post.job_salary_min / 1000) + 'K' : post.job_salary_min;
      var maxK = post.job_salary_max ? (parseInt(post.job_salary_max) >= 1000 ? Math.round(post.job_salary_max / 1000) + 'K' : post.job_salary_max) : '?';
      parts.push('💰 ' + minK + '~' + maxK);
    }
    if (post.author_job_rating > 0) parts.push('⭐ ' + post.author_job_rating);
    return parts.length > 0 ? '<div style="font-size:11px;color:var(--text-secondary);margin-top:2px;">' + parts.join(' · ') + '</div>' : '';
  },

  _updateTagFilterBar: async function() {
    var bar = document.getElementById('tag-filter-bar'); if (!bar) return;
    try { var tags = (await API.getTags(this._currentCategory)).tags || []; if (tags.length === 0) { bar.style.display = 'none'; return; } bar.style.display = 'flex'; var ac = bar.querySelector('.tag-chip'); bar.innerHTML = ''; bar.appendChild(ac); tags.forEach(function(t) { var chip = document.createElement('button'); chip.className = 'tag-chip'; if (Components._activeTag === t.name) chip.classList.add('active'); chip.dataset.tag = t.name; chip.textContent = t.name; bar.appendChild(chip); }); } catch (e) { bar.style.display = 'none'; }
  },

  _loadPosts: async function(isFullRefresh) {
    try {
      var filters = {};
      if (this._currentCategory === 'job') {
        var jt = document.getElementById('job-filter-type');
        var jc = document.getElementById('job-filter-city');
        var js = document.getElementById('job-filter-salary');
        var jr = document.getElementById('job-filter-role');
        if (jt && jt.value) filters.job_type = jt.value;
        if (jc && jc.value) filters.job_location_city = jc.value;
        if (js && js.value) filters.job_salary_min = parseInt(js.value) * 1000;
        if (jr && jr.value) filters.job_role = jr.value;
      }
      if (this._featuredOnly) filters.featured = true;
      var d = await API.getPosts(this.currentPage, 9, this._currentCategory, filters);
      this.hasMore = d.pagination.hasMore;
      if (isFullRefresh || this.currentPage === 1) { this.allPosts = d.posts; }
      else { var ids = new Set(this.allPosts.map(function(p) { return p.id; })); d.posts.forEach(function(p) { if (!ids.has(p.id)) Components.allPosts.push(p); }); }
      if (d.posts.length === 0 && this.allPosts.length === 0) { document.getElementById('empty-state').style.display = 'block'; var pc = document.getElementById('post-container'); if (pc) pc.style.display = 'none'; return; }
      document.getElementById('empty-state').style.display = 'none';
      var pc2 = document.getElementById('post-container'); if (pc2) pc2.style.display = '';
      this._updateTagFilterBar(); this._applyFilters();
      var lw = document.getElementById('load-more-wrap'), lb = document.getElementById('load-more-btn');
      if (lw && lb) { lw.style.display = this.hasMore ? 'block' : 'none'; if (this.hasMore) { lb.textContent = '加载更多 (' + (d.pagination.totalPages - this.currentPage) + ' 页剩余)'; lb.disabled = false; } }
    } catch (err) {
      showToast(err.message, 'error');
      // If user is blocked from job zone, show apply prompt
      if (this._currentCategory === 'job' && err.message && (err.message.indexOf('身份') !== -1 || err.message.indexOf('等级') !== -1 || err.message.indexOf('访问') !== -1)) {
        var es = document.getElementById('empty-state');
        if (es) {
          es.style.display = 'block';
          es.innerHTML = '<div class="empty-state-icon">🔑</div><p class="empty-state-text">需要招聘者/求职者身份才能访问求职招聘区</p><div style="margin-top:12px;display:flex;gap:8px;justify-content:center;"><button class="btn btn-primary btn-sm" id="job-apply-btn">📋 立即申请身份</button></div>';
          document.getElementById('job-apply-btn')?.addEventListener('click', async function() {
            var roleInput = await showPrompt('请选择身份类型', '求职者', '输入「招聘者」或「求职者」');
            if (roleInput === null) return;
            var role = roleInput.trim();
            if (role.indexOf('招聘') >= 0 || role === 'employer') role = 'employer';
            else if (role.indexOf('求职') >= 0 || role === 'seeker') role = 'seeker';
            else { showToast('请输入「招聘者」或「求职者」', 'error'); return; }
            var reason = await showPrompt('申请' + (role === 'employer' ? '招聘者' : '求职者') + '身份', '', '请简单说明申请原因（可选）');
            if (reason === null) return;
            try { await API.submitApplication(role, reason || ''); showToast('申请已提交，等待管理员审核', 'success'); } catch(e) { showToast(e.message, 'error'); }
          });
        }
        var pc = document.getElementById('post-container');
        if (pc) pc.style.display = 'none';
        var lm = document.getElementById('load-more-wrap');
        if (lm) lm.style.display = 'none';
      }
    }
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
    filtered.forEach(function(pt) { grid.appendChild(vm === 'grid' ? Components._createPostCard(pt, true) : Components._createPostRow(pt, true)); });
    if (loadWrap) {
      loadWrap.style.display = this._myPostsHasMore && filtered.length >= 9 ? '' : 'none';
      var lb = document.getElementById('my-posts-load-btn');
      if (lb) lb.disabled = false;
    }
  }
};
