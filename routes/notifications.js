const express = require('express');
const router = express.Router();
const { run, get, all } = require('../db/init');
const { requireAuth } = require('../middleware/auth');

// GET /api/notifications — list notifications for current user
router.get('/notifications', requireAuth, async (req, res) => {
  try {
    const notifications = all(
      `SELECT n.id, n.user_id, n.actor_id, n.type, n.post_id, n.comment_id,
              n.parent_comment_id, n.is_read, n.created_at,
              a.username AS actor_name,
              CASE WHEN p.deleted_at IS NOT NULL THEN '[原帖已删除]'
                   WHEN p.title IS NOT NULL THEN p.title
                   ELSE '' END AS post_title,
              CASE WHEN p.deleted_at IS NOT NULL THEN 1 ELSE 0 END AS post_deleted,
              CASE WHEN COALESCE(c.content, '') != '' THEN
                CASE WHEN length(c.content) > 80
                  THEN substr(c.content, 1, 80) || '…'
                  ELSE c.content
                END
              ELSE '' END AS reply_content
       FROM notifications n
       JOIN users a ON n.actor_id = a.id
       LEFT JOIN posts p ON n.post_id = p.id
       LEFT JOIN comments c ON n.comment_id = c.id
       WHERE n.user_id = ?
       ORDER BY n.is_read ASC, n.created_at DESC
       LIMIT 50`,
      [req.session.userId]
    );
    res.json({ notifications });
  } catch (err) {
    console.error('[Notifications] List error:', err);
    res.status(500).json({ error: '获取通知失败' });
  }
});

// GET /api/notifications/unread-count
router.get('/notifications/unread-count', requireAuth, async (req, res) => {
  try {
    const result = get(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
      [req.session.userId]
    );
    res.json({ count: result ? result.count : 0 });
  } catch (err) {
    console.error('[Notifications] Count error:', err);
    res.status(500).json({ error: '获取未读数失败' });
  }
});

// PUT /api/notifications/:id/read — mark one notification as read
router.put('/notifications/:id/read', requireAuth, async (req, res) => {
  try {
    const notifId = parseInt(req.params.id);
    if (isNaN(notifId)) return res.status(400).json({ error: '无效的通知ID' });

    const notif = get('SELECT * FROM notifications WHERE id = ? AND user_id = ?', [notifId, req.session.userId]);
    if (!notif) return res.status(404).json({ error: '通知不存在' });

    run('UPDATE notifications SET is_read = 1 WHERE id = ?', [notifId]);
    res.json({ message: '已标记为已读' });
  } catch (err) {
    console.error('[Notifications] Mark read error:', err);
    res.status(500).json({ error: '标记已读失败' });
  }
});

// PUT /api/notifications/read-all — mark all as read
router.put('/notifications/read-all', requireAuth, async (req, res) => {
  try {
    run('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0', [req.session.userId]);
    res.json({ message: '已全部标记为已读' });
  } catch (err) {
    console.error('[Notifications] Mark all read error:', err);
    res.status(500).json({ error: '标记全部已读失败' });
  }
});

module.exports = router;
