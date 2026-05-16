const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const LoginNoticeService = require('../services/LoginNoticeService');
const logger = require('../logger');

// GET /api/login-notices — get unseen notices for current user
router.get('/login-notices', requireAuth, async (req, res) => {
  try {
    const notices = LoginNoticeService.getUnseenNotices(req.session.userId);
    res.json({ notices });
  } catch (err) {
    logger.error('[LoginNotices] Get error:', err.message || err);
    res.status(500).json({ error: '获取通知失败' });
  }
});

// POST /api/login-notices/:id/view — mark notice as viewed
router.post('/login-notices/:id/view', requireAuth, async (req, res) => {
  try {
    const noticeId = parseInt(req.params.id);
    if (isNaN(noticeId)) return res.status(400).json({ error: '无效的通知ID' });
    LoginNoticeService.markViewed(req.session.userId, noticeId);
    res.json({ message: '已标记为已读' });
  } catch (err) {
    logger.error('[LoginNotices] View error:', err.message || err);
    res.status(500).json({ error: '操作失败' });
  }
});

// Admin routes
// GET /api/admin/login-notices — list all notices
router.get('/admin/login-notices', requireAdmin, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const result = LoginNoticeService.listNotices(page, limit);
    res.json({
      notices: result.notices,
      pagination: { page, limit, total: result.total, totalPages: Math.ceil(result.total / limit) }
    });
  } catch (err) {
    logger.error('[Admin LoginNotices] List error:', err.message || err);
    res.status(500).json({ error: '获取通知列表失败' });
  }
});

// POST /api/admin/login-notices — create notice
router.post('/admin/login-notices', requireAdmin, async (req, res) => {
  try {
    const result = LoginNoticeService.createNotice(req.body);
    res.json({ message: '通知创建成功', id: result.lastID });
  } catch (err) {
    const status = err.status || 500;
    logger.error('[Admin LoginNotices] Create error:', err.message || err);
    res.status(status).json({ error: err.message || '创建失败' });
  }
});

// PUT /api/admin/login-notices/:id — update notice
router.put('/admin/login-notices/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: '无效的通知ID' });
    LoginNoticeService.updateNotice(id, req.body);
    res.json({ message: '通知已更新' });
  } catch (err) {
    const status = err.status || 500;
    logger.error('[Admin LoginNotices] Update error:', err.message || err);
    res.status(status).json({ error: err.message || '更新失败' });
  }
});

// DELETE /api/admin/login-notices/:id — delete notice
router.delete('/admin/login-notices/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: '无效的通知ID' });
    LoginNoticeService.deleteNotice(id);
    res.json({ message: '通知已删除' });
  } catch (err) {
    const status = err.status || 500;
    logger.error('[Admin LoginNotices] Delete error:', err.message || err);
    res.status(status).json({ error: err.message || '删除失败' });
  }
});

// PATCH /api/admin/login-notices/:id/status — toggle active
router.patch('/admin/login-notices/:id/status', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: '无效的通知ID' });
    const result = LoginNoticeService.toggleActive(id);
    res.json({ message: '状态已更新', is_active: result.is_active });
  } catch (err) {
    const status = err.status || 500;
    logger.error('[Admin LoginNotices] Status error:', err.message || err);
    res.status(status).json({ error: err.message || '操作失败' });
  }
});

module.exports = router;
