/**
 * Zone access middleware — check if user's level has access to a zone
 */
const { getFirst } = require('../db/init');

function requireZoneAccess(zone) {
  return (req, res, next) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ error: '请先登录' });
    }
    // Admin always has access
    if (req.session.role === 'admin') return next();

    const user = getFirst('SELECT level FROM users WHERE id = ?', [req.session.userId]);
    if (!user) return res.status(403).json({ error: '用户不存在' });

    // Get the highest level config the user meets
    const configs = require('../db/init').all(
      'SELECT zones FROM level_config WHERE level <= ? ORDER BY level DESC LIMIT 1',
      [user.level || 1]
    );
    const config = configs && configs.length > 0 ? configs[0] : null;
    if (!config) return next(); // no config found = allow access

    try {
      const zones = JSON.parse(config.zones);
      if (Array.isArray(zones) && zones.includes(zone)) return next();
    } catch (e) {
      return next();
    }

    return res.status(403).json({ error: '等级不足，无法访问该分区' });
  };
}

function requireJobRole(role) {
  return (req, res, next) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ error: '请先登录' });
    }
    if (req.session.role === 'admin') return next();
    const user = require('../db/init').get('SELECT job_role, job_role_approved FROM users WHERE id = ?', [req.session.userId]);
    if (!user || !user.job_role_approved) {
      return res.status(403).json({ error: '请先申请招聘者/求职者身份' });
    }
    if (role && user.job_role !== role) {
      return res.status(403).json({ error: '身份类型不匹配' });
    }
    next();
  };
}

module.exports = { requireZoneAccess, requireJobRole };
