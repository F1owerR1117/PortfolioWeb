// Notification Model
const { run, get, all } = require('../db/init');

const Notification = {
  findByUser(userId) {
    return all(
      `SELECT n.*, u.username as actor_name, up.avatar_url as actor_avatar,
              p.title as post_title, p.deleted_at as post_deleted,
              c.content as reply_content
       FROM notifications n
       JOIN users u ON n.actor_id = u.id
       LEFT JOIN user_profiles up ON u.id = up.user_id
       LEFT JOIN posts p ON n.post_id = p.id
       LEFT JOIN comments c ON n.comment_id = c.id
       WHERE n.user_id = ?
       ORDER BY n.created_at DESC`,
      [userId]
    );
  },

  create(userId, actorId, type, postId, commentId) {
    run(
      'INSERT INTO notifications (user_id, actor_id, type, post_id, comment_id) VALUES (?, ?, ?, ?, ?)',
      [userId, actorId, type, postId || null, commentId || null]
    );
  },

  markRead(notificationId) {
    run('UPDATE notifications SET is_read = 1 WHERE id = ?', [notificationId]);
  },

  markAllRead(userId) {
    run('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [userId]);
  },

  getUnreadCount(userId) {
    const row = get('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0', [userId]);
    return row ? row.count : 0;
  }
};

module.exports = Notification;
