const express = require('express');
const router = express.Router();
const { run, get, addXP } = require('../db/init');
const { requireAuth, requireNotBanned } = require('../middleware/auth');
const logger = require('../logger');

// POST /api/posts/:postId/reaction — like, dislike, or revoke
// Body: { type: "like" | "dislike" | null }
// null = revoke current reaction
router.post('/posts/:postId/reaction', requireAuth, requireNotBanned, async (req, res) => {
  try {
    const postId = parseInt(req.params.postId);
    if (isNaN(postId)) return res.status(400).json({ error: '无效的帖子ID' });

    const post = get('SELECT id FROM posts WHERE id = ?', [postId]);
    if (!post) return res.status(404).json({ error: '帖子不存在' });

    const userId = req.session.userId;
    const { type } = req.body;

    // Validate type
    if (type !== null && type !== 'like' && type !== 'dislike') {
      return res.status(400).json({ error: '无效的表态类型' });
    }

    // Get current reaction for this user+post
    const existing = get(
      'SELECT id, type FROM post_reactions WHERE user_id = ? AND post_id = ?',
      [userId, postId]
    );

    if (type === null) {
      // Revoke: remove existing reaction if any
      if (existing) {
        run('DELETE FROM post_reactions WHERE id = ?', [existing.id]);
        if (existing.type === 'like') {
          run('UPDATE posts SET like_count = MAX(0, like_count - 1) WHERE id = ?', [postId]);
        } else {
          run('UPDATE posts SET dislike_count = MAX(0, dislike_count - 1) WHERE id = ?', [postId]);
        }
      }
    } else {
      if (existing) {
        if (existing.type === type) {
          // Same type already exists — do nothing
          const postCounts = get('SELECT like_count, dislike_count FROM posts WHERE id = ?', [postId]);
          return res.json({
            type: existing.type,
            like_count: postCounts.like_count || 0,
            dislike_count: postCounts.dislike_count || 0,
            message: '已表态'
          });
        }
        // User is changing from like to dislike or vice versa
        // First remove old reaction, then add new one
        run('DELETE FROM post_reactions WHERE id = ?', [existing.id]);
        if (existing.type === 'like') {
          run('UPDATE posts SET like_count = MAX(0, like_count - 1) WHERE id = ?', [postId]);
        } else {
          run('UPDATE posts SET dislike_count = MAX(0, dislike_count - 1) WHERE id = ?', [postId]);
        }
        // Deleted old reaction — notification removed (the toggle creates new notification below)
      }

      // Only create notification if this is a NEW reaction (not same-type)
      const isNewReaction = !existing || existing.type !== type;

      // Add new reaction
      run(
        'INSERT INTO post_reactions (user_id, post_id, type) VALUES (?, ?, ?)',
        [userId, postId, type]
      );
      if (type === 'like') {
        run('UPDATE posts SET like_count = like_count + 1 WHERE id = ?', [postId]);
      } else {
        run('UPDATE posts SET dislike_count = dislike_count + 1 WHERE id = ?', [postId]);
      }

      // Notify post author about the reaction (if not self)
      if (isNewReaction) {
        const postAuthor = get('SELECT created_by FROM posts WHERE id = ?', [postId]);
        if (postAuthor && postAuthor.created_by !== userId) {
          run(
            'INSERT INTO notifications (user_id, actor_id, type, post_id) VALUES (?, ?, ?, ?)',
            [postAuthor.created_by, userId, type, postId]
          );
          // XP reward for receiving a like
          if (type === 'like') addXP(postAuthor.created_by, 2);
        }
      }
    }

    // Return updated counts and current user's reaction
    const postCounts = get('SELECT like_count, dislike_count FROM posts WHERE id = ?', [postId]);
    const currentReaction = get(
      'SELECT type FROM post_reactions WHERE user_id = ? AND post_id = ?',
      [userId, postId]
    );

    res.json({
      type: currentReaction ? currentReaction.type : null,
      like_count: postCounts.like_count || 0,
      dislike_count: postCounts.dislike_count || 0
    });
  } catch (err) {
    logger.error('[Reactions] Error:', err);
    res.status(500).json({ error: '操作失败' });
  }
});

module.exports = router;
