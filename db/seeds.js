// ===== Database Seeds: Default data for fresh databases =====

function seedData(run, get, getFirst, all, forceSave, saveDB) {
  var logger = console;
  var bcrypt = require('bcryptjs');

  // ===== Seed default level config =====
  const levelCount = getFirst("SELECT COUNT(*) as count FROM level_config");
  if (!levelCount || levelCount.count === 0) {
    const names = ['', '新手', '学徒', '工匠', '专家', '大师', '宗师', '传说', '神话', '史诗', '不朽', '星辰', '银河', '宇宙', '创世', '超越', '无限', '永恒', '至尊', '巅峰'];
    const defaultLevels = [
      [1, 0, '["work","chat","music","job"]'],
      [2, 100, '["work","chat","music","job"]'],
      [3, 300, '["work","chat","music","job"]'],
      [4, 600, '["work","chat","music","job"]'],
      [5, 1000, '["work","chat","music","job"]'],
      [6, 1500, '["work","chat","music","job"]'],
      [7, 2100, '["work","chat","music","job"]'],
      [8, 2800, '["work","chat","music","job"]'],
      [9, 3600, '["work","chat","music","job"]'],
      [10, 5000, '["work","chat","music","job"]'],
      [11, 6500, '["work","chat","music","job"]'],
      [12, 8000, '["work","chat","music","job"]'],
      [13, 10000, '["work","chat","music","job"]'],
      [14, 12000, '["work","chat","music","job"]'],
      [15, 15000, '["work","chat","music","job"]'],
      [16, 18000, '["work","chat","music","job"]'],
      [17, 22000, '["work","chat","music","job"]'],
      [18, 26000, '["work","chat","music","job"]'],
      [19, 30000, '["work","chat","music","job"]'],
      [20, 40000, '["work","chat","music","job"]']
    ];
    for (var i = 0; i < defaultLevels.length; i++) {
      var lvl = defaultLevels[i][0], xp = defaultLevels[i][1], z = defaultLevels[i][2];
      var n = names[lvl] || '';
      run("INSERT INTO level_config (level, xp_required, zones, name, title_icon, bg_image) VALUES (?, ?, ?, ?, ?, ?)", [lvl, xp, z, n, '', '']);
    }
    saveDB();
    logger.log('[DB] Default level config created.');
  }

  // ===== Tag migration: migrate comma-separated tags to junction table =====
  const tagMigrationDone = getFirst("SELECT value FROM settings WHERE key = 'tag_migration_done'");
  const hasPostTags = getFirst('SELECT COUNT(*) as count FROM post_tags');
  if (!tagMigrationDone && (!hasPostTags || hasPostTags.count === 0)) {
    const existingPosts = all('SELECT id, tags FROM posts WHERE tags IS NOT NULL AND tags != ?', [""]);
    for (var i = 0; i < existingPosts.length; i++) {
      var post = existingPosts[i];
      const tagNames = post.tags.split(',').map(function(t) { return t.trim(); }).filter(Boolean);
      for (var j = 0; j < tagNames.length; j++) {
        var name = tagNames[j];
        run("INSERT OR IGNORE INTO tags (name) VALUES (?)", [name]);
        const tag = getFirst("SELECT id FROM tags WHERE name = ?", [name]);
        if (tag) {
          run("INSERT OR IGNORE INTO post_tags (post_id, tag_id) VALUES (?, ?)", [post.id, tag.id]);
        }
      }
    }
    run("INSERT OR REPLACE INTO settings (key, value) VALUES ('tag_migration_done', '1')");
    saveDB();
    logger.log('[DB] Tags migration completed.');
  }

  // ===== Create default admin if no users =====
  const userCount = getFirst('SELECT COUNT(*) as count FROM users');
  if (!userCount || userCount.count === 0) {
    logger.log('[DB] Creating default admin account...');
    const hashed = bcrypt.hashSync('admin123', 10);
    run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', ['admin', hashed, 'admin']);
    saveDB();
    logger.log('[DB] Default admin created: admin / admin123');
  }

  // ===== Demo posts =====
  const postCount = getFirst('SELECT COUNT(*) as count FROM posts');
  if (!postCount || postCount.count === 0) {
    const adminUser = getFirst('SELECT id FROM users WHERE username = ?', ['admin']);
    const adminId = adminUser.id;
    logger.log('[DB] Creating demo posts...');

    run('INSERT INTO posts (title, description, tags, views, created_by) VALUES (?, ?, ?, ?, ?)',
      ['演示作品1', '这是一个演示作品，包含多种内容类型。部分内容仅管理员可见。', '设计,前端,JavaScript', Math.floor(Math.random() * 200 + 50), adminId]);
    const post1Id = getFirst('SELECT MAX(id) as id FROM posts').id;
    run('INSERT INTO content_blocks (post_id, type, value, allow_preview, sort_order) VALUES (?, ?, ?, ?, ?)',
      [post1Id, 'text', '这是第一段公开的文本内容。所有登录用户都可以看到这段文字。', 1, 0]);
    run('INSERT INTO content_blocks (post_id, type, value, allow_preview, sort_order) VALUES (?, ?, ?, ?, ?)',
      [post1Id, 'text', '这是一段非公开的文本内容。仅管理员可以看到。', 0, 1]);
    run('INSERT INTO content_blocks (post_id, type, value, allow_preview, sort_order) VALUES (?, ?, ?, ?, ?)',
      [post1Id, 'code', '// 公开的代码示例\nfunction hello() {\n  console.log("Hello World!");\n}\n\nhello();', 1, 2]);
    run('INSERT INTO content_blocks (post_id, type, value, allow_preview, sort_order) VALUES (?, ?, ?, ?, ?)',
      [post1Id, 'code', '// 非公开代码 - API密钥\nconst API_KEY = "sk-xxxxxxxxxxxx";', 0, 3]);

    run('INSERT INTO posts (title, description, tags, views, created_by) VALUES (?, ?, ?, ?, ?)',
      ['演示作品2', '这是一个简洁的演示作品，仅包含公开内容。', '插画,设计', Math.floor(Math.random() * 100 + 20), adminId]);
    const post2Id = getFirst('SELECT MAX(id) as id FROM posts').id;
    run('INSERT INTO content_blocks (post_id, type, value, allow_preview, sort_order) VALUES (?, ?, ?, ?, ?)',
      [post2Id, 'text', '这是演示作品2的公开文本内容。欢迎大家查看！', 1, 0]);
    run('INSERT INTO content_blocks (post_id, type, value, allow_preview, sort_order) VALUES (?, ?, ?, ?, ?)',
      [post2Id, 'text', '这是第二段公开内容，展示多段文本的排版效果。', 1, 1]);
    saveDB();
    logger.log('[DB] Demo posts created.');
  }

  // ===== Default sound settings =====
  const soundUrlExists = getFirst("SELECT value FROM settings WHERE key = 'sound_url'");
  if (!soundUrlExists) {
    run("INSERT OR IGNORE INTO settings (key, value) VALUES ('sound_url', '')");
  }
  const soundVolExists = getFirst("SELECT value FROM settings WHERE key = 'sound_volume'");
  if (!soundVolExists) {
    run("INSERT OR IGNORE INTO settings (key, value) VALUES ('sound_volume', '0.5')");
  }
  saveDB();

  // ===== Default about content =====
  const aboutExists = getFirst("SELECT value FROM site_info WHERE key = 'about'");
  if (!aboutExists) {
    run("INSERT OR IGNORE INTO site_info (key, value) VALUES ('about', ?)",
      [JSON.stringify({
        bio: '你好！我是一名创作者，热爱设计和开发。这里展示我的部分作品。',
        skills: ['UI/UX 设计', '前端开发', 'Node.js', '插画'],
        social: {
          github: 'https://github.com',
          weibo: 'https://weibo.com',
          email: ''
        },
        avatar_url: ''
      })]
    );
    saveDB();
    logger.log('[DB] Default about content created.');
  }
}

module.exports = { seedData };
