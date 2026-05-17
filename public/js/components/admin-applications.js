// Admin component: stats, reports, users, levels, tags, applications
var ComponentsAdminAppend = {
  renderAdminApplications: async function() {
    this.renderLoading();
    try {
      var apps = (await API.getApplications('pending')).applications || [];
      document.getElementById('app').innerHTML = '<div class="page-fade-in"><div class="admin-page">' +
        Components._renderAdminNav('applications') +
        '<div class="admin-card"><div class="admin-card-title">📋 身份申请 <span style="font-size:12px;color:var(--text-secondary);font-weight:400;">待审核 ' + apps.length + ' 条</span></div>' +
        (apps.length === 0 ? '<p style="color:var(--text-secondary);padding:20px;text-align:center;">暂无待审核申请</p>' :
        apps.map(function(a) {
          var roleLabel = a.role === 'employer' ? '<span class="badge" style="background:rgba(245,158,11,.1);color:#f59e0b;">💼 招聘者</span>' : '<span class="badge" style="background:rgba(96,165,250,.1);color:#60a5fa;">🔍 求职者</span>';
          return '<div class="report-card"><div class="report-card-head" style="cursor:default;"><span class="status-dot pending"></span><span>' + escapeHtml(a.username) + '</span><span style="font-size:11px;color:var(--text-secondary);">Lv.' + (a.level || 1) + '</span>' + roleLabel + '</div><div class="report-card-body open"><div class="report-detail-box">' +
            (a.reason ? '<div class="report-detail-row"><span class="report-detail-label">申请理由</span><span>' + escapeHtml(a.reason) + '</span></div>' : '') +
            '<div class="report-detail-row"><span class="report-detail-label">申请时间</span><span>' + formatDate(a.created_at) + '</span></div></div>' +
            '<div class="report-action-group">' +
            '<button class="act-primary review-app-btn" data-id="' + a.id + '" data-action="approved">✅ 批准</button>' +
            '<button class="act-outline review-app-btn" data-id="' + a.id + '" data-action="rejected" style="color:#ef4444;">❌ 拒绝</button></div></div></div>';
        }).join('')) +
        '</div></div></div>';
      Components._bindAdminNav();
      document.querySelectorAll('.review-app-btn').forEach(function(b) { b.addEventListener('click', async function(e) { e.stopPropagation(); var id = parseInt(this.dataset.id), action = this.dataset.action; try { await API.reviewApplication(id, action); showToast(action === 'approved' ? '已批准' : '已拒绝', 'success'); Components.renderAdminApplications(); } catch(err) { showToast(err.message, 'error'); } }); });
    } catch (err) { showToast(err.message, 'error'); Router.navigate('#/works'); }
  }
};
