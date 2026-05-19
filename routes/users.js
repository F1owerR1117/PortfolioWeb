const express = require('express');
const router = express.Router();
const { run, get, all } = require('../db/init');
const { requireAuth, requireNotBanned } = require('../middleware/auth');
const logger = require('../logger');

// GET /api/auth/profile — current user's profile
router.get('/auth/profile', requireAuth, async (req, res) => {
  try {
    const profile = get('SELECT * FROM user_profiles WHERE user_id = ?', [req.session.userId]);
    const user = get('SELECT id, username, role, created_at, level, xp, points, job_role, job_role_approved FROM users WHERE id = ?', [req.session.userId]);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    res.json({
      profile: {
        user_id: user.id, username: user.username, role: user.role, created_at: user.created_at,
        level: user.level || 1, xp: user.xp || 0, points: user.points || 0,
        job_role: user.job_role || null, job_role_approved: !!user.job_role_approved,
        job_rating: profile ? (profile.job_rating || 0) : 0,
        job_completed: profile ? (profile.job_completed || 0) : 0,
        nickname: profile ? (profile.nickname || '') : '', bio: profile ? profile.bio : '',
        avatar_url: profile ? profile.avatar_url : '',
        social: profile ? JSON.parse(profile.social || '{}') : {},
        skills: profile ? JSON.parse(profile.skills || '[]') : []
      }
    });
  } catch (err) {
    logger.error('[Users] Get profile error:', err);
    res.status(500).json({ error: '获取个人信息失败' });
  }
});

// PUT /api/auth/profile — update current user's profile
router.put('/auth/profile', requireAuth, requireNotBanned, async (req, res) => {
  try {
    const { nickname, bio, avatar_url, social, skills } = req.body;

    // SECURITY: validate avatar_url to prevent path traversal
    if (avatar_url && avatar_url.length > 0) {
      if (!avatar_url.startsWith('/api/file/avatar/') ||
          avatar_url.includes('..') || avatar_url.includes('\\')) {
        return res.status(400).json({ error: '无效的头像URL' });
      }
    }

    // Input length validation
    if (nickname && nickname.length > 50) return res.status(400).json({ error: '昵称不能超过50个字符' });
    if (bio && bio.length > 500) return res.status(400).json({ error: '简介不能超过500个字符' });

    const existing = get('SELECT user_id FROM user_profiles WHERE user_id = ?', [req.session.userId]);
    if (existing) {
      run('UPDATE user_profiles SET nickname = ?, bio = ?, avatar_url = ?, social = ?, skills = ? WHERE user_id = ?',
        [nickname || '', bio || '', avatar_url || '', JSON.stringify(social || {}), JSON.stringify(skills || []), req.session.userId]);
    } else {
      run('INSERT INTO user_profiles (user_id, nickname, bio, avatar_url, social, skills) VALUES (?, ?, ?, ?, ?, ?)',
        [req.session.userId, nickname || '', bio || '', avatar_url || '', JSON.stringify(social || {}), JSON.stringify(skills || [])]);
    }
    res.json({ message: '个人信息已更新', profile: { user_id: req.session.userId, nickname: nickname || '', bio: bio || '', avatar_url: avatar_url || '', social: social || {}, skills: skills || [] } });
  } catch (err) {
    logger.error('[Users] Update profile error:', err);
    res.status(500).json({ error: '更新个人信息失败' });
  }
});

// GET /api/users/search
router.get('/users/search', requireAuth, async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json({ users: [] });
    const users = all(
      `SELECT u.id, u.username, COALESCE(up.nickname, '') as nickname, COALESCE(up.avatar_url, '') as avatar_url
       FROM users u LEFT JOIN user_profiles up ON up.user_id = u.id
       WHERE u.username LIKE ? OR up.nickname LIKE ? ORDER BY u.level DESC, u.points DESC LIMIT 10`,
      [`%${q}%`, `%${q}%`]
    );
    res.json({ users });
  } catch (err) {
    logger.error('[Users] Search error:', err);
    res.status(500).json({ error: '搜索用户失败' });
  }
});

// GET /api/users/:id/profile
router.get('/users/:id/profile', requireAuth, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) return res.status(400).json({ error: '无效的用户ID' });
    const user = get('SELECT id, username, role, created_at, is_banned, level, xp, points, job_role, job_role_approved FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    const profile = get('SELECT * FROM user_profiles WHERE user_id = ?', [userId]);
    res.json({
      profile: {
        user_id: user.id, username: user.username, role: user.role, created_at: user.created_at,
        is_banned: !!user.is_banned, level: user.level || 1, xp: user.xp || 0, points: user.points || 0,
        job_role: user.job_role || null, job_role_approved: !!user.job_role_approved,
        job_rating: profile ? (profile.job_rating || 0) : 0,
        job_completed: profile ? (profile.job_completed || 0) : 0,
        nickname: profile ? (profile.nickname || '') : '', bio: profile ? profile.bio : '',
        avatar_url: profile ? profile.avatar_url : '',
        social: profile ? JSON.parse(profile.social || '{}') : {},
        skills: profile ? JSON.parse(profile.skills || '[]') : []
      }
    });
  } catch (err) {
    logger.error('[Users] Get public profile error:', err);
    res.status(500).json({ error: '获取用户信息失败' });
  }
});

// GET /api/users/:id/posts
router.get('/users/:id/posts', requireAuth, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) return res.status(400).json({ error: '无效的用户ID' });
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 9, 50);
    const offset = (page - 1) * limit;
    const total = get('SELECT COUNT(*) as count FROM posts WHERE created_by = ? AND deleted_at IS NULL', [userId]);
    const posts = all(
      `SELECT p.id, p.title, p.description, p.cover_url, p.cover_file_id,
              p.tags, p.views, p.category, COALESCE(p.like_count, 0) as like_count,
              COALESCE(p.dislike_count, 0) as dislike_count,
              COALESCE(p.is_sticky, 0) as is_sticky, COALESCE(p.is_featured, 0) as is_featured,
              p.created_at, p.updated_at, u.username as author
       FROM posts p JOIN users u ON p.created_by = u.id
       WHERE p.created_by = ? AND p.deleted_at IS NULL
       ORDER BY p.is_sticky DESC, p.updated_at DESC LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );
    res.json({ posts, pagination: { page, limit, total: total ? total.count : 0, totalPages: Math.ceil((total ? total.count : 0) / limit), hasMore: offset + limit < (total ? total.count : 0) } });
  } catch (err) {
    logger.error('[Users] Get user posts error:', err);
    res.status(500).json({ error: '获取用户作品失败' });
  }
});

// GET /api/users/:id/stats — aggregated user statistics
router.get('/users/:id/stats', requireAuth, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) return res.status(400).json({ error: '无效的用户ID' });
    const user = get('SELECT id, level, xp, points, created_at FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: '用户不存在' });

    const postCount = get('SELECT COUNT(*) as count FROM posts WHERE created_by = ? AND deleted_at IS NULL', [userId]);
    const commentReceived = get(
      'SELECT COUNT(*) as count FROM comments c JOIN posts p ON c.post_id = p.id WHERE p.created_by = ? AND c.deleted_at IS NULL',
      [userId]
    );
    const totalLikes = get(
      "SELECT COALESCE(SUM(COALESCE(p.like_count, 0)), 0) as count FROM posts p WHERE p.created_by = ? AND p.deleted_at IS NULL",
      [userId]
    );
    const createdAt = new Date((user.created_at || '').replace(' ', 'T') + 'Z');
    const memberDays = Math.floor((Date.now() - createdAt.getTime()) / 86400000);

    res.json({
      stats: {
        postCount: postCount ? postCount.count : 0,
        commentReceived: commentReceived ? commentReceived.count : 0,
        totalLikes: totalLikes ? totalLikes.count : 0,
        memberDays: Math.max(1, memberDays),
        level: user.level || 1,
        xp: user.xp || 0,
        points: user.points || 0
      }
    });
  } catch (err) {
    logger.error('[Users] Stats error:', err);
    res.status(500).json({ error: '获取统计数据失败' });
  }
});

module.exports = router;
