const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const NotificationService = require('../services/NotificationService');
const logger = require('../logger');

// GET /api/notifications
router.get('/notifications', requireAuth, async (req, res) => {
  try {
    const notifications = NotificationService.list(req.session.userId);
    res.json({ notifications });
  } catch (err) {
    logger.error('[Notifications] List error:', err);
    res.status(500).json({ error: '获取通知失败' });
  }
});

// GET /api/notifications/unread-count
router.get('/notifications/unread-count', requireAuth, async (req, res) => {
  try {
    const count = NotificationService.getUnreadCount(req.session.userId);
    res.json({ count });
  } catch (err) {
    logger.error('[Notifications] Count error:', err);
    res.status(500).json({ error: '获取未读数失败' });
  }
});

// PUT /api/notifications/:id/read
router.put('/notifications/:id/read', requireAuth, async (req, res) => {
  try {
    const notifId = parseInt(req.params.id);
    if (isNaN(notifId)) return res.status(400).json({ error: '无效的通知ID' });
    NotificationService.markRead(notifId, req.session.userId);
    res.json({ message: '已标记为已读' });
  } catch (err) {
    const status = err.status || 500;
    logger.error('[Notifications] Mark read error:', err.message || err);
    res.status(status).json({ error: err.message || '标记已读失败' });
  }
});

// PUT /api/notifications/read-all
router.put('/notifications/read-all', requireAuth, async (req, res) => {
  try {
    NotificationService.markAllRead(req.session.userId);
    res.json({ message: '已全部标记为已读' });
  } catch (err) {
    logger.error('[Notifications] Mark all read error:', err);
    res.status(500).json({ error: '标记全部已读失败' });
  }
});

module.exports = router;
