// Admin component: stats, reports, users, levels, tags
var ComponentsAdmin = {
  _adminNavTabs: [
    { id: 'stats', icon: '📊', label: '概览' },
    { id: 'reports', icon: '🚩', label: '举报' },
    { id: 'applications', icon: '📋', label: '申请' },
    { id: 'users', icon: '👥', label: '用户' },
    { id: 'levels', icon: '⭐', label: '等级' },
    { id: 'notices', icon: '📢', label: '公告' },
    { id: 'ads', icon: '📰', label: '广告' },
    { id: 'tags', icon: '🏷️', label: '标签' }
  ],

  _renderAdminNav: function(current) {
    return '<div class="admin-nav">' +
      this._adminNavTabs.map(function(t) {
        return '<button class="admin-nav-item' + (t.id === current ? ' active' : '') + '" data-admin-tab="' + t.id + '">' + t.icon + ' ' + t.label + '</button>';
      }).join('') + '</div>';
  },

  _bindAdminNav: function() {
    var self = this;
    document.querySelectorAll('[data-admin-tab]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        playClickSound();
        var tab = this.dataset.adminTab;
        if (tab === 'stats') Components.renderAdminStats();
        else if (tab === 'reports') Components.renderAdminReports();
        else if (tab === 'users') Components.renderAdminUsers();
        else if (tab === 'levels') Components.renderAdminLevels();
        else if (tab === 'notices') Components.renderLoginNotices();
        else if (tab === 'ads') Components.renderAdminAds();
        else if (tab === 'applications') Components.renderAdminApplications();
        else if (tab === 'tags') Components.renderTagManager();
      });
    });
  },

  renderAdminLevels: async function() {
    this.renderLoading();
    try {
      var configs = (await API.getLevelConfig()).configs || [];
      var allZones = [
        { id: 'work', label: '作品区', icon: '📂' },
        { id: 'chat', label: '聊天区', icon: '💬' },
        { id: 'music', label: '音乐区', icon: '🎵' },
        { id: 'job', label: '求职招聘', icon: '💼' }
      ];
      document.getElementById('app').innerHTML = '<div class="page-fade-in"><div class="admin-page">' +
        Components._renderAdminNav('levels') +
        '<div class="admin-card"><div class="admin-card-title">⭐ 等级配置 <span style="font-size:12px;color:var(--text-secondary);font-weight:400;">共 ' + configs.length + ' 个等级</span></div>' +
        '<div id="level-config-list">' + configs.map(function(c, i) {
          var zones = []; try { zones = JSON.parse(c.zones || '[]'); } catch(e) {}
          var zoneCbs = allZones.map(function(zone) {
            var checked = zones.indexOf(zone.id) >= 0;
            return '<label style="display:inline-flex;align-items:center;gap:4px;cursor:pointer;padding:4px 10px 4px 6px;border-radius:6px;background:' + (checked ? 'var(--bg)' : 'transparent') + ';border:1px solid ' + (checked ? 'var(--primary)' : 'var(--border)') + ';font-size:12px;user-select:none;"><input type="checkbox" class="lvl-cfg-zone" data-zone="' + zone.id + '" data-index="' + i + '"' + (checked ? ' checked' : '') + ' style="margin:0;"> ' + zone.icon + ' ' + zone.label + '</label>';
          }).join('');
          return '<div class="level-config-item" data-index="' + i + '" style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:10px;">' +
            '<div style="display:flex;align-items:flex-start;gap:16px;flex-wrap:wrap;">' +
            '<div style="display:flex;align-items:center;justify-content:center;min-width:48px;height:48px;border-radius:10px;background:var(--bg);font-weight:800;font-size:16px;color:var(--primary);flex-shrink:0;">Lv.' + c.level + '</div>' +
            '<div style="flex:1;min-width:200px;"><div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;">' +
            '<input class="form-input lvl-cfg-name" data-index="' + i + '" value="' + escapeHtml(c.name || '') + '" placeholder="头衔名称" style="flex:2;min-width:120px;font-size:13px;padding:6px 10px;border-radius:8px;">' +
            '<div style="display:flex;align-items:center;gap:4px;flex-shrink:0;"><span style="font-size:12px;color:var(--text-secondary);">所需XP</span><input class="form-input lvl-cfg-xp" data-index="' + i + '" type="number" value="' + (c.xp_required || 0) + '" style="width:80px;font-size:13px;padding:6px 8px;border-radius:8px;text-align:center;"></div>' +
            '</div>' +
            '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;">' + zoneCbs + '</div>' +
            '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;"><span style="font-size:12px;color:var(--text-secondary);">头衔图标:</span><button class="btn btn-sm btn-outline lvl-cfg-icon-btn" data-index="' + i + '" style="border-radius:6px;padding:4px 10px;font-size:12px;">' + (c.title_icon ? '📷 更换' : '📷 上传') + '</button>' + (c.title_icon ? '<img src="' + c.title_icon + '" style="width:26px;height:26px;border-radius:6px;object-fit:cover;border:1px solid var(--border);">' : '<span style="font-size:12px;color:var(--text-light);">未设置</span>') + '</div></div></div></div>';
        }).join('') + '</div>' +
        '<div style="display:flex;justify-content:center;margin-top:20px;"><button class="btn btn-primary" id="save-level-config-btn" style="padding:10px 32px;border-radius:10px;font-size:15px;font-weight:600;">💾 保存所有等级配置</button></div>' +
        '</div></div></div>';
      Components._bindAdminNav();
      document.getElementById('save-level-config-btn').addEventListener('click', async function() {
        var btn = this; btn.disabled = true; btn.textContent = '⏳ 保存中...';
        var newConfigs = []; document.querySelectorAll('.level-config-item').forEach(function(item) {
          var idx = parseInt(item.dataset.index), cfg = configs[idx]; if (!cfg) return;
          var name = item.querySelector('.lvl-cfg-name').value.trim();
          var xp = parseInt(item.querySelector('.lvl-cfg-xp').value) || 0;
          var zones = []; item.querySelectorAll('.lvl-cfg-zone').forEach(function(cb) { if (cb.checked) zones.push(cb.dataset.zone); });
          newConfigs.push({ level: cfg.level, xp_required: xp, name: name, zones: zones, title_icon: cfg.title_icon || '', bg_image: cfg.bg_image || '' });
        });
        try { await API.updateLevelConfig(newConfigs); showToast('✅ 等级配置已保存', 'success'); Components.renderAdminLevels(); } catch(err) { showToast(err.message, 'error'); btn.disabled = false; btn.textContent = '💾 保存所有等级配置'; }
      });
      document.querySelectorAll('.lvl-cfg-zone').forEach(function(cb) { cb.addEventListener('change', function() { var p = this.parentElement; if (p) { p.style.background = this.checked ? 'var(--bg)' : 'transparent'; p.style.borderColor = this.checked ? 'var(--primary)' : 'var(--border)'; } }); });
      document.querySelectorAll('.lvl-cfg-icon-btn').forEach(function(b) { b.addEventListener('click', function() {
        var idx = parseInt(this.dataset.index);
        var fi = document.createElement('input'); fi.type = 'file'; fi.accept = '.jpg,.jpeg,.png,.gif,.webp';
        fi.addEventListener('change', async function() {
          if (!fi.files || !fi.files[0]) return;
          try {
            var cropped = await openCropModal(fi.files[0], 1);
            if (!cropped) return;
            var btnEl = document.querySelector('.lvl-cfg-icon-btn[data-index="' + idx + '"]');
            if (btnEl) btnEl.textContent = '⏳ 上传中...';
            var r = await API.uploadFile(new File([cropped], 'icon.jpg', { type: 'image/jpeg' }));
            configs[idx].title_icon = r.file.url;
            if (btnEl) btnEl.textContent = '📷 更换';
            var parentDiv = btnEl ? btnEl.closest('.level-config-item') : null;
            if (parentDiv) {
              var existingImg = parentDiv.querySelector('img');
              if (existingImg) { existingImg.src = r.file.url; }
              else { btnEl.insertAdjacentHTML('afterend', '<img src="' + r.file.url + '" style="width:26px;height:26px;border-radius:6px;object-fit:cover;border:1px solid var(--border);">'); }
            }
          } catch(err) { showToast(err.message, 'error'); }
        });
        fi.click();
      }); });
    } catch (err) { showToast(err.message, 'error'); Router.navigate('#/works'); }
  },

  // Login Notice Management
  renderLoginNotices: async function() {
    this.renderLoading();
    try {
      var self = this;
      var page = 1;
      var render = async function(p) {
        var result = await API.getAdminLoginNotices(p, 20);
        var notices = result.notices || [];
        var pag = result.pagination || {};
        document.getElementById('app').innerHTML = '<div class="page-fade-in"><div class="admin-page">' +
          Components._renderAdminNav('notices') +
          '<div class="admin-card"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">' +
          '<div class="admin-card-title" style="margin-bottom:0;">📢 登录弹窗管理</div>' +
          '<button class="btn btn-primary" id="add-notice-btn">✚ 新建弹窗</button></div>' +
          (notices.length === 0 ? '<p style="color:var(--text-secondary);text-align:center;padding:40px;">暂无登录弹窗</p>' :
          '<div style="display:flex;flex-direction:column;gap:8px;">' + notices.map(function(n) {
            return '<div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:12px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">' +
              '<div style="flex:1;min-width:200px;">' +
              '<div style="font-weight:600;">' + escapeHtml(n.title) + '</div>' +
              '<div style="font-size:13px;color:var(--text-secondary);margin-top:4px;">优先级: ' + n.priority + ' | 状态: ' + (n.is_active ? '✅ 启用' : '❌ 禁用') + (n.show_once ? ' | 仅显示一次' : '') + '</div>' +
              (n.image_url ? '<img src="' + escapeHtml(n.image_url) + '" style="width:80px;height:50px;object-fit:cover;border-radius:4px;margin-top:4px;">' : '') +
              '</div>' +
              '<div style="display:flex;gap:4px;flex-wrap:wrap;">' +
              '<button class="btn btn-sm btn-outline edit-notice-btn" data-id="' + n.id + '">编辑</button>' +
              '<button class="btn btn-sm ' + (n.is_active ? 'btn-outline' : 'btn-primary') + ' toggle-notice-btn" data-id="' + n.id + '">' + (n.is_active ? '禁用' : '启用') + '</button>' +
              '<button class="btn btn-sm btn-danger delete-notice-btn" data-id="' + n.id + '">删除</button>' +
              '</div></div>';
          }).join('') + '</div>') +
          (pag.totalPages > 1 ? '<div style="display:flex;justify-content:center;gap:4px;padding:12px 0;"><button class="btn btn-sm btn-outline" data-np="prev"' + (pag.page <= 1 ? ' disabled' : '') + '>上一页</button><span style="padding:4px 8px;">' + pag.page + '/' + pag.totalPages + '</span><button class="btn btn-sm btn-outline" data-np="next"' + (pag.page >= pag.totalPages ? ' disabled' : '') + '>下一页</button></div>' : '') +
          '</div></div></div>';
        Components._bindAdminNav();
        // Bind events
        document.getElementById('add-notice-btn').addEventListener('click', function() { self._showNoticeForm(); });
        document.querySelectorAll('.edit-notice-btn').forEach(function(b) { b.addEventListener('click', function() { self._showNoticeForm(parseInt(b.dataset.id)); }); });
        document.querySelectorAll('.toggle-notice-btn').forEach(function(b) { b.addEventListener('click', async function() { try { await API.toggleLoginNoticeStatus(parseInt(b.dataset.id)); showToast('已更新', 'success'); render(p); } catch(err) { showToast(err.message, 'error'); } }); });
        document.querySelectorAll('.delete-notice-btn').forEach(function(b) { b.addEventListener('click', async function() { if (!(await showConfirm('确定删除？'))) return; try { await API.deleteLoginNotice(parseInt(b.dataset.id)); showToast('已删除', 'success'); render(p); } catch(err) { showToast(err.message, 'error'); } }); });
        document.querySelectorAll('[data-np]').forEach(function(b) { b.addEventListener('click', function() { var dir = b.dataset.np; if (dir === 'prev' && pag.page > 1) render(pag.page - 1); else if (dir === 'next' && pag.page < pag.totalPages) render(pag.page + 1); }); });
      };
      render(page);
    } catch (err) { showToast(err.message, 'error'); Router.navigate('#/works'); }
  },

  _showNoticeForm: async function(noticeId) {
    var self = this;
    var notice = null;
    if (noticeId) {
      try { var r = await API.getAdminLoginNotices(1, 100); notice = (r.notices || []).find(function(n) { return n.id === noticeId; }); } catch(e) {}
    }
    var isEdit = !!notice;
    var imageUrl = notice ? (notice.image_url || '') : '';
    var app = document.getElementById('app');
    app.innerHTML = '<div class="page-fade-in"><div class="admin-page"><div class="admin-card">' +
      '<div class="admin-card-title">' + (isEdit ? '编辑' : '新建') + '登录弹窗</div>' +
      '<form id="notice-form">' +
      '<div class="form-group"><label class="form-label">标题 *</label><input class="form-input" id="notice-title" value="' + escapeHtml(notice ? notice.title : '') + '" required></div>' +
      '<div class="form-group"><label class="form-label">内容 *</label><textarea class="form-textarea" id="notice-content" rows="3" required>' + escapeHtml(notice ? notice.content : '') + '</textarea></div>' +
      '<div class="form-group"><label class="form-label">跳转链接</label><input class="form-input" id="notice-link" value="' + escapeHtml(notice ? notice.link_url : '') + '" placeholder="例如: #/works 或 https://..."></div>' +
      '<div class="form-group"><label class="form-label">图片</label><div style="display:flex;gap:8px;align-items:center;"><button type="button" class="btn btn-sm btn-outline" id="notice-upload-img">📁 上传图片</button><input type="file" id="notice-img-file" accept="image/*" style="display:none;"><span id="notice-img-name" style="font-size:13px;">' + (imageUrl ? '已选择' : '未选择') + '</span></div>' +
      '<div id="notice-img-preview" style="margin-top:8px;">' + (imageUrl ? '<img src="' + escapeHtml(imageUrl) + '" style="max-width:200px;border-radius:8px;">' : '') + '</div></div>' +
      '<div class="form-group"><label class="form-label">优先级</label><input class="form-input" id="notice-priority" type="number" value="' + (notice ? notice.priority : 0) + '" min="0"></div>' +
      '<div class="form-group"><label class="form-checkbox"><input type="checkbox" id="notice-show-once"' + (notice && notice.show_once ? ' checked' : '') + '> 每个用户只显示一次</label></div>' +
      '<div class="form-group"><label class="form-label">开始时间（可选）</label><input class="form-input" id="notice-start" type="datetime-local" value="' + (notice && notice.start_date ? notice.start_date.replace(' ', 'T') : '') + '"></div>' +
      '<div class="form-group"><label class="form-label">结束时间（可选）</label><input class="form-input" id="notice-end" type="datetime-local" value="' + (notice && notice.end_date ? notice.end_date.replace(' ', 'T') : '') + '"></div>' +
      '<div style="display:flex;gap:12px;margin-top:16px;"><button type="submit" class="btn btn-primary">' + (isEdit ? '保存' : '创建') + '</button><button type="button" class="btn btn-outline" id="notice-cancel-btn">取消</button></div>' +
      '</form></div></div></div>';
    // Bind events
    document.getElementById('notice-cancel-btn').addEventListener('click', function() { self.renderLoginNotices(); });
    document.getElementById('notice-upload-img').addEventListener('click', function() { document.getElementById('notice-img-file').click(); });
    document.getElementById('notice-img-file').addEventListener('change', async function() {
      var f = this.files && this.files[0]; if (!f) return;
      try { var cropped = await openCropModal(f, 16/9); if (!cropped) return; var r = await API.uploadFile(new File([cropped], 'notice.jpg', { type: 'image/jpeg' })); imageUrl = r.file.url; document.getElementById('notice-img-preview').innerHTML = '<img src="' + imageUrl + '" style="max-width:200px;border-radius:8px;">'; document.getElementById('notice-img-name').textContent = '已选择'; } catch(err) { showToast(err.message, 'error'); }
    });
    document.getElementById('notice-form').addEventListener('submit', async function(e) {
      e.preventDefault();
      var data = { title: document.getElementById('notice-title').value, content: document.getElementById('notice-content').value, link_url: document.getElementById('notice-link').value, image_url: imageUrl, priority: parseInt(document.getElementById('notice-priority').value) || 0, show_once: document.getElementById('notice-show-once').checked, start_date: document.getElementById('notice-start').value || null, end_date: document.getElementById('notice-end').value || null };
      try { if (isEdit) { await API.updateLoginNotice(noticeId, data); } else { await API.createLoginNotice(data); } showToast('已保存', 'success'); self.renderLoginNotices(); } catch(err) { showToast(err.message, 'error'); }
    });
  },

  // ===== Advertisement Management =====
  renderAdminAds: async function() {
    this.renderLoading();
    try {
      var self = this;
      var page = 1;
      var render = async function(p) {
        var result = await API.getAdminAds(p, 20);
        var ads = result.ads || [];
        var pag = result.pagination || {};
        document.getElementById('app').innerHTML = '<div class="page-fade-in"><div class="admin-page">' +
          Components._renderAdminNav('ads') +
          '<div class="admin-card"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">' +
          '<div class="admin-card-title" style="margin-bottom:0;">📺 广告管理</div>' +
          '<button class="btn btn-primary" id="add-ad-btn">✚ 新建广告</button></div>' +
          (ads.length === 0 ? '<p style="color:var(--text-secondary);text-align:center;padding:40px;">暂无广告</p>' :
          '<div style="display:flex;flex-direction:column;gap:8px;">' + ads.map(function(a) {
            var posLabel = a.position === 'left' ? '左侧' : '右侧';
            return '<div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:12px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">' +
              '<div style="display:flex;align-items:center;gap:12px;flex:1;min-width:200px;">' +
              (a.image_file_id ? '<img src="/api/file/' + a.image_file_id + '" style="width:60px;height:40px;object-fit:cover;border-radius:4px;">' : '<div style="width:60px;height:40px;background:var(--bg);border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:20px;">🖼</div>') +
              '<div><div style="font-weight:600;">' + escapeHtml(a.title) + '</div>' +
              '<div style="font-size:13px;color:var(--text-secondary);margin-top:2px;">' + posLabel + ' | 排序:' + a.sort_order + ' | ' + (a.is_active ? '✅ 启用' : '❌ 禁用') + ' | 👁 ' + (a.click_count || 0) + ' | 📄 ' + escapeHtml(a.display_pages || 'works,chats,jobs') + '</div></div></div>' +
              '<div style="display:flex;gap:4px;flex-wrap:wrap;">' +
              '<button class="btn btn-sm btn-outline edit-ad-btn" data-id="' + a.id + '">编辑</button>' +
              '<button class="btn btn-sm ' + (a.is_active ? 'btn-outline' : 'btn-primary') + ' toggle-ad-btn" data-id="' + a.id + '">' + (a.is_active ? '禁用' : '启用') + '</button>' +
              '<button class="btn btn-sm btn-danger delete-ad-btn" data-id="' + a.id + '">删除</button></div></div>';
          }).join('') + '</div>') +
          (pag.totalPages > 1 ? '<div style="display:flex;justify-content:center;gap:4px;padding:12px 0;"><button class="btn btn-sm btn-outline" data-ap="prev"' + (pag.page <= 1 ? ' disabled' : '') + '>上一页</button><span style="padding:4px 8px;">' + pag.page + '/' + pag.totalPages + '</span><button class="btn btn-sm btn-outline" data-ap="next"' + (pag.page >= pag.totalPages ? ' disabled' : '') + '>下一页</button></div>' : '') +
          '</div></div></div>';
        Components._bindAdminNav();
        document.getElementById('add-ad-btn').addEventListener('click', function() { self._showAdForm(); });
        document.querySelectorAll('.edit-ad-btn').forEach(function(b) { b.addEventListener('click', function() { self._showAdForm(parseInt(b.dataset.id)); }); });
        document.querySelectorAll('.toggle-ad-btn').forEach(function(b) { b.addEventListener('click', async function() { try { await API.toggleAdStatus(parseInt(b.dataset.id)); showToast('已更新', 'success'); render(p); } catch(err) { showToast(err.message, 'error'); } }); });
        document.querySelectorAll('.delete-ad-btn').forEach(function(b) { b.addEventListener('click', async function() { if (!(await showConfirm('确定删除？'))) return; try { await API.deleteAd(parseInt(b.dataset.id)); showToast('已删除', 'success'); render(p); } catch(err) { showToast(err.message, 'error'); } }); });
        document.querySelectorAll('[data-ap]').forEach(function(b) { b.addEventListener('click', function() { var dir = b.dataset.ap; if (dir === 'prev' && pag.page > 1) render(pag.page - 1); else if (dir === 'next' && pag.page < pag.totalPages) render(pag.page + 1); }); });
      };
      render(page);
    } catch (err) { showToast(err.message, 'error'); Router.navigate('#/works'); }
  },

  _showAdForm: async function(adId) {
    var self = this;
    var ad = null;
    if (adId) {
      try { var r = await API.getAdminAds(1, 100); ad = (r.ads || []).find(function(a) { return a.id === adId; }); } catch(e) {}
    }
    var isEdit = !!ad;
    var imageFileId = ad ? (ad.image_file_id || null) : null;
    var previewUrl = imageFileId ? '/api/file/' + imageFileId : '';
    document.getElementById('app').innerHTML = '<div class="page-fade-in"><div class="settings-page"><div class="settings-card">' +
      '<h2 style="font-size:22px;font-weight:700;margin-bottom:16px;">' + (isEdit ? '编辑' : '新建') + '广告</h2>' +
      '<form id="ad-form">' +
      '<div class="form-group"><label class="form-label">标题 *</label><input class="form-input" id="ad-title" value="' + escapeHtml(ad ? ad.title : '') + '" required></div>' +
      '<div class="form-group"><label class="form-label">位置</label><select class="form-input" id="ad-position"><option value="right"' + (ad && ad.position === 'right' ? ' selected' : '') + '>右侧</option><option value="left"' + (ad && ad.position === 'left' ? ' selected' : '') + '>左侧</option></select></div>' +
      '<div class="form-group"><label class="form-label">排序</label><input class="form-input" id="ad-sort" type="number" value="' + (ad ? ad.sort_order : 0) + '" min="0"></div>' +
      '<div class="form-group"><label class="form-label">跳转链接</label><input class="form-input" id="ad-link" value="' + escapeHtml(ad ? ad.link_url : '') + '" placeholder="例如: #/works 或 https://..."></div>' +
      '<div class="form-group"><label class="form-label">显示页面</label><div style="display:flex;gap:12px;flex-wrap:wrap;">' +
      '<label class="form-checkbox"><input type="checkbox" class="ad-page-cb" value="works"' + ((ad && (ad.display_pages || '').split(',').indexOf('works') >= 0) || !ad ? ' checked' : '') + '> 📂 作品区</label>' +
      '<label class="form-checkbox"><input type="checkbox" class="ad-page-cb" value="chats"' + ((ad && (ad.display_pages || '').split(',').indexOf('chats') >= 0) || !ad ? ' checked' : '') + '> 💬 聊天区</label></div></div>' +
      '<div class="form-group"><label class="form-label">广告图片 <span style="font-size:12px;color:var(--text-light);">（建议宽高比约 1:2.62，图片将铺满广告栏）</span></label><div style="display:flex;gap:8px;align-items:center;"><button type="button" class="btn btn-sm btn-outline" id="ad-upload-img">📁 上传图片</button><input type="file" id="ad-img-file" accept="image/*" style="display:none;"><span id="ad-img-name" style="font-size:13px;">' + (previewUrl ? '已选择' : '未选择') + '</span></div>' +
      '<div id="ad-img-preview" style="margin-top:8px;">' + (previewUrl ? '<div style="width:240px;height:400px;border:1px solid var(--border);border-radius:8px;overflow:hidden;background:var(--bg);"><img src="' + previewUrl + '" style="width:100%;height:100%;object-fit:cover;display:block;"></div>' : '') + '</div></div>' +
      '<div style="display:flex;gap:12px;margin-top:16px;"><button type="submit" class="btn btn-primary">' + (isEdit ? '保存' : '创建') + '</button><button type="button" class="btn btn-outline" id="ad-cancel-btn">取消</button></div>' +
      '</form></div></div></div>';
    // Bind events
    document.getElementById('ad-cancel-btn').addEventListener('click', function() { self.renderAdminAds(); });
    document.getElementById('ad-upload-img').addEventListener('click', function() { document.getElementById('ad-img-file').click(); });
    document.getElementById('ad-img-file').addEventListener('change', async function() {
      var f = this.files && this.files[0]; if (!f) return;
      try { var cropped = await openCropModal(f, 1/2.62); if (!cropped) return; var r = await API.uploadFile(new File([cropped], 'ad.jpg', { type: 'image/jpeg' })); imageFileId = r.file.id; document.getElementById('ad-img-preview').innerHTML = '<div style="width:240px;height:400px;border:1px solid var(--border);border-radius:8px;overflow:hidden;background:var(--bg);"><img src="' + r.file.url + '" style="width:100%;height:100%;object-fit:cover;display:block;"></div>'; document.getElementById('ad-img-name').textContent = '已选择'; } catch(err) { showToast(err.message, 'error'); }
    });
    document.getElementById('ad-form').addEventListener('submit', async function(e) {
      e.preventDefault();
      var pageCbs = document.querySelectorAll('.ad-page-cb:checked');
      var pages = '';
      for (var ci = 0; ci < pageCbs.length; ci++) { if (pages) pages += ','; pages += pageCbs[ci].value; }
      var data = {
        title: document.getElementById('ad-title').value,
        position: document.getElementById('ad-position').value,
        sort_order: parseInt(document.getElementById('ad-sort').value) || 0,
        link_url: document.getElementById('ad-link').value,
        image_file_id: imageFileId,
        display_pages: pages || 'works,chats'
      };
      try {
        if (isEdit) { await API.updateAd(adId, data); } else { await API.createAd(data); }
        showToast('已保存', 'success'); self.renderAdminAds();
      } catch(err) { showToast(err.message, 'error'); }
    });
  }
};
