// Admin component: stats, reports, users, levels, tags
var ComponentsAdmin = {
  renderTagManager: async function() { this._tagCategory = 'all'; this.renderLoading(); try { await this._renderTagList(); } catch (err) { showToast(err.message, 'error'); Router.navigate('#/works'); } },

  _renderTagList: async function() {
    var app = document.getElementById('app'), isAdmin = App.user && App.user.role === 'admin';
    var tags = (await API.getTags(this._tagCategory === 'all' ? '' : this._tagCategory)).tags || [];
    app.innerHTML = '<div class="page-fade-in"><div class="settings-page"><div class="settings-card"><h2 style="font-size:22px;font-weight:700;margin-bottom:8px;">🏷️ 标签管理</h2><div class="sort-bar" style="margin-bottom:12px;"><button class="sort-btn ' + (this._tagCategory === 'all' ? 'active' : '') + '" data-tag-cat="all">📋 全部</button><button class="sort-btn ' + (this._tagCategory === 'work' ? 'active' : '') + '" data-tag-cat="work">📂 作品区</button><button class="sort-btn ' + (this._tagCategory === 'chat' ? 'active' : '') + '" data-tag-cat="chat">💬 聊天区</button></div><div class="search-bar" style="margin-bottom:16px;"><input class="search-input" id="tag-search" type="text" placeholder="搜索标签..." autocomplete="off"></div><div id="tag-list" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;">' + tags.map(function(t) { return '<span class="tag-manager-item"><span class="tag-manager-name">' + escapeHtml(t.name) + '</span><span class="tag-manager-count">' + t.count + ' 帖</span>' + (isAdmin ? '<span class="tag-manager-remove" data-id="' + t.id + '" data-name="' + escapeHtml(t.name) + '">&times;</span>' : '') + '</span>'; }).join('') + '</div><div class="tag-add-row" style="display:flex;gap:8px;margin-top:12px;"><input class="form-input" id="new-tag-input" type="text" placeholder="新标签名称..." style="flex:1;"><button class="btn btn-primary" id="add-tag-btn">添加</button></div></div></div></div>';
    var self = this;
    document.querySelectorAll('.sort-btn[data-tag-cat]').forEach(function(b) { b.addEventListener('click', function() { playClickSound(); self._tagCategory = b.dataset.tagCat; self._renderTagList(); }); });
    document.getElementById('add-tag-btn').addEventListener('click', async function() { var n = document.getElementById('new-tag-input').value.trim(); if (!n) { showToast('请输入标签名', 'error'); return; } try { await API.createTag(n); showToast('已添加', 'success'); self._renderTagList(); } catch (err) { showToast(err.message, 'error'); } });
    if (isAdmin) document.getElementById('tag-list').addEventListener('click', async function(e) { var rb = e.target.closest('.tag-manager-remove'); if (!rb) return; if (!(await showConfirm('确定删除？'))) return; try { await API.deleteTag(parseInt(rb.dataset.id)); showToast('已删除', 'success'); self._renderTagList(); } catch (err) { showToast(err.message, 'error'); } });
  },

  renderAdminStats: async function() {
    this.renderLoading();
    try {
      var d = await API.getAdminStats(), zones = d.zones || [];
      var totalUsers = d.total_users || 0, pendingReports = d.pending_reports || 0;
      var maxPosts = Math.max.apply(null, [1].concat(zones.map(function(z) { return z.posts; })));
      var maxReplies = Math.max.apply(null, [1].concat(zones.map(function(z) { return z.replies; })));
      document.getElementById('app').innerHTML = '<div class="page-fade-in"><div class="settings-page">' +
        '<div class="settings-card"><h2 style="font-size:22px;font-weight:700;margin-bottom:16px;">📊 区域统计</h2>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:24px;">' +
        '<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:20px;text-align:center;"><div style="font-size:32px;margin-bottom:4px;">👥</div><div style="font-size:28px;font-weight:700;">' + totalUsers + '</div><div style="font-size:13px;color:var(--text-secondary);">总用户数</div></div>' +
        '<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:20px;text-align:center;"><div style="font-size:32px;margin-bottom:4px;">🚩</div><div style="font-size:28px;font-weight:700;' + (pendingReports > 0 ? 'color:var(--error);' : '') + '">' + pendingReports + '</div><div style="font-size:13px;color:var(--text-secondary);">待处理举报</div></div>' +
        '</div>' +
        zones.map(function(z) {
          var postPct = Math.round(z.posts / maxPosts * 100);
          var replyPct = Math.round(z.replies / maxReplies * 100);
          return '<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:16px;margin-top:12px;"><h3 style="font-size:18px;font-weight:700;margin-bottom:12px;">' + (z.zone === 'works' ? '📂' : '💬') + ' ' + escapeHtml(z.label) + '</h3>' +
            '<div style="margin-bottom:12px;"><div style="display:flex;justify-content:space-between;font-size:14px;margin-bottom:4px;"><span>帖子数</span><span style="font-weight:600;">' + z.posts + '</span></div><div style="height:8px;background:var(--bg);border-radius:4px;overflow:hidden;"><div style="height:100%;width:' + postPct + '%;background:var(--primary);border-radius:4px;transition:width 0.3s;"></div></div></div>' +
            '<div><div style="display:flex;justify-content:space-between;font-size:14px;margin-bottom:4px;"><span>回复数</span><span style="font-weight:600;">' + z.replies + '</span></div><div style="height:8px;background:var(--bg);border-radius:4px;overflow:hidden;"><div style="height:100%;width:' + replyPct + '%;background:var(--accent, #8b5cf6);border-radius:4px;transition:width 0.3s;"></div></div></div></div>';
        }).join('') +
        '<div style="text-align:center;margin-top:20px;"><button class="btn btn-outline" id="refresh-stats-btn">🔄 刷新数据</button></div>' +
        '</div></div>';
      document.getElementById('refresh-stats-btn').addEventListener('click', function() { Components.renderAdminStats(); });
    } catch (err) { showToast(err.message, 'error'); Router.navigate('#/works'); }
  },

  renderAdminReports: async function() {
    this.renderLoading();
    try {
      var status = this._reportStatus || 'pending';
      var d = await API.getAdminReports(1, 20, status), reports = d.reports || [], pag = d.pagination || {};
      var tabs = [{ id: 'pending', label: '待处理' }, { id: 'resolved', label: '已处理' }, { id: 'dismissed', label: '已驳回' }];
      document.getElementById('app').innerHTML = '<div class="page-fade-in"><div class="settings-page"><div class="settings-card"><h2 style="font-size:22px;font-weight:700;margin-bottom:16px;">🚩 举报管理</h2><div style="display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap;">' + tabs.map(function(t) { return '<button class="btn btn-sm ' + (t.id === status ? 'btn-primary' : 'btn-outline') + ' report-tab-btn" data-status="' + t.id + '">' + t.label + '</button>'; }).join('') + '</div>' +
        (reports.length === 0 ? '<p style="color:var(--text-secondary);padding:20px;text-align:center;">暂无举报</p>' :
        '<div style="overflow-x:auto;">' + reports.map(function(r) {
          var dateStr = formatDate(r.created_at);
          return '<div class="report-item" style="border:1px solid var(--border);border-radius:8px;padding:12px;margin-bottom:8px;"><div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;"><div style="flex:1;min-width:0;"><div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;"><span class="report-type-badge" style="font-size:11px;padding:1px 6px;border-radius:4px;background:var(--bg);color:var(--text-secondary);flex-shrink:0;">' + (r.target_type === 'post' ? '📄帖子' : '👤用户') + '</span><span class="report-target-link" data-type="' + r.target_type + '" data-id="' + r.target_id + '" style="cursor:pointer;color:var(--primary);font-weight:600;">' + escapeHtml(r.target_name || '未知') + '</span></div><div style="font-size:12px;color:var(--text-secondary);margin-top:4px;display:flex;align-items:center;gap:6px;"><span class="report-reporter-link" data-id="' + r.reporter_id + '" style="cursor:pointer;display:inline-flex;align-items:center;gap:4px;color:var(--primary);">' + (r.reporter_avatar ? '<img src="' + r.reporter_avatar + '" style="width:18px;height:18px;border-radius:50%;object-fit:cover;">' : '<span style="display:inline-flex;width:18px;height:18px;border-radius:50%;background:var(--primary);color:#fff;align-items:center;justify-content:center;font-size:10px;font-weight:600;">' + escapeHtml((r.reporter_name || '?').charAt(0).toUpperCase()) + '</span>') + escapeHtml(r.reporter_name) + '</span> · ' + dateStr + '</div><div style="font-size:13px;margin-top:4px;padding:4px 8px;background:var(--bg);border-radius:4px;">' + escapeHtml(r.reason) + '</div></div>' + (r.status === 'pending' ? '<div style="display:flex;gap:4px;flex-shrink:0;flex-wrap:wrap;">' + (r.target_type === 'user' ? '<button class="btn btn-sm btn-outline report-mute-btn" data-id="' + r.target_id + '" data-banned="' + (r.target_is_banned ? '1' : '0') + '" style="color:var(--warning);">🔇 ' + (r.target_is_banned ? '已禁言' : '禁言') + '</button>' : '') + (r.target_type === 'post' ? '<button class="btn btn-sm btn-outline report-lock-btn" data-id="' + r.target_id + '" data-locked="' + (r.target_is_locked ? '1' : '0') + '" style="color:var(--warning);">🔒 ' + (r.target_is_locked ? '已锁定' : '锁定') + '</button><button class="btn btn-sm btn-outline report-delete-post-btn" data-id="' + r.target_id + '" style="color:var(--error);">🗑 删除</button>' : '') + '<button class="btn btn-sm btn-primary resolve-report-btn" data-id="' + r.id + '">✅ 处理</button><button class="btn btn-sm btn-outline dismiss-report-btn" data-id="' + r.id + '" style="color:var(--error);">❌ 驳回</button></div>' : '<span style="font-size:12px;color:var(--text-secondary);padding:4px 8px;background:var(--bg);border-radius:4px;">' + (r.status === 'resolved' ? '✅ 已处理' : '❌ 已驳回') + '</span>') + '</div></div>';
        }).join('') + '</div>') +
        (pag.totalPages > 1 ? '<div style="display:flex;justify-content:center;gap:6px;padding:12px 0;flex-wrap:wrap;"><button class="btn btn-sm btn-outline" data-rp="prev"' + (pag.page <= 1 ? ' disabled' : '') + '>上一页</button><span style="padding:4px 8px;font-size:13px;color:var(--text-secondary);">' + pag.page + '/' + pag.totalPages + '</span><button class="btn btn-sm btn-outline" data-rp="next"' + (pag.page >= pag.totalPages ? ' disabled' : '') + '>下一页</button></div>' : '') +
        '</div></div></div>';
      document.querySelectorAll('.report-tab-btn').forEach(function(b) { b.addEventListener('click', function() { Components._reportStatus = this.dataset.status; Components.renderAdminReports(); }); });
      document.querySelectorAll('.resolve-report-btn').forEach(function(b) { b.addEventListener('click', async function() { var id = parseInt(this.dataset.id); try { await API.resolveReport(id, 'resolved'); showToast('已处理', 'success'); Components.renderAdminReports(); } catch(err) { showToast(err.message, 'error'); } }); });
      document.querySelectorAll('.dismiss-report-btn').forEach(function(b) { b.addEventListener('click', async function() { var id = parseInt(this.dataset.id); try { await API.resolveReport(id, 'dismissed'); showToast('已驳回', 'success'); Components.renderAdminReports(); } catch(err) { showToast(err.message, 'error'); } }); });
      document.querySelectorAll('.report-target-link').forEach(function(el) { el.addEventListener('click', function() { playClickSound(); var t = this.dataset.type, id = parseInt(this.dataset.id); if (t === 'user') Router.navigate('#/users/' + id); else if (t === 'post') Router.navigate('#/posts/' + id); }); });
      document.querySelectorAll('.report-reporter-link').forEach(function(el) { el.addEventListener('click', function() { playClickSound(); Router.navigate('#/users/' + parseInt(this.dataset.id)); }); });
      document.querySelectorAll('.report-mute-btn').forEach(function(b) { b.addEventListener('click', async function() { var id = parseInt(this.dataset.id), isBanned = this.dataset.banned === '1'; try { if (isBanned) { await API.adminBanUser(id, false); showToast('已解除禁言', 'success'); Components.renderAdminReports(); } else { var hours = await showPrompt('禁言时长（小时），留空为永久禁言：', '', '例如: 24'); if (hours === null) return; var duration = hours.trim() ? parseInt(hours.trim()) : null; if (hours.trim() && (!duration || duration < 1)) { showToast('请输入有效的小时数', 'error'); return; } await API.adminBanUser(id, true, duration, '举报处理 - 违规禁言'); showToast('已禁言', 'success'); Components.renderAdminReports(); } } catch(err) { showToast(err.message, 'error'); } }); });
      document.querySelectorAll('.report-lock-btn').forEach(function(b) { b.addEventListener('click', async function() { var id = parseInt(this.dataset.id), isLocked = this.dataset.locked === '1'; try { await API.lockPost(id, !isLocked); showToast(isLocked ? '已解锁' : '已锁定', 'success'); Components.renderAdminReports(); } catch(err) { showToast(err.message, 'error'); } }); });
      document.querySelectorAll('.report-delete-post-btn').forEach(function(b) { b.addEventListener('click', async function() { var id = parseInt(this.dataset.id); if (!(await showConfirm('确定删除此帖子？'))) return; try { await API.deletePost(id); showToast('已删除', 'success'); Components.renderAdminReports(); } catch(err) { showToast(err.message, 'error'); } }); });
    } catch (err) { showToast(err.message, 'error'); Router.navigate('#/works'); }
  },

  renderAdminUsers: async function() {
    this.renderLoading();
    try {
      var page = 1, search = '';
      var render = async function(p, s) {
        var d = await API.getAdminUsers(p, 20, s), users = d.users || [], pag = d.pagination || {};
        document.getElementById('app').innerHTML = '<div class="page-fade-in"><div class="admin-users-page" style="max-width:1200px;margin:0 auto;padding:20px 16px;">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:20px;"><h2 style="font-size:24px;font-weight:700;margin:0;">👥 用户管理</h2><span style="font-size:13px;color:var(--text-secondary);">共 ' + (pag.total || users.length) + ' 位用户</span></div>' +
          '<div class="search-bar" style="margin-bottom:16px;max-width:400px;display:flex;gap:6px;"><input class="search-input" id="admin-user-search" type="text" placeholder="搜索用户名..." value="' + escapeHtml(s) + '" style="flex:1;"><button class="btn btn-primary btn-sm" id="admin-user-search-btn" style="border-radius:8px;padding:6px 14px;">🔍 搜索</button></div>' +
          (users.length === 0 ? '<div class="empty-state" style="padding:60px;"><div class="empty-state-icon">👥</div><p class="empty-state-text">暂无用户</p></div>' :
          '<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;overflow:hidden;"><table style="width:100%;border-collapse:collapse;font-size:13px;"><thead><tr style="background:var(--bg);">' +
          '<th style="padding:12px 14px;text-align:left;border-bottom:1px solid var(--border);font-weight:600;color:var(--text-secondary);white-space:nowrap;">用户</th>' +
          '<th style="padding:12px 14px;text-align:left;border-bottom:1px solid var(--border);font-weight:600;color:var(--text-secondary);white-space:nowrap;">角色</th>' +
          '<th style="padding:12px 14px;text-align:left;border-bottom:1px solid var(--border);font-weight:600;color:var(--text-secondary);white-space:nowrap;">等级</th>' +
          '<th style="padding:12px 14px;text-align:left;border-bottom:1px solid var(--border);font-weight:600;color:var(--text-secondary);white-space:nowrap;">XP</th>' +
          '<th style="padding:12px 14px;text-align:left;border-bottom:1px solid var(--border);font-weight:600;color:var(--text-secondary);white-space:nowrap;">积分</th>' +
          '<th style="padding:12px 14px;text-align:left;border-bottom:1px solid var(--border);font-weight:600;color:var(--text-secondary);white-space:nowrap;">状态</th>' +
          '<th style="padding:12px 14px;text-align:left;border-bottom:1px solid var(--border);font-weight:600;color:var(--text-secondary);white-space:nowrap;">操作</th>' +
          '</tr></thead><tbody>' + users.map(function(u) {
            var avatarHtml = u.avatar_url ? '<img src="' + u.avatar_url + '" style="width:32px;height:32px;border-radius:50%;object-fit:cover;cursor:pointer;">' : '<span style="display:inline-flex;width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,var(--primary),#6366f1);color:#fff;align-items:center;justify-content:center;font-size:13px;font-weight:700;cursor:pointer;">' + escapeHtml((u.nickname || u.username).charAt(0).toUpperCase()) + '</span>';
            var roleBadge = u.role === 'admin' ? '<span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;background:#e0e7ff;color:#4338ca;">管理员</span>' : '<span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;background:#f0fdf4;color:#16a34a;">用户</span>';
            var statusBadge = u.is_banned ? '<span style="display:inline-flex;align-items:center;gap:3px;font-size:12px;color:#dc2626;"><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#dc2626;"></span>已禁言</span>' : '<span style="display:inline-flex;align-items:center;gap:3px;font-size:12px;color:#16a34a;"><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#16a34a;"></span>正常</span>';
            var canManage = u.username !== 'admin';
            return '<tr style="border-bottom:1px solid var(--border);transition:background 0.15s;"><td style="padding:10px 14px;"><div style="display:flex;align-items:center;gap:10px;"><span class="admin-user-avatar" data-uid="' + u.id + '">' + avatarHtml + '</span><div><div class="admin-user-name" data-uid="' + u.id + '" style="cursor:pointer;color:var(--primary);font-weight:600;font-size:14px;">' + escapeHtml(u.nickname || u.username) + '</div>' + (u.nickname ? '<div style="font-size:11px;color:var(--text-light);">@' + escapeHtml(u.username) + '</div>' : '') + '</div></div></td>' +
              '<td style="padding:10px 14px;">' + roleBadge + '</td>' +
              '<td style="padding:10px 14px;"><input class="form-input admin-edit-level" data-uid="' + u.id + '" type="number" value="' + (u.level || 1) + '" style="width:52px;font-size:13px;padding:4px 6px;text-align:center;border-radius:6px;"></td>' +
              '<td style="padding:10px 14px;"><input class="form-input admin-edit-xp" data-uid="' + u.id + '" type="number" value="' + (u.xp || 0) + '" style="width:72px;font-size:13px;padding:4px 6px;text-align:center;border-radius:6px;"></td>' +
              '<td style="padding:10px 14px;"><input class="form-input admin-edit-points" data-uid="' + u.id + '" type="number" value="' + (u.points || 0) + '" style="width:72px;font-size:13px;padding:4px 6px;text-align:center;border-radius:6px;"></td>' +
              '<td style="padding:10px 14px;">' + statusBadge + '</td>' +
              '<td style="padding:10px 14px;"><div style="display:flex;gap:4px;flex-wrap:nowrap;">' +
              (canManage ? '<button class="admin-ban-btn" data-id="' + u.id + '" data-banned="' + u.is_banned + '" style="padding:5px 10px;font-size:12px;border-radius:6px;border:1px solid ' + (u.is_banned ? 'var(--success)' : 'var(--error)') + ';background:transparent;color:' + (u.is_banned ? 'var(--success)' : 'var(--error)') + ';cursor:pointer;white-space:nowrap;">' + (u.is_banned ? '解除禁言' : '禁言') + '</button>' : '') +
              '<button class="admin-save-level-btn" data-uid="' + u.id + '" style="padding:5px 12px;font-size:12px;border-radius:6px;border:none;background:var(--primary);color:#fff;cursor:pointer;white-space:nowrap;">保存</button>' +
              '</div></td></tr>';
          }).join('') + '</tbody></table></div>') +
          (pag.totalPages > 1 ? '<div style="display:flex;justify-content:center;align-items:center;gap:8px;padding:16px 0 4px;"><button class="btn btn-sm btn-outline" data-up="prev"' + (pag.page <= 1 ? ' disabled' : '') + ' style="padding:6px 14px;border-radius:8px;">← 上一页</button><span style="font-size:13px;color:var(--text-secondary);font-weight:500;">第 ' + pag.page + '/' + pag.totalPages + ' 页</span><button class="btn btn-sm btn-outline" data-up="next"' + (pag.page >= pag.totalPages ? ' disabled' : '') + ' style="padding:6px 14px;border-radius:8px;">下一页 →</button></div>' : '') +
          '</div>';
        var doSearch = function() { var v = (document.getElementById('admin-user-search').value || '').trim(); page = 1; render(1, v); };
        document.getElementById('admin-user-search').addEventListener('keydown', function(e) { if (e.key === 'Enter') doSearch(); });
        document.getElementById('admin-user-search-btn').addEventListener('click', doSearch);
        document.querySelectorAll('[data-up]').forEach(function(b) { b.addEventListener('click', function() { var dir = this.dataset.up; if (dir === 'prev' && pag.page > 1) page = pag.page - 1; else if (dir === 'next' && pag.page < pag.totalPages) page = pag.page + 1; else return; render(page, s); }); });
        document.querySelectorAll('.admin-user-avatar, .admin-user-name').forEach(function(el) { el.addEventListener('click', function() { playClickSound(); Router.navigate('#/users/' + parseInt(this.dataset.uid)); }); });
        document.querySelectorAll('.admin-ban-btn').forEach(function(b) { b.addEventListener('click', async function() { var uid = parseInt(this.dataset.id), banned = this.dataset.banned === 'true'; if (banned) { try { await API.adminBanUser(uid, false); showToast('已解除禁言', 'success'); render(page, s); } catch(err) { showToast(err.message, 'error'); } } else { var reason = await showPrompt('禁言原因（可选）：', '', ''); var duration = await showPrompt('禁言时长（小时，留空=永久）：', '', ''); try { await API.adminBanUser(uid, true, duration ? parseInt(duration) : null, reason || ''); showToast('已禁言', 'success'); render(page, s); } catch(err) { showToast(err.message, 'error'); } } }); });
        document.querySelectorAll('.admin-save-level-btn').forEach(function(b) { b.addEventListener('click', async function() { var uid = parseInt(this.dataset.uid), row = this.closest('tr'); var level = parseInt(row.querySelector('.admin-edit-level').value) || 1; var xp = parseInt(row.querySelector('.admin-edit-xp').value) || 0; var points = parseInt(row.querySelector('.admin-edit-points').value) || 0; try { await API.updateUserLevel(uid, { level: level, xp: xp, points: points }); showToast('已更新', 'success'); render(page, s); } catch(err) { showToast(err.message, 'error'); } }); });
      };
      render(page, search);
    } catch (err) { showToast(err.message, 'error'); Router.navigate('#/works'); }
  },

  renderAdminLevels: async function() {
    this.renderLoading();
    try {
      var configs = (await API.getLevelConfig()).configs || [];
      var allZones = [
        { id: 'work', label: '作品区', icon: '📂' },
        { id: 'chat', label: '聊天区', icon: '💬' },
        { id: 'music', label: '音乐区', icon: '🎵' }
      ];
      document.getElementById('app').innerHTML = '<div class="page-fade-in"><div style="max-width:900px;margin:0 auto;padding:20px 16px;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:20px;"><h2 style="font-size:24px;font-weight:700;margin:0;">🏆 等级配置管理</h2><span style="font-size:13px;color:var(--text-secondary);">共 ' + configs.length + ' 个等级</span></div>' +
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
        '</div></div>';
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
        document.getElementById('app').innerHTML = '<div class="page-fade-in"><div class="settings-page"><div class="settings-card">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">' +
          '<h2 style="font-size:22px;font-weight:700;">📢 登录弹窗管理</h2>' +
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
    app.innerHTML = '<div class="page-fade-in"><div class="settings-page"><div class="settings-card">' +
      '<h2 style="font-size:22px;font-weight:700;margin-bottom:16px;">' + (isEdit ? '编辑' : '新建') + '登录弹窗</h2>' +
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
        document.getElementById('app').innerHTML = '<div class="page-fade-in"><div class="settings-page"><div class="settings-card">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">' +
          '<h2 style="font-size:22px;font-weight:700;">📺 广告管理</h2>' +
          '<button class="btn btn-primary" id="add-ad-btn">✚ 新建广告</button></div>' +
          (ads.length === 0 ? '<p style="color:var(--text-secondary);text-align:center;padding:40px;">暂无广告</p>' :
          '<div style="display:flex;flex-direction:column;gap:8px;">' + ads.map(function(a) {
            var posLabel = a.position === 'left' ? '左侧' : '右侧';
            return '<div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:12px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">' +
              '<div style="display:flex;align-items:center;gap:12px;flex:1;min-width:200px;">' +
              (a.image_file_id ? '<img src="/api/file/' + a.image_file_id + '" style="width:60px;height:40px;object-fit:cover;border-radius:4px;">' : '<div style="width:60px;height:40px;background:var(--bg);border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:20px;">🖼</div>') +
              '<div><div style="font-weight:600;">' + escapeHtml(a.title) + '</div>' +
              '<div style="font-size:13px;color:var(--text-secondary);margin-top:2px;">' + posLabel + ' | 排序:' + a.sort_order + ' | ' + (a.is_active ? '✅ 启用' : '❌ 禁用') + ' | 👁 ' + (a.click_count || 0) + '</div></div></div>' +
              '<div style="display:flex;gap:4px;flex-wrap:wrap;">' +
              '<button class="btn btn-sm btn-outline edit-ad-btn" data-id="' + a.id + '">编辑</button>' +
              '<button class="btn btn-sm ' + (a.is_active ? 'btn-outline' : 'btn-primary') + ' toggle-ad-btn" data-id="' + a.id + '">' + (a.is_active ? '禁用' : '启用') + '</button>' +
              '<button class="btn btn-sm btn-danger delete-ad-btn" data-id="' + a.id + '">删除</button></div></div>';
          }).join('') + '</div>') +
          (pag.totalPages > 1 ? '<div style="display:flex;justify-content:center;gap:4px;padding:12px 0;"><button class="btn btn-sm btn-outline" data-ap="prev"' + (pag.page <= 1 ? ' disabled' : '') + '>上一页</button><span style="padding:4px 8px;">' + pag.page + '/' + pag.totalPages + '</span><button class="btn btn-sm btn-outline" data-ap="next"' + (pag.page >= pag.totalPages ? ' disabled' : '') + '>下一页</button></div>' : '') +
          '</div></div></div>';
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
      '<div class="form-group"><label class="form-label">广告图片 <span style="font-size:12px;color:var(--text-light);">（建议竖版图片，宽高比约 3:4）</span></label><div style="display:flex;gap:8px;align-items:center;"><button type="button" class="btn btn-sm btn-outline" id="ad-upload-img">📁 上传图片</button><input type="file" id="ad-img-file" accept="image/*" style="display:none;"><span id="ad-img-name" style="font-size:13px;">' + (previewUrl ? '已选择' : '未选择') + '</span></div>' +
      '<div id="ad-img-preview" style="margin-top:8px;">' + (previewUrl ? '<div style="width:240px;border:1px solid var(--border);border-radius:8px;overflow:hidden;"><img src="' + previewUrl + '" style="width:100%;display:block;"></div>' : '') + '</div></div>' +
      '<div style="display:flex;gap:12px;margin-top:16px;"><button type="submit" class="btn btn-primary">' + (isEdit ? '保存' : '创建') + '</button><button type="button" class="btn btn-outline" id="ad-cancel-btn">取消</button></div>' +
      '</form></div></div></div>';
    // Bind events
    document.getElementById('ad-cancel-btn').addEventListener('click', function() { self.renderAdminAds(); });
    document.getElementById('ad-upload-img').addEventListener('click', function() { document.getElementById('ad-img-file').click(); });
    document.getElementById('ad-img-file').addEventListener('change', async function() {
      var f = this.files && this.files[0]; if (!f) return;
      try { var cropped = await openCropModal(f, 3/4); if (!cropped) return; var r = await API.uploadFile(new File([cropped], 'ad.jpg', { type: 'image/jpeg' })); imageFileId = r.file.id; document.getElementById('ad-img-preview').innerHTML = '<div style="width:240px;border:1px solid var(--border);border-radius:8px;overflow:hidden;"><img src="' + r.file.url + '" style="width:100%;display:block;"></div>'; document.getElementById('ad-img-name').textContent = '已选择'; } catch(err) { showToast(err.message, 'error'); }
    });
    document.getElementById('ad-form').addEventListener('submit', async function(e) {
      e.preventDefault();
      var data = {
        title: document.getElementById('ad-title').value,
        position: document.getElementById('ad-position').value,
        sort_order: parseInt(document.getElementById('ad-sort').value) || 0,
        link_url: document.getElementById('ad-link').value,
        image_file_id: imageFileId
      };
      try {
        if (isEdit) { await API.updateAd(adId, data); } else { await API.createAd(data); }
        showToast('已保存', 'success'); self.renderAdminAds();
      } catch(err) { showToast(err.message, 'error'); }
    });
  }
};
