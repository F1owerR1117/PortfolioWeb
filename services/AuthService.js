// AuthService — authentication business logic
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const config = require('../config');

const BCRYPT_ROUNDS = 10;

// Password complexity: at least 6 chars, must contain letter and number
function validatePassword(password) {
  if (!password || password.length < 6) return '密码长度至少6位';
  if (password.length > 128) return '密码长度不能超过128位';
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) return '密码必须包含字母和数字';
  return null;
}

const AuthService = {
  async register(username, password, role, adminSecret) {
    // Validation
    if (!username || !password) throw { status: 400, message: '用户名和密码不能为空' };
    if (username.length < 3 || username.length > 20) throw { status: 400, message: '用户名长度应在3-20个字符之间' };

    const pwError = validatePassword(password);
    if (pwError) throw { status: 400, message: pwError };

    // Check duplicate — use generic message to prevent username enumeration
    if (User.exists(username)) throw { status: 400, message: '注册失败，请检查用户名和密码' };

    const finalRole = role === 'admin' ? 'admin' : 'user';

    // Admin secret check
    if (finalRole === 'admin') {
      if (!adminSecret || adminSecret !== config.adminSecret) {
        throw { status: 403, message: '管理员注册秘钥错误' };
      }
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
    User.create(username, hashedPassword, finalRole);

    const newUser = User.findByUsername(username);
    return { id: newUser.id, username: newUser.username, role: newUser.role };
  },

  async login(username, password) {
    if (!username || !password) throw { status: 400, message: '用户名和密码不能为空' };

    const user = User.findByUsername(username);
    if (!user) throw { status: 401, message: '用户名或密码错误' };

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw { status: 401, message: '用户名或密码错误' };

    return { id: user.id, username: user.username, role: user.role };
  },

  async changePassword(userId, currentPassword, newPassword) {
    if (!currentPassword || !newPassword) throw { status: 400, message: '当前密码和新密码不能为空' };

    const pwError = validatePassword(newPassword);
    if (pwError) throw { status: 400, message: pwError };

    const user = User.findById(userId);
    if (!user) throw { status: 404, message: '用户不存在' };

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) throw { status: 403, message: '当前密码错误' };

    const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    User.updatePassword(userId, hashedPassword);
  },

  getCurrentUser(userId) {
    const user = User.findByIdStatus(userId);
    return {
      is_banned: user ? !!user.is_banned : false,
      banned_until: user ? (user.banned_until || null) : null,
      ban_reason: user ? (user.ban_reason || '') : '',
      level: user ? (user.level || 1) : 1,
      xp: user ? (user.xp || 0) : 0,
      points: user ? (user.points || 0) : 0
    };
  }
};

module.exports = AuthService;
