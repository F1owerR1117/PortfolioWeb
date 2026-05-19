/**
 * Authentication middleware
 */
const { run, get, getFirst } = require('../db/init');

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

// Require the current user is the author of the target resource, or an admin.
// table must be a safe literal — only whitelisted values are accepted.
// idParam is the req.params key (default 'id').
var AUTHOR_OR_ADMIN_TABLES = { posts: 1, comments: 1 };

function requireAuthorOrAdmin(table, idParam) {
  if (!AUTHOR_OR_ADMIN_TABLES[table]) {
    throw new Error('requireAuthorOrAdmin: unsupported table "' + table + '" — add to AUTHOR_OR_ADMIN_TABLES whitelist');
  }
  var paramName = idParam || 'id';
  return function (req, res, next) {
    var id = parseInt(req.params[paramName]);
    if (isNaN(id)) return res.status(400).json({ error: '无效的ID' });
    if (req.session.role === 'admin') return next();
    var row = getFirst('SELECT created_by FROM ' + table + ' WHERE id = ?', [id]);
    if (!row) return res.status(404).json({ error: '资源不存在' });
    if (row.created_by !== req.session.userId) {
      return res.status(403).json({ error: '无权操作此资源' });
    }
    next();
  };
}

// Attach user info to req if logged in (optional)
function optionalAuth(req, res, next) {
  // User info is already in session if logged in
  next();
}

module.exports = { requireAuth, requireAdmin, requireNotBanned, requireAuthorOrAdmin, optionalAuth };
