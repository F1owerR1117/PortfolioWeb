// Music library component: songs, playlists — refactored with local DOM updates
var ComponentsMusicLibrary = {
  _musicTab: 'songs',
  _activePlaylistId: null,
  // Cached data for local DOM updates
  _songs: [],
  _playlists: [],

  // ===== Main entry: render the music page =====
  renderMusicLibrary: async function() {
    this.renderLoading();
    try {
      var songData = await API.getMySongs(), plData = await API.getMyPlaylists();
      this._songs = songData.songs || [];
      this._playlists = plData.playlists || [];
      this._renderPageShell();
      if (this._musicTab === 'songs') this._renderSongList();
      else this._renderPlaylistGrid();
    } catch (err) { showToast(err.message, 'error'); Router.navigate('#/works'); }
  },

  // ===== Page shell: header + tabs + content area =====
  _renderPageShell: function() {
    var self = this;
    var plCount = this._playlists.length;
    var app = document.getElementById('app');
    app.innerHTML = '<div class="page-fade-in"><div class="music-page">' +
      '<div class="page-header"><h1>🎵 音乐库</h1><button class="btn btn-primary btn-sm" id="upload-song-btn">📤 上传音乐</button></div>' +
      '<div class="tabs">' +
        '<button class="tab-btn' + (this._musicTab === 'songs' ? ' active' : '') + '" id="music-tab-songs">🎵 歌曲</button>' +
        '<button class="tab-btn' + (this._musicTab === 'playlists' ? ' active' : '') + '" id="music-tab-playlists">📋 歌单' +
          (plCount > 0 ? ' <span style="font-size:11px;background:rgba(163,230,53,0.08);color:var(--primary);padding:1px 8px;border-radius:10px;margin-left:2px;">' + plCount + '</span>' : '') +
        '</button>' +
      '</div>' +
      '<div id="music-content"></div>' +
    '</div></div>';

    document.getElementById('music-tab-songs').onclick = function() {
      self._musicTab = 'songs';
      self._renderSongList();
      var mc = document.getElementById('music-content');
      if (mc) { mc.style.animation = 'none'; requestAnimationFrame(function() { mc.style.animation = ''; }); }
    };
    document.getElementById('music-tab-playlists').onclick = function() {
      self._musicTab = 'playlists';
      self._renderPlaylistGrid();
      var mc = document.getElementById('music-content');
      if (mc) { mc.style.animation = 'none'; requestAnimationFrame(function() { mc.style.animation = ''; }); }
    };
    document.getElementById('upload-song-btn').addEventListener('click', function() { self._uploadSong(); });
  },

  // ===== Upload flow (extracted from render) =====
  _uploadSong: async function() {
    var self = this;
    var fi = document.createElement('input');
    fi.type = 'file';
    fi.accept = 'audio/mpeg,audio/mp3,audio/wav,audio/ogg,.mp3,.wav,.ogg';
    fi.click();

    fi.addEventListener('change', async function() {
      if (!fi.files || !fi.files[0]) return;
      var file = fi.files[0];
      var defaultName = file.name.replace(/\.[^.]+$/, '');
      var name = await showPrompt('歌曲名称：', defaultName, '输入歌曲名称');
      if (!name || !name.trim()) return;
      var artist = await showPrompt('艺术家（可选）：', '', '可选');
      if (artist === null) return;

      var btn = document.getElementById('upload-song-btn');
      if (btn) { btn.disabled = true; btn.textContent = '⏳ 上传中...'; }

      var fd = new FormData();
      fd.append('song', file);
      fd.append('name', name.trim());
      if (artist.trim()) fd.append('artist', artist.trim());

      var xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/music/upload', true);
      xhr.withCredentials = true;
      xhr.upload.onprogress = function(e) {
        if (e.lengthComputable && btn) btn.textContent = '⏳ ' + Math.round(e.loaded / e.total * 100) + '%';
      };
      xhr.onload = function() {
        if (btn) { btn.disabled = false; btn.textContent = '📤 上传音乐'; }
        if (xhr.status >= 200 && xhr.status < 300) {
          showToast('✅ 上传成功', 'success');
          // Full re-render needed to get server-assigned id
          self.renderMusicLibrary();
        } else {
          try { var e = JSON.parse(xhr.responseText); showToast(e.error || '上传失败', 'error'); }
          catch (_) { showToast('上传失败', 'error'); }
        }
      };
      xhr.onerror = function() {
        showToast('网络错误', 'error');
        if (btn) { btn.disabled = false; btn.textContent = '📤 上传音乐'; }
      };
      xhr.ontimeout = function() {
        showToast('上传超时', 'error');
        if (btn) { btn.disabled = false; btn.textContent = '📤 上传音乐'; }
      };
      xhr.timeout = 60000;
      xhr.send(fd);
    });
  },

  // ===== Song list =====
  _renderSongList: function() {
    var self = this;
    var songs = this._songs;
    var content = document.getElementById('music-content');
    if (!content) return;

    var html = '<div class="music-toolbar" style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;">' +
      '<input class="search-input" id="song-search" type="text" placeholder="搜索歌曲..." style="flex:1;min-width:150px;">' +
      '</div>';

    if (songs.length === 0) {
      html += '<div class="empty-state" style="padding:40px;"><div class="empty-state-icon">🎵</div><p class="empty-state-text">暂无歌曲，点击上方按钮上传</p></div>';
    } else {
      html += '<div class="song-list">';
      for (var i = 0; i < songs.length; i++) {
        var s = songs[i];
        var isPlaying = MusicPlayer.currentSong && MusicPlayer.currentSong.id === s.id;
        html += self._buildSongRowHTML(s, i, isPlaying);
      }
      html += '</div>';
    }

    content.innerHTML = html;

    // Bind search
    document.getElementById('song-search').addEventListener('input', function() {
      var q = this.value.trim().toLowerCase();
      document.querySelectorAll('.song-row').forEach(function(row) {
        var name = row.querySelector('.song-name')?.textContent?.toLowerCase() || '';
        row.style.display = (!q || name.includes(q)) ? '' : 'none';
      });
    });

    // Bind per-row events
    document.querySelectorAll('.song-row').forEach(function(row) {
      var idx = parseInt(row.dataset.index);
      var songId = parseInt(row.dataset.songId);
      var song = songs[idx];
      self._bindSongRowEvents(row, song, idx);
    });
  },

  // Build single song row HTML
  _buildSongRowHTML: function(s, index, isPlaying) {
    var coverHTML = s.cover_url
      ? '<img src="' + escapeHtml(s.cover_url) + '" alt="">'
      : '<span style="font-size:18px;">🎵</span>';
    return '<div class="song-row' + (isPlaying ? ' playing' : '') + '" data-song-id="' + s.id + '" data-index="' + index + '">' +
      '<div class="song-index"><span>' + (index + 1) + '</span></div>' +
      '<div class="song-cover">' + coverHTML + '<div class="play-indicator">▶</div></div>' +
      '<div class="song-info">' +
        '<div class="song-name">' + escapeHtml(s.name) + (isPlaying ? ' <span class="now-playing-tag">♫ 播放中</span>' : '') + '</div>' +
        '<div class="song-artist">' + (s.artist ? escapeHtml(s.artist) : '&nbsp;') + '</div>' +
      '</div>' +
      '<div class="song-plays">🎧 ' + (s.play_count || 0) + '</div>' +
      '<div class="song-actions">' +
        '<button class="act-btn song-menu-btn" data-song-id="' + s.id + '" title="更多操作">⋮</button>' +
      '</div>' +
    '</div>';
  },

  // Bind events to a single song row
  _bindSongRowEvents: function(row, song, index) {
    var self = this;
    var songId = song.id;

    // Click row → play
    row.addEventListener('click', function(e) {
      if (e.target.closest('.act-btn') || e.target.closest('.song-menu-popup')) return;
      MusicPlayer.playQueue(self._songs, index, '全部歌曲');
    });

    // Menu button → show dropdown
    var menuBtn = row.querySelector('.song-menu-btn');
    if (menuBtn) {
      menuBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        self._showSongMenu(e, song, row);
      });
    }
  },

  // Show action menu for a song
  _showSongMenu: function(e, song, row) {
    var self = this;
    // Remove any existing menu
    var existing = document.querySelector('.song-menu-popup');
    if (existing) existing.remove();

    var menu = document.createElement('div');
    menu.className = 'song-menu-popup';
    menu.style.cssText = 'position:fixed;z-index:9999;background:var(--bg-card);border:1px solid var(--border);border-radius:10px;padding:4px;min-width:140px;box-shadow:0 8px 24px rgba(0,0,0,0.4);';
    menu.style.left = Math.min(e.clientX, window.innerWidth - 150) + 'px';
    menu.style.top = Math.min(e.clientY, window.innerHeight - 200) + 'px';

    var items = [
      { label: '✏️ 编辑信息', action: function() { self._handleEditSong(song, row); } },
      { label: '🖼 更换封面', action: function() { self._handleSongCover(song, row); } },
      { label: '📋 添加到歌单', action: function() { self._showPlaylistSelector(song.id); } },
      { label: '🗑 删除', danger: true, action: function() { self._handleDeleteSong(song, row); } }
    ];

    items.forEach(function(item) {
      var btn = document.createElement('button');
      btn.textContent = item.label;
      btn.style.cssText = 'display:block;width:100%;padding:8px 12px;border:none;background:transparent;color:' +
        (item.danger ? 'var(--error)' : 'var(--text)') +
        ';font-size:13px;cursor:pointer;text-align:left;border-radius:6px;font-family:inherit;';
      btn.addEventListener('mouseenter', function() { btn.style.background = 'var(--bg-focus-glow)'; });
      btn.addEventListener('mouseleave', function() { btn.style.background = 'transparent'; });
      btn.addEventListener('click', function() {
        menu.remove();
        item.action();
      });
      menu.appendChild(btn);
    });

    document.body.appendChild(menu);

    // Close on outside click
    var close = function(ev) {
      if (!menu.contains(ev.target) && ev.target !== menu) {
        menu.remove();
        document.removeEventListener('click', close);
      }
    };
    setTimeout(function() { document.addEventListener('click', close); }, 0);
  },

  // ===== Local DOM update: edit song name/artist =====
  _handleEditSong: async function(song, row) {
    var name = await showPrompt('歌曲名称：', song.name, '输入歌曲名称');
    if (name === null) return;
    if (!name.trim()) { showToast('名称不能为空', 'error'); return; }
    var artist = await showPrompt('艺术家：', song.artist || '', '可选');
    if (artist === null) return;

    try {
      await API.updateSong(song.id, { name: name.trim(), artist: artist.trim() });
      // Local update
      song.name = name.trim();
      song.artist = artist.trim();
      var nameEl = row.querySelector('.song-name');
      if (nameEl) {
        // Keep playing tag if present
        var tag = nameEl.querySelector('.now-playing-tag');
        nameEl.innerHTML = escapeHtml(song.name) + (tag ? tag.outerHTML : '');
      }
      var artistEl = row.querySelector('.song-artist');
      if (artistEl) artistEl.textContent = song.artist || '';
      showToast('✅ 已更新', 'success');
    } catch (err) { showToast(err.message, 'error'); }
  },

  // ===== Local DOM update: change cover =====
  _handleSongCover: async function(song, row) {
    var self = this;
    var fi = document.createElement('input');
    fi.type = 'file'; fi.accept = '.jpg,.jpeg,.png';
    fi.addEventListener('change', async function() {
      if (!fi.files || !fi.files[0]) return;
      try {
        var cropped = await openCropModal(fi.files[0], 1);
        if (!cropped) return;
        var r = await API.uploadMusicCover(new File([cropped], 'cover.jpg', { type: 'image/jpeg' }));
        await API.updateSong(song.id, { cover_url: r.cover_url });
        // Local update
        song.cover_url = r.cover_url;
        var coverEl = row.querySelector('.song-cover');
        if (coverEl) {
          var existingImg = coverEl.querySelector('img');
          if (existingImg) {
            existingImg.src = r.cover_url;
          } else {
            // Replace emoji with img
            var span = coverEl.querySelector('span');
            var indicator = coverEl.querySelector('.play-indicator');
            if (span) span.remove();
            var img = document.createElement('img');
            img.src = r.cover_url;
            img.alt = '';
            coverEl.insertBefore(img, indicator);
          }
        }
        showToast('✅ 封面已更新', 'success');
      } catch (err) { showToast(err.message, 'error'); }
    });
    fi.click();
  },

  // ===== Local DOM update: delete song =====
  _handleDeleteSong: async function(song, row) {
    if (!(await showConfirm('确定删除「' + song.name + '」？'))) return;
    try {
      await API.deleteSong(song.id);
      // Remove from cached array
      var idx = this._songs.findIndex(function(s) { return s.id === song.id; });
      if (idx >= 0) this._songs.splice(idx, 1);
      // Animate and remove row
      row.style.transition = 'opacity 0.2s, transform 0.2s';
      row.style.opacity = '0';
      row.style.transform = 'translateX(20px)';
      setTimeout(function() { row.remove(); }, 200);
      showToast('已删除', 'success');
      // Refresh playlist count in tab
      this._refreshPlaylistTabCount();
    } catch (err) { showToast(err.message, 'error'); }
  },

  // ===== Playlist grid =====
  _renderPlaylistGrid: function() {
    var self = this;
    var playlists = this._playlists;
    var content = document.getElementById('music-content');
    if (!content) return;

    var html = '<div style="display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap;">' +
      '<button class="btn btn-primary btn-sm" id="create-playlist-btn">📋 新建歌单</button>' +
      '</div>';

    if (playlists.length === 0) {
      html += '<div class="empty-state" style="padding:40px;"><div class="empty-state-icon">📋</div><p class="empty-state-text">暂无歌单</p></div>';
    } else {
      html += '<div class="playlist-grid">';
      for (var i = 0; i < playlists.length; i++) {
        var p = playlists[i];
        html += self._buildPlaylistCardHTML(p);
      }
      html += '</div>';
    }

    content.innerHTML = html;

    // Bind create button
    document.getElementById('create-playlist-btn').addEventListener('click', function() { self._handleCreatePlaylist(); });

    // Bind card clicks
    document.querySelectorAll('.playlist-card').forEach(function(card) {
      card.addEventListener('click', function(e) {
        if (e.target.closest('.act-btn')) return;
        Router.navigate('#/music/playlist/' + card.dataset.pid);
      });
    });
  },

  _buildPlaylistCardHTML: function(p) {
    var coverHTML = p.cover_url
      ? '<img src="' + escapeHtml(p.cover_url) + '" alt="">'
      : '📋';
    return '<div class="playlist-card' + (this._activePlaylistId === p.id ? ' active' : '') + '" data-pid="' + p.id + '">' +
      '<div class="playlist-cover">' + coverHTML + '</div>' +
      '<div class="playlist-info">' +
        '<div class="playlist-name">' + escapeHtml(p.name) + '</div>' +
        '<div class="playlist-meta"><span class="playlist-song-count">🎵 ' + (p.song_count || 0) + ' 首</span></div>' +
      '</div>' +
      '<div class="playlist-actions"><button class="act-btn play-playlist-btn" data-pid="' + p.id + '">▶ 播放</button></div>' +
    '</div>';
  },

  _handleCreatePlaylist: async function() {
    var self = this;
    var name = await showPrompt('输入歌单名称：', '', '我的歌单');
    if (!name || !name.trim()) return;
    try {
      var result = await API.createPlaylist(name.trim());
      var plId = result.playlist ? result.playlist.id : null;
      var addCover = await showConfirm('是否添加封面图片？', '添加封面', '跳过');
      if (addCover && plId) {
        var fi = document.createElement('input');
        fi.type = 'file'; fi.accept = '.jpg,.jpeg,.png';
        fi.click();
        await new Promise(function(resolve) { fi.onchange = resolve; });
        if (fi.files && fi.files[0]) {
          var cropped = await openCropModal(fi.files[0], 1);
          if (cropped) {
            var ur = await API.uploadMusicCover(new File([cropped], 'cover.jpg', { type: 'image/jpeg' }));
            await API.updatePlaylist(plId, { cover_url: ur.cover_url });
          }
        }
      }
      showToast('✅ 歌单已创建', 'success');
      self.renderMusicLibrary();
    } catch (err) { showToast(err.message, 'error'); }
  },

  _refreshPlaylistTabCount: function() {
    var tab = document.getElementById('music-tab-playlists');
    if (tab) {
      // The count badge is inline; just re-render playlists tab is complex.
      // For simplicity, we leave it — count updates on next full render.
    }
  },

  // ===== Playlist detail page =====
  renderPlaylistDetail: async function(playlistId) {
    this._activePlaylistId = playlistId;
    this.renderLoading();
    try {
      var data, isPublicView = false;
      try { data = await API.getPlaylist(playlistId); } catch(e) { data = await API.viewPublicPlaylist(playlistId); isPublicView = true; }
      var pl = data.playlist, songs = pl.songs || [], currentSong = MusicPlayer.currentSong;
      var plCoverHtml = pl.cover_url ? '<img src="' + escapeHtml(pl.cover_url) + '" style="width:64px;height:64px;border-radius:12px;object-fit:cover;box-shadow:0 4px 12px rgba(0,0,0,0.3);">' : '<div class="music-playlist-header-icon" style="font-size:48px;">📋</div>';
      document.getElementById('app').innerHTML = '<div class="page-fade-in"><div class="music-page"><div class="music-playlist-header-gradient" style="gap:16px;">' + plCoverHtml + '<div class="music-playlist-header-info"><div class="music-playlist-header-name">' + escapeHtml(pl.name) + '</div><div class="music-playlist-header-meta">' + songs.length + ' 首歌曲' + (pl.is_public ? ' · 🌍 公开' : ' · 🔒 私密') + '</div></div><div class="music-playlist-header-actions">' + (songs.length > 0 ? '<button class="btn btn-primary" id="play-all-btn">▶ 播放全部</button>' : '') + (!isPublicView ? '<button class="btn btn-outline" id="toggle-public-btn" style="margin-right:4px;">' + (pl.is_public ? '🔒 设为私密' : '🌍 设为公开') + '</button><button class="btn btn-outline" id="change-cover-btn" style="margin-right:4px;">🖼 封面</button><button class="btn btn-outline" id="edit-playlist-btn" style="margin-right:4px;">✏️ 编辑</button><button class="btn btn-outline" id="add-songs-btn">+ 添加歌曲</button>' : '') + '</div></div><button class="btn btn-outline btn-sm" id="back-to-music" style="margin-bottom:16px;">← 返回</button>' +
        (songs.length === 0 ? '<div class="empty-state"><div class="empty-state-icon">📋</div><p class="empty-state-text">歌单中暂无歌曲</p></div>' : '<div class="music-song-list">' + songs.map(function(s) { return '<div class="music-song-item' + (currentSong && currentSong.id === s.id ? ' playing' : '') + '" data-song-id="' + s.id + '"><div class="music-song-cover">' + (s.cover_url ? '<img src="' + escapeHtml(s.cover_url) + '" alt="">' : '&#9835;') + '</div><div class="music-song-info"><div class="music-song-name-row">' + escapeHtml(s.name) + (currentSong && currentSong.id === s.id ? ' <span class="music-song-playing">♫ 播放中</span>' : '') + '</div>' + (s.artist ? '<div class="music-song-artist-row">' + escapeHtml(s.artist) + '</div>' : '') + '</div><div class="music-song-actions">' + (!isPublicView ? '<button class="btn btn-sm btn-outline remove-from-playlist-btn" data-song-id="' + s.id + '" style="color:var(--error);">移除</button>' : '') + '</div></div>'; }).join('') + '</div>') + '</div></div>';
      document.getElementById('back-to-music').onclick = function() { if (isPublicView) window.history.back(); else { Components._musicTab = 'playlists'; Router.navigate('#/music'); } };
      document.getElementById('play-all-btn')?.addEventListener('click', function() { if (songs.length > 0) MusicPlayer.playQueue(songs, 0, '歌单: ' + pl.name); });
      document.getElementById('toggle-public-btn')?.addEventListener('click', async function() { var isPub = !!pl.is_public; try { var r = await API.setPlaylistPublic(playlistId, !isPub); showToast(r.message || '已更新', 'success'); Components.renderPlaylistDetail(playlistId); } catch(err) { showToast(err.message, 'error'); } });
      document.getElementById('change-cover-btn')?.addEventListener('click', function() { var fi = document.createElement('input'); fi.type = 'file'; fi.accept = '.jpg,.jpeg,.png'; fi.addEventListener('change', async function() { if (!fi.files || !fi.files[0]) return; var btn = document.getElementById('change-cover-btn'); if (btn) btn.textContent = '⏳'; try { var cropped = await openCropModal(fi.files[0], 1); if (!cropped) { if (btn) btn.textContent = '🖼 封面'; return; } var r = await API.uploadMusicCover(new File([cropped], 'cover.jpg', { type: 'image/jpeg' })); await API.updatePlaylist(playlistId, { cover_url: r.cover_url }); showToast('✅ 封面已更新', 'success'); Components.renderPlaylistDetail(playlistId); } catch(err) { showToast(err.message, 'error'); if (btn) btn.textContent = '🖼 封面'; } }); fi.click(); });
      document.getElementById('edit-playlist-btn')?.addEventListener('click', function() { (async function() { var name = await showPrompt('歌单名称：', pl.name, '输入歌单名称'); if (name === null) return; if (!name.trim()) { showToast('名称不能为空', 'error'); return; } try { await API.updatePlaylist(playlistId, { name: name.trim() }); showToast('已更新', 'success'); Components.renderPlaylistDetail(playlistId); } catch(err) { showToast(err.message, 'error'); } })(); });
      document.getElementById('add-songs-btn')?.addEventListener('click', function() { Components._showSongSelector(playlistId, new Set(songs.map(function(s) { return s.id; }))); });
      document.querySelectorAll('.music-song-item').forEach(function(item) { item.addEventListener('click', function(e) { if (e.target.closest('button')) return; var id = parseInt(item.dataset.songId), idx = songs.findIndex(function(s) { return s.id === id; }); if (idx >= 0) MusicPlayer.playQueue(songs, idx, '歌单: ' + pl.name); }); });
      if (!isPublicView) { document.querySelectorAll('.remove-from-playlist-btn').forEach(function(btn) { btn.addEventListener('click', async function(e) { e.stopPropagation(); if (!(await showConfirm('确定移除此歌曲？'))) return; try { await API.removeFromPlaylist(playlistId, parseInt(btn.dataset.songId)); showToast('已移除', 'success'); Components.renderPlaylistDetail(playlistId); } catch(err) { showToast(err.message, 'error'); } }); }); }
    } catch (err) { showToast(err.message, 'error'); Router.navigate('#/music'); }
  },

  // ===== Song selector modal (for adding to playlist) =====
  _showSongSelector: async function(playlistId, existingIds) {
    existingIds = existingIds || new Set();
    try { var d = await API.getMySongs(), allSongs = d.songs || [], selectedIds = new Set(existingIds); var ov = document.createElement('div'); ov.className = 'custom-modal-overlay'; var renderList = function(filter) { var listDiv = ov.querySelector('#selector-song-list') || ov; var items = allSongs.filter(function(s) { return !filter || s.name.toLowerCase().includes(filter) || (s.artist || '').toLowerCase().includes(filter); }); listDiv.innerHTML = '<div style="padding:8px 0;max-height:300px;overflow-y:auto;">'; if (items.length === 0) { listDiv.innerHTML += '<div style="padding:20px;text-align:center;color:var(--text-secondary);">无匹配歌曲</div>'; } else { items.forEach(function(s) { var checked = selectedIds.has(s.id) ? ' checked' : ''; var artistHtml = s.artist ? '<span style="color:var(--text-light);font-size:12px;"> - ' + escapeHtml(s.artist) + '</span>' : ''; listDiv.innerHTML += '<div class="selector-song-item" style="display:flex;align-items:center;padding:8px 24px;gap:8px;cursor:pointer;"><input type="checkbox" class="selector-checkbox" value="' + s.id + '"' + checked + '><span>' + escapeHtml(s.name) + '</span>' + artistHtml + '</div>'; }); } listDiv.innerHTML += '</div>'; listDiv.querySelectorAll('.selector-checkbox').forEach(function(cb) { cb.addEventListener('change', function() { var id = parseInt(cb.value); if (cb.checked) selectedIds.add(id); else selectedIds.delete(id); }); }); }; ov.innerHTML = '<div class="custom-modal-dialog" style="max-width:450px;"><div style="padding:16px 24px;border-bottom:1px solid var(--border);"><div style="font-size:17px;font-weight:700;">📋 选择歌曲</div></div><div style="padding:8px 24px;"><input class="form-input" id="selector-search" type="text" placeholder="搜索歌曲..." style="width:100%;"></div><div id="selector-song-list"></div><div style="padding:12px 24px;border-top:1px solid var(--border);display:flex;gap:8px;justify-content:flex-end;"><button class="btn btn-sm btn-outline" id="selector-cancel-btn">取消</button><button class="btn btn-sm btn-primary" id="confirm-selector-btn">确认添加</button></div></div>'; document.body.appendChild(ov); requestAnimationFrame(function() { ov.classList.add('visible'); }); renderList(''); document.getElementById('selector-search').addEventListener('input', function() { renderList(this.value.trim().toLowerCase()); }); document.getElementById('confirm-selector-btn').addEventListener('click', async function() { var ids = [...selectedIds].filter(function(id) { return !existingIds.has(id); }); if (ids.length === 0) { showToast('请选择新歌曲', 'warning'); return; } var btn = this; btn.disabled = true; btn.textContent = '添加中...'; try { var r = await API.batchAddToPlaylist(playlistId, ids); showToast(r.message || '已添加', 'success'); ov.classList.remove('visible'); ov.classList.add('closing'); setTimeout(function() { if (ov.parentNode) ov.parentNode.removeChild(ov); }, 200); Components.renderPlaylistDetail(playlistId); } catch(err) { showToast(err.message, 'error'); } btn.disabled = false; btn.textContent = '确认添加'; }); document.getElementById('selector-cancel-btn').addEventListener('click', function() { ov.classList.remove('visible'); ov.classList.add('closing'); setTimeout(function() { if (ov.parentNode) ov.parentNode.removeChild(ov); }, 200); }); } catch(err) { showToast(err.message, 'error'); }
  },

  // ===== Playlist selector modal =====
  _showPlaylistSelector: async function(songId) {
    try { var d = await API.getMyPlaylists(); var playlists = d.playlists || []; var ov = document.createElement('div'); ov.className = 'custom-modal-overlay'; ov.innerHTML = '<div class="custom-modal-dialog" style="max-width:420px;padding:16px 0;"><div style="padding:0 20px 12px;border-bottom:1px solid var(--border);"><div style="font-size:17px;font-weight:700;">📋 添加到歌单</div></div><div id="playlist-selector-list" style="padding:8px 0;max-height:300px;overflow-y:auto;">' + (playlists.length === 0 ? '<div style="padding:20px;text-align:center;color:var(--text-secondary);">暂无歌单</div>' : playlists.map(function(p) { return '<div class="playlist-sel-item" data-pid="' + p.id + '" data-selected="0" style="padding:10px 20px;cursor:pointer;display:flex;align-items:center;gap:10px;"><span class="pl-sel-box" style="width:22px;height:22px;border:2px solid var(--border);border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;">☐</span><div style="flex:1;min-width:0;"><div style="font-weight:600;font-size:14px;">' + escapeHtml(p.name) + '</div><div style="font-size:12px;color:var(--text-light);">' + (p.song_count || 0) + ' 首</div></div></div>'; }).join('')) + '</div><div style="padding:12px 20px;border-top:1px solid var(--border);display:flex;gap:8px;justify-content:flex-end;"><button class="btn btn-sm btn-outline" id="pl-sel-cancel">取消</button><button class="btn btn-sm btn-primary" id="pl-sel-confirm">确认添加</button></div></div>'; document.body.appendChild(ov); requestAnimationFrame(function() { ov.classList.add('visible'); }); var sel = {}; ov.querySelectorAll('.playlist-sel-item').forEach(function(item) { item.addEventListener('click', function() { var pid = this.dataset.pid; var isOn = this.dataset.selected === '1'; this.dataset.selected = isOn ? '0' : '1'; this.style.borderLeft = isOn ? '' : '3px solid var(--primary)'; this.querySelector('.pl-sel-box').textContent = isOn ? '☐' : '☑'; sel[pid] = !isOn; }); }); var closePl = function() { ov.classList.remove('visible'); ov.classList.add('closing'); setTimeout(function() { if (ov.parentNode) ov.parentNode.removeChild(ov); }, 200); }; document.getElementById('pl-sel-cancel').addEventListener('click', closePl); document.getElementById('pl-sel-confirm').addEventListener('click', async function() { var pids = Object.keys(sel).filter(function(p) { return sel[p]; }); if (pids.length === 0) { showToast('请选择歌单', 'warning'); return; } var btn = this; btn.disabled = true; btn.textContent = '添加中...'; var count = 0; try { for (var i = 0; i < pids.length; i++) { await API.addToPlaylist(parseInt(pids[i]), songId); count++; } showToast('✅ 已添加到 ' + count + ' 个歌单', 'success'); closePl(); } catch(err) { showToast(err.message, 'error'); } btn.disabled = false; btn.textContent = '确认添加'; }); ov.addEventListener('click', function(e) { if (e.target === ov) closePl(); }); } catch(err) { showToast(err.message, 'error'); }
  }
};
