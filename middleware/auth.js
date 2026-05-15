/**
 * Authentication middleware
 */

// Require login - redirect to 401 if not authenticated
function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: '请先登录' });
  }
  // Track last seen time (debounced to once per minute per session)
  try {
    const now = Math.floor(Date.now() / 60000);
    if (req.session._lastSeenMin !== now) {
      req.session._lastSeenMin = now;
      const { run } = require('../db/init');
      run("UPDATE users SET last_seen_at = datetime('now') WHERE id = ?", [req.session.userId]);
    }
  } catch (e) { /* non-critical */ }
  next();
}

// Require admin role
function requireAdmin(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: '请先登录' });
  }
  if (req.session.role !== 'admin') {
    return res.status(403).json({ error: '权限不足，需要管理员身份' });
  }
  next();
}

// Require user is not banned
function requireNotBanned(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: '请先登录' });
  }
  const { get, run } = require('../db/init');
  const user = get('SELECT is_banned, banned_until FROM users WHERE id = ?', [req.session.userId]);
  if (!user || !user.is_banned) return next();

  // Check if ban has expired (banned_until is set and is in the past)
  if (user.banned_until) {
    const until = new Date(user.banned_until.replace(' ', 'T') + 'Z');
    if (Date.now() >= until.getTime()) {
      // Auto-unban
      run('UPDATE users SET is_banned = 0, banned_until = NULL, ban_reason = \'\' WHERE id = ?', [req.session.userId]);
      return next();
    }
    // Still banned — calculate remaining time
    const remainingMs = until.getTime() - Date.now();
    const remainingDays = Math.floor(remainingMs / 86400000);
    const remainingHours = Math.floor((remainingMs % 86400000) / 3600000);
    const remaining = remainingDays > 0
      ? `禁言剩余 ${remainingDays} 天 ${remainingHours} 小时`
      : `禁言剩余 ${remainingHours} 小时`;
    return res.status(403).json({ error: `您已被禁言，无法操作。${remaining}` });
  }

  // Permanent ban
  return res.status(403).json({ error: '您已被永久禁言，无法操作' });
}

// Attach user info to req if logged in (optional)
function optionalAuth(req, res, next) {
  // User info is already in session if logged in
  next();
}

module.exports = { requireAuth, requireAdmin, requireNotBanned, optionalAuth };
