const express = require('express');
const router = express.Router();
const { run, get, all } = require('../db/init');
const LevelService = require('../services/LevelService');
const { requireAuth, requireNotBanned } = require('../middleware/auth');
const { requireJobRole } = require('../middleware/zoneAccess');
const logger = require('../logger');

// Create notification when someone replies to a comment
function createReplyNotification(commentId, parentCommentId, replyUserId, postId) {
  const parent = get('SELECT user_id FROM comments WHERE id = ?', [parentCommentId]);
  if (!parent) return;
  if (parent.user_id === replyUserId) return;
  run(
    'INSERT INTO notifications (user_id, actor_id, type, post_id, comment_id, parent_comment_id) VALUES (?, ?, ?, ?, ?, ?)',
    [parent.user_id, replyUserId, 'reply', postId, commentId, parentCommentId]
  );
}

// GET /api/posts/:postId/comments
router.get('/posts/:postId/comments', requireAuth, async (req, res) => {
  try {
    const postId = parseInt(req.params.postId);
    if (isNaN(postId)) return res.status(400).json({ error: '无效的帖子ID' });
    const post = get('SELECT id FROM posts WHERE id = ? AND deleted_at IS NULL', [postId]);
    if (!post) return res.status(404).json({ error: '作品不存在' });
    const comments = all(
      `SELECT c.id, c.post_id, c.parent_id, c.user_id, c.content, c.created_at, c.updated_at,
              u.username, COALESCE(u.level, 1) as user_level,
              COALESCE(lc.name, '') as level_name,
              COALESCE(up.nickname, '') as nickname,
              COALESCE(up.avatar_url, '') as avatar_url
       FROM comments c
       JOIN users u ON c.user_id = u.id
       LEFT JOIN level_config lc ON lc.level = u.level
       LEFT JOIN user_profiles up ON up.user_id = c.user_id
       WHERE c.post_id = ?
       ORDER BY COALESCE(c.parent_id, c.id), c.created_at ASC`,
      [postId]
    );
    res.json({ comments });
  } catch (err) {
    logger.error('[Comments] List error:', err);
    res.status(500).json({ error: '获取评论失败' });
  }
});

// POST /api/posts/:postId/comments
router.post('/posts/:postId/comments', requireAuth, requireNotBanned, async (req, res) => {
  try {
    const postId = parseInt(req.params.postId);
    if (isNaN(postId)) return res.status(400).json({ error: '无效的帖子ID' });
    const { content, parent_id } = req.body;
    if (!content || content.trim().length === 0) return res.status(400).json({ error: '评论内容不能为空' });
    if (content.length > 2000) return res.status(400).json({ error: '评论内容不能超过2000字' });

    const post = get('SELECT id, is_locked, deleted_at, category FROM posts WHERE id = ?', [postId]);
    if (!post || post.deleted_at) return res.status(404).json({ error: '作品不存在' });
    if (post.is_locked) return res.status(403).json({ error: '该帖子已被锁定，无法回复' });
    if (post.category === 'job' && req.session.role !== 'admin') {
      const user = get('SELECT job_role_approved FROM users WHERE id = ?', [req.session.userId]);
      if (!user || !user.job_role_approved) {
        return res.status(403).json({ error: '请先申请招聘者/求职者身份才能回复' });
      }
    }

    if (parent_id) {
      const parent = get('SELECT id, post_id FROM comments WHERE id = ?', [parent_id]);
      if (!parent) return res.status(404).json({ error: '回复的评论不存在' });
      if (parent.post_id !== postId) return res.status(400).json({ error: '评论与帖子不匹配' });
    }

    const result = run(
      'INSERT INTO comments (post_id, parent_id, user_id, content) VALUES (?, ?, ?, ?)',
      [postId, parent_id || null, req.session.userId, content.trim()]
    );

    const comment = get(
      `SELECT c.id, c.post_id, c.parent_id, c.user_id, c.content, c.created_at, c.updated_at,
              u.username, COALESCE(u.level, 1) as user_level,
              COALESCE(up.avatar_url, '') as avatar_url
       FROM comments c JOIN users u ON c.user_id = u.id
       LEFT JOIN user_profiles up ON up.user_id = c.user_id WHERE c.id = ?`,
      [result.lastID]
    );

    if (parent_id) {
      createReplyNotification(result.lastID, parent_id, req.session.userId, postId);
    } else {
      const postAuthor = get('SELECT created_by FROM posts WHERE id = ?', [postId]);
      if (postAuthor && postAuthor.created_by !== req.session.userId) {
        run('INSERT INTO notifications (user_id, actor_id, type, post_id, comment_id) VALUES (?, ?, ?, ?, ?)',
          [postAuthor.created_by, req.session.userId, 'comment', postId, result.lastID]);
      }
    }

    LevelService.addXP(req.session.userId, 10);
    if (parent_id) {
      const parentComment = get('SELECT user_id FROM comments WHERE id = ?', [parent_id]);
      if (parentComment && parentComment.user_id !== req.session.userId) LevelService.addXP(parentComment.user_id, 5);
    } else {
      const postAuthor = get('SELECT created_by FROM posts WHERE id = ?', [postId]);
      if (postAuthor && postAuthor.created_by !== req.session.userId) LevelService.addXP(postAuthor.created_by, 5);
    }

    res.status(201).json({ message: '评论发布成功', comment });
  } catch (err) {
    logger.error('[Comments] Create error:', err);
    res.status(500).json({ error: '发布评论失败' });
  }
});

// PUT /api/comments/:id
router.put('/comments/:id', requireAuth, async (req, res) => {
  try {
    const commentId = parseInt(req.params.id);
    if (isNaN(commentId)) return res.status(400).json({ error: '无效的评论ID' });
    const { content } = req.body;
    if (!content || content.trim().length === 0) return res.status(400).json({ error: '评论内容不能为空' });
    if (content.length > 2000) return res.status(400).json({ error: '评论内容不能超过2000字' });

    const comment = get('SELECT * FROM comments WHERE id = ?', [commentId]);
    if (!comment) return res.status(404).json({ error: '评论不存在' });
    if (comment.user_id !== req.session.userId && req.session.role !== 'admin') {
      return res.status(403).json({ error: '无权编辑此评论' });
    }

    run("UPDATE comments SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [content.trim(), commentId]);
    const updated = get(
      `SELECT c.id, c.post_id, c.parent_id, c.user_id, c.content, c.created_at, c.updated_at,
              u.username, COALESCE(u.level, 1) as user_level, COALESCE(up.avatar_url, '') as avatar_url
       FROM comments c JOIN users u ON c.user_id = u.id
       LEFT JOIN user_profiles up ON up.user_id = c.user_id WHERE c.id = ?`,
      [commentId]
    );
    res.json({ message: '评论已更新', comment: updated });
  } catch (err) {
    logger.error('[Comments] Update error:', err);
    res.status(500).json({ error: '更新评论失败' });
  }
});

// DELETE /api/comments/:id
router.delete('/comments/:id', requireAuth, async (req, res) => {
  try {
    const commentId = parseInt(req.params.id);
    if (isNaN(commentId)) return res.status(400).json({ error: '无效的评论ID' });
    const comment = get('SELECT * FROM comments WHERE id = ?', [commentId]);
    if (!comment) return res.status(404).json({ error: '评论不存在' });
    if (comment.user_id !== req.session.userId && req.session.role !== 'admin') {
      return res.status(403).json({ error: '无权删除此评论' });
    }

    const idsToDelete = [commentId];
    const collectDescendants = (parentId) => {
      const children = all('SELECT id FROM comments WHERE parent_id = ?', [parentId]);
      children.forEach(child => { idsToDelete.push(child.id); collectDescendants(child.id); });
    };
    collectDescendants(commentId);

    const placeholders = idsToDelete.map(() => '?').join(',');
    run(`DELETE FROM notifications WHERE comment_id IN (${placeholders}) OR parent_comment_id IN (${placeholders})`, [...idsToDelete, ...idsToDelete]);
    idsToDelete.reverse().forEach(id => { if (id !== commentId) run('DELETE FROM comments WHERE id = ?', [id]); });
    run('DELETE FROM comments WHERE id = ?', [commentId]);

    res.json({ message: '评论已删除' });
  } catch (err) {
    logger.error('[Comments] Delete error:', err);
    res.status(500).json({ error: '删除评论失败' });
  }
});

module.exports = router;
