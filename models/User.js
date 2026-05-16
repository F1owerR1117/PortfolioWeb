// User Model — all user-related database operations
const { run, get, all } = require('../db/init');

const User = {
  findById(id) {
    return get('SELECT * FROM users WHERE id = ?', [id]);
  },

  findByUsername(username) {
    return get('SELECT * FROM users WHERE username = ?', [username]);
  },

  findByIdBasic(id) {
    return get('SELECT id, username, role FROM users WHERE id = ?', [id]);
  },

  findByIdStatus(id) {
    return get('SELECT is_banned, banned_until, ban_reason, level, xp, points FROM users WHERE id = ?', [id]);
  },

  exists(username) {
    return get('SELECT id FROM users WHERE username = ?', [username]);
  },

  create(username, hashedPassword, role) {
    return run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', [username, hashedPassword, role]);
  },

  updatePassword(id, hashedPassword) {
    run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, id]);
  },

  getProfile(userId) {
    return get(
      `SELECT u.id, u.username, u.role, u.level, u.xp, u.points, u.is_banned, u.banned_until, u.ban_reason, u.created_at,
              up.nickname, up.bio, up.avatar_url, up.social, up.skills
       FROM users u
       LEFT JOIN user_profiles up ON u.id = up.user_id
       WHERE u.id = ?`,
      [userId]
    );
  },

  updateProfile(userId, data) {
    const { nickname, bio, social, skills, avatar_url } = data;
    run(
      `INSERT INTO user_profiles (user_id, nickname, bio, social, skills, avatar_url)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         nickname = excluded.nickname, bio = excluded.bio,
         social = excluded.social, skills = excluded.skills, avatar_url = excluded.avatar_url`,
      [userId, nickname || '', bio || '', JSON.stringify(social || {}), JSON.stringify(skills || []), avatar_url || '']
    );
  },

  search(query, limit = 20) {
    return all(
      `SELECT u.id, u.username, u.role, u.level, u.is_banned, up.nickname, up.avatar_url
       FROM users u LEFT JOIN user_profiles up ON u.id = up.user_id
       WHERE u.username LIKE ? OR up.nickname LIKE ?
       ORDER BY u.id DESC LIMIT ?`,
      [`%${query}%`, `%${query}%`, limit]
    );
  },

  list(page = 1, limit = 20, search = '') {
    const offset = (page - 1) * limit;
    let whereClause = '';
    const params = [];
    if (search) {
      whereClause = 'WHERE u.username LIKE ? OR up.nickname LIKE ?';
      params.push(`%${search}%`, `%${search}%`);
    }
    const total = get(`SELECT COUNT(*) as count FROM users u LEFT JOIN user_profiles up ON u.id = up.user_id ${whereClause}`, params);
    const users = all(
      `SELECT u.id, u.username, u.role, u.level, u.xp, u.points, u.is_banned, u.created_at,
              up.nickname, up.avatar_url
       FROM users u LEFT JOIN user_profiles up ON u.id = up.user_id
       ${whereClause} ORDER BY u.id DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    return { users, total: total.count };
  },

  ban(userId, banned, duration, reason) {
    if (banned) {
      const bannedUntil = duration ? new Date(Date.now() + duration * 3600000).toISOString() : null;
      run('UPDATE users SET is_banned = 1, banned_until = ?, ban_reason = ? WHERE id = ?',
        [bannedUntil, reason || '', userId]);
    } else {
      run('UPDATE users SET is_banned = 0, banned_until = NULL, ban_reason = NULL WHERE id = ?', [userId]);
    }
  },

  updateLevel(userId, data) {
    const { level, xp, points } = data;
    run('UPDATE users SET level = ?, xp = ?, points = ? WHERE id = ?',
      [level || 1, xp || 0, points || 0, userId]);
  }
};

module.exports = User;
