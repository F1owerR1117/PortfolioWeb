const express = require('express');
const fs = require('fs');
const router = express.Router();
const { get } = require('../db/init');
const { requireAuth } = require('../middleware/auth');
const logger = require('../logger');

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
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.send('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="#333" rx="8"/><text x="20" y="28" text-anchor="middle" font-size="20" fill="#888">?</text></svg>');
    }
    const ext = require('path').extname(filename).toLowerCase();
    const mimeMap = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp' };
    res.setHeader('Content-Type', mimeMap[ext] || 'application/octet-stream');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, max-age=86400');
    const stream = require('fs').createReadStream(filepath);
    stream.pipe(res);
    stream.on('error', () => { res.status(500).json({ error: '读取文件失败' }); });
  } catch (err) {
    logger.error('[File] Avatar error:', err);
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

      // Also check if file is used as a login notice image
      const loginNoticeImage = get(
        "SELECT id FROM login_notices WHERE image_url LIKE ? LIMIT 1",
        ['%/api/file/' + fileId]
      );

      if (!allowedBlock && !coverPost && !songCover && !playlistCover && !loginNoticeImage) {
        // SECURITY: default deny — only serve files that are linked to public content
        return res.status(403).json({ error: '无权访问此文件' });
      }
    }

    // Check file exists on disk
    if (!fs.existsSync(fileRecord.filepath)) {
      // Return transparent placeholder instead of 404 to suppress browser console errors
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.send('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>');
    }

    const mimeType = fileRecord.mime_type || 'application/octet-stream';

    // Serve the file
    res.setHeader('Content-Type', mimeType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileRecord.original_name)}"`);
    res.setHeader('Cache-Control', 'private, max-age=3600');

    const stream = fs.createReadStream(fileRecord.filepath);
    stream.pipe(res);
    stream.on('error', () => {
      res.status(500).json({ error: '读取文件失败' });
    });
  } catch (err) {
    logger.error('[File] Access error:', err);
    res.status(500).json({ error: '获取文件失败' });
  }
});

module.exports = router;
