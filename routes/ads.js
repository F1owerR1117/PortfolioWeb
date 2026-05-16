const express = require('express');
const router = express.Router();
const { run, get, all, getFirst } = require('../db/init');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const logger = require('../logger');

// GET /api/ads — get active ads grouped by position
router.get('/ads', requireAuth, (req, res) => {
  try {
    const ads = all(
      `SELECT id, title, image_file_id, link_url, position, display_pages FROM ads
       WHERE is_active = 1 ORDER BY position, sort_order ASC, created_at DESC`
    );
    const result = { left: [], right: [] };
    for (const ad of ads) {
      const entry = {
        id: ad.id,
        title: ad.title || '',
        image_url: ad.image_file_id ? `/api/file/${ad.image_file_id}` : null,
        link_url: ad.link_url || '',
        display_pages: ad.display_pages || 'works,chats'
      };
      if (ad.position === 'left') result.left.push(entry);
      else result.right.push(entry);
    }
    res.json(result);
  } catch (err) {
    logger.error('[Ads] Get error:', err);
    res.status(500).json({ error: '获取广告失败' });
  }
});

// POST /api/ads/:id/click — record ad click
router.post('/ads/:id/click', requireAuth, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: '无效的广告ID' });
    run('UPDATE ads SET click_count = click_count + 1 WHERE id = ?', [id]);
    res.json({ message: '已记录' });
  } catch (err) {
    logger.error('[Ads] Click error:', err);
    res.status(500).json({ error: '记录失败' });
  }
});

// Admin endpoints
// GET /api/admin/ads — list all ads
router.get('/admin/ads', requireAdmin, (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;
    const total = getFirst('SELECT COUNT(*) as count FROM ads');
    const ads = all(
      `SELECT a.*, f.original_name as file_name FROM ads a
       LEFT JOIN files f ON f.id = a.image_file_id
       ORDER BY a.position, a.sort_order ASC, a.created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    res.json({
      ads,
      pagination: { page, limit, total: total.count, totalPages: Math.ceil(total.count / limit) }
    });
  } catch (err) {
    logger.error('[Admin Ads] List error:', err);
    res.status(500).json({ error: '获取广告列表失败' });
  }
});

// POST /api/admin/ads — create ad
router.post('/admin/ads', requireAdmin, (req, res) => {
  try {
    const { title, image_file_id, link_url, position, sort_order, display_pages } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ error: '标题不能为空' });
    if (position && !['left', 'right'].includes(position)) return res.status(400).json({ error: '无效的位置' });
    const pages = display_pages ? (Array.isArray(display_pages) ? display_pages.join(',') : display_pages) : 'works,chats';
    const result = run(
      `INSERT INTO ads (title, image_file_id, link_url, position, sort_order, display_pages)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [title.trim(), image_file_id || null, link_url || '', position || 'right', parseInt(sort_order) || 0, pages]
    );
    res.json({ message: '广告创建成功', id: result.lastID });
  } catch (err) {
    logger.error('[Admin Ads] Create error:', err);
    res.status(500).json({ error: '创建失败' });
  }
});

// PUT /api/admin/ads/:id — update ad
router.put('/admin/ads/:id', requireAdmin, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: '无效的广告ID' });
    const ad = getFirst('SELECT id FROM ads WHERE id = ?', [id]);
    if (!ad) return res.status(404).json({ error: '广告不存在' });

    const { title, image_file_id, link_url, position, sort_order, display_pages } = req.body;
    const fields = [];
    const params = [];
    if (title !== undefined) { fields.push('title = ?'); params.push(title.trim()); }
    if (image_file_id !== undefined) { fields.push('image_file_id = ?'); params.push(image_file_id || null); }
    if (link_url !== undefined) { fields.push('link_url = ?'); params.push(link_url); }
    if (position !== undefined) {
      if (!['left', 'right'].includes(position)) return res.status(400).json({ error: '无效的位置' });
      fields.push('position = ?'); params.push(position);
    }
    if (sort_order !== undefined) { fields.push('sort_order = ?'); params.push(parseInt(sort_order) || 0); }
    if (display_pages !== undefined) {
      const pages = Array.isArray(display_pages) ? display_pages.join(',') : display_pages;
      fields.push('display_pages = ?'); params.push(pages);
    }
    if (fields.length === 0) return res.status(400).json({ error: '请指定要更新的字段' });
    fields.push("updated_at = CURRENT_TIMESTAMP");
    params.push(id);
    run(`UPDATE ads SET ${fields.join(', ')} WHERE id = ?`, params);
    res.json({ message: '广告已更新' });
  } catch (err) {
    logger.error('[Admin Ads] Update error:', err);
    res.status(500).json({ error: '更新失败' });
  }
});

// DELETE /api/admin/ads/:id — delete ad
router.delete('/admin/ads/:id', requireAdmin, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: '无效的广告ID' });
    run('DELETE FROM ads WHERE id = ?', [id]);
    res.json({ message: '广告已删除' });
  } catch (err) {
    logger.error('[Admin Ads] Delete error:', err);
    res.status(500).json({ error: '删除失败' });
  }
});

// PATCH /api/admin/ads/:id/status — toggle active
router.patch('/admin/ads/:id/status', requireAdmin, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: '无效的广告ID' });
    const ad = getFirst('SELECT is_active FROM ads WHERE id = ?', [id]);
    if (!ad) return res.status(404).json({ error: '广告不存在' });
    const newStatus = ad.is_active ? 0 : 1;
    run('UPDATE ads SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newStatus, id]);
    res.json({ message: '状态已更新', is_active: !!newStatus });
  } catch (err) {
    logger.error('[Admin Ads] Status error:', err);
    res.status(500).json({ error: '操作失败' });
  }
});

// POST /api/admin/ads/:id/image — set ad image via file_id
router.post('/admin/ads/:id/image', requireAdmin, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: '无效的广告ID' });
    const { file_id } = req.body;
    if (!file_id) return res.status(400).json({ error: '请提供文件ID' });
    run('UPDATE ads SET image_file_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [file_id, id]);
    res.json({ message: '广告图片已更新' });
  } catch (err) {
    logger.error('[Admin Ads] Image error:', err);
    res.status(500).json({ error: '更新图片失败' });
  }
});

module.exports = router;
