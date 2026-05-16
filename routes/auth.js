const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const AuthService = require('../services/AuthService');
const logger = require('../logger');

// Helper: regenerate session and set user data
function authenticateSession(req, user) {
  return new Promise((resolve, reject) => {
    // SECURITY: regenerate session ID to prevent session fixation
    req.session.regenerate((err) => {
      if (err) return reject(err);
      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.role = user.role;
      req.session.save((err2) => {
        if (err2) return reject(err2);
        resolve();
      });
    });
  });
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, password, role, adminSecret } = req.body;
    const user = await AuthService.register(username, password, role, adminSecret);
    await authenticateSession(req, user);
    res.json({ message: '注册成功', user });
  } catch (err) {
    const status = err.status || 500;
    logger.error('[Auth] Register error:', err.message || err);
    res.status(status).json({ error: err.message || '注册失败，请稍后重试' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await AuthService.login(username, password);
    // Destroy any existing sessions for this user (single-session enforcement)
    req.sessionStore.destroyByUserId(user.id);
    await authenticateSession(req, user);
    res.json({ message: '登录成功', user });
  } catch (err) {
    const status = err.status || 500;
    logger.error('[Auth] Login error:', err.message || err);
    res.status(status).json({ error: err.message || '登录失败，请稍后重试' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  const sessionId = req.sessionID;
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: '退出登录失败' });
    // Clear the session cookie (use configured name or default)
    res.clearCookie('portfolio_sid');
    res.json({ message: '已退出登录' });
  });
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  if (req.session && req.session.userId) {
    const status = AuthService.getCurrentUser(req.session.userId);
    res.json({ user: { id: req.session.userId, username: req.session.username, role: req.session.role, ...status } });
  } else {
    res.json({ user: null });
  }
});

// PUT /api/auth/password
router.put('/password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    await AuthService.changePassword(req.session.userId, currentPassword, newPassword);
    res.json({ message: '密码修改成功' });
  } catch (err) {
    const status = err.status || 500;
    logger.error('[Auth] Password change error:', err.message || err);
    res.status(status).json({ error: err.message || '密码修改失败' });
  }
});

module.exports = router;
