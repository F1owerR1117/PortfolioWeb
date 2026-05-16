const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const DB_PATH = path.resolve(process.env.DB_PATH || './database.db');

let db = null;
let SQL = null;
let _needsSave = false;

// Save database to disk
function saveDB() {
  try {
    if (!db) return;
    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
    _needsSave = false;
  } catch (err) {
    console.error('[DB] Save error:', err);
  }
}

// Periodic save
setInterval(() => {
  if (_needsSave) saveDB();
}, 2000);

// Save on exit
process.on('exit', () => { if (_needsSave) saveDB(); });
process.on('SIGINT', () => { if (_needsSave) saveDB(); process.exit(); });
process.on('SIGTERM', () => { if (_needsSave) saveDB(); process.exit(); });

async function initDatabase() {
  console.log('[DB] Initializing database...');
  SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
    console.log('[DB] Loaded existing database');
  } else {
    db = new SQL.Database();
    console.log('[DB] Created new database');
  }

  // Enable WAL mode and foreign keys
  db.run('PRAGMA journal_mode = WAL');
  db.run('PRAGMA foreign_keys = ON');

  // Create tables
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    cover_url TEXT DEFAULT '',
    cover_file_id INTEGER,
    tags TEXT DEFAULT '',
    views INTEGER DEFAULT 0,
    created_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS content_blocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('text','image','video','code')),
    value TEXT DEFAULT '',
    file_id INTEGER,
    allow_preview INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    filepath TEXT NOT NULL,
    size INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    parent_id INTEGER,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  // ====== Notification table migration: make post_id nullable ======
  // SQLite doesn't support ALTER COLUMN, so we recreate the table
  // First, clean up any stale migration leftovers
  db.run("DROP TABLE IF EXISTS notifications_new");
  db.run("DROP TABLE IF EXISTS notifications_old");

  try {
    // Check current schema — PRAGMA succeeds even if table doesn't exist
    const tableInfo = all("PRAGMA table_info(notifications)");
    const postIdCol = tableInfo.find(col => col.name === 'post_id');
    if (postIdCol && postIdCol.notnull === 1) {
      console.log('[DB] Migrating notifications table to allow nullable post_id...');
      // Disable FK temporarily for migration, then re-enable
      db.run("PRAGMA foreign_keys = OFF");
      db.run("CREATE TABLE IF NOT EXISTS notifications_new (\n" +
        "    id INTEGER PRIMARY KEY AUTOINCREMENT,\n" +
        "    user_id INTEGER NOT NULL,\n" +
        "    actor_id INTEGER NOT NULL,\n" +
        "    type TEXT NOT NULL DEFAULT 'reply',\n" +
        "    post_id INTEGER,\n" +
        "    comment_id INTEGER,\n" +
        "    parent_comment_id INTEGER,\n" +
        "    is_read INTEGER DEFAULT 0,\n" +
        "    created_at DATETIME DEFAULT CURRENT_TIMESTAMP\n" +
        ")");
      db.run("INSERT INTO notifications_new SELECT * FROM notifications");
      db.run("DROP TABLE notifications");
      db.run("ALTER TABLE notifications_new RENAME TO notifications");
      db.run("PRAGMA foreign_keys = ON");
      console.log('[DB] Notifications table migrated successfully.');
    }
  } catch (e) {
    console.log('[DB] Notification migration skipped or already done:', e.message);
    db.run("DROP TABLE IF EXISTS notifications_new");
  }

  // Create notifications table if not exists (for fresh databases — now with nullable post_id)
  db.run(`CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    actor_id INTEGER NOT NULL,
    type TEXT NOT NULL DEFAULT 'reply',
    post_id INTEGER,
    comment_id INTEGER,
    parent_comment_id INTEGER,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS site_info (
    key TEXT PRIMARY KEY,
    value TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS user_profiles (
    user_id INTEGER PRIMARY KEY,
    bio TEXT DEFAULT '',
    avatar_url TEXT DEFAULT '',
    social TEXT DEFAULT '{}',
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS friend_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_user_id INTEGER NOT NULL,
    to_user_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (from_user_id) REFERENCES users(id),
    FOREIGN KEY (to_user_id) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS friends (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    friend_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (friend_id) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_user_id INTEGER NOT NULL,
    to_user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (from_user_id) REFERENCES users(id),
    FOREIGN KEY (to_user_id) REFERENCES users(id)
  )`);

  // Create tags and post_tags tables
  db.run(`CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS post_tags (
    post_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (post_id, tag_id),
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
  )`);

  // Create post_reactions table
  db.run(`CREATE TABLE IF NOT EXISTS post_reactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    post_id INTEGER NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('like','dislike')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
  )`);
  try { db.run("CREATE UNIQUE INDEX IF NOT EXISTS idx_post_reactions_user_post ON post_reactions(user_id, post_id)"); } catch (e) {}

  // Migrate existing databases: add tags/views columns if missing
  try { db.run("ALTER TABLE posts ADD COLUMN tags TEXT DEFAULT ''"); } catch (e) { /* column exists */ }
  try { db.run("ALTER TABLE posts ADD COLUMN views INTEGER DEFAULT 0"); } catch (e) { /* column exists */ }

  // Migrate: add nickname to user_profiles
  try { db.run("ALTER TABLE user_profiles ADD COLUMN nickname TEXT DEFAULT ''"); } catch (e) { /* column exists */ }
  // Migrate: add skills to user_profiles
  try { db.run("ALTER TABLE user_profiles ADD COLUMN skills TEXT DEFAULT '[]'"); } catch (e) { /* column exists */ }

  // Migrate: add category column to posts
  try { db.run("ALTER TABLE posts ADD COLUMN category TEXT DEFAULT 'work'"); } catch (e) { /* column exists */ }

  // Migrate: add like/dislike counts to posts
  try { db.run("ALTER TABLE posts ADD COLUMN like_count INTEGER DEFAULT 0"); } catch (e) { /* column exists */ }
  try { db.run("ALTER TABLE posts ADD COLUMN dislike_count INTEGER DEFAULT 0"); } catch (e) { /* column exists */ }

  // Migrate: add sticky/featured flag to posts
  try { db.run("ALTER TABLE posts ADD COLUMN is_sticky INTEGER DEFAULT 0"); } catch (e) { /* column exists */ }
  try { db.run("ALTER TABLE posts ADD COLUMN is_featured INTEGER DEFAULT 0"); } catch (e) { /* column exists */ }

  // Migrate: add is_banned to users
  try { db.run("ALTER TABLE users ADD COLUMN is_banned INTEGER DEFAULT 0"); } catch (e) { /* column exists */ }
  // Migrate: add ban duration and reason
  try { db.run("ALTER TABLE users ADD COLUMN banned_until TEXT"); } catch (e) { /* column exists */ }
  try { db.run("ALTER TABLE users ADD COLUMN ban_reason TEXT DEFAULT ''"); } catch (e) { /* column exists */ }

  // Migrate: soft delete support
  try { db.run("ALTER TABLE posts ADD COLUMN deleted_at TEXT"); } catch (e) { /* column exists */ }
  try { db.run("ALTER TABLE comments ADD COLUMN deleted_at TEXT"); } catch (e) { /* column exists */ }

  // Migrate: lock posts
  try { db.run("ALTER TABLE posts ADD COLUMN is_locked INTEGER DEFAULT 0"); } catch (e) { /* column exists */ }

  // Migrate: track last active time for online status
  try { db.run("ALTER TABLE users ADD COLUMN last_seen_at TEXT DEFAULT ''"); } catch (e) { /* column exists */ }

  // Migrate: add level/points/coins to users (for admin user list and post queries)
  try { db.run("ALTER TABLE users ADD COLUMN level INTEGER DEFAULT 1"); } catch (e) { /* column exists */ }
  try { db.run("ALTER TABLE users ADD COLUMN points INTEGER DEFAULT 0"); } catch (e) { /* column exists */ }
  try { db.run("ALTER TABLE users ADD COLUMN coins INTEGER DEFAULT 0"); } catch (e) { /* column exists */ }
  try { db.run("ALTER TABLE users ADD COLUMN xp INTEGER DEFAULT 0"); } catch (e) { /* column exists */ }

  // Level config table
  db.run(`CREATE TABLE IF NOT EXISTS level_config (
    level INTEGER PRIMARY KEY,
    xp_required INTEGER NOT NULL,
    zones TEXT NOT NULL DEFAULT '["work","chat"]',
    name TEXT DEFAULT '',
    title_icon TEXT DEFAULT '',
    bg_image TEXT DEFAULT ''
  )`);

  // Migrate: add name and title_icon to level_config
  try { db.run("ALTER TABLE level_config ADD COLUMN name TEXT DEFAULT ''"); } catch (e) {}
  try { db.run("ALTER TABLE level_config ADD COLUMN title_icon TEXT DEFAULT ''"); } catch (e) {}
  try { db.run("ALTER TABLE level_config ADD COLUMN bg_image TEXT DEFAULT ''"); } catch (e) {}

  // Migrate: add 'music' to level zones if missing
  const cfgRows = all("SELECT level, zones FROM level_config WHERE zones NOT LIKE '%music%'");
  for (const row of cfgRows) {
    try {
      const z = JSON.parse(row.zones);
      if (Array.isArray(z) && !z.includes('music')) {
        z.push('music');
        run("UPDATE level_config SET zones = ? WHERE level = ?", [JSON.stringify(z), row.level]);
      }
    } catch (e) {}
  }
  if (cfgRows.length > 0) { saveDB(); console.log('[DB] Level configs updated to include music zone.'); }

  // Seed default level config if table is empty
  const levelCount = getFirst("SELECT COUNT(*) as count FROM level_config");
  if (!levelCount || levelCount.count === 0) {
    const names = ['', '新手', '学徒', '工匠', '专家', '大师', '宗师', '传说', '神话', '史诗', '不朽', '星辰', '银河', '宇宙', '创世', '超越', '无限', '永恒', '至尊', '巅峰'];
    const defaultLevels = [
      [1, 0, '["work","chat","music"]'],
      [2, 100, '["work","chat","music"]'],
      [3, 300, '["work","chat","music"]'],
      [4, 600, '["work","chat","music"]'],
      [5, 1000, '["work","chat","music"]'],
      [6, 1500, '["work","chat","music"]'],
      [7, 2100, '["work","chat","music"]'],
      [8, 2800, '["work","chat","music"]'],
      [9, 3600, '["work","chat","music"]'],
      [10, 5000, '["work","chat","music"]'],
      [11, 6500, '["work","chat","music"]'],
      [12, 8000, '["work","chat","music"]'],
      [13, 10000, '["work","chat","music"]'],
      [14, 12000, '["work","chat","music"]'],
      [15, 15000, '["work","chat","music"]'],
      [16, 18000, '["work","chat","music"]'],
      [17, 22000, '["work","chat","music"]'],
      [18, 26000, '["work","chat","music"]'],
      [19, 30000, '["work","chat","music"]'],
      [20, 40000, '["work","chat","music"]']
    ];
    for (const [lvl, xp, z] of defaultLevels) {
      const n = names[lvl] || '';
      db.run("INSERT INTO level_config (level, xp_required, zones, name, title_icon, bg_image) VALUES (?, ?, ?, ?, ?, ?)", [lvl, xp, z, n, '', '']);
    }
    saveDB();
    console.log('[DB] Default level config created.');
  }

  // Music system tables
  db.run(`CREATE TABLE IF NOT EXISTS songs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    artist TEXT DEFAULT '',
    cover_url TEXT DEFAULT '',
    file_url TEXT NOT NULL,
    duration REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS playlists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    cover_url TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS playlist_songs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    playlist_id INTEGER NOT NULL,
    song_id INTEGER NOT NULL,
    sort_order INTEGER DEFAULT 0,
    FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
    FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
  )`);

  // Migrate: fix song cover URLs (remove spurious 'music_cover/' segment)
  db.run("UPDATE songs SET cover_url = REPLACE(cover_url, '/api/file/music_cover/', '/api/file/') WHERE cover_url LIKE '%/api/file/music_cover/%'");

  // Create post_views table for persistent view tracking (cross-session)
  db.run(`CREATE TABLE IF NOT EXISTS post_views (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    post_id INTEGER NOT NULL,
    viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
  )`);
  try { db.run("CREATE UNIQUE INDEX IF NOT EXISTS idx_post_views_user_post ON post_views(user_id, post_id)"); } catch (e) {}

  // Migrate existing comma-separated tags to the new junction table (ONE-TIME migration)
  const tagMigrationDone = getFirst("SELECT value FROM settings WHERE key = 'tag_migration_done'");
  const hasPostTags = getFirst('SELECT COUNT(*) as count FROM post_tags');
  if (!tagMigrationDone && (!hasPostTags || hasPostTags.count === 0)) {
    const existingPosts = all('SELECT id, tags FROM posts WHERE tags IS NOT NULL AND tags != ?', [""]);
    for (const post of existingPosts) {
      const tagNames = post.tags.split(',').map(t => t.trim()).filter(Boolean);
      for (const name of tagNames) {
        db.run("INSERT OR IGNORE INTO tags (name) VALUES (?)", [name]);
        const tag = getFirst("SELECT id FROM tags WHERE name = ?", [name]);
        if (tag) {
          db.run("INSERT OR IGNORE INTO post_tags (post_id, tag_id) VALUES (?, ?)", [post.id, tag.id]);
        }
      }
    }
    db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('tag_migration_done', '1')");
    saveDB();
    console.log('[DB] Tags migration completed.');
  }

  saveDB();

  // Create default admin if users table is empty
  const userCount = getFirst('SELECT COUNT(*) as count FROM users');
  if (!userCount || userCount.count === 0) {
    console.log('[DB] Creating default admin account...');
    const hashed = bcrypt.hashSync('admin123', 10);
    db.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', ['admin', hashed, 'admin']);
    saveDB();
    console.log('[DB] Default admin created: admin / admin123');
  }

  // Create demo posts if posts table is empty
  const postCount = getFirst('SELECT COUNT(*) as count FROM posts');
  if (!postCount || postCount.count === 0) {
    const adminUser = getFirst('SELECT id FROM users WHERE username = ?', ['admin']);
    const adminId = adminUser.id;

    console.log('[DB] Creating demo posts...');

    // Post 1
    db.run('INSERT INTO posts (title, description, tags, views, created_by) VALUES (?, ?, ?, ?, ?)',
      ['演示作品1', '这是一个演示作品，包含多种内容类型。部分内容仅管理员可见。', '设计,前端,JavaScript', Math.floor(Math.random() * 200 + 50), adminId]);
    const post1Id = getFirst('SELECT MAX(id) as id FROM posts').id;

    db.run('INSERT INTO content_blocks (post_id, type, value, allow_preview, sort_order) VALUES (?, ?, ?, ?, ?)',
      [post1Id, 'text', '这是第一段公开的文本内容。所有登录用户都可以看到这段文字。', 1, 0]);
    db.run('INSERT INTO content_blocks (post_id, type, value, allow_preview, sort_order) VALUES (?, ?, ?, ?, ?)',
      [post1Id, 'text', '这是一段非公开的文本内容。仅管理员可以看到。', 0, 1]);
    db.run('INSERT INTO content_blocks (post_id, type, value, allow_preview, sort_order) VALUES (?, ?, ?, ?, ?)',
      [post1Id, 'code', '// 公开的代码示例\nfunction hello() {\n  console.log("Hello World!");\n}\n\nhello();', 1, 2]);
    db.run('INSERT INTO content_blocks (post_id, type, value, allow_preview, sort_order) VALUES (?, ?, ?, ?, ?)',
      [post1Id, 'code', '// 非公开代码 - API密钥\nconst API_KEY = "sk-xxxxxxxxxxxx";\n// 这里的内容不会对普通用户展示', 0, 3]);

    // Post 2
    db.run('INSERT INTO posts (title, description, tags, views, created_by) VALUES (?, ?, ?, ?, ?)',
      ['演示作品2', '这是一个简洁的演示作品，仅包含公开内容。', '插画,设计', Math.floor(Math.random() * 100 + 20), adminId]);
    const post2Id = getFirst('SELECT MAX(id) as id FROM posts').id;

    db.run('INSERT INTO content_blocks (post_id, type, value, allow_preview, sort_order) VALUES (?, ?, ?, ?, ?)',
      [post2Id, 'text', '这是演示作品2的公开文本内容。欢迎大家查看！', 1, 0]);
    db.run('INSERT INTO content_blocks (post_id, type, value, allow_preview, sort_order) VALUES (?, ?, ?, ?, ?)',
      [post2Id, 'text', '这是第二段公开内容，展示多段文本的排版效果。', 1, 1]);

    saveDB();
    console.log('[DB] Demo posts created.');
  }

  // ===== Playlist public & collections =====
  try { db.run("ALTER TABLE playlists ADD COLUMN is_public INTEGER DEFAULT 0"); } catch (e) {}
  try { db.run("ALTER TABLE playlists ADD COLUMN view_count INTEGER DEFAULT 0"); } catch (e) {}

  db.run(`CREATE TABLE IF NOT EXISTS playlist_collections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    playlist_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
  )`);
  try { db.run("CREATE UNIQUE INDEX IF NOT EXISTS idx_playlist_collections ON playlist_collections(user_id, playlist_id)"); } catch (e) {}

  // ===== Post bookmark system =====
  db.run(`CREATE TABLE IF NOT EXISTS bookmark_collections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS post_bookmarks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    post_id INTEGER NOT NULL,
    collection_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (collection_id) REFERENCES bookmark_collections(id) ON DELETE CASCADE
  )`);
  try { db.run("CREATE UNIQUE INDEX IF NOT EXISTS idx_post_bookmarks ON post_bookmarks(user_id, post_id, collection_id)"); } catch (e) {}

  // ===== Report system =====
  db.run(`CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reporter_id INTEGER NOT NULL,
    target_type TEXT NOT NULL CHECK(target_type IN ('post','user')),
    target_id INTEGER NOT NULL,
    reason TEXT DEFAULT '',
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending','resolved','dismissed')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME,
    FOREIGN KEY (reporter_id) REFERENCES users(id)
  )`);

  // ===== Admin zone stats =====
  db.run(`CREATE TABLE IF NOT EXISTS zone_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    zone_name TEXT NOT NULL UNIQUE,
    post_count INTEGER DEFAULT 0,
    reply_count INTEGER DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  try { db.run("INSERT OR IGNORE INTO zone_stats (zone_name, post_count, reply_count) VALUES ('works', 0, 0)"); } catch (e) {}
  try { db.run("INSERT OR IGNORE INTO zone_stats (zone_name, post_count, reply_count) VALUES ('chat', 0, 0)"); } catch (e) {}

  // ===== Login notification popup =====
  db.run(`CREATE TABLE IF NOT EXISTS login_notices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    link_url TEXT NOT NULL DEFAULT '',
    priority INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    start_date DATETIME,
    end_date DATETIME,
    show_once INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS login_notice_views (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    notice_id INTEGER NOT NULL,
    viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, notice_id)
  )`);

  // ===== Attachment system: content_blocks migration to support file type ====
  try {
    const tableInfo = all("PRAGMA table_info(content_blocks)");
    const hasAttachmentCol = tableInfo.find(col => col.name === 'attachment_file_id');
    if (!hasAttachmentCol) {
      console.log('[DB] Migrating content_blocks table for attachment support...');
      db.run("PRAGMA foreign_keys = OFF");
      db.run(`CREATE TABLE IF NOT EXISTS content_blocks_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        value TEXT DEFAULT '',
        file_id INTEGER,
        allow_preview INTEGER DEFAULT 1,
        sort_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        attachment_file_id INTEGER,
        attachment_name TEXT DEFAULT '',
        attachment_size INTEGER DEFAULT 0,
        min_level_view INTEGER DEFAULT 0,
        unlock_points INTEGER DEFAULT 0,
        download_points INTEGER DEFAULT 0,
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
      )`);
      db.run("INSERT INTO content_blocks_new SELECT id, post_id, type, value, file_id, allow_preview, sort_order, created_at, NULL, '', 0, 0, 0, 0 FROM content_blocks");
      db.run("DROP TABLE content_blocks");
      db.run("ALTER TABLE content_blocks_new RENAME TO content_blocks");
      db.run("PRAGMA foreign_keys = ON");
      saveDB();
      console.log('[DB] Content_blocks migration complete.');
    }
  } catch (e) {
    console.log('[DB] Content_blocks migration error:', e.message);
    try { db.run("DROP TABLE IF EXISTS content_blocks_new"); } catch (ex) {}
  }

  // ===== Attachment purchases table =====
  db.run(`CREATE TABLE IF NOT EXISTS attachment_purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    block_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('unlock','download')),
    points_paid INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(block_id, user_id, type),
    FOREIGN KEY (block_id) REFERENCES content_blocks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  // Ensure default settings
  const soundUrlExists = getFirst("SELECT value FROM settings WHERE key = 'sound_url'");
  if (!soundUrlExists) {
    db.run("INSERT OR IGNORE INTO settings (key, value) VALUES ('sound_url', '')");
  }
  const soundVolExists = getFirst("SELECT value FROM settings WHERE key = 'sound_volume'");
  if (!soundVolExists) {
    db.run("INSERT OR IGNORE INTO settings (key, value) VALUES ('sound_volume', '0.5')");
  }
  saveDB();

  // Seed default about content if empty
  const aboutExists = getFirst("SELECT value FROM site_info WHERE key = 'about'");
  if (!aboutExists) {
    db.run("INSERT OR IGNORE INTO site_info (key, value) VALUES ('about', ?)",
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
    console.log('[DB] Default about content created.');
  }

  console.log('[DB] Database initialization complete.');
}

// ===== Query Helpers (synchronous, using sql.js) =====

function getDb() {
  if (!db) throw new Error('Database not initialized');
  return db;
}

function run(sql, params = []) {
  const d = getDb();
  d.run(sql, params);
  _needsSave = true;
  const idResult = d.exec("SELECT last_insert_rowid() as id");
  const lastID = idResult.length > 0 ? idResult[0].values[0][0] : null;
  return { lastID, changes: d.getRowsModified() };
}

function getFirst(sql, params = []) {
  const rows = all(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

function all(sql, params = []) {
  const d = getDb();
  const stmt = d.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

// Convenience alias
function get(sql, params = []) {
  return getFirst(sql, params);
}

// Export for immediate save
function forceSave() {
  saveDB();
}

// Add XP to a user, handle level-up, also reward coins, and return new state
function addXP(userId, amount) {
  if (amount <= 0) return null;
  const user = getFirst('SELECT xp, level, points, coins FROM users WHERE id = ?', [userId]);
  if (!user) return null;
  let newXP = (user.xp || 0) + amount;
  let newLevel = user.level || 1;
  let newPoints = (user.points || 0) + amount;
  let newCoins = (user.coins || 0) + amount;
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
  run('UPDATE users SET xp = ?, level = ?, points = ?, coins = ? WHERE id = ?', [newXP, newLevel, newPoints, newCoins, userId]);
  return { xp: newXP, level: newLevel, points: newPoints, coins: newCoins };
}

module.exports = { initDatabase, getDb, run, get, getFirst, all, forceSave, addXP };
