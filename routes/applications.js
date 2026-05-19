// Job Applications route — manage employer/seeker identity applications
const express = require('express');
const router = express.Router();
const { run, get, getFirst, all } = require('../db/init');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const Notification = require('../models/Notification');
const logger = require('../logger');

// POST /api/applications — submit a job role application
router.post('/', requireAuth, (req, res) => {
  try {
    const userId = req.session.userId;
    const { role, reason } = req.body;
    if (!role || !['employer', 'seeker'].includes(role)) {
      return res.status(400).json({ error: '无效的身份类型' });
    }
    const existing = get('SELECT id, status FROM job_applications WHERE user_id = ? AND status = ?', [userId, 'pending']);
    if (existing) return res.status(409).json({ error: '你已有一个待审核的申请' });

    const approved = get('SELECT job_role_approved FROM users WHERE id = ?', [userId]);
    if (approved && approved.job_role_approved) return res.status(409).json({ error: '你已经拥有身份' });

    run('INSERT INTO job_applications (user_id, role, reason) VALUES (?, ?, ?)', [userId, role, reason || '']);

    // Notify all admins
    const admins = all("SELECT id FROM users WHERE role = 'admin'");
    const applicant = getFirst('SELECT username FROM users WHERE id = ?', [userId]);
    const roleLabel = role === 'employer' ? '招聘者' : '求职者';
    const msg = '📋 新身份申请：用户「' + (applicant ? applicant.username : '?') + '」申请「' + roleLabel + '」身份';
    for (const admin of admins) {
      Notification.create(admin.id, userId, 'admin_application', null, null, msg, '#/admin/applications');
    }

    res.json({ message: '申请已提交，等待管理员审核' });
  } catch (err) {
    logger.error('[Applications] Submit error:', err);
    res.status(500).json({ error: '提交申请失败' });
  }
});

// GET /api/applications — list applications (admin: all, user: own)
router.get('/', requireAuth, (req, res) => {
  try {
    const isAdmin = req.session.role === 'admin';
    const status = req.query.status || null;
    let sql, params;
    if (isAdmin) {
      sql = `SELECT a.*, u.username, u.level FROM job_applications a
             JOIN users u ON a.user_id = u.id`;
      params = [];
      if (status) { sql += ' WHERE a.status = ?'; params.push(status); }
      sql += ' ORDER BY a.created_at DESC';
    } else {
      sql = `SELECT * FROM job_applications WHERE user_id = ? ORDER BY created_at DESC`;
      params = [req.session.userId];
    }
    const apps = all(sql, params);
    res.json({ applications: apps });
  } catch (err) {
    logger.error('[Applications] List error:', err);
    res.status(500).json({ error: '获取申请列表失败' });
  }
});

// PUT /api/applications/:id — approve/reject (admin only)
router.put('/:id', requireAdmin, (req, res) => {
  try {
    const appId = parseInt(req.params.id);
    const { status } = req.body;
    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: '无效的审核状态' });
    }
    const app = get('SELECT * FROM job_applications WHERE id = ?', [appId]);
    if (!app) return res.status(404).json({ error: '申请不存在' });
    if (app.status !== 'pending') return res.status(400).json({ error: '该申请已处理' });

    run('UPDATE job_applications SET status = ?, processed_by = ?, processed_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, req.session.userId, appId]);

    if (status === 'approved') {
      run('UPDATE users SET job_role = ?, job_role_approved = 1 WHERE id = ?', [app.role, app.user_id]);
    }

    // Notify the applicant
    if (status === 'approved') {
      Notification.create(app.user_id, req.session.userId, 'job_approved', null, null, '你的' + (app.role === 'employer' ? '招聘者' : '求职者') + '身份申请已通过', '#/jobs');
    } else {
      Notification.create(app.user_id, req.session.userId, 'job_rejected', null, null, '你的' + (app.role === 'employer' ? '招聘者' : '求职者') + '身份申请未通过', '#/profile');
    }

    res.json({ message: status === 'approved' ? '已批准' : '已拒绝' });
  } catch (err) {
    logger.error('[Applications] Review error:', err);
    res.status(500).json({ error: '审核失败' });
  }
});

module.exports = router;
