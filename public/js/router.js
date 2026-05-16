// ===== Router Module =====
const Router = {
  currentRoute: null,
  _routes: {},

  init() {
    window.addEventListener('hashchange', () => this.handleRoute());
    this.handleRoute();
  },

  register(pattern, handler) {
    this._routes[pattern] = handler;
  },

  navigate(hash) {
    window.location.hash = hash;
    // handleRoute will be called by hashchange event
  },

  handleRoute() {
    const hash = window.location.hash || '#/works';
    const path = hash.split('#')[1] || '/posts';

    // Check authentication
    if (!App.user) {
      // Only allow auth page
      if (path !== '/login') {
        // Wait for App to check auth
        App.checkAuth().then(() => {
          if (!App.user) {
            Components.renderAuth();
          } else {
            this._handlePath(path);
          }
        });
        return;
      }
    }

    this._handlePath(path);
  },

  _handlePath(path) {
    playClickSound();
    // Clean up polling timers when navigating away from friends/chat pages
    if (Components._onlinePollTimer) { clearInterval(Components._onlinePollTimer); Components._onlinePollTimer = null; }
    if (Components._chatOnlineTimer) { clearInterval(Components._chatOnlineTimer); Components._chatOnlineTimer = null; }
    if (Components._chatPollTimer) { clearInterval(Components._chatPollTimer); Components._chatPollTimer = null; }

    // Admin-only routes (standard create/edit)
    // /create/chat bypasses admin check
    const isCreateChat = path === '/create/chat';
    const adminRoutes = ['/create', '/edit'];
    const isAdminRoute = adminRoutes.some(r => path.startsWith(r)) && !isCreateChat;
    if (isAdminRoute && (!App.user || App.user.role !== 'admin')) {
      showToast('权限不足', 'error');
      this.navigate('#/works');
      return;
    }

    // Match routes
    if (path === '/my-posts') {
      if (!App.user) { showToast('请先登录', 'error'); this.navigate('#/login'); return; }
      Components.renderMyPosts();
    } else if (path === '/works') {
      Components.renderPostList('work');
    } else if (path === '/chats') {
      Components.renderPostList('chat');
    } else if (path === '/tags') {
      if (!App.user || App.user.role !== 'admin') { showToast('权限不足', 'error'); this.navigate('#/works'); return; }
      Components.renderTagManager();
    } else if (path === '/music') {
      Components.renderMusicLibrary();
    } else if (path.startsWith('/music/playlist/')) {
      const playlistId = parseInt(path.split('/')[3]);
      if (isNaN(playlistId)) {
        showToast('无效的歌单ID', 'error');
        this.navigate('#/music');
        return;
      }
      Components.renderPlaylistDetail(playlistId);
    } else if (path === '/friends') {
      Components.renderFriends();
    } else if (path.startsWith('/chat/')) {
      const friendId = parseInt(path.split('/')[2]);
      if (isNaN(friendId)) {
        showToast('无效的好友ID', 'error');
        this.navigate('#/friends');
        return;
      }
      Components.renderChat(friendId);
    } else if (path === '/notifications') {
      Components.renderNotifications();
    } else if (path === '/about') {
      this.navigate('#/profile');
    } else if (path === '/profile') {
      Components.renderMyProfile();
    } else if (path.startsWith('/users/')) {
      const userId = parseInt(path.split('/')[2]);
      if (isNaN(userId)) {
        showToast('无效的用户ID', 'error');
        this.navigate('#/works');
        return;
      }
      Components.renderUserProfile(userId);
    } else if (path === '/login' || path === '/register') {
      if (App.user) {
        this.navigate('#/works');
        return;
      }
      Components.renderAuth();
    } else if (path === '/posts') {
      Components.renderPostList();
    } else if (path.startsWith('/posts/')) {
      const id = parseInt(path.split('/')[2]);
      if (isNaN(id)) {
        showToast('无效的作品ID', 'error');
        this.navigate('#/works');
        return;
      }
      Components._highlightCommentId = Components._extractCommentParam(path);
      Components.renderPostDetail(id);
    } else if (path === '/create/chat') {
      Components.renderCreatePost('chat');
    } else if (path === '/create') {
      Components.renderCreatePost();
    } else if (path.startsWith('/edit/')) {
      const id = parseInt(path.split('/')[2]);
      if (isNaN(id)) {
        showToast('无效的作品ID', 'error');
        this.navigate('#/works');
        return;
      }
      Components.renderEditPost(id);
    } else if (path === '/settings') {
      this.navigate('#/profile');
    } else if (path === '/bookmarks') {
      Components.renderBookmarks();
    } else if (path === '/admin/stats') {
      Components.renderAdminStats();
    } else if (path === '/admin/reports') {
      Components.renderAdminReports();
    } else if (path === '/admin/users') {
      if (!App.user || App.user.role !== 'admin') {
        showToast('权限不足', 'error');
        this.navigate('#/works');
        return;
      }
      Components.renderAdminUsers();
    } else if (path === '/admin/levels') {
      if (!App.user || App.user.role !== 'admin') {
        showToast('权限不足', 'error');
        this.navigate('#/works');
        return;
      }
      Components.renderAdminLevels();
    } else if (path === '/admin/login-notices') {
      if (!App.user || App.user.role !== 'admin') {
        showToast('权限不足', 'error');
        this.navigate('#/works');
        return;
      }
      Components.renderLoginNotices();
    } else if (path === '/admin/ads') {
      if (!App.user || App.user.role !== 'admin') {
        showToast('权限不足', 'error');
        this.navigate('#/works');
        return;
      }
      Components.renderAdminAds();
    } else {
      this.navigate('#/works');
    }

    // Update nav
    App.updateNav();
    // Always refresh level display (fetch fresh XP/progress/level name from server)
    App.refreshLevel();
    // Ad bar: show/hide based on route
    ComponentsAds.onRouteChange(path);
  }
};
