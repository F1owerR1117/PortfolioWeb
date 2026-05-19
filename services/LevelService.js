// LevelService — XP, level-up, and points business logic
const { run, getFirst } = require('../db/init');

const LevelService = {
  /**
   * Add XP to a user, handle level-up, and return new state.
   * @param {number} userId
   * @param {number} amount - XP to add (ignored if <= 0)
   * @returns {{ xp: number, level: number, points: number } | null}
   */
  addXP(userId, amount) {
    if (amount <= 0) return null;
    const user = getFirst('SELECT xp, level, points FROM users WHERE id = ?', [userId]);
    if (!user) return null;

    let newXP = (user.xp || 0) + amount;
    let newLevel = user.level || 1;
    let newPoints = (user.points || 0) + amount;

    // Loop: check for level-up
    while (true) {
      const nextConfig = getFirst('SELECT xp_required FROM level_config WHERE level = ?', [newLevel + 1]);
      if (nextConfig && newXP >= nextConfig.xp_required) {
        newXP -= nextConfig.xp_required;
        newLevel++;
      } else {
        break;
      }
    }

    run('UPDATE users SET xp = ?, level = ?, points = ? WHERE id = ?', [newXP, newLevel, newPoints, userId]);
    return { xp: newXP, level: newLevel, points: newPoints };
  }
};

module.exports = LevelService;
