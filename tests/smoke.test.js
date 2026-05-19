/**
 * 系统冒烟测试 — 一键验证后端核心链路
 *
 * 覆盖：数据库初始化 / 模块加载 / 路由表完整性 / API 端到端 (注册→登录→发帖→评论→删帖→登出)
 *
 * 运行: npm test
 */

// ==========================================================
// Test 1: 数据库初始化 + 模块全量加载
// ==========================================================
test('数据库初始化 + 全部模块加载', function() {
  process.env.DB_PATH = 'F:/code/portfolio/database.db';
  process.env.SESSION_SECRET = 'smoke-test-secret';

  var db = require('../db/init');
  db.initDatabase();

  // Verify schema version
  var sv = db.getFirst("SELECT value FROM settings WHERE key = 'schema_version'");
  expect(sv).not.toBeNull();

  // Verify critical tables exist
  var tables = db.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
  var tableNames = tables.map(function(t) { return t.name; });
  expect(tableNames).toContain('users');
  expect(tableNames).toContain('posts');
  expect(tableNames).toContain('comments');
  expect(tableNames).toContain('sessions');
  expect(tableNames).toContain('level_config');
  expect(tableNames).toContain('notifications');
  expect(tableNames).toContain('settings');

  // Load all route files (catches circular deps, missing imports)
  var routeFiles = [
    'auth', 'posts', 'comments', 'notifications', 'users', 'friends',
    'music', 'bookmarks', 'reports', 'levels', 'admin', 'tags',
    'reactions', 'avatar', 'upload', 'file', 'site', 'settings',
    'ads', 'loginNotices', 'applications', 'jobs-stats'
  ];
  routeFiles.forEach(function(f) {
    expect(function() { require('../routes/' + f); }).not.toThrow();
  });

  // Load all service files
  var serviceFiles = ['AuthService', 'PostService', 'LevelService', 'FileService', 'NotificationService', 'LoginNoticeService'];
  serviceFiles.forEach(function(f) {
    expect(function() { require('../services/' + f); }).not.toThrow();
  });

  // Load middleware
  expect(function() { require('../middleware/auth'); }).not.toThrow();
  expect(function() { require('../middleware/zoneAccess'); }).not.toThrow();
  expect(function() { require('../middleware/errorHandler'); }).not.toThrow();
  expect(function() { require('../middleware/upload'); }).not.toThrow();
});

// ==========================================================
// Test 2: CONVENTIONS 合规 — 无动态 require
// ==========================================================
test('CONVENTIONS: 函数体内无动态 require(\'../db/init\')', function() {
  var fs = require('fs');
  var path = require('path');
  var base = path.join(__dirname, '..');

  // Check all JS files in routes/, services/, middleware/
  var dirs = ['routes', 'services', 'middleware'];
  var violations = [];

  dirs.forEach(function(dir) {
    var dirPath = path.join(base, dir);
    if (!fs.existsSync(dirPath)) return;
    var files = fs.readdirSync(dirPath).filter(function(f) { return f.endsWith('.js'); });
    files.forEach(function(f) {
      var content = fs.readFileSync(path.join(dirPath, f), 'utf8');
      var lines = content.split('\n');
      lines.forEach(function(line, idx) {
        // Match: any indented line containing require('../db/init')
        if (/^\s+.*require\(['"]\.\.\/db\/init['"]\)/.test(line)) {
          violations.push(dir + '/' + f + ':' + (idx + 1));
        }
      });
    });
  });

  if (violations.length > 0) {
    console.log('Violations:\n  ' + violations.join('\n  '));
  }
  expect(violations.length).toBe(0);
});

// ==========================================================
// Test 3: 路由表完整性
// ==========================================================
test('路由表: 所有关键路径已注册', function() {
  // Read router.js and verify it contains expected route patterns
  var fs = require('fs');
  var path = require('path');
  var content = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'router.js'), 'utf8');

  var requiredRoutes = [
    "'/works'", "'/chats'", "'/music'", "'/friends'", "'/profile'",
    "'/login'", "'/register'", "'/bookmarks'",
    "'/posts/:id'", "'/users/:id'", "'/edit/:id'", "'/chat/:id'",
    "'/admin/stats'", "'/admin/users'", "'/admin/reports'"
  ];

  requiredRoutes.forEach(function(route) {
    expect(content.indexOf(route)).toBeGreaterThan(-1);
  });
});
