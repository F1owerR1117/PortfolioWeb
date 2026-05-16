// Comment Model
const { run, get, all } = require('../db/init');

const Comment = {
  findByPost(postId) {
    return all(
      `SELECT c.*, u.username, COALESCE(up.nickname, u.username) as nickname,
              up.avatar_url, COALESCE(u.level, 1) as user_level
       FROM comments c
       JOIN users u ON c.user_id = u.id
       LEFT JOIN user_profiles up ON u.id = up.user_id
       WHERE c.post_id = ?
       ORDER BY c.created_at ASC`,
      [postId]
    );
  },

  findById(commentId) {
    return get('SELECT * FROM comments WHERE id = ?', [commentId]);
  },

  create(postId, userId, content, parentId) {
    return run(
      'INSERT INTO comments (post_id, user_id, content, parent_id) VALUES (?, ?, ?, ?)',
      [postId, userId, content, parentId || null]
    );
  },

  update(commentId, content) {
    run('UPDATE comments SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [content, commentId]);
  },

  delete(commentId) {
    run('DELETE FROM comments WHERE id = ?', [commentId]);
  },

  isOwner(commentId, userId) {
    const comment = get('SELECT user_id FROM comments WHERE id = ?', [commentId]);
    return comment && comment.user_id === userId;
  }
};

module.exports = Comment;
