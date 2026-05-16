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
      var [statsData, userPostsData, notifData] = await Promise.all([
        API.getUserStats(App.user.id).catch(function() { return { stats: {} }; }),
        API.getUserPosts(App.user.id, 1, 6).catch(function() { return { posts: [] }; }),
        API.getNotifications().catch(function() { return { notifications: [] }; })
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

        app.innerHTML = '<div class="page-fade-in"><div class="about-page">' +
          // Profile card
          '<div class="about-card">' +
          '<div style="display:flex;align-items:flex-start;gap:20px;flex-wrap:wrap;">' +
          '<div class="about-avatar" style="flex-shrink:0;">' + (avatarUrl ? '<img src="' + escapeHtml(avatarUrl) + '" alt="头像">' : '👤') + '</div>' +
          '<div style="flex:1;min-width:200px;">' +
          '<h1 style="font-size:24px;font-weight:700;margin-bottom:2px;">' + escapeHtml(p.nickname || p.username) + '</h1>' +
          '<div style="font-size:13px;color:var(--text-secondary);margin-bottom:8px;">' +
          (p.nickname ? '<span style="font-size:12px;color:var(--text-light);">@' + escapeHtml(p.username) + '</span> · ' : '') +
          (p.role === 'admin' ? '管理员' : '用户') + ' · ' + self._renderLevelBadge((p.level || 1)) +
          ' · ' + (p.xp || 0) + 'XP · ' + (p.points || 0) + '分 · 加入于 ' + formatDate(p.created_at) +
          '</div>' +
          '<div class="about-bio">' + escapeHtml(p.bio || '暂无简介') + '</div>' +
          (skills.length > 0 ? '<div class="about-skills" style="margin-top:8px;">' + skills.map(function(s) { return '<span class="about-skill-tag">' + escapeHtml(s) + '</span>'; }).join('') + '</div>' : '') +
          '</div></div>' +
          // Stats row
          statsHtml +
          // Action buttons
          '<div style="text-align:center;margin-top:20px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">' +
          '<button class="btn btn-outline btn-sm" id="toggle-edit-profile">✏ 编辑个人信息</button>' +
          '<button class="btn btn-outline btn-sm" id="preview-other-view">👁 他人视角</button>' +
          '</div>' +
          '</div>' +
          // Dashboard content: recent posts + recent notifications
          '<div class="dashboard-content-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:20px;">' +
          '<div class="about-card" style="padding:20px;">' + postsHtml + '</div>' +
          '<div class="about-card" style="padding:20px;">' + notifHtml + '</div>' +
          '</div></div></div>';

        // Bind events
        document.getElementById('toggle-edit-profile').addEventListener('click', function() { playClickSound(); renderEdit(); });
        document.getElementById('preview-other-view')?.addEventListener('click', function() { playClickSound(); Router.navigate('#/users/' + App.user.id); });
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

      var statsHtml = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:10px;margin-top:20px;padding-top:20px;border-top:1px solid var(--border);">' +
        '<div style="text-align:center;"><div style="font-size:20px;font-weight:700;color:var(--primary);">' + (stats.postCount || 0) + '</div><div style="font-size:11px;color:var(--text-secondary);">作品</div></div>' +
        '<div style="text-align:center;"><div style="font-size:20px;font-weight:700;color:var(--success);">' + (stats.commentReceived || 0) + '</div><div style="font-size:11px;color:var(--text-secondary);">评论</div></div>' +
        '<div style="text-align:center;"><div style="font-size:20px;font-weight:700;color:var(--warning);">' + (stats.totalLikes || 0) + '</div><div style="font-size:11px;color:var(--text-secondary);">获赞</div></div>' +
        '<div style="text-align:center;"><div style="font-size:20px;font-weight:700;">' + (stats.memberDays || 1) + '</div><div style="font-size:11px;color:var(--text-secondary);">天数</div></div></div>';

      document.getElementById('app').innerHTML = '<div class="page-fade-in"><div class="about-page"><div class="about-card"><div class="about-avatar">' + (p.avatar_url ? '<img src="' + escapeHtml(p.avatar_url) + '" alt="头像">' : '👤') + '</div><h1 style="text-align:center;font-size:24px;font-weight:700;margin-bottom:4px;">' + escapeHtml(p.nickname || p.username) + '</h1><div style="text-align:center;font-size:13px;color:var(--text-secondary);margin-bottom:16px;">' + (p.nickname ? '<span style="font-size:12px;color:var(--text-light);">@' + escapeHtml(p.username) + '</span> · ' : '') + (p.role === 'admin' ? '管理员' : '用户') + ' · ' + this._renderLevelBadge(p.level || 1) + ' · ' + (p.xp || 0) + 'XP · ' + (p.points || 0) + '分 · 加入于 ' + formatDate(p.created_at) + (p.is_banned ? '<span style="margin-left:8px;color:var(--error);font-weight:600;">🚫 已禁言</span>' : '') + '</div><div class="about-bio">' + escapeHtml(p.bio || '暂无简介') + '</div>' + (p.skills && p.skills.length > 0 ? '<h3 style="margin-top:24px;font-size:16px;font-weight:600;">🛠 技能</h3><div class="about-skills">' + p.skills.map(function(s) { return '<span class="about-skill-tag">' + escapeHtml(s) + '</span>'; }).join('') + '</div>' : '') + (p.social && (p.social.github || p.social.weibo || p.social.email) ? '<h3 style="margin-top:24px;font-size:16px;font-weight:600;">🔗 社交</h3><div class="about-social">' + (p.social.github ? '<a href="' + escapeHtml(p.social.github) + '" target="_blank" rel="noopener">🐙 GitHub</a>' : '') + (p.social.weibo ? '<a href="' + escapeHtml(p.social.weibo) + '" target="_blank" rel="noopener">📢 微博</a>' : '') + (p.social.email ? '<a href="mailto:' + escapeHtml(p.social.email) + '">✉️ ' + escapeHtml(p.social.email) + '</a>' : '') + '</div>' : '') +
        statsHtml +
        '<div style="text-align:center;margin-top:20px;display:flex;gap:8px;justify-content:center;" id="friend-action-area"><div class="spinner" style="width:20px;height:20px;border-width:2px;"></div></div>' + (isOwn ? '' : '<div style="text-align:center;margin-top:8px;"><button class="btn btn-sm btn-outline" id="report-user-btn" style="color:var(--text-light);">🚩 举报用户</button></div>') +
        '<h3 style="margin-top:32px;font-size:16px;font-weight:600;">📂 作品</h3>' + (posts.length === 0 ? '<div class="empty-state"><p>暂无作品</p></div>' : '<div class="post-grid" id="user-post-grid">' + posts.map(function(pt) { return '<div class="post-card" data-post-id="' + pt.id + '"><div class="post-card-img" style="' + (pt.cover_url ? "background-image:url('" + pt.cover_url + "');background-size:cover;background-position:center;" : '') + '">' + (pt.cover_url ? '' : '📄') + '</div><div class="post-card-body"><div class="post-card-title">' + escapeHtml(pt.title) + '</div><div class="post-card-desc">' + escapeHtml(pt.description || '暂无简介') + '</div><div class="post-card-footer"><div class="post-card-views">👁 ' + (pt.views || 0) + '</div></div></div></div>'; }).join('') + '</div>') + '<div id="public-playlists-area"></div></div></div></div>';
      document.querySelectorAll('#user-post-grid .post-card')?.forEach(function(c) { c.addEventListener('click', function() { playClickSound(); Router.navigate('#/posts/' + c.dataset.postId); }); });
      if (currentUser) {
        API.getUserPublicPlaylists(userId).then(function(pd) { var pls = pd.playlists || []; var area = document.getElementById('public-playlists-area'); if (!area) return; if (pls.length === 0) { area.style.display = 'none'; return; } area.innerHTML = '<h3 style="margin-top:32px;font-size:16px;font-weight:600;">🎵 公开歌单</h3><div class="music-playlist-grid">' + pls.map(function(pl) { var pc = pl.cover_url ? '<img src="' + escapeHtml(pl.cover_url) + '" style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0;">' : '<span class="music-playlist-card-cover-icon">📋</span>'; return '<div class="music-playlist-card" data-pid="' + pl.id + '" style="cursor:pointer;"><div class="music-playlist-card-cover" style="position:relative;height:100px;">' + pc + '</div><div class="music-playlist-card-body"><div class="music-playlist-name">' + escapeHtml(pl.name) + '</div><div class="music-playlist-count"><span class="music-playlist-count-badge">' + (pl.song_count || 0) + ' 首</span></div></div></div>'; }).join('') + '</div>'; area.querySelectorAll('.music-playlist-card').forEach(function(card) { card.addEventListener('click', function() { Router.navigate('#/music/playlist/' + this.dataset.pid); }); }); }).catch(function() {});
        if (isOwn) { var fa = document.getElementById('friend-action-area'); if (fa) fa.innerHTML = '<span style="font-size:13px;color:var(--text-light);">这是你的个人主页（他人视角）</span><button class="btn btn-sm btn-outline" id="back-to-my-profile-btn" style="margin-left:8px;">← 返回我的主页</button>'; if (fa) fa.addEventListener('click', function(e) { if (e.target.id === 'back-to-my-profile-btn') { playClickSound(); Router.navigate('#/profile'); } }); } else { this._checkAndRenderFriendButton(userId); }
      }
      document.getElementById('report-user-btn')?.addEventListener('click', async function() { var r = await showPrompt('举报原因：', '', '违规内容'); if (!r || !r.trim()) return; try { await API.createReport('user', userId, r.trim()); showToast('已提交', 'success'); } catch(err) { showToast(err.message, 'error'); } });
    } catch (err) { showToast(err.message, 'error'); this.renderPostList(); }
  },

  _checkAndRenderFriendButton: async function(userId) {
    try { var d = await API.getFriendshipStatus(userId), area = document.getElementById('friend-action-area'); if (!area) return; var labels = { friends: '<span style="font-size:13px;color:var(--success);font-weight:600;">✅ 已是好友</span>', request_sent: '<span style="font-size:13px;color:var(--text-light);">⏳ 好友申请已发送</span>', request_received: '<button class="btn btn-sm btn-primary" id="accept-friend-btn">✅ 接受好友申请</button>', none: '<button class="btn btn-sm btn-outline" id="add-friend-btn">➕ 添加好友</button>' }; area.innerHTML = labels[d.status] || ''; document.getElementById('add-friend-btn')?.addEventListener('click', async function() { try { await API.sendFriendRequest(userId); showToast('已发送', 'success'); Components._checkAndRenderFriendButton(userId); } catch (err) { showToast(err.message, 'error'); } }); var ab = document.getElementById('accept-friend-btn'); if (ab) { try { var rd = await API.getFriendRequests(); var r = (rd.requests || []).find(function(x) { return x.from_user_id === userId; }); if (r) ab.addEventListener('click', async function() { try { await API.approveFriendRequest(r.id); showToast('已添加', 'success'); Components._checkAndRenderFriendButton(userId); } catch (err) { showToast(err.message, 'error'); } }); } catch(e) {} } } catch (e) {}
  }
};
