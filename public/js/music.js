// ===== Music Player Module =====
const MusicPlayer = {
  audio: null,
  currentSong: null,       // { id, name, artist, cover_url, file_url, duration }
  queue: [],               // Array of song objects
  queueIndex: -1,          // Current index in queue
  queueLabel: '',          // '全部歌曲' or '歌单: xxx'
  mode: 'sequential',      // 'sequential' | 'loop' | 'single'
  playing: false,
  volume: 0.7,
  _initDone: false,
  _stateSaveTimer: null,
  _changeCallbacks: [],

  onSongChange(callback) {
    if (typeof callback === 'function') this._changeCallbacks.push(callback);
  },

  _notifySongChange() {
    this._changeCallbacks.forEach(fn => fn(this.currentSong));
  },

  init() {
    if (this._initDone) return;
    this._initDone = true;

    this.audio = new Audio();
    this.audio.volume = this.volume;

    // Restore state from localStorage
    this._loadState();

    // Audio events
    this.audio.addEventListener('ended', () => this._onEnded());
    this.audio.addEventListener('timeupdate', () => this._updateProgress());
    this.audio.addEventListener('play', () => {
      this.playing = true;
      this._renderPlayer();
    });
    this.audio.addEventListener('pause', () => {
      this.playing = false;
      this._renderPlayer();
    });
    this.audio.addEventListener('error', () => {
      this.playing = false;
      this._renderPlayer();
    });

    // Initial render into footer
    this._renderPlayer();
  },

  // Play a specific song with a queue
  play(song, queue, queueLabel) {
    if (!song || !song.file_url) {
      showToast('无法播放：歌曲文件不存在', 'error');
      return;
    }
    this.queue = queue && queue.length > 0 ? queue : [song];
    this.queueLabel = queueLabel || '';
    this.queueIndex = this.queue.findIndex(s => s.id === song.id);
    if (this.queueIndex < 0) this.queueIndex = 0;
    this.currentSong = song;
    this._notifySongChange();
    this._loadAndPlay();
  },

  // Play a queue starting from a specific index
  playQueue(queue, startIndex, queueLabel) {
    if (!queue || queue.length === 0) return;
    this.queue = queue;
    this.queueLabel = queueLabel || '';
    this.queueIndex = Math.max(0, Math.min(startIndex, queue.length - 1));
    this.currentSong = this.queue[this.queueIndex];
    this._notifySongChange();
    this._loadAndPlay();
  },

  _loadAndPlay() {
    if (!this.currentSong) return;
    try {
      this.audio.src = this.currentSong.file_url;
      this.audio.play().catch(e => {
        console.warn('[MusicPlayer] Play failed:', e);
      });
      this._renderPlayer();
      this._updatePlayingIndicator();
      this._saveState();
    } catch (e) {
      console.error('[MusicPlayer] Load error:', e);
    }
  },

  // Sync the 'playing' indicator in the song list / playlist detail DOM
  _updatePlayingIndicator() {
    // Remove 'playing' class and badge from all .music-song-item (playlist detail)
    document.querySelectorAll('.music-song-item.playing').forEach(el => {
      el.classList.remove('playing');
      const badge = el.querySelector('.music-song-playing');
      if (badge) badge.remove();
    });
    // Remove 'playing' class from .song-row (music library list)
    document.querySelectorAll('.song-row.playing').forEach(el => {
      el.classList.remove('playing');
      const tag = el.querySelector('.now-playing-tag');
      if (tag) tag.remove();
      const indicator = el.querySelector('.play-indicator');
      if (indicator) indicator.textContent = '▶';
    });

    // Add 'playing' class to the current song's item
    if (this.currentSong) {
      const id = this.currentSong.id;
      // Highlight in playlist detail view
      const item = document.querySelector(`.music-song-item[data-song-id="${id}"]`);
      if (item) {
        item.classList.add('playing');
        const nameRow = item.querySelector('.music-song-name-row');
        if (nameRow && !nameRow.querySelector('.music-song-playing')) {
          const badge = document.createElement('span');
          badge.className = 'music-song-playing';
          badge.textContent = '♪ 播放中';
          nameRow.appendChild(badge);
        }
      }
      // Highlight in music library song list
      const row = document.querySelector(`.song-row[data-song-id="${id}"]`);
      if (row) {
        row.classList.add('playing');
        // Update play indicator icon on cover
        const indicator = row.querySelector('.play-indicator');
        if (indicator) indicator.textContent = '♫';
        // Add "播放中" tag to song name
        const nameEl = row.querySelector('.song-name');
        if (nameEl && !nameEl.querySelector('.now-playing-tag')) {
          const tag = document.createElement('span');
          tag.className = 'now-playing-tag';
          tag.textContent = '♫ 播放中';
          nameEl.appendChild(tag);
        }
      }
    }
  },

  togglePlay() {
    if (!this.currentSong) return;
    if (this.audio.paused) {
      this.audio.play().catch(e => {});
    } else {
      this.audio.pause();
    }
    this._renderPlayer();
    this._saveState();
  },

  next() {
    if (this.queue.length === 0) return;
    if (this.mode === 'single') {
      this.audio.currentTime = 0;
      this.audio.play().catch(e => {});
      return;
    }
    this.queueIndex++;
    if (this.queueIndex >= this.queue.length) {
      if (this.mode === 'loop') {
        this.queueIndex = 0;
      } else {
        this.queueIndex = this.queue.length - 1;
        this.audio.pause();
        this.playing = false;
        this._renderPlayer();
        this._saveState();
        return;
      }
    }
    this.currentSong = this.queue[this.queueIndex];
    this._loadAndPlay();
  },

  prev() {
    if (this.queue.length === 0) return;
    if (this.audio.currentTime > 3) {
      this.audio.currentTime = 0;
      return;
    }
    this.queueIndex--;
    if (this.queueIndex < 0) {
      this.queueIndex = this.mode === 'loop' ? this.queue.length - 1 : 0;
    }
    this.currentSong = this.queue[this.queueIndex];
    this._loadAndPlay();
  },

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.audio) this.audio.volume = this.volume;
    this._saveState();
  },

  seekTo(pct) {
    const duration = this.audio.duration || this.currentSong?.duration || 0;
    if (duration > 0 && this.audio) {
      this.audio.currentTime = (pct / 100) * duration;
    }
  },

  cycleMode() {
    const modes = ['sequential', 'loop', 'single'];
    const idx = modes.indexOf(this.mode);
    this.mode = modes[(idx + 1) % modes.length];
    this._renderPlayer();
    this._saveState();
  },

  _onEnded() {
    if (this.queue.length > 0) {
      this.next();
    }
  },

  _fmtTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  },

  _updateProgress() {
    const progressEl = document.getElementById('np-progress-bar');
    const currentEl = document.getElementById('np-current-time');
    const totalEl = document.getElementById('np-total-time');
    if (!progressEl) return;

    const current = this.audio.currentTime || 0;
    const duration = this.audio.duration || this.currentSong?.duration || 0;
    const pct = duration > 0 ? (current / duration) * 100 : 0;
    progressEl.style.width = pct + '%';
    if (currentEl) currentEl.textContent = this._fmtTime(current);
    if (totalEl) totalEl.textContent = duration > 0 ? this._fmtTime(duration) : '--:--';
  },

  _saveState() {
    if (this._stateSaveTimer) clearTimeout(this._stateSaveTimer);
    this._stateSaveTimer = setTimeout(() => {
      try {
        const state = {
          queueIds: this.queue.map(s => s.id).filter(Boolean),
          queueIndex: this.queueIndex,
          queueLabel: this.queueLabel,
          currentSongId: this.currentSong ? this.currentSong.id : null,
          volume: this.volume,
          mode: this.mode
        };
        localStorage.setItem('music_player_state', JSON.stringify(state));
      } catch (e) {}
    }, 500);
  },

  _loadState() {
    try {
      const raw = localStorage.getItem('music_player_state');
      if (!raw) return;
      const state = JSON.parse(raw);
      if (state.volume !== undefined) this.volume = state.volume;
      if (state.mode) this.mode = state.mode;

      // Try to restore queue from song IDs
      if (state.queueIds && state.queueIds.length > 0 && state.currentSongId) {
        (async () => {
          try {
            const data = await API.getMySongs();
            const allSongs = data.songs || [];
            const restoredQueue = state.queueIds
              .map(id => allSongs.find(s => s.id === id))
              .filter(Boolean);

            if (restoredQueue.length > 0) {
              this.queue = restoredQueue;
              this.queueLabel = state.queueLabel || '';
              const idx = Math.max(0, Math.min(state.queueIndex || 0, restoredQueue.length - 1));
              this.queueIndex = idx;
              this.currentSong = restoredQueue[idx];

              // Preload but don't autoplay
              this.audio.src = this.currentSong.file_url;
              this._renderPlayer();
            } else {
              localStorage.removeItem('music_player_state');
            }
          } catch (e) {
            // Songs not available (not logged in, etc.)
          }
        })();
      }
    } catch (e) {
      // Invalid state
    }
  },

  // ===== Player UI Rendering (called into footer) =====
  _playerRendered: false,

  _renderPlayer() {
    var container = document.getElementById('music-player-container');
    if (!container) return;

    var song = this.currentSong;
    var modeLabels = { sequential: '顺序', loop: '循环', single: '单曲' };
    var modeLabel = modeLabels[this.mode] || '顺序';

    // First render: build full DOM
    if (!this._playerRendered) {
      this._playerRendered = true;
      var html = '<div class="now-playing' + (this.playing ? ' playing' : '') + '" id="music-player">' +
        '<div class="now-inner">' +
          '<div class="np-cover" id="np-cover">' +
            (song && song.cover_url ? '<img src="' + escapeHtml(song.cover_url) + '" alt="">' : '<span style="opacity:0.5;">&#9835;</span>') +
            '<div class="music-equalizer"><span></span><span></span><span></span><span></span></div>' +
          '</div>' +
          '<div class="np-info">' +
            '<div class="np-title" id="np-title">' + (song ? escapeHtml(song.name) : '未选择歌曲') + '</div>' +
            '<div class="np-artist" id="np-artist">' + (song && song.artist ? escapeHtml(song.artist) : '从音乐库中选择歌曲播放') + '</div>' +
          '</div>' +
          '<span class="np-time" id="np-current-time">0:00</span>' +
          '<div class="np-progress" id="np-progress-wrap"><div class="np-progress-bar" id="np-progress-bar" style="width:0%;"></div></div>' +
          '<span class="np-time" id="np-total-time">--:--</span>' +
          '<div class="np-controls">' +
            '<button class="np-btn np-mode" id="music-mode-btn">' + modeLabel + '</button>' +
            '<button class="np-btn" id="music-prev-btn" title="上一首">⏮</button>' +
            '<button class="np-play" id="music-play-btn">▶</button>' +
            '<button class="np-btn" id="music-next-btn" title="下一首">⏭</button>' +
          '</div>' +
          '<div class="np-volume">' +
            '<span style="font-size:14px;color:rgba(255,255,255,0.3);">🔊</span>' +
            '<input type="range" id="music-volume" min="0" max="100" value="' + Math.round(this.volume * 100) + '" title="音量">' +
          '</div>' +
        '</div></div>';
      container.innerHTML = html;
      this._bindPlayerEvents();
    }

    // Update dynamic parts (every render call)
    var player = document.getElementById('music-player');
    if (!player) return;

    // Playing class
    player.classList.toggle('playing', this.playing);

    // Cover
    var cover = document.getElementById('np-cover');
    if (cover) {
      if (song && song.cover_url) {
        var img = cover.querySelector('img');
        if (!img) { img = document.createElement('img'); cover.innerHTML = ''; cover.appendChild(img); }
        img.src = song.cover_url;
      } else if (!song) {
        if (!cover.querySelector('span')) cover.innerHTML = '<span style="opacity:0.5;">&#9835;</span>';
      }
    }

    // Title
    var titleEl = document.getElementById('np-title');
    if (titleEl) {
      titleEl.textContent = song ? song.name : '未选择歌曲';
      titleEl.title = song ? (song.name + (song.artist ? ' - ' + song.artist : '')) : '';
    }

    // Artist
    var artistEl = document.getElementById('np-artist');
    if (artistEl) {
      artistEl.textContent = song && song.artist ? song.artist : (song ? '' : '从音乐库中选择歌曲播放');
    }

    // Play button
    var playBtn = document.getElementById('music-play-btn');
    if (playBtn) {
      playBtn.textContent = this.playing ? '⏸' : '▶';
      playBtn.title = this.playing ? '暂停' : '播放';
    }

    // Mode button
    var modeBtn = document.getElementById('music-mode-btn');
    if (modeBtn) {
      modeBtn.textContent = modeLabel;
      modeBtn.title = '播放模式：' + modeLabel;
      modeBtn.className = 'np-btn np-mode mode-' + this.mode;
    }

    // Prev/next disabled state
    var hasQueue = this.queue.length > 1;
    var prevBtn = document.getElementById('music-prev-btn');
    var nextBtn = document.getElementById('music-next-btn');
    if (prevBtn) prevBtn.disabled = !hasQueue;
    if (nextBtn) nextBtn.disabled = !hasQueue;

    // Volume slider (only on first render since volume doesn't change externally)
  },

  _bindPlayerEvents() {
    var playBtn = document.getElementById('music-play-btn');
    var prevBtn = document.getElementById('music-prev-btn');
    var nextBtn = document.getElementById('music-next-btn');
    var modeBtn = document.getElementById('music-mode-btn');
    var volumeSlider = document.getElementById('music-volume');
    var progressWrap = document.getElementById('np-progress-wrap');

    if (playBtn) playBtn.addEventListener('click', function() { MusicPlayer.togglePlay(); });
    if (prevBtn) prevBtn.addEventListener('click', function() { MusicPlayer.prev(); });
    if (nextBtn) nextBtn.addEventListener('click', function() { MusicPlayer.next(); });
    if (modeBtn) modeBtn.addEventListener('click', function() { MusicPlayer.cycleMode(); });
    if (volumeSlider) {
      volumeSlider.addEventListener('input', function(e) {
        MusicPlayer.setVolume(parseInt(e.target.value) / 100);
      });
    }
    if (progressWrap) {
      progressWrap.addEventListener('click', function(e) {
        var rect = progressWrap.getBoundingClientRect();
        var x = e.clientX - rect.left;
        var pct = Math.max(0, Math.min(1, x / rect.width));
        var duration = MusicPlayer.audio.duration || (MusicPlayer.currentSong && MusicPlayer.currentSong.duration) || 0;
        if (duration > 0) MusicPlayer.seekTo(pct * 100);
      });
    }
  }
};
