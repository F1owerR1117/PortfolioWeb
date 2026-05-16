const express = require('express');
const router = express.Router();
const { run, get, all, getFirst, addXP } = require('../db/init');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const logger = require('../logger');

// GET /api/levels/me — current user's level info
router.get('/levels/me', requireAuth, (req, res) => {
  try {
    const user = getFirst('SELECT level, xp, points, coins FROM users WHERE id = ?', [req.session.userId]);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    // Get next level requirement
    const nextConfig = getFirst('SELECT xp_required FROM level_config WHERE level = ?', [user.level + 1]);
    const levelCfg = getFirst('SELECT name, title_icon, bg_image FROM level_config WHERE level = ?', [user.level || 1]);
    res.json({
      level: user.level || 1,
      xp: user.xp || 0,
      points: user.points || 0,
      coins: user.coins || 0,
      next_xp_required: nextConfig ? nextConfig.xp_required : null,
      level_name: levelCfg ? (levelCfg.name || '') : '',
      title_icon: levelCfg ? (levelCfg.title_icon || '') : '',
      bg_image: levelCfg ? (levelCfg.bg_image || '') : ''
    });
  } catch (err) {
    logger.error('[Levels] Get me error:', err);
    res.status(500).json({ error: '获取等级信息失败' });
  }
});

// GET /api/admin/levels/config — all level configs (any logged-in user, for badge display)
router.get('/admin/levels/config', requireAuth, (req, res) => {
  try {
    const configs = all('SELECT * FROM level_config ORDER BY level ASC');
    res.json({ configs });
  } catch (err) {
    logger.error('[Levels] Config list error:', err);
    res.status(500).json({ error: '获取等级配置失败' });
  }
});

// PUT /api/admin/levels/config — update level configs (admin only)
router.put('/admin/levels/config', requireAdmin, (req, res) => {
  try {
    const { configs } = req.body;
    if (!Array.isArray(configs) || configs.length === 0) {
      return res.status(400).json({ error: '请提供等级配置数据' });
    }
    for (const cfg of configs) {
      const level = parseInt(cfg.level);
      const xp_required = parseInt(cfg.xp_required);
      const name = cfg.name || '';
      const title_icon = cfg.title_icon || '';
      const bg_image = cfg.bg_image || '';
      const zones = cfg.zones || '["work","chat"]';
      if (isNaN(level) || isNaN(xp_required)) continue;
      // Validate zones JSON
      try { JSON.parse(typeof zones === 'string' ? zones : JSON.stringify(zones)); } catch (e) { continue; }
      const zonesStr = typeof zones === 'string' ? zones : JSON.stringify(zones);
      const existing = getFirst('SELECT level FROM level_config WHERE level = ?', [level]);
      if (existing) {
        run('UPDATE level_config SET xp_required = ?, zones = ?, name = ?, title_icon = ?, bg_image = ? WHERE level = ?', [xp_required, zonesStr, name, title_icon, bg_image, level]);
      } else {
        run('INSERT INTO level_config (level, xp_required, zones, name, title_icon, bg_image) VALUES (?, ?, ?, ?, ?, ?)', [level, xp_required, zonesStr, name, title_icon, bg_image]);
      }
    }
    res.json({ message: '等级配置已更新' });
  } catch (err) {
    logger.error('[Levels] Config update error:', err);
    res.status(500).json({ error: '更新等级配置失败' });
  }
});

// GET /api/admin/levels/users — paginated user list with level info (admin only)
router.get('/admin/levels/users', requireAdmin, (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const search = (req.query.search || '').trim();

    let whereClause = '';
    const params = [];
    if (search) {
      whereClause = 'WHERE u.username LIKE ?';
      params.push(`%${search}%`);
    }

    const total = getFirst(`SELECT COUNT(*) as count FROM users u ${whereClause}`, params);
    const users = all(
      `SELECT u.id, u.username, u.role, u.level, u.xp, u.points, u.coins,
              COALESCE(up.nickname, '') as nickname
       FROM users u
       LEFT JOIN user_profiles up ON up.user_id = u.id
       ${whereClause}
       ORDER BY u.level DESC, u.points DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    // Get level config for max level reference
    const maxLevel = getFirst('SELECT MAX(level) as max_level FROM level_config');

    res.json({
      users,
      max_level: maxLevel ? maxLevel.max_level : 20,
      pagination: {
        page, limit,
        total: total.count,
        totalPages: Math.ceil(total.count / limit),
        hasMore: offset + limit < total.count
      }
    });
  } catch (err) {
    logger.error('[Levels] User list error:', err);
    res.status(500).json({ error: '获取用户列表失败' });
  }
});

// PUT /api/admin/levels/users/:id — update user level/xp/points (admin only)
router.put('/admin/levels/users/:id', requireAdmin, (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) return res.status(400).json({ error: '无效的用户ID' });

    const user = getFirst('SELECT id, username FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: '用户不存在' });

    const { level, xp, points } = req.body;
    const updates = [];
    const params = [];

    if (level !== undefined) {
      const lvl = parseInt(level);
      if (isNaN(lvl) || lvl < 1) return res.status(400).json({ error: '无效的等级' });
      updates.push('level = ?');
      params.push(lvl);
    }
    if (xp !== undefined) {
      const x = parseInt(xp);
      if (isNaN(x) || x < 0) return res.status(400).json({ error: '无效的经验值' });
      updates.push('xp = ?');
      params.push(x);
    }
    if (points !== undefined) {
      const p = parseInt(points);
      if (isNaN(p) || p < 0) return res.status(400).json({ error: '无效的积分' });
      updates.push('points = ?');
      params.push(p);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: '请指定要更新的字段' });
    }

    params.push(userId);
    run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);

    // Auto level-up: if XP qualifies for a higher level, consume and level up
    var cur = getFirst('SELECT level, xp FROM users WHERE id = ?', [userId]);
    if (cur) {
      var newLevel = cur.level, newXP = cur.xp;
      while (true) {
        var next = getFirst('SELECT xp_required FROM level_config WHERE level = ?', [newLevel + 1]);
        if (next && newXP >= next.xp_required) { newXP -= next.xp_required; newLevel++; }
        else break;
      }
      if (newLevel !== cur.level || newXP !== cur.xp)
        run('UPDATE users SET level = ?, xp = ? WHERE id = ?', [newLevel, newXP, userId]);
    }

    const updated = getFirst('SELECT level, xp, points, coins FROM users WHERE id = ?', [userId]);
    // Sync session if admin edited their own level
    if (userId === req.session.userId) {
      req.session.level = updated.level;
      req.session.xp = updated.xp;
      req.session.points = updated.points;
    }
    res.json({ message: '用户等级已更新', user: { id: userId, username: user.username, ...updated } });
  } catch (err) {
    logger.error('[Levels] User update error:', err);
    res.status(500).json({ error: '更新用户等级失败' });
  }
});

// GET /api/zone-access/:zone — check if current user can access a zone
router.get('/zone-access/:zone', requireAuth, (req, res) => {
  try {
    const zone = req.params.zone;
    if (!zone || !['work', 'chat', 'music'].includes(zone)) {
      return res.status(400).json({ error: '无效的分区' });
    }
    if (req.session.role === 'admin') {
      return res.json({ zone, accessible: true });
    }
    const user = require('../db/init').getFirst('SELECT level FROM users WHERE id = ?', [req.session.userId]);
    if (!user) return res.json({ zone, accessible: false });

    const configs = require('../db/init').all(
      'SELECT zones FROM level_config WHERE level <= ? ORDER BY level DESC LIMIT 1',
      [user.level || 1]
    );
    const config = configs && configs.length > 0 ? configs[0] : null;
    let accessible = true;
    if (config) {
      try {
        const zones = JSON.parse(config.zones);
        accessible = Array.isArray(zones) && zones.includes(zone);
      } catch (e) {}
    }
    res.json({ zone, accessible });
  } catch (err) {
    logger.error('[Zone] Check error:', err);
    res.status(500).json({ error: '检查分区访问失败' });
  }
});

module.exports = router;
