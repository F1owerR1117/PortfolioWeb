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
    this._loadAndPlay();
  },

  // Play a queue starting from a specific index
  playQueue(queue, startIndex, queueLabel) {
    if (!queue || queue.length === 0) return;
    this.queue = queue;
    this.queueLabel = queueLabel || '';
    this.queueIndex = Math.max(0, Math.min(startIndex, queue.length - 1));
    this.currentSong = this.queue[this.queueIndex];
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
  // so it stays in sync when next/prev changes the current song
  _updatePlayingIndicator() {
    // Remove 'playing' class and badge from all song items
    document.querySelectorAll('.music-song-item.playing').forEach(el => {
      el.classList.remove('playing');
      const badge = el.querySelector('.music-song-playing');
      if (badge) badge.remove();
    });

    // Add 'playing' class and badge to the current song's item
    if (this.currentSong) {
      const item = document.querySelector(
        `.music-song-item[data-song-id="${this.currentSong.id}"]`
      );
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
      // Restart current
      this.audio.currentTime = 0;
      this.audio.play().catch(e => {});
      return;
    }
    this.queueIndex++;
    if (this.queueIndex >= this.queue.length) {
      if (this.mode === 'loop') {
        this.queueIndex = 0;
      } else {
        // sequential: stop
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
      // Just restart current song if >3 seconds in
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

  _onEnded() {
    if (this.mode === 'single') {
      this.audio.currentTime = 0;
      this.audio.play().catch(e => {});
      return;
    }
    this.next();
  },

  setMode(mode) {
    this.mode = mode;
    this._renderPlayer();
    this._saveState();
  },

  cycleMode() {
    const modes = ['sequential', 'loop', 'single'];
    const idx = modes.indexOf(this.mode);
    this.mode = modes[(idx + 1) % modes.length];
    var modeLabels = { sequential: '顺序', loop: '循环', single: '单曲' };
    var modeCls = { sequential: 'mode-sequential', loop: 'mode-loop', single: 'mode-single' };
    var btn = document.getElementById('music-mode-btn');
    if (btn) {
      btn.textContent = modeLabels[this.mode] || '顺序';
      // Replace mode class
      Object.values(modeCls).forEach(function(c) { btn.classList.remove(c); });
      btn.classList.add(modeCls[this.mode]);
      btn.title = '播放模式：' + (modeLabels[this.mode] || '顺序');
    }
    this._saveState();
  },

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
    this.audio.volume = this.volume;
    // Update slider DOM directly without full re-render
    var slider = document.getElementById('music-volume');
    if (slider) slider.value = Math.round(this.volume * 100);
    this._saveState();
  },

  _updateProgress() {
    const progressEl = document.getElementById('music-progress');
    const currentEl = document.getElementById('music-current-time');
    const totalEl = document.getElementById('music-total-time');
    if (!progressEl) return;

    const current = this.audio.currentTime || 0;
    const duration = this.audio.duration || this.currentSong?.duration || 0;
    const pct = duration > 0 ? (current / duration) * 100 : 0;
    progressEl.value = pct;

    if (currentEl) currentEl.textContent = this._fmtTime(current);
    if (totalEl) totalEl.textContent = duration > 0 ? this._fmtTime(duration) : '--:--';
  },

  seekTo(pct) {
    if (!this.audio || !this.audio.duration) return;
    this.audio.currentTime = (pct / 100) * this.audio.duration;
  },

  _fmtTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return m + ':' + String(s).padStart(2, '0');
  },

  // Save state to localStorage
  _saveState() {
    if (this._stateSaveTimer) clearTimeout(this._stateSaveTimer);
    this._stateSaveTimer = setTimeout(() => {
      const state = {
        currentSongId: this.currentSong?.id || null,
        queueIds: this.queue.map(s => s.id),
        queueIndex: this.queueIndex,
        queueLabel: this.queueLabel,
        mode: this.mode,
        volume: this.volume
      };
      localStorage.setItem('music_player_state', JSON.stringify(state));
    }, 500);
  },

  // Restore state from localStorage
  async _loadState() {
    try {
      const raw = localStorage.getItem('music_player_state');
      if (!raw) return;
      const state = JSON.parse(raw);

      this.mode = state.mode || 'sequential';
      this.volume = state.volume || 0.7;
      this.audio.volume = this.volume;

      // Try to restore queue by getting current user's songs
      if (state.queueIds && state.queueIds.length > 0 && state.currentSongId) {
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
      }
    } catch (e) {
      // Invalid state
    }
  },

  // ===== Player UI Rendering (called into footer) =====
  _renderPlayer() {
    const container = document.getElementById('music-player-container');
    if (!container) return;

    const song = this.currentSong;
    const modeLabels = { sequential: '顺序', loop: '循环', single: '单曲' };
    const modeLabel = modeLabels[this.mode] || '顺序';

    var playingClass = this.playing ? ' playing' : '';
    var modeCls = 'mode-' + this.mode;
    container.innerHTML = [
      '<div class="music-player' + playingClass + '" id="music-player">',
      '  <div class="music-cover" style="position:relative;">',
      song && song.cover_url
        ? '<img src="' + escapeHtml(song.cover_url) + '" alt="">'
        : '<span class="music-cover-icon">&#9835;</span>',
      '    <div class="music-equalizer"><span></span><span></span><span></span><span></span></div>',
      '  </div>',
      '  <div class="music-info">',
      '    <div class="music-song-name" title="' + (song ? escapeHtml(song.name) + (song.artist ? ' - ' + escapeHtml(song.artist) : '') : '') + '">',
      (song ? escapeHtml(song.name) : '未选择歌曲'),
      '    </div>',
      (song && song.artist ? '<div class="music-artist">' + escapeHtml(song.artist) + '</div>' : ''),
      (!song ? '<div class="music-artist">从音乐库中选择歌曲播放</div>' : ''),
      '  </div>',
      '  <div class="music-controls">',
      '    <button class="music-btn music-mode-btn ' + modeCls + '" id="music-mode-btn" title="播放模式：' + modeLabel + '">' + modeLabel + '</button>',
      '    <button class="music-btn" id="music-prev-btn" title="上一首"' + (this.queue.length <= 1 ? ' disabled' : '') + '>|<</button>',
      '    <button class="music-btn music-play-btn" id="music-play-btn" title="' + (this.playing ? '暂停' : '播放') + '">',
      (this.playing ? '||' : '&#9654;'),
      '    </button>',
      '    <button class="music-btn" id="music-next-btn" title="下一首"' + (this.queue.length <= 1 ? ' disabled' : '') + '>>|</button>',
      '    <div class="music-volume-wrap">',
      '      <span class="music-volume-icon">&#9834;</span>',
      '      <input type="range" class="music-volume-slider" id="music-volume" min="0" max="100" value="' + Math.round(this.volume * 100) + '" title="音量">',
      '    </div>',
      '  </div>',
      '  <div class="music-progress-wrap">',
      '    <span class="music-time" id="music-current-time">0:00</span>',
      '    <input type="range" class="music-progress-bar" id="music-progress" min="0" max="100" value="0" title="进度">',
      '    <span class="music-time" id="music-total-time">--:--</span>',
      '  </div>',
      '</div>'
    ].join('');

    // Bind events on the newly rendered player
    this._bindPlayerEvents();
  },

  _bindPlayerEvents() {
    const playBtn = document.getElementById('music-play-btn');
    const prevBtn = document.getElementById('music-prev-btn');
    const nextBtn = document.getElementById('music-next-btn');
    const modeBtn = document.getElementById('music-mode-btn');
    const volumeSlider = document.getElementById('music-volume');
    const progressBar = document.getElementById('music-progress');

    if (playBtn) {
      playBtn.addEventListener('click', () => this.togglePlay());
    }
    if (prevBtn) {
      prevBtn.addEventListener('click', () => this.prev());
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', () => this.next());
    }
    if (modeBtn) {
      modeBtn.addEventListener('click', () => this.cycleMode());
    }
    if (volumeSlider) {
      volumeSlider.addEventListener('input', (e) => {
        this.setVolume(parseInt(e.target.value) / 100);
      });
    }
    if (progressBar) {
      let seeking = false;
      progressBar.addEventListener('mousedown', () => { seeking = true; });
      progressBar.addEventListener('mouseup', (e) => {
        if (seeking) {
          this.seekTo(parseInt(e.target.value));
          seeking = false;
        }
      });
      progressBar.addEventListener('input', (e) => {
        if (seeking) return;
        this.seekTo(parseInt(e.target.value));
      });
      // Mobile touch support
      progressBar.addEventListener('touchstart', () => { seeking = true; });
      progressBar.addEventListener('touchend', (e) => {
        if (seeking) {
          this.seekTo(parseInt(e.target.value));
          seeking = false;
        }
      });
    }
  }
};
