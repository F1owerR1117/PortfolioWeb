const express = require('express');
const router = express.Router();
const { run, get, all } = require('../db/init');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const logger = require('../logger');

// GET /api/tags — list all tags with usage count (optionally filtered by category)
router.get('/', requireAuth, (req, res) => {
  try {
    const category = req.query.category || null;
    let sql, params;
    if (category && (category === 'work' || category === 'chat')) {
      sql = `SELECT t.*, COUNT(p.id) as count
             FROM tags t
             LEFT JOIN post_tags pt ON t.id = pt.tag_id
             LEFT JOIN posts p ON pt.post_id = p.id AND p.deleted_at IS NULL
             WHERE p.category = ?
             GROUP BY t.id
             ORDER BY count DESC, t.name ASC`;
      params = [category];
    } else {
      sql = `SELECT t.*, COUNT(p.id) as count
             FROM tags t
             LEFT JOIN post_tags pt ON t.id = pt.tag_id
             LEFT JOIN posts p ON pt.post_id = p.id AND p.deleted_at IS NULL
             GROUP BY t.id
             ORDER BY count DESC, t.name ASC`;
      params = [];
    }
    const tags = all(sql, params);
    res.json({ tags });
  } catch (err) {
    logger.error('[Tags] List error:', err);
    res.status(500).json({ error: '获取标签列表失败' });
  }
});

// POST /api/tags — create a tag (any auth user)
router.post('/', requireAuth, (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: '标签名不能为空' });
    }
    const trimmed = name.trim();
    run("INSERT OR IGNORE INTO tags (name) VALUES (?)", [trimmed]);
    const tag = get("SELECT * FROM tags WHERE name = ?", [trimmed]);
    if (!tag) {
      return res.status(409).json({ error: '标签已存在' });
    }
    res.json({ message: '标签创建成功', tag });
  } catch (err) {
    logger.error('[Tags] Create error:', err);
    res.status(500).json({ error: '创建标签失败' });
  }
});

// DELETE /api/tags/:id — delete a tag (admin only)
router.delete('/:id', requireAdmin, (req, res) => {
  try {
    const tagId = parseInt(req.params.id);
    if (isNaN(tagId)) return res.status(400).json({ error: '无效的标签ID' });

    const existing = get('SELECT * FROM tags WHERE id = ?', [tagId]);
    if (!existing) return res.status(404).json({ error: '标签不存在' });

    run('DELETE FROM tags WHERE id = ?', [tagId]);
    res.json({ message: '标签已删除' });
  } catch (err) {
    logger.error('[Tags] Delete error:', err);
    res.status(500).json({ error: '删除标签失败' });
  }
});

module.exports = router;
