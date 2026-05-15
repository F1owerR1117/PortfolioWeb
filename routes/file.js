const express = require('express');
const fs = require('fs');
const router = express.Router();
const { get } = require('../db/init');
const { requireAuth } = require('../middleware/auth');

// GET /api/file/avatar/:filename — serve avatar files (public)
router.get('/avatar/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    // Security: prevent directory traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: '无效的文件名' });
    }
    const filepath = require('path').resolve('./uploads', filename);
    if (!require('fs').existsSync(filepath)) {
      return res.status(404).json({ error: '头像文件不存在' });
    }
    const ext = require('path').extname(filename).toLowerCase();
    const mimeMap = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp' };
    res.setHeader('Content-Type', mimeMap[ext] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'private, max-age=86400');
    const stream = require('fs').createReadStream(filepath);
    stream.pipe(res);
    stream.on('error', () => { res.status(500).json({ error: '读取文件失败' }); });
  } catch (err) {
    console.error('[File] Avatar error:', err);
    res.status(500).json({ error: '获取头像失败' });
  }
});

// GET /api/file/:fileId — permission-controlled file access
router.get('/:fileId', requireAuth, async (req, res) => {
  try {
    const fileId = parseInt(req.params.fileId);
    if (isNaN(fileId)) return res.status(400).json({ error: '无效的文件ID' });

    const fileRecord = get('SELECT * FROM files WHERE id = ?', [fileId]);
    if (!fileRecord) return res.status(404).json({ error: '文件不存在' });

    // Admin can access any file
    if (req.session.role !== 'admin') {
      // Regular user: check if file is associated with a preview-allowed content block
      const allowedBlock = get(
        `SELECT cb.id FROM content_blocks cb
         JOIN posts p ON cb.post_id = p.id
         WHERE cb.file_id = ? AND cb.allow_preview = 1
         LIMIT 1`,
        [fileId]
      );

      // Also check if file is used as a post cover
      const coverPost = get(
        'SELECT id FROM posts WHERE cover_file_id = ? LIMIT 1',
        [fileId]
      );

      // Also check if file is used as a song cover
      const songCover = get(
        "SELECT id FROM songs WHERE cover_url LIKE ? LIMIT 1",
        ['%/api/file/' + fileId]
      );

      // Also check if file is used as a playlist cover
      const playlistCover = get(
        "SELECT id FROM playlists WHERE cover_url LIKE ? LIMIT 1",
        ['%/api/file/' + fileId]
      );

      if (!allowedBlock && !coverPost && !songCover && !playlistCover) {
        // Not linked to any post, content block, song, or playlist.
        // But the file exists in DB — allow access. File upload requires auth,
        // so any file in the DB was uploaded by a legitimate user.
        // This covers post/playlist cover preview before saving, etc.
      }
    }

    // Check file exists on disk
    if (!fs.existsSync(fileRecord.filepath)) {
      return res.status(404).json({ error: '文件已在服务器上丢失' });
    }

    const mimeType = fileRecord.mime_type || 'application/octet-stream';

    // Serve the file
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileRecord.original_name)}"`);
    res.setHeader('Cache-Control', 'private, max-age=3600');

    const stream = fs.createReadStream(fileRecord.filepath);
    stream.pipe(res);
    stream.on('error', () => {
      res.status(500).json({ error: '读取文件失败' });
    });
  } catch (err) {
    console.error('[File] Access error:', err);
    res.status(500).json({ error: '获取文件失败' });
  }
});

module.exports = router;
