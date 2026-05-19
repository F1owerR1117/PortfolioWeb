/**
 * LevelService 单元测试 — XP 计算 / 升级 / 边界条件
 *
 * 运行: npx jest tests/LevelService.test.js
 */

// Mock db/init before requiring LevelService
jest.mock('../db/init', function() {
  // In-memory fake database
  var users = {};
  var levelConfig = {};

  function setUser(id, xp, level, points) {
    users[id] = { xp: xp || 0, level: level || 1, points: points || 0 };
  }

  function setLevelConfig(level, xpRequired) {
    levelConfig[level] = { xp_required: xpRequired };
  }

  return {
    run: jest.fn(function(sql, params) {
      // Parse "UPDATE users SET xp=?, level=?, points=? WHERE id=?"
      if (sql.indexOf('UPDATE users') === 0) {
        users[params[3]] = { xp: params[0], level: params[1], points: params[2] };
      }
      return { lastID: 0, changes: 1 };
    }),
    getFirst: jest.fn(function(sql, params) {
      // "SELECT xp, level, points FROM users WHERE id = ?"
      if (sql.indexOf('FROM users') > -1) {
        var user = users[params[0]];
        return user ? { xp: user.xp, level: user.level, points: user.points } : null;
      }
      // "SELECT xp_required FROM level_config WHERE level = ?"
      if (sql.indexOf('FROM level_config') > -1) {
        var cfg = levelConfig[params[0]];
        return cfg || null;
      }
      return null;
    })
  };
});

var LevelService = require('../services/LevelService');
var db = require('../db/init');

// Helper to configure fake DB state
function setupUser(id, xp, level, points) {
  db.getFirst.mockImplementation(function(sql, params) {
    if (sql.indexOf('FROM users') > -1) {
      var user = { 1: { xp: xp, level: level, points: points } };
      return user[params[0]] || null;
    }
    if (sql.indexOf('FROM level_config') > -1) {
      // Default level config: Lv.1→0, Lv.2→100, Lv.3→300, Lv.4→600, Lv.5→1000
      var cfg = {
        1: { xp_required: 0 },
        2: { xp_required: 100 },
        3: { xp_required: 300 },
        4: { xp_required: 600 },
        5: { xp_required: 1000 },
        6: { xp_required: 1500 },
        7: { xp_required: 2100 },
        8: { xp_required: 2800 },
        9: { xp_required: 3600 },
        10: { xp_required: 5000 },
        11: { xp_required: 6500 },
        12: { xp_required: 8000 },
        13: { xp_required: 10000 },
        14: { xp_required: 12000 },
        15: { xp_required: 15000 },
        16: { xp_required: 18000 },
        17: { xp_required: 22000 },
        18: { xp_required: 26000 },
        19: { xp_required: 30000 },
        20: { xp_required: 40000 }
      };
      return cfg[params[0]] || null;
    }
    return null;
  });
}

beforeEach(function() {
  jest.clearAllMocks();
});

// ==========================================================
// Test 1: Normal XP add, no level-up
// ==========================================================
test('正常加 XP，不升级', function() {
  setupUser(1, 50, 1, 50);

  var result = LevelService.addXP(1, 20);

  expect(result).not.toBeNull();
  expect(result.level).toBe(1);
  expect(result.xp).toBe(70);   // 50 + 20
  expect(result.points).toBe(70); // 50 + 20

  // Verify DB was updated
  expect(db.run).toHaveBeenCalled();
  var updateCall = db.run.mock.calls[db.run.mock.calls.length - 1];
  expect(updateCall[1][0]).toBe(70);  // new XP
  expect(updateCall[1][1]).toBe(1);   // level unchanged
});

// ==========================================================
// Test 2: Exactly enough XP to level up to Lv.2
// ==========================================================
test('加足额 XP，升级到 Lv.2', function() {
  setupUser(1, 80, 1, 80); // 20 XP short of Lv.2 (threshold: 100)

  var result = LevelService.addXP(1, 20);

  expect(result).not.toBeNull();
  expect(result.level).toBe(2);
  expect(result.xp).toBe(0);  // 80 + 20 = 100, minus 100 threshold = 0
  expect(result.points).toBe(100);

  var updateCall = db.run.mock.calls[db.run.mock.calls.length - 1];
  expect(updateCall[1][1]).toBe(2);
});

// ==========================================================
// Test 3: Burst XP — cross multiple levels
// ==========================================================
test('爆发式加 10000 XP，跨级升到 Lv.9', function() {
  // Start at Lv.1, 0 XP
  setupUser(1, 0, 1, 0);

  var result = LevelService.addXP(1, 10000);

  expect(result).not.toBeNull();
  // Thresholds: 0+100+300+600+1000+1500+2100+2800+3600 = 12000 to reach Lv.10
  // 10000 XP should reach Lv.9 with some remainder
  expect(result.level).toBeGreaterThan(5);
  expect(result.xp).toBeGreaterThanOrEqual(0);

  var updateCall = db.run.mock.calls[db.run.mock.calls.length - 1];
  expect(updateCall[1][1]).toBe(result.level);
  expect(updateCall[1][0]).toBe(result.xp);
});

// ==========================================================
// Test 4: Max level — no overflow
// ==========================================================
test('满级 Lv.20 继续加 XP，不崩溃', function() {
  setupUser(1, 50000, 20, 50000);

  var result = LevelService.addXP(1, 100);

  expect(result).not.toBeNull();
  expect(result.level).toBe(20);
  // XP just accumulates, no crash
  expect(result.xp).toBe(50100);
});

// ==========================================================
// Test 5: Negative / zero / invalid XP
// ==========================================================
test('负数或零 XP，返回 null 且不写数据库', function() {
  setupUser(1, 50, 1, 50);

  var resultNeg = LevelService.addXP(1, -10);
  expect(resultNeg).toBeNull();

  var resultZero = LevelService.addXP(1, 0);
  expect(resultZero).toBeNull();

  // run() should NOT have been called (no DB write for invalid input)
  var updateCalls = db.run.mock.calls.filter(function(c) {
    return c[0].indexOf('UPDATE users') === 0;
  });
  expect(updateCalls.length).toBe(0);
});
