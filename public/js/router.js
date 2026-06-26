// ===== Router Module — config-driven route table =====
var Router = {
  currentRoute: null,

  // ---- Route table: add new pages by appending one line ----
  _table: {
    // Exact-match routes
    '/my-posts':       { render: function() { Components.renderMyPosts(); },                     auth: true },
    '/works':          { render: function() { Components.renderPostList('work'); } },
    '/chats':          { render: function() { Components.renderPostList('chat'); } },
    '/tags':           { render: function() { Components.renderTagManager(); },                   auth: true, admin: true },
    '/music':          { render: function() { Components.renderMusicLibrary(); } },
    '/friends':        { render: function() { Components.renderFriends(); } },
    '/notifications':  { render: function() { Components.renderNotifications(); } },
    '/profile':        { render: function() { Components.renderMyProfile(); } },
    '/login':          { render: function() { Components.renderAuth(); },                         guest: true },
    '/register':       { render: function() { Components.renderAuth(); },                         guest: true },
    '/posts':          { render: function() { Components.renderPostList(); } },
    '/bookmarks':      { render: function() { Components.renderBookmarks(); } },
    '/about':          { redirect: '/profile' },
    '/settings':       { redirect: '/profile' },
    '/create':         { render: function() { Components.renderCreatePost(); },                   admin: true },
    '/create/chat':    { render: function() { Components.renderCreatePost('chat'); } },
    '/create/job':     { render: function() { Components.renderCreatePost('job'); } },
    '/admin/stats':    { render: function() { Components.renderAdminStats(); } },
    '/admin/reports':  { render: function() { Components.renderAdminReports(); } },
    '/admin/users':    { render: function() { Components.renderAdminUsers(); },                   admin: true },
    '/admin/levels':   { render: function() { Components.renderAdminLevels(); },                  admin: true },
    '/admin/login-notices': { render: function() { Components.renderLoginNotices(); },            admin: true },
    '/admin/applications':  { render: function() { Components.renderAdminApplications(); },       admin: true },
    '/admin/ads':      { render: function() { Components.renderAdminAds(); },                     admin: true },

    // Parameterized routes — checked after exact matches
    '/posts/:id':      { render: function(id) {
                          Components._highlightCommentId = Components._extractCommentParam(window.location.hash);
                          Components.renderPostDetail(parseInt(id));
                        }},
    '/edit/:id':       { render: function(id) { Components.renderEditPost(parseInt(id)); }},
    '/users/:id':      { render: function(id) { Components.renderUserProfile(parseInt(id)); }},
    '/chat/:id':       { render: function(id) { Components.renderChat(parseInt(id)); }},
    '/music/playlist/:id': { render: function(id) { Components.renderPlaylistDetail(parseInt(id)); }},
  },

  // ---- Special handlers (require async logic) ----
  _specials: {
    '/jobs': function() {
      var self = this;
      API.checkZoneAccess('job').then(function(d) {
        if (d.accessible) { Components.renderPostList('job'); }
        else if (d.reason === '身份未审核') { Components.renderPostList('job'); }
        else { showToast('等级不足，无法访问该分区', 'error'); self.navigate('#/profile'); }
      }).catch(function() { Components.renderPostList('job'); });
    }
  },

  // ---- Lifecycle ----
  init: function() {
    var self = this;
    window.addEventListener('hashchange', function() { self.handleRoute(); });
    this.handleRoute();
  },

  navigate: function(hash) {
    window.location.hash = hash;
  },

  handleRoute: function() {
    var hash = window.location.hash || '#/works';
    var path = hash.split('#')[1] || '/works';

    // Auth gate: redirect unauthenticated users
    if (!App.user && path !== '/login' && path !== '/register') {
      var self = this;
      App.checkAuth().then(function() {
        if (!App.user) { Components.renderAuth(); }
        else { self._dispatch(path); }
      });
      return;
    }

    // Guest routes: redirect logged-in users
    if (App.user && (path === '/login' || path === '/register')) {
      this.navigate('#/works');
      return;
    }

    this._dispatch(path);
  },

  // ---- Core dispatch ----
  _dispatch: function(path) {
    playClickSound();
    this._cleanupTimers();
    // Strip query parameters (e.g. ?comment=123) for route matching
    var qIdx = path.indexOf('?');
    if (qIdx > -1) path = path.substring(0, qIdx);

    // 1. Exact match in route table
    var entry = this._table[path];
    if (entry) {
      return this._execute(entry, path);
    }

    // 2. Special async handlers
    if (this._specials[path]) {
      this._specials[path].call(this);
      this._afterRender(path);
      return;
    }

    // 3. Parameterized routes — match '/prefix/:id' and '/prefix/:id/*'
    for (var routePath in this._table) {
      if (routePath.indexOf('/:id') === -1) continue;
      var base = routePath.replace('/:id', '/');
      if (path.indexOf(base) === 0) {
        var remainder = path.substring(base.length);
        // Extract the first segment as id (must be numeric)
        var slashIdx = remainder.indexOf('/');
        var id = slashIdx > -1 ? remainder.substring(0, slashIdx) : remainder;
        if (id && /^\d+$/.test(id)) {
          var pEntry = this._table[routePath];
          return this._execute(pEntry, path, [id]);
        }
      }
    }

    // 4. Fallback
    this.navigate('#/works');
  },

  // ---- Execute a route entry with guards ----
  _execute: function(entry, path, args) {
    // Redirect
    if (entry.redirect) {
      this.navigate('#' + entry.redirect);
      return;
    }

    // Admin guard
    if (entry.admin && (!App.user || App.user.role !== 'admin')) {
      showToast('权限不足', 'error');
      this.navigate('#/works');
      return;
    }

    // Auth guard
    if (entry.auth && !App.user) {
      showToast('请先登录', 'error');
      this.navigate('#/login');
      return;
    }

    // Call handler
    if (args && args.length) {
      entry.render.apply(null, args);
    } else {
      entry.render();
    }

    this._afterRender(path);
  },

  // ---- Post-render hooks (always run after any route) ----
  _afterRender: function(path) {
    App.updateNav();
    App.refreshLevel();
    if (typeof ComponentsAds !== 'undefined') ComponentsAds.onRouteChange(path);
  },

  // ---- Timer cleanup (prevent polling leaks) ----
  _cleanupTimers: function() {
    if (Components._onlinePollTimer)  { clearInterval(Components._onlinePollTimer);  Components._onlinePollTimer = null; }
    if (Components._chatOnlineTimer)  { clearInterval(Components._chatOnlineTimer);  Components._chatOnlineTimer = null; }
    if (Components._chatPollTimer)    { clearInterval(Components._chatPollTimer);    Components._chatPollTimer = null; }
  }
};
