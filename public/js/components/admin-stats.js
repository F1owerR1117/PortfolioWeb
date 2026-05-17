// admin-stats.js — extracted from admin.js
var ComponentsAdminStats = {
  renderAdminStats: async function() {
    this.renderLoading();
    try {
      var d = await API.getAdminStats(), zones = d.zones || [];
      var totalUsers = d.total_users || 0, pendingReports = d.pending_reports || 0;
      var maxPosts = Math.max.apply(null, [1].concat(zones.map(function(z) { return z.posts; })));
      var maxReplies = Math.max.apply(null, [1].concat(zones.map(function(z) { return z.replies; })));
      document.getElementById('app').innerHTML = '<div class="page-fade-in"><div class="admin-page">' +
        Components._renderAdminNav('stats') +
        '<div class="admin-page-header"><div><h1>📊 系统概览</h1><div class="admin-subtitle">数据概览与统计</div></div></div>' +
        '<div class="admin-stats-grid">' +
        '<div class="admin-stat-box"><div class="admin-stat-icon">👥</div><div class="admin-stat-num">' + totalUsers + '</div><div class="admin-stat-label">总用户</div></div>' +
        '<div class="admin-stat-box"><div class="admin-stat-icon">📄</div><div class="admin-stat-num">' + (zones.reduce(function(s,z){return s+(z.posts||0);},0)) + '</div><div class="admin-stat-label">帖子</div></div>' +
        '<div class="admin-stat-box"><div class="admin-stat-icon">💬</div><div class="admin-stat-num">' + (zones.reduce(function(s,z){return s+(z.replies||0);},0)) + '</div><div class="admin-stat-label">评论</div></div>' +
        '<div class="admin-stat-box"><div class="admin-stat-icon">🚩</div><div class="admin-stat-num' + (pendingReports > 0 ? ' alert' : '') + '">' + pendingReports + '</div><div class="admin-stat-label">待处理举报</div></div>' +
        '</div>' +
        '<div class="admin-card"><div class="admin-card-title">📊 分区统计</div>' +
        zones.map(function(z) {
          var postPct = Math.round(z.posts / maxPosts * 100);
          var replyPct = Math.round(z.replies / maxReplies * 100);
          return '<div style="margin-bottom:16px;"><div class="admin-progress-row"><span>' + (z.zone === 'works' ? '📂' : '💬') + ' ' + escapeHtml(z.label) + '</span><span>' + z.posts + ' 帖子</span></div><div class="admin-progress-bar"><div class="admin-progress-fill primary" style="width:' + postPct + '%;"></div></div></div>' +
            '<div style="margin-bottom:4px;"><div class="admin-progress-row"><span>回复数</span><span>' + z.replies + '</span></div><div class="admin-progress-bar"><div class="admin-progress-fill accent" style="width:' + replyPct + '%;"></div></div></div>';
        }).join('') +
        '<button class="btn btn-outline btn-sm" id="refresh-stats-btn" style="margin-top:12px;">🔄 刷新数据</button>' +
        '</div></div></div>';
      document.getElementById('refresh-stats-btn').addEventListener('click', function() { Components.renderAdminStats(); });
      Components._bindAdminNav();
    } catch (err) { showToast(err.message, 'error'); Router.navigate('#/works'); }
  }
};
