const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const { run, get } = require('../db/init');
const { requireAuth } = require('../middleware/auth');

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, password, role, adminSecret } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }
    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({ error: '用户名长度应在3-20个字符之间' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: '密码长度至少6位' });
    }

    // Check if username already exists
    const existing = get('SELECT id FROM users WHERE username = ?', [username]);
    if (existing) {
      return res.status(409).json({ error: '用户名已被注册' });
    }

    const finalRole = role === 'admin' ? 'admin' : 'user';

    // Admin registration requires secret key
    if (finalRole === 'admin') {
      const expectedSecret = process.env.ADMIN_SECRET || 'AdminKey123';
      if (!adminSecret || adminSecret !== expectedSecret) {
        return res.status(403).json({ error: '管理员注册秘钥错误' });
      }
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      [username, hashedPassword, finalRole]);

    const newUser = get('SELECT id, username, role FROM users WHERE username = ?', [username]);

    // Auto-login after registration (destroy any existing sessions first)
    req.sessionStore.destroyByUserId(newUser.id);

    req.session.userId = newUser.id;
    req.session.username = newUser.username;
    req.session.role = newUser.role;

    res.json({
      message: '注册成功',
      user: { id: newUser.id, username: newUser.username, role: newUser.role }
    });
  } catch (err) {
    console.error('[Auth] Register error:', err);
    res.status(500).json({ error: '注册失败，请稍后重试' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    const user = get('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    // Destroy existing sessions for this user (single-session enforcement)
    req.sessionStore.destroyByUserId(user.id);

    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.role = user.role;

    res.json({
      message: '登录成功',
      user: { id: user.id, username: user.username, role: user.role }
    });
  } catch (err) {
    console.error('[Auth] Login error:', err);
    res.status(500).json({ error: '登录失败，请稍后重试' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: '退出登录失败' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: '已退出登录' });
  });
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  if (req.session && req.session.userId) {
    const { get } = require('../db/init');
    const user = get('SELECT is_banned, banned_until, ban_reason, level, xp, points FROM users WHERE id = ?', [req.session.userId]);
    res.json({
      user: {
        id: req.session.userId,
        username: req.session.username,
        role: req.session.role,
        is_banned: user ? !!user.is_banned : false,
        banned_until: user ? (user.banned_until || null) : null,
        ban_reason: user ? (user.ban_reason || '') : '',
        level: user ? (user.level || 1) : 1,
        xp: user ? (user.xp || 0) : 0,
        points: user ? (user.points || 0) : 0
      }
    });
  } else {
    res.json({ user: null });
  }
});

// PUT /api/auth/password — change password (logged in user)
router.put('/password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: '当前密码和新密码不能为空' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: '新密码长度至少6位' });
    }

    const user = get('SELECT * FROM users WHERE id = ?', [req.session.userId]);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    if (!bcrypt.compareSync(currentPassword, user.password)) {
      return res.status(403).json({ error: '当前密码错误' });
    }

    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.session.userId]);

    res.json({ message: '密码修改成功' });
  } catch (err) {
    console.error('[Auth] Password change error:', err);
    res.status(500).json({ error: '密码修改失败，请稍后重试' });
  }
});

module.exports = router;
