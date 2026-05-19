const express = require('express');
const router = express.Router();
const { run, get, all } = require('../db/init');
const { requireAdmin } = require('../middleware/auth');
const logger = require('../logger');

// GET /api/admin/users — list all users with pagination and search (admin only)
router.get('/admin/users', requireAdmin, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const search = (req.query.search || '').trim();

    let whereClause = '';
    const params = [];

    if (search) {
      // Support searching by username (fuzzy) or email (exact) — email uses exact match
      whereClause = 'WHERE u.username LIKE ?';
      params.push(`%${search}%`);
    }

    const total = get(`SELECT COUNT(*) as count FROM users u ${whereClause}`, params);
    const users = all(
      `SELECT u.id, u.username, u.role, u.created_at, u.is_banned,
              u.banned_until, u.ban_reason,
              u.points, u.level, u.xp,
              u.job_role, u.job_role_approved,
              COALESCE(up.nickname, '') as nickname,
              COALESCE(up.avatar_url, '') as avatar_url
       FROM users u
       LEFT JOIN user_profiles up ON up.user_id = u.id
       ${whereClause}
       ORDER BY u.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      users: users.map(u => ({
        ...u,
        is_banned: !!u.is_banned,
        banned_until: u.banned_until || null,
        ban_reason: u.ban_reason || ''
      })),
      pagination: {
        page,
        limit,
        total: total.count,
        totalPages: Math.ceil(total.count / limit),
        hasMore: offset + limit < total.count
      }
    });
  } catch (err) {
    logger.error('[Admin] List users error:', err);
    res.status(500).json({ error: '获取用户列表失败' });
  }
});

// PATCH /api/admin/users/:userId/ban — toggle ban status (admin only)
router.patch('/admin/users/:userId/ban', requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) return res.status(400).json({ error: '无效的用户ID' });

    // Cannot ban yourself
    if (userId === req.session.userId) {
      return res.status(400).json({ error: '不能禁言自己' });
    }

    const user = get('SELECT id, username, is_banned, banned_until FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: '用户不存在' });

    const { isBanned, banDuration, banReason } = req.body;
    if (typeof isBanned !== 'boolean') {
      return res.status(400).json({ error: '请指定禁言状态' });
    }

    let bannedUntil = null;
    if (isBanned) {
      if (banDuration) {
        // banDuration in hours; use SQLite datetime function
        const result = run("UPDATE users SET is_banned = 1, banned_until = datetime('now', ?), ban_reason = ? WHERE id = ?",
          [`+${parseInt(banDuration)} hours`, banReason || '', userId]);
      } else {
        // Permanent ban
        run('UPDATE users SET is_banned = 1, banned_until = NULL, ban_reason = ? WHERE id = ?',
          [banReason || '', userId]);
      }
      // Fetch the updated banned_until
      const updated = get('SELECT banned_until FROM users WHERE id = ?', [userId]);
      bannedUntil = updated ? updated.banned_until : null;

      // Create notification for the banned user (use a non-admin user as actor, or admin)
      const existingNotif = get('SELECT id FROM notifications WHERE user_id = ? AND type = ? AND is_read = 0',
        [userId, 'banned']);
      if (!existingNotif) {
        run('INSERT INTO notifications (user_id, actor_id, type, post_id) VALUES (?, ?, ?, ?)',
          [userId, req.session.userId, 'banned', null]);
      }
    } else {
      // Unban
      run('UPDATE users SET is_banned = 0, banned_until = NULL, ban_reason = \'\' WHERE id = ?', [userId]);
    }

    const result = {
      message: isBanned ? '用户已禁言' : '用户已解除禁言',
      user: {
        id: user.id,
        username: user.username,
        is_banned: isBanned,
        banned_until: bannedUntil,
        ban_reason: banReason || ''
      }
    };
    res.json(result);
  } catch (err) {
    logger.error('[Admin] Ban user error:', err);
    res.status(500).json({ error: '操作失败' });
  }
});

// DELETE /api/admin/posts/batch — soft-delete posts (admin only)
router.delete('/admin/posts/batch', requireAdmin, async (req, res) => {
  try {
    const { postIds } = req.body;
    if (!Array.isArray(postIds) || postIds.length === 0) {
      return res.status(400).json({ error: '请提供要删除的帖子ID列表' });
    }

    // Deduplicate and filter valid IDs
    const ids = [...new Set(postIds.filter(id => Number.isInteger(id) && id > 0))];
    if (ids.length === 0) {
      return res.status(400).json({ error: '无效的帖子ID' });
    }

    // Verify all posts exist and are not already deleted
    const placeholders = ids.map(() => '?').join(',');
    const existing = all(`SELECT id, title, created_by FROM posts WHERE id IN (${placeholders}) AND deleted_at IS NULL`, ids);
    const existingIds = existing.map(p => p.id);
    const notFoundIds = ids.filter(id => !existingIds.includes(id));

    if (existingIds.length === 0) {
      return res.status(404).json({ error: '没有找到要删除的帖子' });
    }

    // Soft delete in batch
    const delPlaceholders = existingIds.map(() => '?').join(',');
    run(`UPDATE posts SET deleted_at = CURRENT_TIMESTAMP WHERE id IN (${delPlaceholders})`, existingIds);

    // Create notifications for post authors (skip self-deletion)
    const adminId = req.session.userId;
    for (const post of existing) {
      if (post.created_by !== adminId) {
        run('INSERT INTO notifications (user_id, actor_id, type, post_id) VALUES (?, ?, ?, ?)',
          [post.created_by, adminId, 'post_deleted', post.id]);
      }
    }

    logger.info(`[Admin] Batch soft-deleted ${existingIds.length} posts`);

    res.json({
      message: `成功删除 ${existingIds.length} 个帖子`,
      deletedCount: existingIds.length,
      notFoundIds
    });
  } catch (err) {
    logger.error('[Admin] Batch delete error:', err);
    res.status(500).json({ error: '批量删除失败' });
  }
});
module.exports = router;
