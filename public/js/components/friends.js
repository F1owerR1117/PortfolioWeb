// Friends component
var ComponentsFriends = {
  _friendsTab: 'all',

  renderFriends: async function() {
    this.renderLoading();
    try {
      var friends = (await API.getFriends()).friends || [];
      var requests = (await API.getFriendRequests()).requests || [];
      var app = document.getElementById('app');
      var tab = this._friendsTab;

      app.innerHTML = '<div class="page-fade-in"><div class="friends-page">' +
        '<div class="fr-header"><h1>👥 好友 <span class="fr-count">共 ' + friends.length + ' 人</span></h1>' +
        '</div>' +
        '<div class="fr-search search-bar"><input class="search-input" id="friend-search" type="text" placeholder="搜索好友或用户..."></div>' +
        '<div class="fr-tabs"><button class="fr-tab' + (tab === 'all' ? ' active' : '') + '" data-fr-tab="all">👥 全部好友</button><button class="fr-tab' + (tab === 'requests' ? ' active' : '') + '" data-fr-tab="requests">📨 好友请求' + (requests.length > 0 ? ' <span class="fr-tab-badge">' + requests.length + '</span>' : '') + '</button></div>' +
        '<div id="fr-content">' + this._renderTabContent(tab, friends, requests) + '</div>' +
        '</div></div>';

      var self = this;
      document.querySelectorAll('[data-fr-tab]').forEach(function(btn) {
        btn.addEventListener('click', function() {
          Components._friendsTab = this.dataset.frTab;
          Components.renderFriends();
        });
      });

      // Search
      var searchTimer;
      document.getElementById('friend-search').addEventListener('input', function() {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(function() {
          var q = this.value.trim().toLowerCase();
          if (!q) {
            Components._friendsTab = 'all';
            Components.renderFriends();
            return;
          }
          API.searchUsers(q).then(function(d) {
            var results = d.users || [];
            var friendIds = {};
            friends.forEach(function(f) { friendIds[f.friend_id] = true; });
            var content = document.getElementById('fr-content');
            if (!content) return;
            if (results.length === 0) {
              content.innerHTML = '<div class="fr-empty">未找到用户</div>';
              return;
            }
            content.innerHTML = results.map(function(u) {
              var initial = escapeHtml((u.nickname || u.username).charAt(0).toUpperCase());
              var avatar = u.avatar_url ? '<img src="' + escapeHtml(u.avatar_url) + '" alt="">' : initial;
              var isFriend = friendIds[u.id];
              var btnHtml = isFriend
                ? '<button class="btn btn-sm btn-success" disabled style="opacity:0.6;">✓ 已是好友</button>'
                : '<button class="btn btn-sm btn-outline add-friend-btn" data-uid="' + u.id + '">➕ 添加好友</button>';
              return '<div class="request-card" style="cursor:pointer;"><div class="req-avatar" data-uid="' + u.id + '">' + avatar + '</div><div class="req-info" data-uid="' + u.id + '"><div class="req-name" data-uid="' + u.id + '">' + escapeHtml(u.nickname || u.username) + '</div><div class="req-time">@' + escapeHtml(u.username) + '</div></div>' + btnHtml + '</div>';
            }).join('');
            content.querySelectorAll('[data-uid]').forEach(function(el) {
              el.addEventListener('click', function() { Router.navigate('#/users/' + this.dataset.uid); });
            });
            content.querySelectorAll('.add-friend-btn').forEach(function(btn) {
              btn.addEventListener('click', async function(e) {
                e.stopPropagation();
                try {
                  await API.sendFriendRequest(parseInt(this.dataset.uid));
                  showToast('好友请求已发送', 'success');
                  this.textContent = '✅ 已发送';
                  this.disabled = true;
                } catch(err) { showToast(err.message, 'error'); }
              });
            });
          }).catch(function() {});
        }.bind(this), 300);
      });

      // Bind friend card clicks
      document.querySelectorAll('.friend-card .fn, .friend-card .fa').forEach(function(el) {
        el.addEventListener('click', function() { Router.navigate('#/users/' + this.dataset.uid); });
      });
      document.querySelectorAll('.friend-card .chat-btn').forEach(function(btn) {
        btn.addEventListener('click', function() { Router.navigate('#/chat/' + this.dataset.id); });
      });
      document.querySelectorAll('.request-card .accept-btn').forEach(function(btn) {
        btn.addEventListener('click', async function() {
          try { await API.approveFriendRequest(parseInt(this.dataset.id)); showToast('已添加', 'success'); Components.renderFriends(); }
          catch(err) { showToast(err.message, 'error'); }
        });
      });
      document.querySelectorAll('.request-card .reject-btn').forEach(function(btn) {
        btn.addEventListener('click', async function() {
          try { await API.rejectFriendRequest(parseInt(this.dataset.id)); showToast('已拒绝', 'success'); Components.renderFriends(); }
          catch(err) { showToast(err.message, 'error'); }
        });
      });

      // Online polling
      var updateOnlineDots = async function() {
        try {
          var od = await API.getFriendOnlineStatus();
          document.querySelectorAll('.friend-card .online-dot').forEach(function(dot) {
            var uid = parseInt(dot.dataset.uid);
            if (od && od.online && od.online[uid]) {
              dot.classList.remove('offline');
            } else {
              dot.classList.add('offline');
            }
          });
        } catch(e) {}
      };
      if (friends.length > 0) {
        if (Components._onlinePollTimer) clearInterval(Components._onlinePollTimer);
        Components._onlinePollTimer = setInterval(updateOnlineDots, 30000);
      }
    } catch (err) { showToast(err.message, 'error'); Router.navigate('#/works'); }
  },

  _renderTabContent: function(tab, friends, requests) {
    if (tab === 'all') {
      if (friends.length === 0) {
        return '<div class="fr-empty">暂无好友，搜索用户添加吧</div>';
      }
      var self = this;
      return friends.map(function(f) {
        var initial = escapeHtml((f.nickname || f.username).charAt(0).toUpperCase());
        var avatarHtml = f.avatar_url ? '<img src="' + escapeHtml(f.avatar_url) + '" alt="">' : initial;
        var online = f.is_online ? true : false;
        return '<div class="friend-card">' +
          '<div class="fa" data-uid="' + f.friend_id + '">' + avatarHtml +
          '<span class="online-dot' + (online ? '' : ' offline') + '" data-uid="' + f.friend_id + '"></span></div>' +
          '<div class="fi"><div class="fn" data-uid="' + f.friend_id + '">' + escapeHtml(f.nickname || f.username) + '</div>' +
          '<div class="fb">@' + escapeHtml(f.username) + '</div></div>' +
          '<div class="fm">' +
          '<span class="friend-status' + (online ? ' online' : '') + '">' + (online ? '🟢' : '⚪') + ' ' + (online ? '在线' : '离线') + '</span>' +
          '<button class="btn btn-sm btn-outline chat-btn" data-id="' + f.friend_id + '">💬 私信</button>' +
          '</div></div>';
      }).join('');
    } else if (tab === 'requests') {
      if (requests.length === 0) {
        return '<div class="fr-empty">暂无好友请求</div>';
      }
      return requests.map(function(r) {
        var initial = escapeHtml((r.nickname || r.username).charAt(0).toUpperCase());
        var avatarHtml = r.avatar_url ? '<img src="' + escapeHtml(r.avatar_url) + '" alt="">' : initial;
        return '<div class="request-card">' +
          '<div class="req-avatar" data-uid="' + r.from_user_id + '">' + avatarHtml + '</div>' +
          '<div class="req-info"><div class="req-name" data-uid="' + r.from_user_id + '">' + escapeHtml(r.nickname || r.username) + '</div>' +
          '<div class="req-time">请求加为好友</div></div>' +
          '<div style="display:flex;gap:6px;"><button class="btn btn-sm btn-primary accept-btn" data-id="' + r.id + '">✓ 接受</button>' +
          '<button class="btn btn-sm btn-outline reject-btn" data-id="' + r.id + '">✕ 拒绝</button></div></div>';
      }).join('');
    }
    return '';
  }
};
