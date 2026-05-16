// ===== Database Migrations: ALTER TABLE and table rebuilds =====

function runMigrations(run, get, all, forceSave) {
  var logger = console; // Use console for DB init logging

  // ===== Notifications table: make post_id nullable =====
  // SQLite doesn't support ALTER COLUMN, so we recreate the table
  run("DROP TABLE IF EXISTS notifications_new");
  run("DROP TABLE IF EXISTS notifications_old");

  try {
    const tableInfo = all("PRAGMA table_info(notifications)");
    const postIdCol = tableInfo.find(col => col.name === 'post_id');
    if (postIdCol && postIdCol.notnull === 1) {
      logger.log('[DB] Migrating notifications table to allow nullable post_id...');
      run("PRAGMA foreign_keys = OFF");
      run("CREATE TABLE IF NOT EXISTS notifications_new (\n" +
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
      run("INSERT INTO notifications_new SELECT * FROM notifications");
      run("DROP TABLE notifications");
      run("ALTER TABLE notifications_new RENAME TO notifications");
      run("PRAGMA foreign_keys = ON");
      logger.log('[DB] Notifications table migrated successfully.');
    }
  } catch (e) {
    logger.log('[DB] Notification migration skipped or already done:', e.message);
    run("DROP TABLE IF EXISTS notifications_new");
  }

  // ===== Column additions =====
  // Posts
  try { run("ALTER TABLE posts ADD COLUMN tags TEXT DEFAULT ''"); } catch (e) {}
  try { run("ALTER TABLE posts ADD COLUMN views INTEGER DEFAULT 0"); } catch (e) {}
  try { run("ALTER TABLE posts ADD COLUMN category TEXT DEFAULT 'work'"); } catch (e) {}
  try { run("ALTER TABLE posts ADD COLUMN like_count INTEGER DEFAULT 0"); } catch (e) {}
  try { run("ALTER TABLE posts ADD COLUMN dislike_count INTEGER DEFAULT 0"); } catch (e) {}
  try { run("ALTER TABLE posts ADD COLUMN is_sticky INTEGER DEFAULT 0"); } catch (e) {}
  try { run("ALTER TABLE posts ADD COLUMN is_featured INTEGER DEFAULT 0"); } catch (e) {}
  try { run("ALTER TABLE posts ADD COLUMN deleted_at TEXT"); } catch (e) {}
  try { run("ALTER TABLE posts ADD COLUMN is_locked INTEGER DEFAULT 0"); } catch (e) {}

  // User profiles
  try { run("ALTER TABLE user_profiles ADD COLUMN nickname TEXT DEFAULT ''"); } catch (e) {}
  try { run("ALTER TABLE user_profiles ADD COLUMN skills TEXT DEFAULT '[]'"); } catch (e) {}

  // Users
  try { run("ALTER TABLE users ADD COLUMN is_banned INTEGER DEFAULT 0"); } catch (e) {}
  try { run("ALTER TABLE users ADD COLUMN banned_until TEXT"); } catch (e) {}
  try { run("ALTER TABLE users ADD COLUMN ban_reason TEXT DEFAULT ''"); } catch (e) {}
  try { run("ALTER TABLE users ADD COLUMN last_seen_at TEXT DEFAULT ''"); } catch (e) {}
  try { run("ALTER TABLE users ADD COLUMN level INTEGER DEFAULT 1"); } catch (e) {}
  try { run("ALTER TABLE users ADD COLUMN points INTEGER DEFAULT 0"); } catch (e) {}
  try { run("ALTER TABLE users ADD COLUMN coins INTEGER DEFAULT 0"); } catch (e) {}
  try { run("ALTER TABLE users ADD COLUMN xp INTEGER DEFAULT 0"); } catch (e) {}

  // Comments
  try { run("ALTER TABLE comments ADD COLUMN deleted_at TEXT"); } catch (e) {}

  // Level config
  try { run("ALTER TABLE level_config ADD COLUMN name TEXT DEFAULT ''"); } catch (e) {}
  try { run("ALTER TABLE level_config ADD COLUMN title_icon TEXT DEFAULT ''"); } catch (e) {}
  try { run("ALTER TABLE level_config ADD COLUMN bg_image TEXT DEFAULT ''"); } catch (e) {}

  // Playlists
  try { run("ALTER TABLE playlists ADD COLUMN is_public INTEGER DEFAULT 0"); } catch (e) {}
  try { run("ALTER TABLE playlists ADD COLUMN view_count INTEGER DEFAULT 0"); } catch (e) {}

  // Ads
  try { run("ALTER TABLE ads ADD COLUMN display_pages TEXT DEFAULT 'works,chats'"); } catch (e) {}

  // ===== Level config: add 'music' zone to existing configs =====
  const cfgRows = all("SELECT level, zones FROM level_config WHERE zones NOT LIKE '%music%'");
  for (var i = 0; i < cfgRows.length; i++) {
    var row = cfgRows[i];
    try {
      const z = JSON.parse(row.zones);
      if (Array.isArray(z) && !z.includes('music')) {
        z.push('music');
        run("UPDATE level_config SET zones = ? WHERE level = ?", [JSON.stringify(z), row.level]);
      }
    } catch (e) {}
  }
  if (cfgRows.length > 0) { forceSave(); logger.log('[DB] Level configs updated to include music zone.'); }

  // ===== Fix song cover URLs =====
  run("UPDATE songs SET cover_url = REPLACE(cover_url, '/api/file/music_cover/', '/api/file/') WHERE cover_url LIKE '%/api/file/music_cover/%'");

  // ===== Content blocks: attachment support =====
  try {
    const tableInfo = all("PRAGMA table_info(content_blocks)");
    const hasAttachmentCol = tableInfo.find(col => col.name === 'attachment_file_id');
    if (!hasAttachmentCol) {
      logger.log('[DB] Migrating content_blocks table for attachment support...');
      run("PRAGMA foreign_keys = OFF");
      run(`CREATE TABLE IF NOT EXISTS content_blocks_new (
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
      run("INSERT INTO content_blocks_new SELECT id, post_id, type, value, file_id, allow_preview, sort_order, created_at, NULL, '', 0, 0, 0, 0 FROM content_blocks");
      run("DROP TABLE content_blocks");
      run("ALTER TABLE content_blocks_new RENAME TO content_blocks");
      run("PRAGMA foreign_keys = ON");
      forceSave();
      logger.log('[DB] Content_blocks migration complete.');
    }
  } catch (e) {
    logger.log('[DB] Content_blocks migration error:', e.message);
    try { run("DROP TABLE IF EXISTS content_blocks_new"); } catch (ex) {}
  }

  // Zone stats defaults
  try { run("INSERT OR IGNORE INTO zone_stats (zone_name, post_count, reply_count) VALUES ('works', 0, 0)"); } catch (e) {}
  try { run("INSERT OR IGNORE INTO zone_stats (zone_name, post_count, reply_count) VALUES ('chat', 0, 0)"); } catch (e) {}
}

module.exports = { runMigrations };
