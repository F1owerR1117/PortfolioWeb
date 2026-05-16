const express = require('express');
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { generalUpload, attachmentUpload, uploadsDir } = require('../middleware/upload');
const { run } = require('../db/init');
const logger = require('../logger');

// Per-category size limits (bytes)
const SIZE_LIMITS = {
  image: 5 * 1024 * 1024,
  video: 50 * 1024 * 1024,
  code: 1024 * 1024
};

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg', 'video/x-msvideo', 'video/quicktime'];
const CODE_EXT = ['.txt', '.js', '.py', '.html', '.css', '.json'];

function getFileCategory(mimeType, ext) {
  if (IMAGE_TYPES.includes(mimeType)) return 'image';
  if (VIDEO_TYPES.includes(mimeType)) return 'video';
  if (CODE_EXT.includes(ext)) return 'code';
  return null;
}

// POST /api/upload — upload a file (any auth user)
router.post('/', requireAuth, (req, res) => {
  generalUpload.single('file')(req, res, async (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: '文件大小超出限制（图片5MB/视频50MB/代码1MB）' });
      }
      return res.status(400).json({ error: err.message || '文件上传失败' });
    }

    if (!req.file) {
      return res.status(400).json({ error: '请选择要上传的文件' });
    }

    try {
      const filepath = path.join(uploadsDir, req.file.filename);
      const mimeType = req.file.mimetype || mime.lookup(req.file.originalname) || 'application/octet-stream';
      const ext = path.extname(req.file.originalname).toLowerCase();

      // Determine file category and validate size
      const category = getFileCategory(mimeType, ext);
      if (!category) {
        // Clean up rejected file
        try { if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path); } catch (e) {}
        return res.status(400).json({ error: '不支持的文件类型。允许：图片(jpg/png/gif/webp)、视频(mp4)、代码(txt/js/py/html/css/json)' });
      }

      if (req.file.size > SIZE_LIMITS[category]) {
        // Clean up oversized file
        try { if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path); } catch (e) {}
        const sizeLabels = { image: '5MB', video: '50MB', code: '1MB' };
        return res.status(400).json({ error: `${category === 'image' ? '图片' : category === 'video' ? '视频' : '代码'}文件不能超过${sizeLabels[category]}` });
      }

      run(
        'INSERT INTO files (filename, original_name, mime_type, filepath, size) VALUES (?, ?, ?, ?, ?)',
        [req.file.filename, req.file.originalname, mimeType, filepath, req.file.size]
      );

      // Get last insert ID
      const { getFirst } = require('../db/init');
      const fileRecord = getFirst('SELECT MAX(id) as id FROM files');
      const fileId = fileRecord ? fileRecord.id : null;

      // If it's a code file, read contents for inline display
      let codeContent = null;
      const codeExtensions = ['.txt', '.js', '.py', '.html', '.css', '.json'];
      if (codeExtensions.includes(ext)) {
        try {
          codeContent = fs.readFileSync(filepath, 'utf-8');
        } catch (readErr) {
          logger.error('[Upload] Read code file error:', readErr);
        }
      }

      res.json({
        message: '文件上传成功',
        file: {
          id: fileId,
          original_name: req.file.originalname,
          mime_type: mimeType,
          size: req.file.size,
          url: `/api/file/${fileId}`,
          code_content: codeContent
        }
      });
    } catch (dbErr) {
      logger.error('[Upload] DB error:', dbErr);

      // Clean up uploaded file on error
      try {
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      } catch (e) { /* ignore */ }

      res.status(500).json({ error: '保存文件信息失败' });
    }
  });
});

// POST /api/upload/attachment — upload an attachment file (any auth user)
router.post('/attachment', requireAuth, (req, res) => {
  attachmentUpload.single('file')(req, res, async (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: '附件不能超过 50MB' });
      }
      return res.status(400).json({ error: err.message || '文件上传失败' });
    }

    if (!req.file) {
      return res.status(400).json({ error: '请选择要上传的文件' });
    }

    try {
      const filepath = path.join(uploadsDir, req.file.filename);
      const mimeType = req.file.mimetype || mime.lookup(req.file.originalname) || 'application/octet-stream';
      const ext = path.extname(req.file.originalname).toLowerCase();

      run(
        'INSERT INTO files (filename, original_name, mime_type, filepath, size) VALUES (?, ?, ?, ?, ?)',
        [req.file.filename, req.file.originalname, mimeType, filepath, req.file.size]
      );

      const { getFirst } = require('../db/init');
      const fileRecord = getFirst('SELECT MAX(id) as id FROM files');
      const fileId = fileRecord ? fileRecord.id : null;

      res.json({
        message: '附件上传成功',
        file: {
          id: fileId,
          original_name: req.file.originalname,
          mime_type: mimeType,
          size: req.file.size,
          url: `/api/file/${fileId}`
        }
      });
    } catch (dbErr) {
      logger.error('[Upload] Attachment DB error:', dbErr);
      try { if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path); } catch (e) {}
      res.status(500).json({ error: '保存文件信息失败' });
    }
  });
});

module.exports = router;
