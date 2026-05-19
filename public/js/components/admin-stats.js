// admin-stats.js — system overview dashboard
var ComponentsAdminStats = {
  // Zone display config
  _zoneIcons: { work: '📂', chat: '💬', music: '🎵', job: '💼' },
  _zoneColors: { work: 'primary', chat: 'accent', music: '#10b981', job: '#f59e0b' },

  renderAdminStats: async function() {
    this.renderLoading();
    try {
      var d = await API.getAdminStats(), zones = d.zones || [];
      var totalUsers = d.total_users || 0;
      var totalPosts = d.total_posts || 0;
      var totalComments = d.total_comments || 0;
      var pendingReports = d.pending_reports || 0;
      var postsToday = d.posts_today || 0;
      var usersToday = d.users_today || 0;

      // Relative max for progress bars (across all zones)
      var maxPosts = Math.max(1, zones.reduce(function(m, z) { return Math.max(m, z.posts); }, 0));
      var maxReplies = Math.max(1, zones.reduce(function(m, z) { return Math.max(m, z.replies); }, 0));

      var self = this;
      var html = '<div class="page-fade-in"><div class="admin-page">' +
        Components._renderAdminNav('stats') +
        '<div class="admin-page-header"><div><h1>📊 系统概览</h1><div class="admin-subtitle">数据概览与统计</div></div></div>';

      // ---- Summary cards (4-col) ----
      html += '<div class="admin-stats-grid">' +
        self._statCard('👥', totalUsers, '总用户' + (usersToday > 0 ? ' <span style="color:#10b981;font-size:11px;">+' + usersToday + ' 今日</span>' : '')) +
        self._statCard('📄', totalPosts, '总帖子' + (postsToday > 0 ? ' <span style="color:#10b981;font-size:11px;">+' + postsToday + ' 今日</span>' : '')) +
        self._statCard('💬', totalComments, '总评论') +
        self._statCard('🚩', pendingReports, '待处理举报', pendingReports > 0) +
        '</div>';

      // ---- Zone stats card ----
      html += '<div class="admin-card"><div class="admin-card-title">📊 分区统计</div>';

      for (var i = 0; i < zones.length; i++) {
        var z = zones[i];
        var icon = self._zoneIcons[z.zone] || '📌';
        var color = self._zoneColors[z.zone] || 'primary';
        var postPct = Math.round(z.posts / maxPosts * 100);
        var replyPct = Math.round(z.replies / maxReplies * 100);
        var isLast = i === zones.length - 1;

        html += '<div style="margin-bottom:' + (isLast ? '12' : '18') + 'px;">' +
          '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">' +
            '<span style="font-size:16px;">' + icon + '</span>' +
            '<span style="font-weight:600;font-size:14px;">' + escapeHtml(z.label) + '</span>' +
            '<span style="margin-left:auto;font-size:12px;color:var(--text-on-bg-muted);">' +
              z.posts + ' 帖子 · ' + z.replies + ' 回复' +
            '</span>' +
          '</div>' +
          // Posts bar
          '<div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;">' +
            '<span style="font-size:11px;color:var(--text-on-bg-muted);width:28px;text-align:right;">帖子</span>' +
            '<div class="admin-progress-bar" style="flex:1;margin-top:0;">' +
              '<div class="admin-progress-fill' + (color === 'primary' || color === 'accent' ? ' ' + color : '') + '"' +
                ' style="width:' + postPct + '%;' + (color !== 'primary' && color !== 'accent' ? 'background:' + color + ';' : '') + '"></div>' +
            '</div>' +
            '<span style="font-size:12px;font-weight:600;min-width:36px;">' + z.posts + '</span>' +
          '</div>' +
          // Replies bar
          '<div style="display:flex;align-items:center;gap:10px;">' +
            '<span style="font-size:11px;color:var(--text-on-bg-muted);width:28px;text-align:right;">回复</span>' +
            '<div class="admin-progress-bar" style="flex:1;margin-top:0;">' +
              '<div class="admin-progress-fill accent" style="width:' + replyPct + '%;"></div>' +
            '</div>' +
            '<span style="font-size:12px;font-weight:600;min-width:36px;">' + z.replies + '</span>' +
          '</div>' +
        '</div>';
      }

      // Empty state
      if (zones.length === 0) {
        html += '<div style="text-align:center;padding:32px;color:var(--text-on-bg-muted);">暂无分区数据</div>';
      }

      html += '<button class="btn btn-outline btn-sm" id="refresh-stats-btn" style="margin-top:8px;">🔄 刷新数据</button>' +
        '</div>';

      html += '</div></div>';

      document.getElementById('app').innerHTML = html;
      document.getElementById('refresh-stats-btn').addEventListener('click', function() { Components.renderAdminStats(); });
      Components._bindAdminNav();
    } catch (err) { showToast(err.message, 'error'); Router.navigate('#/works'); }
  },

  // Helper: render a stat card
  _statCard: function(icon, num, label, alert) {
    return '<div class="admin-stat-box">' +
      '<div class="admin-stat-icon">' + icon + '</div>' +
      '<div class="admin-stat-num' + (alert ? ' alert' : '') + '">' + num + '</div>' +
      '<div class="admin-stat-label">' + label + '</div>' +
    '</div>';
  }
};
