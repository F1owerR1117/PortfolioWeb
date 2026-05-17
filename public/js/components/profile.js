// Profile component: my profile and user profile
var ComponentsProfile = {
  // SYNC entry — renders loading screen immediately, defers data fetching
  renderMyProfile: function() {
    this.renderLoading();
    this._initLevelCache();
    var self = this;
    setTimeout(function() { self._loadMyProfileData(); }, 0);
  },

  // ASYNC data loading — runs after _handlePath sync ops (updateNav etc.) complete
  _loadMyProfileData: async function() {
    try {
      var p = (await API.getMyProfile()).profile;
      var avatarUrl = p.avatar_url || '';
      var skills = (p.skills || []).slice();
      var self = this;

      // Fetch dashboard data in parallel
      var [statsData, userPostsData, notifData, levelData] = await Promise.all([
        API.getUserStats(App.user.id).catch(function() { return { stats: {} }; }),
        API.getUserPosts(App.user.id, 1, 6).catch(function() { return { posts: [] }; }),
        API.getNotifications().catch(function() { return { notifications: [] }; }),
        API.getMyLevel().catch(function() { return { xp: 0, next_xp_required: 0 }; })
      ]);
      var stats = statsData.stats || {};
      var recentPosts = (userPostsData.posts || []).slice(0, 6);
      var recentNotifs = (notifData.notifications || []).slice(0, 5);

      var renderView = function() {
        var app = document.getElementById('app');
        // Stats cards HTML
        var statsHtml =
          '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:12px;margin-top:20px;">' +
          '<div class="stat-card" style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:16px;text-align:center;">' +
          '<div style="font-size:24px;font-weight:700;color:var(--primary);">' + (stats.postCount || 0) + '</div>' +
          '<div style="font-size:12px;color:var(--text-secondary);margin-top:4px;">📂 作品</div></div>' +
          '<div class="stat-card" style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:16px;text-align:center;">' +
          '<div style="font-size:24px;font-weight:700;color:var(--success);">' + (stats.commentReceived || 0) + '</div>' +
          '<div style="font-size:12px;color:var(--text-secondary);margin-top:4px;">💬 评论</div></div>' +
          '<div class="stat-card" style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:16px;text-align:center;">' +
          '<div style="font-size:24px;font-weight:700;color:var(--warning);">' + (stats.totalLikes || 0) + '</div>' +
          '<div style="font-size:12px;color:var(--text-secondary);margin-top:4px;">👍 获赞</div></div>' +
          '<div class="stat-card" style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:16px;text-align:center;">' +
          '<div style="font-size:24px;font-weight:700;">' + (stats.memberDays || 1) + '</div>' +
          '<div style="font-size:12px;color:var(--text-secondary);margin-top:4px;">📅 注册天数</div></div></div>';

        // Recent posts HTML
        
        // Job role application card
        var jobRoleHtml = '';
        if (p.job_role_approved) {
          var roleLabel = p.job_role === 'employer' ? '💼 招聘者' : '🔍 求职者';
          jobRoleHtml = '<div class="stat-card" style="background:var(--bg-active);border:1px solid rgba(163,230,53,.1);border-radius:var(--radius);padding:16px;margin-bottom:16px;display:flex;align-items:center;gap:12px;">' +
            '<span style="font-size:28px;">✅</span>' +
            '<div style="flex:1;"><div style="font-size:14px;font-weight:600;">' + roleLabel + ' 身份</div><div style="font-size:12px;color:var(--text-secondary);margin-top:2px;">📌 已通过审核，发布招聘/求职贴已开启' + (p.job_rating ? ' · ⭐ ' + p.job_rating + ' 信誉' : '') + (p.job_completed ? ' · ✅ ' + p.job_completed + ' 次完成' : '') + '</div></div></div>';
        } else {
          jobRoleHtml = '<div class="stat-card" style="background:var(--bg-input);border:1px dashed var(--border);border-radius:var(--radius);padding:16px;margin-bottom:16px;">' +
            '<div style="text-align:center;"><span style="font-size:24px;">🔑</span>' +
            '<div style="font-size:13px;font-weight:600;margin-top:6px;">求职招聘身份</div>' +
            '<div style="font-size:12px;color:var(--text-secondary);margin:4px 0 10px;">申请后可发布和回复求职招聘信息</div>' +
            '<div style="display:flex;gap:8px;justify-content:center;">' +
            '<button class="btn btn-primary btn-sm" id="apply-employer-btn">💼 申请招聘者</button>' +
            '<button class="btn btn-outline btn-sm" id="apply-seeker-btn">🔍 申请求职者</button></div></div></div>';
        }
var postsHtml = '<h3 style="font-size:16px;font-weight:600;margin-bottom:12px;">📂 最近作品</h3>';
        if (recentPosts.length === 0) {
          postsHtml += '<div class="empty-state" style="padding:20px 0;"><p>暂无作品</p></div>';
        } else {
          postsHtml += '<div class="post-grid" id="dashboard-post-grid">' +
            recentPosts.map(function(pt) {
              return '<div class="post-card" data-post-id="' + pt.id + '">' +
                '<div class="post-card-img" style="' + (pt.cover_url ? "background-image:url('" + pt.cover_url + "');background-size:cover;background-position:center;" : '') + '">' +
                (pt.cover_url ? '' : '📄') + '</div>' +
                '<div class="post-card-body">' +
                '<div class="post-card-title">' + escapeHtml(pt.title) + '</div>' +
                '<div class="post-card-footer"><div class="post-card-views">👁 ' + (pt.views || 0) + '</div></div>' +
                '</div></div>';
            }).join('') + '</div>';
          postsHtml += '<div style="text-align:right;margin-top:8px;"><a href="#/my-posts" style="font-size:13px;">查看全部 →</a></div>';
        }

        // Recent notifications HTML
        var notifHtml = '<h3 style="font-size:16px;font-weight:600;margin-bottom:12px;">🔔 最近通知</h3>';
        if (recentNotifs.length === 0) {
          notifHtml += '<div class="empty-state" style="padding:20px 0;"><p>暂无通知</p></div>';
        } else {
          notifHtml += '<div class="notif-list" id="dashboard-notif-list">';
          var notifLabels = { reply: '回复了你', comment: '评论了你的帖子', sticky: '帖子被置顶', featured: '帖子被设为精华', locked: '帖子被锁定', post_deleted: '帖子被删除', friend_request: '请求添加好友', friend_approved: '通过了你的好友申请', message: '给你发了私信', bookmark: '收藏了你的帖子', playlist_collect: '收藏了你的歌单', banned: '你已被禁言' };
          for (var ni = 0; ni < recentNotifs.length; ni++) {
            var n = recentNotifs[ni];
            var notifIcon = n.type === 'reply' ? '💬' : n.type === 'comment' ? '💬' : n.type === 'like' ? '👍' : n.type === 'sticky' ? '📌' : n.type === 'featured' ? '⭐' : n.type === 'post_deleted' ? '🗑️' : n.type === 'locked' ? '🔒' : n.type === 'message' ? '✉️' : n.type === 'friend_request' ? '👥' : n.type === 'friend_approved' ? '✅' : n.type === 'bookmark' ? '🔖' : n.type === 'playlist_collect' ? '📋' : n.type === 'banned' ? '🚫' : '🔔';
            var notifText = (n.actor_name ? escapeHtml(n.actor_name) + ' ' : '') + (notifLabels[n.type] || n.type);
            notifHtml += '<div class="notif-item" style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px;">' +
              '<span>' + notifIcon + '</span>' +
              '<span style="flex:1;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + notifText + '</span>' +
              '<span style="font-size:11px;color:var(--text-light);flex-shrink:0;">' + formatRelativeTime(n.created_at) + '</span></div>';
          }
          notifHtml += '</div>';
          notifHtml += '<div style="text-align:right;margin-top:4px;"><a href="#/notifications" style="font-size:13px;">查看全部 →</a></div>';
        }

        app.innerHTML = '<div class="page-fade-in"><div class="profile-page">' +
          // Profile header
          '<div class="profile-header">' +
          '<div class="profile-avatar-wrap">' +
          '<div class="profile-avatar">' + (avatarUrl ? '<img src="' + escapeHtml(avatarUrl) + '" alt="头像">' : '👤') + '</div>' +
          '<button class="avatar-edit-btn" id="toggle-edit-profile">✎</button>' +
          '</div>' +
          '<div class="profile-info">' +
          '<div class="profile-name">' + escapeHtml(p.nickname || p.username) + ' ⭐' + (p.level || 1) + '</div>' +
          '<div class="profile-username">@' + escapeHtml(p.username) + ' · ' + (p.role === 'admin' ? '管理员' : '用户') + (p.job_role === 'employer' ? ' · <span class="badge" style="background:rgba(245,158,11,.1);color:#f59e0b;font-size:10px;">💼 招聘者</span>' : p.job_role === 'seeker' ? ' · <span class="badge" style="background:rgba(96,165,250,.1);color:#60a5fa;font-size:10px;">🔍 求职者</span>' : '') + '</div>' +
          '<div class="profile-bio">' + escapeHtml(p.bio || '暂无简介') + '</div>' +
          (skills.length > 0 ? '<div class="about-skills" style="margin-bottom:16px;">' + skills.map(function(s) { return '<span class="about-skill-tag">' + escapeHtml(s) + '</span>'; }).join('') + '</div>' : '') +
          '<div class="profile-actions">' +
          '<button class="btn btn-outline btn-sm" id="toggle-edit-profile-btn">✏ 编辑资料</button>' +
          '<button class="btn btn-outline btn-sm" id="preview-other-view">👁 他人视角</button>' +
          '</div>' +
          '</div></div>' +
          // Stats
          '<div class="profile-stats">' +
          '<div class="stat-card"><div class="stat-number">' + (stats.postCount || 0) + '</div><div class="stat-label">作品</div></div>' +
          '<div class="stat-card"><div class="stat-number">' + (stats.totalLikes || 0) + '</div><div class="stat-label">获赞</div></div>' +
          '<div class="stat-card"><div class="stat-number">' + (stats.commentReceived || 0) + '</div><div class="stat-label">评论</div></div>' +
          '<div class="stat-card"><div class="stat-number">' + (stats.memberDays || 1) + '</div><div class="stat-label">注册天数</div></div>' +
          '</div>' +
          // XP Section
          '<div class="xp-section">' +
          '<div class="xp-header">' +
          '<div class="xp-level">⭐ Lv.' + (p.level || 1) + ' ' + escapeHtml(p.level_name || '') + ' <span class="level-badge">' + (p.xp || 0) + ' XP</span></div>' +
          '<div class="xp-numbers">' + (levelData.xp || 0) + ' / ' + (levelData.next_xp_required || 0) + '</div>' +
          '</div>' +
          '<div class="xp-bar"><div class="xp-bar-fill" style="width:' + Math.min(100, Math.round(((levelData.xp || 0) / Math.max(1, (levelData.next_xp_required || 1))) * 100)) + '%;"></div></div>' +
          '</div>' +
          // Dashboard content
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:20px;">' +
          '<div class="about-card" style="padding:20px;">' + postsHtml + '</div>' +
          '<div class="about-card" style="padding:20px;">' + notifHtml + '</div>' +
          '</div></div></div>';

        // Bind events
        document.getElementById('toggle-edit-profile').addEventListener('click', function() { playClickSound(); renderEdit(); });
        document.getElementById('toggle-edit-profile-btn').addEventListener('click', function() { playClickSound(); renderEdit(); });
        document.getElementById('preview-other-view')?.addEventListener('click', function() { playClickSound(); Router.navigate('#/users/' + App.user.id); });
        document.getElementById('apply-employer-btn')?.addEventListener('click', async function() {
            var reason = await showPrompt('申请招聘者身份', '', '请简单说明申请原因');
            if (reason === null) return;
            try { await API.submitApplication('employer', reason); showToast('申请已提交', 'success'); this.disabled = true; this.textContent = '已申请'; } catch(err) { showToast(err.message, 'error'); }
          });
          document.getElementById('apply-seeker-btn')?.addEventListener('click', async function() {
            var reason = await showPrompt('申请求职者身份', '', '请简单说明申请原因');
            if (reason === null) return;
            try { await API.submitApplication('seeker', reason); showToast('申请已提交', 'success'); this.disabled = true; this.textContent = '已申请'; } catch(err) { showToast(err.message, 'error'); }
          });
        document.querySelectorAll('#dashboard-post-grid .post-card')?.forEach(function(c) {
          c.addEventListener('click', function() { playClickSound(); Router.navigate('#/posts/' + c.dataset.postId); });
        });
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

  renderUserProfile: async function(userId) {
    this.renderLoading();
    try {
      var pd = await API.getUserProfile(userId), ps = await API.getUserPosts(userId);
      var p = pd.profile, posts = ps.posts || [], currentUser = App.user, isOwn = currentUser && currentUser.id === userId;

      var sd;
      try { sd = await API.getUserStats(userId); } catch (e) { sd = { stats: {} }; }
      var stats = sd.stats || {};
      var views = (stats.totalViews || stats.views || 0);
      views = views > 1000 ? (views / 1000).toFixed(1) + 'k' : views;

      var avatarHtml = p.avatar_url ? '<img src="' + escapeHtml(p.avatar_url) + '" alt="头像">' : escapeHtml((p.nickname || p.username || ' ').charAt(0).toUpperCase());
      var onlineDot = '<div class="online-dot"></div>';
      var levelBadge = this._renderLevelBadge(p.level || 1);
      var usernameHtml = p.nickname ? '<span style="font-size:12px;color:var(--text-light);">@' + escapeHtml(p.username) + '</span> · ' : '';
      var bannedHtml = p.is_banned ? '<span style="color:var(--error);font-weight:600;">🚫 已禁言</span>' : '';
      var memberDate = formatDate(p.created_at);

      var skillsHtml = (p.skills && p.skills.length > 0) ? p.skills.map(function(s) { return '<span class="skill-tag">' + escapeHtml(s) + '</span>'; }).join(' ') : '';
      var socialHtml = '';
      if (p.social && (p.social.github || p.social.weibo || p.social.email)) {
        socialHtml = (p.social.github ? '<a class="social-link" href="' + escapeHtml(p.social.github) + '" target="_blank" rel="noopener">🐙 GitHub</a>' : '') +
          (p.social.weibo ? '<a class="social-link" href="' + escapeHtml(p.social.weibo) + '" target="_blank" rel="noopener">📢 微博</a>' : '') +
          (p.social.email ? '<a class="social-link" href="mailto:' + escapeHtml(p.social.email) + '">✉️ ' + escapeHtml(p.social.email) + '</a>' : '');
      }

      document.getElementById('app').innerHTML = '<div class="page-fade-in"><div class="profile-hero"><div class="profile-hero-bg"></div><div class="profile-hero-content"><div class="profile-avatar-wrap"><div class="profile-avatar-lg">' + avatarHtml + '</div>' + onlineDot + '</div><div class="profile-info-top"><div class="profile-name">' + escapeHtml(p.nickname || p.username) + ' ' + levelBadge + '</div><div class="profile-username">' + (usernameHtml || (p.role === 'admin' ? '@admin · ' : '')) + (p.role === 'admin' ? '管理员' : '') + '</div>' + (p.bio ? '<div class="profile-bio-inline">' + escapeHtml(p.bio) + '</div>' : '') + '</div><div class="profile-actions-hero" id="friend-action-area"><div class="spinner" style="width:20px;height:20px;border-width:2px;"></div></div></div></div>' +
        '<div class="stat-row"><div class="stat-item primary"><div class="stat-num">' + (stats.postCount || 0) + '</div><div class="stat-label">📂 作品</div></div><div class="stat-item success"><div class="stat-num">' + (stats.commentReceived || 0) + '</div><div class="stat-label">💬 评论</div></div><div class="stat-item warning"><div class="stat-num">' + (stats.totalLikes || 0) + '</div><div class="stat-label">👍 获赞</div></div><div class="stat-item info"><div class="stat-num">' + views + '</div><div class="stat-label">👁 浏览</div></div></div>' +
        '<div class="profile-layout"><div class="profile-main">' +
        '<div style="font-size:15px;font-weight:600;margin-bottom:14px;display:flex;align-items:center;gap:8px;">📂 最近作品<span style="font-weight:400;color:var(--text-muted);font-size:12px;">' + posts.length + ' 篇</span></div>' +
        (posts.length === 0 ? '<div class="empty-state"><p>暂无作品</p></div>' : '<div class="user-post-grid">' + posts.map(function(pt) { return '<div class="up-card" data-post-id="' + pt.id + '"><div class="up-card-img">' + (pt.cover_url ? '<img src="' + escapeHtml(pt.cover_url) + '" alt="">' : '📄') + '</div><div class="up-card-body"><div class="up-card-title">' + escapeHtml(pt.title) + '</div><div class="up-card-meta"><span>👁 ' + (pt.views || 0) + '</span><span>👍 ' + (pt.like_count || 0) + '</span></div></div></div>'; }).join('') + '</div>') +
        '<div id="public-playlists-area"></div></div><div class="profile-sidebar">' +
        '<div class="sidebar-card"><h4>🤝 关系</h4><div id="friend-action-sidebar"><div class="spinner" style="width:20px;height:20px;border-width:2px;"></div></div></div>' +
        (skillsHtml ? '<div class="sidebar-card"><h4>🛠 技能</h4><div style="display:flex;gap:6px;flex-wrap:wrap;">' + skillsHtml + '</div></div>' : '') +
        '<div class="sidebar-card" id="playlist-sidebar-card" style="display:none;"><h4>🎵 公开歌单</h4><div id="playlist-sidebar-list"></div></div>' +
        (socialHtml ? '<div class="sidebar-card"><h4>🔗 社交</h4><div class="social-links">' + socialHtml + '</div></div>' : '') +
        '</div></div></div>';
      document.querySelectorAll('.up-card').forEach(function(c) { c.addEventListener('click', function() { playClickSound(); Router.navigate('#/posts/' + c.dataset.postId); }); });
      if (currentUser) {
        API.getUserPublicPlaylists(userId).then(function(pd) { var pls = pd.playlists || []; var card = document.getElementById('playlist-sidebar-card'); var list = document.getElementById('playlist-sidebar-list'); if (!card || !list) return; if (pls.length === 0) { card.style.display = 'none'; return; } card.style.display = 'block'; list.innerHTML = pls.map(function(pl) { var pc = pl.cover_url ? '<img src="' + escapeHtml(pl.cover_url) + '" alt="">' : '🎵'; return '<div class="pl-card" data-pid="' + pl.id + '"><div class="pl-cover">' + pc + '</div><div class="pl-info"><div class="pl-name">' + escapeHtml(pl.name) + '</div><div class="pl-count">' + (pl.song_count || 0) + ' 首</div></div></div>'; }).join(''); list.querySelectorAll('.pl-card').forEach(function(card) { card.addEventListener('click', function() { Router.navigate('#/music/playlist/' + this.dataset.pid); }); }); }).catch(function() {});
        if (isOwn) {
          ['friend-action-area', 'friend-action-sidebar'].forEach(function(id) { var fa = document.getElementById(id); if (fa) fa.innerHTML = '<span style="font-size:13px;color:var(--text-light);">这是你的个人主页（他人视角）</span><button class="btn btn-sm btn-outline" id="back-to-my-profile-btn" style="margin-left:8px;">← 返回我的主页</button>'; });
          document.querySelectorAll('#back-to-my-profile-btn').forEach(function(el) { el.addEventListener('click', function() { playClickSound(); Router.navigate('#/profile'); }); });
        } else {
          this._checkAndRenderFriendButton(userId);
        }
      }
    } catch (err) { showToast(err.message, 'error'); this.renderPostList(); }
  },

  _checkAndRenderFriendButton: async function(userId) {
    try { var d = await API.getFriendshipStatus(userId); var areas = ['friend-action-area', 'friend-action-sidebar'].map(function(id) { return document.getElementById(id); }).filter(Boolean); if (areas.length === 0) return; var labels = { friends: '<span style="font-size:13px;color:var(--success);font-weight:600;">✅ 已是好友</span>', request_sent: '<span style="font-size:13px;color:var(--text-light);">⏳ 好友申请已发送</span>', request_received: '<button class="btn btn-sm btn-primary" id="accept-friend-btn">✅ 接受好友申请</button>', none: '<button class="btn btn-sm btn-primary" id="add-friend-btn">➕ 添加好友</button>' }; var html = labels[d.status] || ''; areas.forEach(function(a) { a.innerHTML = html; }); document.getElementById('add-friend-btn')?.addEventListener('click', async function() { try { await API.sendFriendRequest(userId); showToast('已发送', 'success'); Components._checkAndRenderFriendButton(userId); } catch (err) { showToast(err.message, 'error'); } }); var ab = document.getElementById('accept-friend-btn'); if (ab) { try { var rd = await API.getFriendRequests(); var r = (rd.requests || []).find(function(x) { return x.from_user_id === userId; }); if (r) ab.addEventListener('click', async function() { try { await API.approveFriendRequest(r.id); showToast('已添加', 'success'); Components._checkAndRenderFriendButton(userId); } catch (err) { showToast(err.message, 'error'); } }); } catch(e) {} } } catch (e) {}
  }
};
