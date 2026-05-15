const express = require('express');
const router = express.Router();
const { run, get, all } = require('../db/init');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// ===== Report System =====

// POST /api/reports — create a report
router.post('/reports', requireAuth, (req, res) => {
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

    res.json({ message: '举报已提交，管理员将尽快处理' });
  } catch (err) {
    console.error('[Reports] Create error:', err);
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
      `SELECT r.*, ru.username as reporter_name,
              CASE WHEN r.target_type = 'post' THEN (SELECT p.title FROM posts p WHERE p.id = r.target_id)
                   WHEN r.target_type = 'user' THEN (SELECT u2.username FROM users u2 WHERE u2.id = r.target_id)
              END as target_name
       FROM reports r
       JOIN users ru ON r.reporter_id = ru.id
       ${where}
       ORDER BY r.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({ reports, pagination: { page, limit, total: total.count, totalPages: Math.ceil(total.count / limit), hasMore: offset + limit < total.count } });
  } catch (err) {
    console.error('[Admin Reports] List error:', err);
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
    console.error('[Admin Reports] Update error:', err);
    res.status(500).json({ error: '更新举报状态失败' });
  }
});

// ===== Admin Zone Stats =====

// GET /api/admin/stats — zone statistics
router.get('/admin/stats', requireAdmin, (req, res) => {
  try {
    // Count posts by category
    const workPosts = get("SELECT COUNT(*) as count FROM posts WHERE category = 'work' AND deleted_at IS NULL");
    const chatPosts = get("SELECT COUNT(*) as count FROM posts WHERE category = 'chat' AND deleted_at IS NULL");
    const workReplies = get("SELECT COUNT(*) as count FROM comments c JOIN posts p ON c.post_id = p.id WHERE p.category = 'work' AND p.deleted_at IS NULL");
    const chatReplies = get("SELECT COUNT(*) as count FROM comments c JOIN posts p ON c.post_id = p.id WHERE p.category = 'chat' AND p.deleted_at IS NULL");
    const totalUsers = get('SELECT COUNT(*) as count FROM users');
    const totalReports = get("SELECT COUNT(*) as count FROM reports WHERE status = 'pending'");

    const zones = [
      { zone: 'works', label: '作品区', posts: workPosts.count, replies: workReplies.count },
      { zone: 'chat', label: '聊天区', posts: chatPosts.count, replies: chatReplies.count },
    ];

    res.json({ zones, total_users: totalUsers.count, pending_reports: totalReports.count });
  } catch (err) {
    console.error('[Admin Stats] Error:', err);
    res.status(500).json({ error: '获取统计数据失败' });
  }
});

module.exports = router;
