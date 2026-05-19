const express = require('express');
const router = express.Router();
const { run, get, all } = require('../db/init');
const { requireAuth, requireAdmin, requireNotBanned } = require('../middleware/auth');
const Notification = require('../models/Notification');
const logger = require('../logger');

// ===== Report System =====

// POST /api/reports — create a report
router.post('/reports', requireAuth, requireNotBanned, (req, res) => {
  try {
    const { target_type, target_id, reason } = req.body;
    if (!target_type || !target_id) return res.status(400).json({ error: '请指定举报对象' });
    if (!['post', 'user'].includes(target_type)) return res.status(400).json({ error: '无效的举报类型' });
    if (!reason || !reason.trim()) return res.status(400).json({ error: '请填写举报原因' });

    // Verify target exists
    if (target_type === 'post') {
      const post = get('SELECT id FROM posts WHERE id = ?', [target_id]);
      if (!post) return res.status(404).json({ error: '帖子不存在' });
    } else {
      const user = get('SELECT id FROM users WHERE id = ?', [target_id]);
      if (!user) return res.status(404).json({ error: '用户不存在' });
    }

    // Check duplicate pending report
    const dup = get(
      "SELECT id FROM reports WHERE reporter_id = ? AND target_type = ? AND target_id = ? AND status = 'pending'",
      [req.session.userId, target_type, target_id]
    );
    if (dup) return res.status(400).json({ error: '您已经举报过了，请等待处理' });

    run('INSERT INTO reports (reporter_id, target_type, target_id, reason) VALUES (?, ?, ?, ?)',
      [req.session.userId, target_type, target_id, reason.trim()]);

    // Notify all admins
    const admins = all('SELECT id FROM users WHERE role = ?', ['admin']);
    const targetRecord = get(target_type === 'post' ? 'SELECT title FROM posts WHERE id = ?' : 'SELECT username FROM users WHERE id = ?', [target_id]);
    const targetName = targetRecord ? (targetRecord.title || targetRecord.username || '未知') : '未知';
    const reporter = get('SELECT username FROM users WHERE id = ?', [req.session.userId]);
    const msg = '🚩 新举报：用户「' + (reporter ? reporter.username : '?') + '」举报了 ' + (target_type === 'post' ? '帖子' : '用户') + '「' + targetName + '」';
    for (const admin of admins) {
      if (admin.id !== req.session.userId) {
        Notification.create(admin.id, req.session.userId, 'admin_report', null, null, msg, '#/admin/reports');
      }
    }

    res.json({ message: '举报已提交，管理员将尽快处理' });
  } catch (err) {
    logger.error('[Reports] Create error:', err);
    res.status(500).json({ error: '提交举报失败' });
  }
});

// GET /api/admin/reports — admin: list reports
router.get('/admin/reports', requireAdmin, (req, res) => {
  try {
    const status = req.query.status || 'pending';
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;

    let where = 'WHERE r.status = ?';
    const params = [status];

    const total = get(`SELECT COUNT(*) as count FROM reports r ${where}`, params);
    const reports = all(
      `SELECT r.*, ru.username as reporter_name, COALESCE(up.avatar_url, '') as reporter_avatar,
              CASE WHEN r.target_type = 'post' THEN (SELECT p.title FROM posts p WHERE p.id = r.target_id)
                   WHEN r.target_type = 'user' THEN (SELECT u2.username FROM users u2 WHERE u2.id = r.target_id)
              END as target_name,
              (CASE WHEN r.target_type = 'post' THEN (SELECT COALESCE(p.is_locked, 0) FROM posts p WHERE p.id = r.target_id) END) as target_is_locked,
              (CASE WHEN r.target_type = 'user' THEN (SELECT u2.is_banned FROM users u2 WHERE u2.id = r.target_id) END) as target_is_banned
       FROM reports r
       JOIN users ru ON r.reporter_id = ru.id
       LEFT JOIN user_profiles up ON up.user_id = ru.id
       ${where}
       ORDER BY r.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({ reports, pagination: { page, limit, total: total.count, totalPages: Math.ceil(total.count / limit), hasMore: offset + limit < total.count } });
  } catch (err) {
    logger.error('[Admin Reports] List error:', err);
    res.status(500).json({ error: '获取举报列表失败' });
  }
});

// PUT /api/admin/reports/:id — resolve/dismiss a report
router.put('/admin/reports/:id', requireAdmin, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    if (!['resolved', 'dismissed'].includes(status)) return res.status(400).json({ error: '无效的状态' });

    const report = get('SELECT id FROM reports WHERE id = ?', [id]);
    if (!report) return res.status(404).json({ error: '举报不存在' });

    run("UPDATE reports SET status = ?, resolved_at = CURRENT_TIMESTAMP WHERE id = ?", [status, id]);
    res.json({ message: status === 'resolved' ? '举报已处理' : '举报已驳回' });
  } catch (err) {
    logger.error('[Admin Reports] Update error:', err);
    res.status(500).json({ error: '更新举报状态失败' });
  }
});

// ===== Admin Zone Stats =====

// GET /api/admin/stats — zone statistics (optimized: 2 queries instead of 10)
router.get('/admin/stats', requireAdmin, (req, res) => {
  try {
    // Query 1: zone stats in one GROUP BY pass
    var zoneRows = all(
      "SELECT p.category, " +
      "COUNT(DISTINCT p.id) as posts, " +
      "COUNT(DISTINCT c.id) as replies " +
      "FROM posts p " +
      "LEFT JOIN comments c ON c.post_id = p.id AND p.deleted_at IS NULL " +
      "WHERE p.deleted_at IS NULL " +
      "GROUP BY p.category"
    );

    // Normalize into ordered zone map
    var zoneOrder = ['work', 'chat', 'music', 'job'];
    var zoneLabels = { work: '作品区', chat: '聊天区', music: '音乐区', job: '求职招聘' };
    var zoneMap = {};
    for (var i = 0; i < zoneRows.length; i++) {
      zoneMap[zoneRows[i].category] = zoneRows[i];
    }
    var zones = zoneOrder.map(function(z) {
      var row = zoneMap[z];
      return { zone: z, label: zoneLabels[z], posts: row ? row.posts : 0, replies: row ? row.replies : 0 };
    });

    // Query 2: totals + today's metrics in one pass
    var totals = get(
      "SELECT " +
      "(SELECT COUNT(*) FROM users) as total_users, " +
      "(SELECT COUNT(*) FROM reports WHERE status = 'pending') as pending_reports, " +
      "(SELECT COUNT(*) FROM posts WHERE deleted_at IS NULL AND created_at > datetime('now', '-1 day')) as posts_today, " +
      "(SELECT COUNT(*) FROM users WHERE created_at > datetime('now', '-1 day')) as users_today, " +
      "(SELECT COUNT(*) FROM posts WHERE deleted_at IS NULL) as total_posts, " +
      "(SELECT COUNT(*) FROM comments) as total_comments"
    );

    res.json({
      zones: zones,
      total_users: totals.total_users,
      total_posts: totals.total_posts,
      total_comments: totals.total_comments,
      pending_reports: totals.pending_reports,
      posts_today: totals.posts_today,
      users_today: totals.users_today
    });
  } catch (err) {
    logger.error('[Admin Stats] Error:', err);
    res.status(500).json({ error: '获取统计数据失败' });
  }
});

module.exports = router;
