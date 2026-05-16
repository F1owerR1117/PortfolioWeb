const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const { run, get, all } = require('../db/init');
const { requireAuth, requireNotBanned } = require('../middleware/auth');
const logger = require('../logger');

// Ensure music uploads directory
const musicDir = path.resolve('./uploads/music');
const musicCoverDir = path.resolve('./uploads/music_covers');
if (!fs.existsSync(musicDir)) fs.mkdirSync(musicDir, { recursive: true });
if (!fs.existsSync(musicCoverDir)) fs.mkdirSync(musicCoverDir, { recursive: true });

// Multer for music files
const ALLOWED_AUDIO = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/wave', 'audio/ogg', 'audio/vorbis', 'application/ogg'];
const ALLOWED_AUDIO_EXT = ['.mp3', '.wav', '.ogg'];
const ALLOWED_COVER = ['image/jpeg', 'image/png'];
const ALLOWED_COVER_EXT = ['.jpg', '.jpeg', '.png'];

const songStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, musicDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, uuidv4() + ext);
  }
});

function songFileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_AUDIO.includes(file.mimetype) && ALLOWED_AUDIO_EXT.includes(ext)) {
    return cb(null, true);
  }
  cb(new Error('仅支持 MP3、WAV、OGG 格式音频文件'));
}

const songUpload = multer({
  storage: songStorage,
  fileFilter: songFileFilter,
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB
});

// Multer for cover images (used standalone or as part of upload)
const coverStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, musicCoverDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, uuidv4() + ext);
  }
});

function coverFileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_COVER.includes(file.mimetype) && ALLOWED_COVER_EXT.includes(ext)) {
    return cb(null, true);
  }
  cb(new Error('封面仅支持 JPG、PNG 格式'));
}

const coverUpload = multer({
  storage: coverStorage,
  fileFilter: coverFileFilter,
  limits: { fileSize: 2 * 1024 * 1024 } // 2MB
});

// ===== Song Management =====

// POST /api/music/upload — upload a song with metadata
router.post('/music/upload', requireAuth, requireNotBanned, songUpload.single('song'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '请选择音频文件' });

    const { name, artist } = req.body;
    if (!name || !name.trim()) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: '歌曲名称不能为空' });
    }

    // Handle cover upload separately via cover field
    let coverUrl = '';
    if (req.body.cover_file_id) {
      const coverId = parseInt(req.body.cover_file_id);
      const coverRec = get('SELECT filepath FROM files WHERE id = ?', [coverId]);
      if (coverRec) {
        coverUrl = '/api/file/' + coverId;
      }
    }

    const fileUrl = '/api/music/stream/' + req.file.filename.replace(/\\/g, '/');

    run(
      'INSERT INTO songs (user_id, name, artist, cover_url, file_url, duration) VALUES (?, ?, ?, ?, ?, ?)',
      [req.session.userId, name.trim(), (artist || '').trim(), coverUrl, fileUrl, 0]
    );

    res.status(201).json({ message: '歌曲上传成功' });
  } catch (err) {
    logger.error('[Music] Upload error:', err);
    res.status(500).json({ error: err.message || '上传失败' });
  }
});

// POST /api/music/upload-cover — upload cover image (returns file ID)
router.post('/music/upload-cover', requireAuth, requireNotBanned, coverUpload.single('cover'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '请选择封面图片' });

    const result = run(
      'INSERT INTO files (filename, original_name, mime_type, filepath, size) VALUES (?, ?, ?, ?, ?)',
      [req.file.filename, req.file.originalname, req.file.mimetype, req.file.path, req.file.size]
    );

    res.json({
      file_id: result.lastID,
      cover_url: '/api/file/' + result.lastID
    });
  } catch (err) {
    logger.error('[Music] Cover upload error:', err);
    res.status(500).json({ error: '封面上传失败' });
  }
});

// GET /api/music/songs — list current user's songs
router.get('/music/songs', requireAuth, async (req, res) => {
  try {
    const search = (req.query.search || '').trim();
    let where = 'WHERE s.user_id = ?';
    const params = [req.session.userId];

    if (search) {
      where += ' AND (s.name LIKE ? OR s.artist LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    const songs = all(
      `SELECT s.* FROM songs s ${where} ORDER BY s.created_at DESC`,
      params
    );

    res.json({ songs });
  } catch (err) {
    logger.error('[Music] List songs error:', err);
    res.status(500).json({ error: '获取歌曲列表失败' });
  }
});

// PUT /api/music/songs/:id — update song metadata (name, artist, cover_url)
router.put('/music/songs/:id', requireAuth, async (req, res) => {
  try {
    const songId = parseInt(req.params.id);
    if (isNaN(songId)) return res.status(400).json({ error: '无效的歌曲ID' });

    const song = get('SELECT * FROM songs WHERE id = ? AND user_id = ?', [songId, req.session.userId]);
    if (!song) return res.status(404).json({ error: '歌曲不存在或无权操作' });

    const { name, artist, cover_url } = req.body;
    const updates = [];
    const params = [];

    if (name !== undefined) { updates.push('name = ?'); params.push(name.trim() || song.name); }
    if (artist !== undefined) { updates.push('artist = ?'); params.push(artist.trim() || ''); }
    if (cover_url !== undefined) { updates.push('cover_url = ?'); params.push(cover_url || ''); }

    if (updates.length === 0) return res.status(400).json({ error: '请指定要更新的字段' });

    params.push(songId);
    run(`UPDATE songs SET ${updates.join(', ')} WHERE id = ?`, params);

    res.json({ message: '歌曲已更新' });
  } catch (err) {
    logger.error('[Music] Update song error:', err);
    res.status(500).json({ error: '更新歌曲失败' });
  }
});

// DELETE /api/music/songs/:id — delete a song (and remove from all playlists)
router.delete('/music/songs/:id', requireAuth, async (req, res) => {
  try {
    const songId = parseInt(req.params.id);
    if (isNaN(songId)) return res.status(400).json({ error: '无效的歌曲ID' });

    const song = get('SELECT * FROM songs WHERE id = ? AND user_id = ?', [songId, req.session.userId]);
    if (!song) return res.status(404).json({ error: '歌曲不存在或无权操作' });

    // Delete physical file
    const filePath = song.file_url.replace('/api/music/stream/', '');
    const fullPath = path.join(musicDir, filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }

    // Delete cover file reference if exists
    if (song.cover_url && song.cover_url.startsWith('/api/file/')) {
      const coverId = parseInt(song.cover_url.split('/').pop());
      const coverFile = get('SELECT * FROM files WHERE id = ?', [coverId]);
      if (coverFile) {
        if (fs.existsSync(coverFile.filepath)) fs.unlinkSync(coverFile.filepath);
        run('DELETE FROM files WHERE id = ?', [coverId]);
      }
    }

    // CASCADE will handle playlist_songs
    run('DELETE FROM songs WHERE id = ?', [songId]);

    res.json({ message: '歌曲已删除' });
  } catch (err) {
    logger.error('[Music] Delete song error:', err);
    res.status(500).json({ error: '删除歌曲失败' });
  }
});

// GET /api/music/stream/:filename — stream audio file
router.get('/music/stream/:filename', requireAuth, async (req, res) => {
  try {
    const filename = path.basename(req.params.filename);
    const filePath = path.join(musicDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: '音频文件不存在' });
    }

    const stat = fs.statSync(filePath);
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
      const chunksize = end - start + 1;

      const stream = fs.createReadStream(filePath, { start, end });
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'audio/mpeg'
      });
      stream.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': stat.size,
        'Content-Type': 'audio/mpeg'
      });
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (err) {
    logger.error('[Music] Stream error:', err);
    res.status(500).json({ error: '音频流失败' });
  }
});

// ===== Playlist Management =====

// GET /api/music/playlists — list current user's playlists
router.get('/music/playlists', requireAuth, async (req, res) => {
  try {
    const playlists = all(
      'SELECT p.*, (SELECT COUNT(*) FROM playlist_songs ps WHERE ps.playlist_id = p.id) as song_count FROM playlists p WHERE p.user_id = ? ORDER BY p.created_at DESC',
      [req.session.userId]
    );
    res.json({ playlists });
  } catch (err) {
    logger.error('[Music] List playlists error:', err);
    res.status(500).json({ error: '获取歌单列表失败' });
  }
});

// POST /api/music/playlists — create a new playlist
router.post('/music/playlists', requireAuth, requireNotBanned, async (req, res) => {
  try {
    const { name, cover_url } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: '歌单名称不能为空' });
    }

    const result = run(
      'INSERT INTO playlists (user_id, name, cover_url) VALUES (?, ?, ?)',
      [req.session.userId, name.trim(), cover_url || '']
    );

    res.status(201).json({
      message: '歌单创建成功',
      playlist: { id: result.lastID, name: name.trim(), cover_url: cover_url || '', song_count: 0 }
    });
  } catch (err) {
    logger.error('[Music] Create playlist error:', err);
    res.status(500).json({ error: '创建歌单失败' });
  }
});

// PUT /api/music/playlists/:id — update playlist name/cover
router.put('/music/playlists/:id', requireAuth, async (req, res) => {
  try {
    const playlistId = parseInt(req.params.id);
    if (isNaN(playlistId)) return res.status(400).json({ error: '无效的歌单ID' });

    const playlist = get('SELECT * FROM playlists WHERE id = ? AND user_id = ?', [playlistId, req.session.userId]);
    if (!playlist) return res.status(404).json({ error: '歌单不存在或无权操作' });

    const { name, cover_url } = req.body;
    if (name !== undefined && !name.trim()) {
      return res.status(400).json({ error: '歌单名称不能为空' });
    }

    if (name !== undefined) {
      run('UPDATE playlists SET name = ? WHERE id = ?', [name.trim(), playlistId]);
    }
    if (cover_url !== undefined) {
      run('UPDATE playlists SET cover_url = ? WHERE id = ?', [cover_url, playlistId]);
    }

    res.json({ message: '歌单已更新' });
  } catch (err) {
    logger.error('[Music] Update playlist error:', err);
    res.status(500).json({ error: '更新歌单失败' });
  }
});

// DELETE /api/music/playlists/:id — delete playlist (not songs)
router.delete('/music/playlists/:id', requireAuth, async (req, res) => {
  try {
    const playlistId = parseInt(req.params.id);
    if (isNaN(playlistId)) return res.status(400).json({ error: '无效的歌单ID' });

    const playlist = get('SELECT * FROM playlists WHERE id = ? AND user_id = ?', [playlistId, req.session.userId]);
    if (!playlist) return res.status(404).json({ error: '歌单不存在或无权操作' });

    run('DELETE FROM playlists WHERE id = ?', [playlistId]);
    res.json({ message: '歌单已删除' });
  } catch (err) {
    logger.error('[Music] Delete playlist error:', err);
    res.status(500).json({ error: '删除歌单失败' });
  }
});

// GET /api/music/playlists/:id — get playlist with its songs
router.get('/music/playlists/:id', requireAuth, async (req, res) => {
  try {
    const playlistId = parseInt(req.params.id);
    if (isNaN(playlistId)) return res.status(400).json({ error: '无效的歌单ID' });

    const playlist = get('SELECT * FROM playlists WHERE id = ? AND user_id = ?', [playlistId, req.session.userId]);
    if (!playlist) return res.status(404).json({ error: '歌单不存在或无权操作' });

    const songs = all(
      `SELECT s.*, ps.sort_order
       FROM playlist_songs ps
       JOIN songs s ON ps.song_id = s.id
       WHERE ps.playlist_id = ?
       ORDER BY ps.sort_order ASC`,
      [playlistId]
    );

    res.json({ playlist: { ...playlist, songs } });
  } catch (err) {
    logger.error('[Music] Get playlist error:', err);
    res.status(500).json({ error: '获取歌单详情失败' });
  }
});

// POST /api/music/playlists/:id/songs — add songs to playlist (batch or single)
router.post('/music/playlists/:id/songs', requireAuth, requireNotBanned, async (req, res) => {
  try {
    const playlistId = parseInt(req.params.id);
    if (isNaN(playlistId)) return res.status(400).json({ error: '无效的歌单ID' });

    const playlist = get('SELECT * FROM playlists WHERE id = ? AND user_id = ?', [playlistId, req.session.userId]);
    if (!playlist) return res.status(404).json({ error: '歌单不存在或无权操作' });

    // Support both single { song_id } and batch { song_ids: [] }
    let songIds = [];
    if (Array.isArray(req.body.song_ids)) {
      songIds = req.body.song_ids.map(id => parseInt(id)).filter(id => !isNaN(id) && id > 0);
    } else if (req.body.song_id) {
      songIds = [parseInt(req.body.song_id)];
    }

    if (songIds.length === 0) {
      return res.status(400).json({ error: '请提供要添加的歌曲ID' });
    }

    // Verify all songs belong to user
    const placeholders = songIds.map(() => '?').join(',');
    const ownedSongs = all(
      `SELECT id FROM songs WHERE id IN (${placeholders}) AND user_id = ?`,
      [...songIds, req.session.userId]
    );
    const ownedIds = ownedSongs.map(s => s.id);

    // Get existing entries to skip duplicates
    const existing = all(
      `SELECT song_id FROM playlist_songs WHERE playlist_id = ? AND song_id IN (${placeholders})`,
      [playlistId, ...ownedIds]
    );
    const existingIds = new Set(existing.map(e => e.song_id));

    // Get max sort_order for ordering new entries
    const maxOrder = get('SELECT MAX(sort_order) as max_order FROM playlist_songs WHERE playlist_id = ?', [playlistId]);
    let nextOrder = (maxOrder ? maxOrder.max_order : 0) + 1;

    let addedCount = 0;
    for (const songId of ownedIds) {
      if (existingIds.has(songId)) continue; // skip duplicates
      run('INSERT INTO playlist_songs (playlist_id, song_id, sort_order) VALUES (?, ?, ?)',
        [playlistId, songId, nextOrder++]);
      addedCount++;
    }

    res.status(201).json({ message: `已添加 ${addedCount} 首歌曲`, addedCount });
  } catch (err) {
    logger.error('[Music] Add to playlist error:', err);
    res.status(500).json({ error: '添加到歌单失败' });
  }
});

// DELETE /api/music/playlists/:id/songs — batch remove songs from playlist
router.delete('/music/playlists/:id/songs', requireAuth, async (req, res) => {
  try {
    const playlistId = parseInt(req.params.id);
    if (isNaN(playlistId)) return res.status(400).json({ error: '无效的歌单ID' });

    const playlist = get('SELECT * FROM playlists WHERE id = ? AND user_id = ?', [playlistId, req.session.userId]);
    if (!playlist) return res.status(404).json({ error: '歌单不存在或无权操作' });

    const { song_ids } = req.body;
    if (!Array.isArray(song_ids) || song_ids.length === 0) {
      return res.status(400).json({ error: '请提供要移除的歌曲ID列表' });
    }

    const songIds = song_ids.map(id => parseInt(id)).filter(id => !isNaN(id) && id > 0);
    const placeholders = songIds.map(() => '?').join(',');

    run(`DELETE FROM playlist_songs WHERE playlist_id = ? AND song_id IN (${placeholders})`,
      [playlistId, ...songIds]);

    res.json({ message: `已移除 ${songIds.length} 首歌曲`, removedCount: songIds.length });
  } catch (err) {
    logger.error('[Music] Batch remove error:', err);
    res.status(500).json({ error: '移除歌曲失败' });
  }
});

// DELETE /api/music/playlists/:id/songs/:songId — remove single song from playlist
router.delete('/music/playlists/:id/songs/:songId', requireAuth, async (req, res) => {
  try {
    const playlistId = parseInt(req.params.id);
    const songId = parseInt(req.params.songId);
    if (isNaN(playlistId) || isNaN(songId)) return res.status(400).json({ error: '无效的参数' });

    const playlist = get('SELECT * FROM playlists WHERE id = ? AND user_id = ?', [playlistId, req.session.userId]);
    if (!playlist) return res.status(404).json({ error: '歌单不存在或无权操作' });

    run('DELETE FROM playlist_songs WHERE playlist_id = ? AND song_id = ?', [playlistId, songId]);
    res.json({ message: '已从歌单移除' });
  } catch (err) {
    logger.error('[Music] Remove from playlist error:', err);
    res.status(500).json({ error: '从歌单移除失败' });
  }
});

// ===== Public Playlist Features =====

// PUT /api/playlists/:id/public — set playlist visibility
router.put('/playlists/:id/public', requireAuth, (req, res) => {
  try {
    const playlistId = parseInt(req.params.id);
    const playlist = get('SELECT * FROM playlists WHERE id = ? AND user_id = ?', [playlistId, req.session.userId]);
    if (!playlist) return res.status(404).json({ error: '歌单不存在或无权操作' });
    const { is_public } = req.body;
    run('UPDATE playlists SET is_public = ? WHERE id = ?', [is_public ? 1 : 0, playlistId]);
    res.json({ message: is_public ? '歌单已设为公开' : '歌单已设为私密', is_public: !!is_public });
  } catch (err) {
    logger.error('[Music] Public toggle error:', err);
    res.status(500).json({ error: '操作失败' });
  }
});

// GET /api/users/:userId/public-playlists — get public playlists for a user profile
router.get('/users/:userId/public-playlists', requireAuth, (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const playlists = all(
      `SELECT p.*, (SELECT COUNT(*) FROM playlist_songs ps WHERE ps.playlist_id = p.id) as song_count,
              (SELECT COUNT(*) FROM playlist_collections pc WHERE pc.playlist_id = p.id) as collection_count
       FROM playlists p
       WHERE p.user_id = ? AND p.is_public = 1
       ORDER BY p.view_count DESC`,
      [userId]
    );
    const user = get('SELECT username FROM users WHERE id = ?', [userId]);
    res.json({ playlists, username: user ? user.username : '' });
  } catch (err) {
    logger.error('[Music] Public list error:', err);
    res.status(500).json({ error: '获取公开歌单失败' });
  }
});

// GET /api/playlists/:id/public-view — view a public playlist (increments view count)
router.get('/playlists/:id/public-view', requireAuth, (req, res) => {
  try {
    const playlistId = parseInt(req.params.id);
    const playlist = get('SELECT * FROM playlists WHERE id = ? AND is_public = 1', [playlistId]);
    if (!playlist) return res.status(404).json({ error: '歌单不存在或未公开' });

    // Increment view count
    run('UPDATE playlists SET view_count = COALESCE(view_count, 0) + 1 WHERE id = ?', [playlistId]);

    const songs = all(
      `SELECT s.*, ps.sort_order FROM playlist_songs ps
       JOIN songs s ON ps.song_id = s.id
       WHERE ps.playlist_id = ?
       ORDER BY ps.sort_order ASC`,
      [playlistId]
    );

    // Check if current user collected this playlist
    const collected = get('SELECT id FROM playlist_collections WHERE user_id = ? AND playlist_id = ?',
      [req.session.userId, playlistId]);

    res.json({ playlist: { ...playlist, songs }, collected: !!collected });
  } catch (err) {
    logger.error('[Music] Public view error:', err);
    res.status(500).json({ error: '获取歌单失败' });
  }
});

// POST /api/playlists/:id/collect — toggle collect a public playlist
router.post('/playlists/:id/collect', requireAuth, requireNotBanned, (req, res) => {
  try {
    const playlistId = parseInt(req.params.id);
    const userId = req.session.userId;

    const playlist = get('SELECT id, user_id FROM playlists WHERE id = ? AND is_public = 1', [playlistId]);
    if (!playlist) return res.status(404).json({ error: '歌单不存在或未公开' });
    if (playlist.user_id === userId) return res.status(400).json({ error: '不能收藏自己的歌单' });

    const existing = get('SELECT id FROM playlist_collections WHERE user_id = ? AND playlist_id = ?', [userId, playlistId]);
    if (existing) {
      run('DELETE FROM playlist_collections WHERE id = ?', [existing.id]);
      res.json({ collected: false, message: '已取消收藏' });
    } else {
      run('INSERT INTO playlist_collections (user_id, playlist_id) VALUES (?, ?)', [userId, playlistId]);
      // Notify playlist owner
      run('INSERT INTO notifications (user_id, actor_id, type, post_id) VALUES (?, ?, ?, ?)',
        [playlist.user_id, userId, 'playlist_collect', null]);
      res.json({ collected: true, message: '已收藏歌单' });
    }
  } catch (err) {
    logger.error('[Music] Collect error:', err);
    res.status(500).json({ error: '操作失败' });
  }
});

// GET /api/playlists/collected — get current user's collected playlists
router.get('/playlists/collected', requireAuth, (req, res) => {
  try {
    const playlists = all(
      `SELECT p.*, pc.created_at as collected_at,
              (SELECT COUNT(*) FROM playlist_songs ps WHERE ps.playlist_id = p.id) as song_count,
              u.username as owner_name
       FROM playlist_collections pc
       JOIN playlists p ON pc.playlist_id = p.id
       JOIN users u ON p.user_id = u.id
       WHERE pc.user_id = ?
       ORDER BY pc.created_at DESC`,
      [req.session.userId]
    );
    res.json({ playlists });
  } catch (err) {
    logger.error('[Music] Collected list error:', err);
    res.status(500).json({ error: '获取收藏歌单失败' });
  }
});

module.exports = router;
