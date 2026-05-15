const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { run, get } = require('../db/init');

// POST /api/user/avatar — upload/resize avatar for current user
// Uses a userID+timestamp filename to bust caches
router.post('/user/avatar', requireAuth, (req, res) => {
  const multer = require('multer');
  const uploadsDir = path.resolve('./uploads');

  const avatarStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
      const ts = Date.now();
      const name = `avatar_user${req.session.userId}_${ts}${ext}`;
      cb(null, name);
    }
  });

  const avatarUpload = multer({
    storage: avatarStorage,
    fileFilter: (req, file, cb) => {
      const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (imageTypes.includes(file.mimetype)) return cb(null, true);
      cb(new Error('仅支持 JPG/PNG/GIF/WebP 格式图片'));
    },
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
  }).single('avatar');

  avatarUpload(req, res, async (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: '头像图片不能超过5MB' });
      }
      return res.status(400).json({ error: err.message || '头像上传失败' });
    }

    if (!req.file) {
      return res.status(400).json({ error: '请选择要上传的图片' });
    }

    try {
      const fileUrl = `/api/file/avatar/${req.file.filename}`;
      const userId = req.session.userId;

      // Get old avatar URL to delete old file later
      const oldProfile = get('SELECT avatar_url FROM user_profiles WHERE user_id = ?', [userId]);

      // Update or insert avatar_url
      const existing = get('SELECT user_id FROM user_profiles WHERE user_id = ?', [userId]);
      if (existing) {
        run('UPDATE user_profiles SET avatar_url = ? WHERE user_id = ?', [fileUrl, userId]);
      } else {
        run('INSERT INTO user_profiles (user_id, avatar_url) VALUES (?, ?)', [userId, fileUrl]);
      }

      // Delete old avatar file if it was an uploaded file (starts with /api/file/avatar/)
      if (oldProfile && oldProfile.avatar_url) {
        const oldMatch = oldProfile.avatar_url.match(/^\/api\/file\/avatar\/(.+)$/);
        if (oldMatch) {
          const oldPath = path.join(uploadsDir, oldMatch[1]);
          try {
            if (fs.existsSync(oldPath)) {
              fs.unlinkSync(oldPath);
              console.log('[Avatar] Deleted old avatar:', oldPath);
            }
          } catch (cleanErr) {
            console.error('[Avatar] Failed to delete old avatar:', cleanErr);
          }
        }
      }

      res.json({
        message: '头像已更新',
        avatar_url: fileUrl
      });
    } catch (dbErr) {
      console.error('[Avatar] DB error:', dbErr);
      // Clean up uploaded file on error
      try { if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path); } catch (e) {}
      res.status(500).json({ error: '保存头像失败' });
    }
  });
});

module.exports = router;
