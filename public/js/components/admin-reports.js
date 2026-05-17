// admin-reports.js — extracted from admin.js
var ComponentsAdminReports = {
  renderAdminReports: async function() {
    this.renderLoading();
    try {
      if (!this._reportPage) this._reportPage = 1;
      var status = this._reportStatus || 'pending';
      var d = await API.getAdminReports(this._reportPage, 20, status), reports = d.reports || [], pag = d.pagination || {};
      var allCount = pag.total || reports.length;
      var totalPages = pag.totalPages || 1;
      var tabs = [
        { id: 'pending', label: '⏳ 待处理' },
        { id: 'resolved', label: '✅ 已处理' },
        { id: 'dismissed', label: '❌ 已驳回' }
      ];
      document.getElementById('app').innerHTML = '<div class="page-fade-in"><div class="admin-page">' +
        Components._renderAdminNav('reports') +
        '<div class="admin-card"><div class="admin-card-title">🚩 举报管理 <span style="font-size:12px;color:var(--text-secondary);font-weight:400;">共 ' + allCount + ' 条</span></div>' +
        '<div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap;align-items:center;">' +
        '<div class="report-tab-group">' + tabs.map(function(t) { return '<button class="report-tab-btn ' + (t.id === status ? 'active' : '') + '" data-status="' + t.id + '">' + t.label + '</button>'; }).join('') + '</div>' +
        '<div style="position:relative;flex:1;min-width:160px;"><input class="search-input" id="report-search" type="text" placeholder="搜索举报..." style="padding:8px 14px 8px 32px;"><span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);font-size:13px;opacity:.3;">🔍</span></div></div>' +
        (reports.length === 0 ? '<p style="color:var(--text-secondary);padding:20px;text-align:center;">暂无举报</p>' :
        reports.map(function(r) {
          var dateStr = formatDate(r.created_at);
          var statusClass = r.status === 'pending' ? 'pending' : r.status === 'resolved' ? 'resolved' : 'dismissed';
          var typeClass = r.target_type === 'post' ? 'post' : 'user';
          var typeLabel = r.target_type === 'post' ? '📄帖子' : '👤用户';
          var isPending = r.status === 'pending';
          var reporterAvatar = r.reporter_avatar ? '<img src="' + r.reporter_avatar + '" style="width:18px;height:18px;border-radius:50%;object-fit:cover;">' :
            '<span style="display:inline-flex;width:18px;height:18px;border-radius:50%;background:var(--primary);color:#fff;align-items:center;justify-content:center;font-size:10px;font-weight:600;">' + escapeHtml((r.reporter_name || '?').charAt(0).toUpperCase()) + '</span>';
          return '<div class="report-card"><div class="report-card-head report-card-toggle" data-id="' + r.id + '"><span class="status-dot ' + statusClass + '"></span><span class="type-badge ' + typeClass + '">' + typeLabel + '</span><span class="reason-text">' + escapeHtml(r.reason) + '</span><span class="date-text">' + dateStr + '</span></div><div class="report-card-body" id="report-body-' + r.id + '"><div class="report-detail-box"><div class="report-detail-row"><span class="report-detail-label">举报目标</span><span class="report-target-link" data-type="' + r.target_type + '" data-id="' + r.target_id + '" style="color:var(--primary);cursor:pointer;">' + escapeHtml(r.target_name || '未知') + '</span></div><div class="report-detail-row"><span class="report-detail-label">举报人</span><span class="report-reporter-link" data-id="' + r.reporter_id + '" style="color:var(--primary);cursor:pointer;display:inline-flex;align-items:center;gap:4px;">' + reporterAvatar + escapeHtml(r.reporter_name) + '</span></div><div class="report-detail-row"><span class="report-detail-label">举报原因</span><span>' + escapeHtml(r.reason) + '</span></div><div class="report-detail-row"><span class="report-detail-label">举报时间</span><span>' + dateStr + '</span></div></div>' +
            (isPending ? '<div class="report-action-group">' +
            (r.target_type === 'user' ? '<button class="act-warning report-mute-btn" data-id="' + r.target_id + '" data-banned="' + (r.target_is_banned ? '1' : '0') + '">🔇 ' + (r.target_is_banned ? '已禁言' : '禁言') + '</button>' : '') +
            (r.target_type === 'post' ? '<button class="act-warning report-lock-btn" data-id="' + r.target_id + '" data-locked="' + (r.target_is_locked ? '1' : '0') + '">🔒 ' + (r.target_is_locked ? '已解锁' : '锁定帖子') + '</button><button class="act-danger report-delete-post-btn" data-id="' + r.target_id + '">🗑 删除帖子</button>' : '') +
            '<button class="act-primary resolve-report-btn" data-id="' + r.id + '">✅ 处理</button>' +
            '<button class="act-outline dismiss-report-btn" data-id="' + r.id + '">❌ 驳回</button></div>' :
            '<div style="font-size:12px;color:var(--text-secondary);padding:8px 12px;background:var(--bg-input);border-radius:8px;">' + (r.status === 'resolved' ? '✅ 已处理' : '❌ 已驳回') + '</div>') +
          '</div></div>';
        }).join('')) +
        (totalPages > 1 ? '<div style="display:flex;justify-content:center;gap:6px;padding:12px 0;flex-wrap:wrap;"><button class="btn btn-sm btn-outline report-page-btn" data-dir="prev"' + (this._reportPage <= 1 ? ' disabled' : '') + '>◀ 上一页</button><span style="padding:4px 8px;font-size:13px;color:var(--text-secondary);">' + this._reportPage + '/' + totalPages + '</span><button class="btn btn-sm btn-outline report-page-btn" data-dir="next"' + (this._reportPage >= totalPages ? ' disabled' : '') + '>下一页 ▶</button></div>' : '') +
        '</div></div></div>';
      Components._bindAdminNav();
      document.querySelectorAll('.report-tab-btn').forEach(function(b) { b.addEventListener('click', function() { Components._reportStatus = this.dataset.status; Components._reportPage = 1; Components.renderAdminReports(); }); });
      document.querySelectorAll('.report-page-btn').forEach(function(b) { b.addEventListener('click', function() { if (this.disabled) return; Components._reportPage += this.dataset.dir === 'next' ? 1 : -1; Components.renderAdminReports(); }); });
      document.querySelectorAll('.report-card-toggle').forEach(function(el) { el.addEventListener('click', function() { var body = document.getElementById('report-body-' + this.dataset.id); if (body) body.classList.toggle('open'); }); });
      document.querySelectorAll('.resolve-report-btn').forEach(function(b) { b.addEventListener('click', async function(e) { e.stopPropagation(); var id = parseInt(this.dataset.id); try { await API.resolveReport(id, 'resolved'); showToast('已处理', 'success'); Components.renderAdminReports(); } catch(err) { showToast(err.message, 'error'); } }); });
      document.querySelectorAll('.dismiss-report-btn').forEach(function(b) { b.addEventListener('click', async function(e) { e.stopPropagation(); var id = parseInt(this.dataset.id); try { await API.resolveReport(id, 'dismissed'); showToast('已驳回', 'success'); Components.renderAdminReports(); } catch(err) { showToast(err.message, 'error'); } }); });
      document.querySelectorAll('.report-target-link').forEach(function(el) { el.addEventListener('click', function(e) { e.stopPropagation(); playClickSound(); var t = this.dataset.type, id = parseInt(this.dataset.id); if (t === 'user') Router.navigate('#/users/' + id); else if (t === 'post') Router.navigate('#/posts/' + id); }); });
      document.querySelectorAll('.report-reporter-link').forEach(function(el) { el.addEventListener('click', function(e) { e.stopPropagation(); playClickSound(); Router.navigate('#/users/' + parseInt(this.dataset.id)); }); });
      document.querySelectorAll('.report-mute-btn').forEach(function(b) { b.addEventListener('click', async function(e) { e.stopPropagation(); var id = parseInt(this.dataset.id), isBanned = this.dataset.banned === '1'; try { if (isBanned) { await API.adminBanUser(id, false); showToast('已解除禁言', 'success'); Components.renderAdminReports(); } else { var hours = await showPrompt('禁言时长（小时），留空为永久禁言：', '', '例如: 24'); if (hours === null) return; var duration = hours.trim() ? parseInt(hours.trim()) : null; if (hours.trim() && (!duration || duration < 1)) { showToast('请输入有效的小时数', 'error'); return; } await API.adminBanUser(id, true, duration, '举报处理 - 违规禁言'); showToast('已禁言', 'success'); Components.renderAdminReports(); } } catch(err) { showToast(err.message, 'error'); } }); });
      document.querySelectorAll('.report-lock-btn').forEach(function(b) { b.addEventListener('click', async function(e) { e.stopPropagation(); var id = parseInt(this.dataset.id), isLocked = this.dataset.locked === '1'; try { await API.lockPost(id, !isLocked); showToast(isLocked ? '已解锁' : '已锁定', 'success'); Components.renderAdminReports(); } catch(err) { showToast(err.message, 'error'); } }); });
      document.querySelectorAll('.report-delete-post-btn').forEach(function(b) { b.addEventListener('click', async function(e) { e.stopPropagation(); var id = parseInt(this.dataset.id); if (!(await showConfirm('确定删除此帖子？'))) return; try { await API.deletePost(id); showToast('已删除', 'success'); Components.renderAdminReports(); } catch(err) { showToast(err.message, 'error'); } }); });
    } catch (err) { showToast(err.message, 'error'); Router.navigate('#/works'); }
  }
};
