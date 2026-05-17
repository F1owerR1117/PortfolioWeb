// NotificationService
const { get, run, all } = require('../db/init');

const NotificationService = {
  list(userId) {
    return all(
      `SELECT n.id, n.user_id, n.actor_id, n.type, n.post_id, n.comment_id,
              n.parent_comment_id, n.is_read, n.created_at,
              a.username AS actor_name,
              CASE WHEN p.deleted_at IS NOT NULL THEN '[原帖已删除]' WHEN p.title IS NOT NULL THEN p.title ELSE '' END AS post_title,
              CASE WHEN p.deleted_at IS NOT NULL THEN 1 ELSE 0 END AS post_deleted,
              CASE WHEN COALESCE(c.content, '') != '' THEN
                CASE WHEN length(c.content) > 80 THEN substr(c.content, 1, 80) || '…' ELSE c.content END
              ELSE '' END AS reply_content
       FROM notifications n
       JOIN users a ON n.actor_id = a.id
       LEFT JOIN posts p ON n.post_id = p.id
       LEFT JOIN comments c ON n.comment_id = c.id
       WHERE n.user_id = ?
       ORDER BY n.is_read ASC, n.created_at DESC LIMIT 50`,
      [userId]
    );
  },

  getUnreadCount(userId) {
    const result = get('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0', [userId]);
    return result ? result.count : 0;
  },

  listAdmin() {
    return all(
      `SELECT n.id, n.user_id, n.actor_id, n.type, n.post_id, n.comment_id,
              n.is_read, n.created_at, n.message, n.target_url,
              a.username AS actor_name
       FROM notifications n
       JOIN users a ON n.actor_id = a.id
       WHERE n.type IN ('admin_report','admin_application','admin_system')
       ORDER BY n.created_at DESC LIMIT 50`
    );
  },

  markRead(notificationId, userId) {
    const notif = get('SELECT * FROM notifications WHERE id = ? AND user_id = ?', [notificationId, userId]);
    if (!notif) throw { status: 404, message: '通知不存在' };
    run('UPDATE notifications SET is_read = 1 WHERE id = ?', [notificationId]);
  },

  markAllRead(userId) {
    run('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0', [userId]);
  }
};

module.exports = NotificationService;
