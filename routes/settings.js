const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const { get, run } = require('../db/init');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { soundUpload, soundsDir } = require('../middleware/upload');
const logger = require('../logger');

// GET /api/settings/sound — get sound settings
router.get('/sound', async (req, res) => {
  try {
    const soundUrlSetting = get("SELECT value FROM settings WHERE key = 'sound_url'");
    const soundVolume = get("SELECT value FROM settings WHERE key = 'sound_volume'");

    // Check if custom sound file exists
    const soundPath = path.join(soundsDir, 'click.mp3');
    const hasCustomSound = fs.existsSync(soundPath);

    res.json({
      sound_url: hasCustomSound ? `/api/settings/sound/file` : null,
      sound_volume: parseFloat(soundVolume?.value || '0.5'),
      has_custom_sound: hasCustomSound
    });
  } catch (err) {
    logger.error('[Settings] Get sound error:', err);
    res.status(500).json({ error: '获取声音设置失败' });
  }
});

// POST /api/settings/sound/upload — upload sound file (admin only)
router.post('/sound/upload', requireAdmin, (req, res) => {
  soundUpload.single('sound_file')(req, res, async (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: '音频文件不能超过500KB' });
      }
      return res.status(400).json({ error: err.message || '上传失败' });
    }

    if (!req.file) {
      return res.status(400).json({ error: '请选择音频文件' });
    }

    try {
      const soundPath = path.join(soundsDir, 'click.mp3');

      // Store a file record for the sound
      const result = run(
        'INSERT INTO files (filename, original_name, mime_type, filepath, size) VALUES (?, ?, ?, ?, ?)',
        [req.file.filename, req.file.originalname, req.file.mimetype, soundPath, req.file.size]
      );

      const fileId = result.lastID;
      run("UPDATE settings SET value = ? WHERE key = 'sound_url'", [String(fileId)]);

      res.json({
        message: '提示音上传成功',
        sound_url: `/api/settings/sound/file`,
        file_id: fileId
      });
    } catch (dbErr) {
      logger.error('[Settings] Sound upload DB error:', dbErr);
      res.status(500).json({ error: '保存声音设置失败' });
    }
  });
});

// PUT /api/settings/sound — update sound volume (admin only)
router.put('/sound', requireAdmin, async (req, res) => {
  try {
    const { volume } = req.body;
    if (typeof volume !== 'number' || volume < 0 || volume > 1) {
      return res.status(400).json({ error: '音量值必须在0-1之间' });
    }

    run("UPDATE settings SET value = ? WHERE key = 'sound_volume'", [String(volume)]);

    res.json({ message: '音量设置已更新', volume });
  } catch (err) {
    logger.error('[Settings] Update volume error:', err);
    res.status(500).json({ error: '更新音量设置失败' });
  }
});

// GET /api/settings/sound/file — serve the click sound file (require auth)
router.get('/sound/file', requireAuth, async (req, res) => {
  try {
    const soundPath = path.join(soundsDir, 'click.mp3');
    if (!fs.existsSync(soundPath)) {
      return res.status(404).json({ error: '未上传自定义提示音' });
    }

    const soundUrlSetting = get("SELECT value FROM settings WHERE key = 'sound_url'");
    const fileId = parseInt(soundUrlSetting?.value || '0');

    // If there's a file record, check permissions
    if (fileId > 0) {
      const fileRecord = get('SELECT * FROM files WHERE id = ?', [fileId]);
      if (fileRecord && fs.existsSync(fileRecord.filepath)) {
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Cache-Control', 'private, max-age=3600');
        const stream = fs.createReadStream(fileRecord.filepath);
        stream.pipe(res);
        return;
      }
    }

    // Fallback: serve directly from soundsDir
    if (fs.existsSync(soundPath)) {
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Cache-Control', 'private, max-age=3600');
      const stream = fs.createReadStream(soundPath);
      stream.pipe(res);
    } else {
      res.status(404).json({ error: '提示音文件未找到' });
    }
  } catch (err) {
    logger.error('[Settings] Serve sound error:', err);
    res.status(500).json({ error: '获取提示音文件失败' });
  }
});

module.exports = router;
