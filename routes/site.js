const express = require('express');
const router = express.Router();
const { run, get } = require('../db/init');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// GET /api/site/about — get about page content
router.get('/about', requireAuth, async (req, res) => {
  try {
    const row = get("SELECT value FROM site_info WHERE key = 'about'");
    const about = row ? JSON.parse(row.value) : {
      bio: '',
      skills: [],
      social: {},
      avatar_url: ''
    };
    res.json({ about });
  } catch (err) {
    console.error('[Site] About get error:', err);
    res.status(500).json({ error: '获取关于信息失败' });
  }
});

// PUT /api/site/about — update about page content (admin only)
router.put('/about', requireAdmin, async (req, res) => {
  try {
    const { bio, skills, social, avatar_url } = req.body;

    if (!bio || bio.trim().length === 0) {
      return res.status(400).json({ error: '简介不能为空' });
    }

    const aboutData = {
      bio: bio.trim(),
      skills: Array.isArray(skills) ? skills : [],
      social: social || {},
      avatar_url: avatar_url || ''
    };

    run("INSERT OR REPLACE INTO site_info (key, value) VALUES ('about', ?)",
      JSON.stringify(aboutData));

    res.json({ message: '关于信息已更新', about: aboutData });
  } catch (err) {
    console.error('[Site] About update error:', err);
    res.status(500).json({ error: '更新关于信息失败' });
  }
});

module.exports = router;
