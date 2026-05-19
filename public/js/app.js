// ===== Main App Module =====
const App = {
  user: null,
  _theme: 'light',

  async init() {
    // UI ready
    document.getElementById('loading-screen').style.display = 'none';

    // Initialize audio on first user interaction
    document.addEventListener('click', unlockAudio, { once: true });

    // Initialize music player
    MusicPlayer.init();

    // Load sound settings
    await loadSoundSettings();

    // Initialize dark mode
    this._initTheme();

    // Check authentication
    await this.checkAuth();


    // Update navigation
    this.updateNav();

    // Initialize router
    Router.init();

    // Prepare ad containers (ads loaded on route change)
    ComponentsAds._ensureContainers();

    // Mute checkbox from localStorage
    const muteCheckbox = document.getElementById('mute-checkbox');
    const savedMute = localStorage.getItem('portfolio_mute');
    if (savedMute === 'true') muteCheckbox.checked = true;
    muteCheckbox.addEventListener('change', () => {
      localStorage.setItem('portfolio_mute', muteCheckbox.checked);
    });
  },

  _initTheme() {
  },

  async checkAuth() {
    try {
      const data = await API.getMe();
      if (data.user) {
        this.user = data.user;
      } else {
        this.user = null;
      }
    } catch (err) {
      this.user = null;
    }
    this.updateNav();
  },

  setUser(user) {
    this.user = user;
    this.updateNav();
    // Show login notice popup after a short delay
    if (user) {
      setTimeout(() => this._showLoginNotices(), 1000);
    }
  },

  _noticeList: [],
  _noticeIndex: 0,
  _noticeOverlay: null,

  async _showLoginNotices() {
    try {
      const data = await API.getLoginNotices();
      const notices = data.notices || [];
      if (notices.length === 0) return;
      this._noticeList = notices;
      this._noticeIndex = 0;
      this._showNoticePopup();
    } catch (e) { /* non-critical */ }
  },

  _showNoticePopup() {
    var self = this;
    var notices = this._noticeList;
    var idx = this._noticeIndex;
    var notice = notices[idx];
    var total = notices.length;
    var isSingle = total === 1;

    // Create or reuse overlay
    if (!this._noticeOverlay) {
      this._noticeOverlay = document.createElement('div');
      this._noticeOverlay.className = 'custom-modal-overlay';
      this._noticeOverlay.style.zIndex = '10000';
      this._noticeOverlay.addEventListener('click', function(e) { if (e.target === self._noticeOverlay) self._closeNoticePopup(); });
      document.body.appendChild(this._noticeOverlay);
      requestAnimationFrame(function() { self._noticeOverlay.classList.add('visible'); });
    }

    var imgHtml = notice.image_url ? '<img src="' + escapeHtml(notice.image_url) + '" style="width:100%;max-height:300px;object-fit:cover;border-radius:8px;margin-bottom:16px;">' : '';
    var counterHtml = isSingle ? '' : '<span style="font-size:13px;color:var(--text-secondary);margin-left:8px;">[' + (idx + 1) + '/' + total + ']</span>';
    var navHtml = isSingle ? '' :
      '<div style="display:flex;gap:8px;justify-content:space-between;align-items:center;">' +
      '<button class="btn btn-sm btn-outline notice-prev-btn"' + (idx === 0 ? ' disabled' : '') + '>◀ 上一个</button>' +
      '<span style="font-size:13px;color:var(--text-secondary);">' + (idx + 1) + ' / ' + total + '</span>' +
      '<button class="btn btn-sm btn-outline notice-next-btn"' + (idx === total - 1 ? ' disabled' : '') + '>下一个 ▶</button>' +
      '</div>';

    this._noticeOverlay.innerHTML = '<div class="custom-modal-dialog" style="max-width:480px;padding:0;overflow:hidden;">' +
      '<div style="padding:20px 24px;">' +
      '<div style="font-size:18px;font-weight:700;margin-bottom:8px;">📢 ' + escapeHtml(notice.title) + counterHtml + '</div>' +
      imgHtml +
      '<div style="color:var(--text-secondary);margin-bottom:16px;line-height:1.6;">' + escapeHtml(notice.content) + '</div>' +
      navHtml +
      '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px;">' +
      '<button class="btn btn-outline notice-close-btn">我知道了</button>' +
      (notice.link_url ? '<button class="btn btn-primary notice-link-btn">查看详情 →</button>' : '') +
      '</div></div></div>';

    // Bind buttons
    var closeBtn = this._noticeOverlay.querySelector('.notice-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', function() { self._closeNoticePopup(); });

    if (notice.link_url) {
      var linkBtn = this._noticeOverlay.querySelector('.notice-link-btn');
      if (linkBtn) linkBtn.addEventListener('click', function() {
        self._closeNoticePopup();
        if (notice.link_url.startsWith('#')) {
          Router.navigate(notice.link_url);
        } else {
          window.open(notice.link_url, '_blank');
        }
      });
    }

    if (!isSingle) {
      var prevBtn = this._noticeOverlay.querySelector('.notice-prev-btn');
      var nextBtn = this._noticeOverlay.querySelector('.notice-next-btn');
      if (prevBtn) prevBtn.addEventListener('click', function() {
        if (self._noticeIndex > 0) { self._noticeIndex--; self._showNoticePopup(); }
      });
      if (nextBtn) nextBtn.addEventListener('click', function() {
        if (self._noticeIndex < notices.length - 1) { self._noticeIndex++; self._showNoticePopup(); }
      });
    }
  },

  _closeNoticePopup() {
    var self = this;
    if (this._noticeOverlay) {
      this._noticeOverlay.classList.remove('visible');
      this._noticeOverlay.classList.add('closing');
      setTimeout(function() { if (self._noticeOverlay && self._noticeOverlay.parentNode) self._noticeOverlay.parentNode.removeChild(self._noticeOverlay); self._noticeOverlay = null; }, 200);
    }
    // Mark all notices as viewed
    if (this._noticeList.length > 0) {
      this._noticeList.forEach(function(n) { API.markLoginNoticeViewed(n.id).catch(function() {}); });
      this._noticeList = [];
      this._noticeIndex = 0;
    }
  },

  async refreshLevel() {
    try {
      const data = await API.getMyLevel();
      if (this.user) {
        this.user.level = data.level;
        this.user.xp = data.xp;
        this.user.points = data.points;
      }
      const ld = document.getElementById('nav-level');
      if (ld) {
        var lvl = data.level || 1;
        var lvlName = data.level_name || ('Lv.' + lvl);
        var badgeContent = data.title_icon
          ? '<img class="lvl-badge-img" src="' + data.title_icon + '" alt="">'
          : lvl;
        var bgStyle = data.bg_image ? ' style="background-image:url(\'' + data.bg_image + '\')"' : '';
        var nextXP = data.next_xp_required || 1;
        var progress = Math.min(100, Math.round(((data.xp || 0) / nextXP) * 100));
        var progressHtml = data.next_xp_required
          ? '<span class="lvl-progress-row">' +
              '<span class="lvl-progress"><span class="lvl-progress-fill" style="width:' + progress + '%"></span></span>' +
              '<span class="lvl-progress-label">' + (data.xp || 0) + '/' + data.next_xp_required + '</span>' +
            '</span>'
          : '<span class="lvl-progress-row"><span class="lvl-progress-label" style="color:var(--primary);font-size:10px;">MAX</span></span>';
        ld.innerHTML = '<span class="lvl-badge"' + bgStyle + '>' + badgeContent + '</span>' +
          '<span class="lvl-details">' +
            '<span class="lvl-name-row">Lv.' + lvl + ' ' + lvlName + '</span>' +
            progressHtml +
            '<span class="lvl-stats-row"><span class="lvl-points">⭐ ' + (data.points || 0) + ' 分</span></span>' +
          '</span>';
      }
    } catch (e) {}
  },

  updateNav() {
    const navLinks = document.getElementById('nav-links');
    const navBrand = document.querySelector('.nav-brand');
    if (!navLinks) return;

    if (this.user) {
      const isAdmin = this.user.role === 'admin';
      navLinks.innerHTML = `
        <span class="level-display" id="nav-level">
          <span class="lvl-badge">${this.user.level || 1}</span>
          <span class="lvl-details">
            <span class="lvl-name-row">Lv.${this.user.level || 1}</span>
            <span class="lvl-stats-row"><span class="lvl-points">⭐ ${this.user.points || 0} 分</span></span>
          </span>
        </span>
        <button class="nav-btn" id="nav-friends" style="position:relative;">
          👥 好友
          <span class="unread-badge" id="friend-request-badge" style="display:none;">0</span>
        </button>
        <button class="nav-btn" id="nav-jobs">💼 求职招聘</button>
        <span class="nav-user" id="nav-user-profile" style="cursor:pointer;">
          👤 ${escapeHtml(this.user.username)}
          <span class="role-badge ${isAdmin ? 'admin' : ''}">${isAdmin ? '管理员' : '用户'}</span>
        </span>
        <button class="nav-btn" id="nav-notifications" style="position:relative;">
          🔔 <span class="unread-badge" id="unread-badge" style="display:none;">0</span>
        </button>
        <button class="nav-btn primary" id="nav-logout">退出</button>`;

      // Add hamburger button
      if (!document.getElementById('hamburger-btn')) {
        const hamburger = document.createElement('button');
        hamburger.id = 'hamburger-btn';
        hamburger.className = 'hamburger-btn';
        hamburger.innerHTML = '☰';
        hamburger.setAttribute('aria-label', '菜单');
        const navbar = document.querySelector('.navbar');
        const navInner = document.querySelector('.nav-inner');
        navbar.insertBefore(hamburger, navInner);
      }


      // Create side menu and overlay if not exists
      if (!document.getElementById('side-menu')) {
        const overlay = document.createElement('div');
        overlay.className = 'menu-overlay';
        overlay.id = 'menu-overlay';
        document.body.appendChild(overlay);

        const menu = document.createElement('div');
        menu.className = 'side-menu';
        menu.id = 'side-menu';
        let menuHtml = `
          <div class="side-menu-item" data-route="/profile" data-label="profile">👤 我的主页</div>
          <div class="side-menu-item" data-route="/works" data-label="works" data-zone="work">📂 作品区</div>
          <div class="side-menu-item" data-route="/chats" data-label="chats" data-zone="chat">💬 聊天区</div>
          <div class="side-menu-item" data-route="/music" data-label="music" data-zone="music">🎵 我的音乐</div>
          <div class="side-menu-item" data-route="/jobs" data-label="jobs" data-zone="job">💼 求职招聘</div>
          <div class="side-menu-item" data-route="/bookmarks" data-label="bookmark">🔖 收藏夹</div>
          <div class="side-menu-item" data-action="show-notices">📢 系统公告</div>`;
        if (App.user && App.user.role === 'admin') {
          menuHtml += `
          <div class="side-menu-item" data-route="/admin/stats" data-label="admin">⚙️ 后台管理</div>`;
        }
        menu.innerHTML = menuHtml;
        document.body.appendChild(menu);

        this._checkZoneLocks();

        // Bind hamburger toggle
        document.getElementById('hamburger-btn').addEventListener('click', (e) => {
          e.stopPropagation();
          playClickSound();
          document.body.classList.toggle('side-menu-open');
        });

        // Bind overlay close
        overlay.addEventListener('click', () => {
          document.body.classList.remove('side-menu-open');
        });

        // Bind menu item clicks with lock check
        menu.addEventListener('click', (e) => {
          const item = e.target.closest('.side-menu-item');
          if (item) {
            playClickSound();
            // Handle action items (non-route)
            if (item.dataset.action === 'show-notices') {
              document.body.classList.remove('side-menu-open');
              App._showLoginNotices();
              return;
            }
            if (item.dataset.action === 'toggle-admin') {
              item.classList.toggle('open');
              var sub = document.getElementById('admin-submenu');
              if (sub) sub.classList.toggle('open');
              return;
            }
            if (item.dataset.locked === 'true') {
              var zone = item.dataset.zone;
              API.checkZoneAccess(zone).then(function(d) {
                if (d.accessible) {
                  document.body.classList.remove('side-menu-open');
                  Router.navigate(item.dataset.route);
                } else if (d.reason === '身份未审核') {
                  document.body.classList.remove('side-menu-open');
                  Router.navigate('#/jobs');
                } else {
                  showToast('等级不足，无法访问该分区', 'error');
                }
              }).catch(function() {
                showToast('等级不足，无法访问该分区', 'error');
              });
              return;
            }
            document.body.classList.remove('side-menu-open');
            Router.navigate(item.dataset.route);
          }
        });
      }

      // Highlight active menu item (runs every nav update, not just menu creation)
      this._highlightActiveMenuItem();

      document.getElementById('nav-friends').addEventListener('click', () => {
        playClickSound();
        Router.navigate('#/friends');
      });

      document.getElementById('nav-jobs').addEventListener('click', () => {
        playClickSound();
        API.checkZoneAccess('job').then(function(d) {
          if (d.accessible) { Router.navigate('#/jobs'); }
          else if (d.reason === '身份未审核') { Router.navigate('#/jobs'); }
          else { showToast('等级不足，无法访问该分区', 'error'); }
        }).catch(function() { Router.navigate('#/jobs'); });
      });

      document.getElementById('nav-user-profile').addEventListener('click', () => {
        playClickSound();
        Router.navigate('#/profile');
      });



      document.getElementById('nav-logout').addEventListener('click', async () => {
        playClickSound();
        try {
          await API.logout();
          this.user = null;
          showToast('已退出登录', 'info');
          this.updateNav();
          Router.navigate('#/login');
        } catch (err) {
          showToast(err.message, 'error');
        }
      });

      document.getElementById('nav-notifications').addEventListener('click', () => {
        playClickSound();
        Router.navigate('#/notifications');
      });


      // Poll for unread count
      this._startNotifPolling();

      // Show ban banner if user is banned
      this._updateBanBanner();

      // Show music player
      const playerContainer = document.getElementById('music-player-container');
      if (playerContainer) playerContainer.style.display = '';
      MusicPlayer._renderPlayer();
      // Check music zone access - hide player if locked
      API.checkZoneAccess('music').then(function(d) {
        var mc = document.getElementById('music-player-container');
        if (mc && !d.accessible) {
          mc.style.display = 'none';
          if (MusicPlayer.audio) { MusicPlayer.audio.pause(); MusicPlayer.audio.src = ''; }
          MusicPlayer.currentSong = null; MusicPlayer.queue = [];
        }
      }).catch(function() {});
    } else {
      navLinks.innerHTML = '';
      this._stopNotifPolling();

      // Remove ban banner on logout
      const banner = document.getElementById('ban-banner');
      if (banner) banner.remove();
      if (this._banBannerTimer) {
        clearInterval(this._banBannerTimer);
        this._banBannerTimer = null;
      }

      // Hide & reset music player
      const playerContainer = document.getElementById('music-player-container');
      if (playerContainer) {
        playerContainer.style.display = 'none';
        if (MusicPlayer.audio) {
          MusicPlayer.audio.pause();
          MusicPlayer.audio.src = '';
        }
        MusicPlayer.currentSong = null;
        MusicPlayer.queue = [];
        MusicPlayer.queueIndex = -1;
        MusicPlayer.queueLabel = '';
        MusicPlayer.playing = false;
      }
      localStorage.removeItem('music_player_state');
      // Remove hamburger and side menu
      const hamburger = document.getElementById('hamburger-btn');
      if (hamburger) hamburger.remove();
      const menu = document.getElementById('side-menu');
      if (menu) menu.remove();
      const overlay = document.getElementById('menu-overlay');
      if (overlay) overlay.remove();
      document.body.classList.remove('side-menu-open');
    }
  },

  _highlightActiveMenuItem() {
    const hash = window.location.hash || '#/works';
    const cur = hash.split('#')[1] || '/works';
    document.querySelectorAll('.side-menu-item').forEach(el => {
      const route = el.dataset.route;
      // Skip items without data-route (e.g., action buttons like "系统公告")
      if (!route) { el.classList.remove('active'); return; }
      el.classList.toggle('active', cur === route || cur.startsWith(route + '/'));
    });
    // Admin submenu no longer needed — single entry point
  },

  _notifPollTimer: null,

  _stopNotifPolling() {
    if (this._notifPollTimer) {
      clearInterval(this._notifPollTimer);
      this._notifPollTimer = null;
    }
  },

  _banBannerTimer: null,
  _lastUnreadCount: 0,

  _updateBanBanner() {
    const existing = document.getElementById('ban-banner');
    if (existing) existing.remove();
    if (this._banBannerTimer) {
      clearInterval(this._banBannerTimer);
      this._banBannerTimer = null;
    }

    if (!this.user || !this.user.is_banned) return;

    const render = () => {
      let banner = document.getElementById('ban-banner');
      if (!banner) {
        banner = document.createElement('div');
        banner.id = 'ban-banner';
        banner.className = 'ban-banner';
        const navbar = document.querySelector('.navbar');
        navbar.parentNode.insertBefore(banner, navbar.nextSibling);
      }

      let timeText = '';
      if (this.user.banned_until) {
        const until = new Date(this.user.banned_until.replace(' ', 'T') + 'Z');
        const remaining = Math.max(0, until.getTime() - Date.now());
        if (remaining <= 0) {
          this.checkAuth().then(() => {
            const b = document.getElementById('ban-banner');
            if (b) b.remove();
          });
          return;
        }
        const days = Math.floor(remaining / 86400000);
        const hours = Math.floor((remaining % 86400000) / 3600000);
        const minutes = Math.floor((remaining % 3600000) / 60000);
        timeText = `禁言剩余 ${days > 0 ? days + '天 ' : ''}${hours}小时${minutes}分钟`;
      } else {
        timeText = '永久禁言';
      }

      const reasonText = this.user.ban_reason ? `原因：${escapeHtml(this.user.ban_reason)}` : '';
      banner.innerHTML = `<span>🚫 ${timeText}</span>${reasonText ? `<span>${reasonText}</span>` : ''}`;
    };

    render();
    if (this.user.banned_until) {
      this._banBannerTimer = setInterval(render, 60000);
    }
  },

  _checkZoneLocks() {
    var self = this;
    var zones = ['work', 'chat', 'music', 'job'];
    zones.forEach(function(zone) {
      API.checkZoneAccess(zone).then(function(data) {
        var item = document.querySelector('.side-menu-item[data-zone="' + zone + '"]');
        if (!item || data.accessible) return;
        item.dataset.locked = 'true';
        var lockSpan = document.createElement('span');
        lockSpan.className = 'zone-lock-icon';
        lockSpan.textContent = ' \uD83D\uDD12';
        item.appendChild(lockSpan);
      }).catch(function() {});
    });
  },

  _startNotifPolling() {
    this._lastUnreadCount = 0;
    const self = this;
    function updateBadge(count) {
      var badge = document.getElementById("unread-badge");
      if (!badge) return;
      if (count > 0) {
        badge.textContent = count > 99 ? "99+" : count;
        badge.style.display = "inline";
      } else {
        badge.style.display = "none";
      }
    };
    var poll = async function() {
      try {
        var data = await API.getUnreadCount();
        var count = data.count || 0;
        updateBadge(count);
        Components._updateFriendRequestBadge();
        if (count > self._lastUnreadCount && self._lastUnreadCount > 0) {
          var diff = count - self._lastUnreadCount;
          showToast("您有 " + diff + " 条新通知", "info");
        }
        self._lastUnreadCount = count;
      } catch (e) { }
    };
    poll();
    if (this._notifPollTimer) clearInterval(this._notifPollTimer);
    this._notifPollTimer = setInterval(poll, 30000);
  },
};

// Bootstrap application
document.addEventListener('DOMContentLoaded', () => App.init());
