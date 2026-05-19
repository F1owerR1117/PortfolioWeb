// ===== Database Migrations: version-tracked schema changes =====
//
// Migration version is stored in the `settings` table as `schema_version`.
// Each migration block runs only when current version < its target version.
// After success, schema_version is bumped to that version.
// Add NEW migrations at the bottom with the next integer version.

function runMigrations(run, get, all, forceSave) {
  var logger = console;

  // ---- helpers ----
  function currentVersion() {
    var row = get("SELECT value FROM settings WHERE key = 'schema_version'");
    return row ? parseInt(row.value, 10) || 0 : 0;
  }
  function setVersion(v) {
    run("INSERT OR REPLACE INTO settings (key, value) VALUES ('schema_version', ?)", [String(v)]);
  }

  var ver = currentVersion();

  // ================================================================
  // v1 — Notifications: make post_id nullable (table rebuild)
  // ================================================================
  if (ver < 1) {
    run("DROP TABLE IF EXISTS notifications_new");
    run("DROP TABLE IF EXISTS notifications_old");
    try {
      var info = all("PRAGMA table_info(notifications)");
      var col = info.find(function(c) { return c.name === 'post_id'; });
      if (col && col.notnull === 1) {
        logger.log('[DB] v1: Migrating notifications table to allow nullable post_id...');
        run("PRAGMA foreign_keys = OFF");
        run("CREATE TABLE notifications_new (\n" +
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
        logger.log('[DB] v1: Notifications table migrated successfully.');
      }
      setVersion(1); forceSave();
    } catch (e) {
      logger.error('[DB] v1 FAILED:', e.message);
      try { run("DROP TABLE IF EXISTS notifications_new"); } catch (ex) {}
      throw new Error('Migration v1 (notifications nullable post_id) failed: ' + e.message);
    }
  }

  // ================================================================
  // v2 — Posts: add core columns (idempotent — skips existing)
  // ================================================================
  if (ver < 2) {
    var v2cols = [
      "ALTER TABLE posts ADD COLUMN tags TEXT DEFAULT ''",
      "ALTER TABLE posts ADD COLUMN views INTEGER DEFAULT 0",
      "ALTER TABLE posts ADD COLUMN category TEXT DEFAULT 'work'",
      "ALTER TABLE posts ADD COLUMN like_count INTEGER DEFAULT 0",
      "ALTER TABLE posts ADD COLUMN dislike_count INTEGER DEFAULT 0",
      "ALTER TABLE posts ADD COLUMN is_sticky INTEGER DEFAULT 0",
      "ALTER TABLE posts ADD COLUMN is_featured INTEGER DEFAULT 0",
      "ALTER TABLE posts ADD COLUMN deleted_at TEXT",
      "ALTER TABLE posts ADD COLUMN is_locked INTEGER DEFAULT 0"
    ];
    for (var vi = 0; vi < v2cols.length; vi++) {
      try { run(v2cols[vi]); } catch (e) {
        if (!/duplicate column name/i.test(e.message)) throw e;
      }
    }
    setVersion(2); forceSave();
    logger.log('[DB] v2: Posts columns ensured.');
  }

  // ================================================================
  // v3 — User profiles: add nickname, skills (idempotent)
  // ================================================================
  if (ver < 3) {
    try { run("ALTER TABLE user_profiles ADD COLUMN nickname TEXT DEFAULT ''"); } catch (e) { if (!/duplicate column name/i.test(e.message)) throw e; }
    try { run("ALTER TABLE user_profiles ADD COLUMN skills TEXT DEFAULT '[]'"); } catch (e) { if (!/duplicate column name/i.test(e.message)) throw e; }
    setVersion(3); forceSave();
    logger.log('[DB] v3: User profile columns ensured.');
  }

  // ================================================================
  // v4 — Users: add ban, level, points, coins, xp columns (idempotent)
  // ================================================================
  if (ver < 4) {
    var v4cols = [
      "ALTER TABLE users ADD COLUMN is_banned INTEGER DEFAULT 0",
      "ALTER TABLE users ADD COLUMN banned_until TEXT",
      "ALTER TABLE users ADD COLUMN ban_reason TEXT DEFAULT ''",
      "ALTER TABLE users ADD COLUMN last_seen_at TEXT DEFAULT ''",
      "ALTER TABLE users ADD COLUMN level INTEGER DEFAULT 1",
      "ALTER TABLE users ADD COLUMN points INTEGER DEFAULT 0",
      "ALTER TABLE users ADD COLUMN coins INTEGER DEFAULT 0",
      "ALTER TABLE users ADD COLUMN xp INTEGER DEFAULT 0"
    ];
    for (var vi = 0; vi < v4cols.length; vi++) {
      try { run(v4cols[vi]); } catch (e) {
        if (!/duplicate column name/i.test(e.message)) throw e;
      }
    }
    setVersion(4); forceSave();
    logger.log('[DB] v4: User columns ensured.');
  }

  // ================================================================
  // v5 — Comments: add deleted_at (idempotent)
  // ================================================================
  if (ver < 5) {
    try { run("ALTER TABLE comments ADD COLUMN deleted_at TEXT"); } catch (e) { if (!/duplicate column name/i.test(e.message)) throw e; }
    setVersion(5); forceSave();
    logger.log('[DB] v5: Comments deleted_at ensured.');
  }

  // ================================================================
  // v6 — Level config: add name, title_icon, bg_image (idempotent)
  // ================================================================
  if (ver < 6) {
    try { run("ALTER TABLE level_config ADD COLUMN name TEXT DEFAULT ''"); } catch (e) { if (!/duplicate column name/i.test(e.message)) throw e; }
    try { run("ALTER TABLE level_config ADD COLUMN title_icon TEXT DEFAULT ''"); } catch (e) { if (!/duplicate column name/i.test(e.message)) throw e; }
    try { run("ALTER TABLE level_config ADD COLUMN bg_image TEXT DEFAULT ''"); } catch (e) { if (!/duplicate column name/i.test(e.message)) throw e; }
    setVersion(6); forceSave();
    logger.log('[DB] v6: Level config columns ensured.');
  }

  // ================================================================
  // v7 — Playlists: add is_public, view_count (idempotent)
  // ================================================================
  if (ver < 7) {
    try { run("ALTER TABLE playlists ADD COLUMN is_public INTEGER DEFAULT 0"); } catch (e) { if (!/duplicate column name/i.test(e.message)) throw e; }
    try { run("ALTER TABLE playlists ADD COLUMN view_count INTEGER DEFAULT 0"); } catch (e) { if (!/duplicate column name/i.test(e.message)) throw e; }
    setVersion(7); forceSave();
    logger.log('[DB] v7: Playlist columns ensured.');
  }

  // ================================================================
  // v8 — Ads: add display_pages (idempotent)
  // ================================================================
  if (ver < 8) {
    try { run("ALTER TABLE ads ADD COLUMN display_pages TEXT DEFAULT 'works,chats'"); } catch (e) { if (!/duplicate column name/i.test(e.message)) throw e; }
    setVersion(8); forceSave();
    logger.log('[DB] v8: Ads display_pages ensured.');
  }

  // ================================================================
  // v9 — Level config: add 'music' zone to existing configs
  // ================================================================
  if (ver < 9) {
    try {
      var cfgRows = all("SELECT level, zones FROM level_config WHERE zones NOT LIKE '%music%'");
      for (var i = 0; i < cfgRows.length; i++) {
        var row = cfgRows[i];
        var z = JSON.parse(row.zones);
        if (Array.isArray(z) && !z.includes('music')) {
          z.push('music');
          run("UPDATE level_config SET zones = ? WHERE level = ?", [JSON.stringify(z), row.level]);
        }
      }
      setVersion(9); forceSave();
      logger.log('[DB] v9: Level configs updated to include music zone.');
    } catch (e) {
      logger.error('[DB] v9 FAILED:', e.message);
      throw new Error('Migration v9 (music zone) failed: ' + e.message);
    }
  }

  // ================================================================
  // v10 — Songs: fix cover URL prefix
  // ================================================================
  if (ver < 10) {
    try {
      run("UPDATE songs SET cover_url = REPLACE(cover_url, '/api/file/music_cover/', '/api/file/') WHERE cover_url LIKE '%/api/file/music_cover/%'");
      setVersion(10); forceSave();
      logger.log('[DB] v10: Song cover URLs fixed.');
    } catch (e) {
      logger.error('[DB] v10 FAILED:', e.message);
      throw new Error('Migration v10 (song cover URLs) failed: ' + e.message);
    }
  }

  // ================================================================
  // v11 — Content blocks: attachment support (table rebuild)
  // ================================================================
  if (ver < 11) {
    try {
      var tbl = all("PRAGMA table_info(content_blocks)");
      if (!tbl.find(function(c) { return c.name === 'attachment_file_id'; })) {
        logger.log('[DB] v11: Migrating content_blocks for attachment support...');
        run("PRAGMA foreign_keys = OFF");
        run("CREATE TABLE IF NOT EXISTS content_blocks_new (\n" +
          "  id INTEGER PRIMARY KEY AUTOINCREMENT,\n" +
          "  post_id INTEGER NOT NULL,\n" +
          "  type TEXT NOT NULL,\n" +
          "  value TEXT DEFAULT '',\n" +
          "  file_id INTEGER,\n" +
          "  allow_preview INTEGER DEFAULT 1,\n" +
          "  sort_order INTEGER DEFAULT 0,\n" +
          "  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n" +
          "  attachment_file_id INTEGER,\n" +
          "  attachment_name TEXT DEFAULT '',\n" +
          "  attachment_size INTEGER DEFAULT 0,\n" +
          "  min_level_view INTEGER DEFAULT 0,\n" +
          "  unlock_points INTEGER DEFAULT 0,\n" +
          "  download_points INTEGER DEFAULT 0,\n" +
          "  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE\n" +
          ")");
        run("INSERT INTO content_blocks_new SELECT id, post_id, type, value, file_id, allow_preview, sort_order, created_at, NULL, '', 0, 0, 0, 0 FROM content_blocks");
        run("DROP TABLE content_blocks");
        run("ALTER TABLE content_blocks_new RENAME TO content_blocks");
        run("PRAGMA foreign_keys = ON");
      }
      setVersion(11); forceSave();
      logger.log('[DB] v11: Content blocks attachment support done.');
    } catch (e) {
      logger.error('[DB] v11 FAILED:', e.message);
      try { run("DROP TABLE IF EXISTS content_blocks_new"); } catch (ex) {}
      throw new Error('Migration v11 (content_blocks attachment) failed: ' + e.message);
    }
  }

  // ================================================================
  // v12 — Content blocks: add label column (idempotent)
  // ================================================================
  if (ver < 12) {
    try { run("ALTER TABLE content_blocks ADD COLUMN label TEXT DEFAULT NULL"); } catch (e) { if (!/duplicate column name/i.test(e.message)) throw e; }
    setVersion(12); forceSave();
    logger.log('[DB] v12: Content blocks label ensured.');
  }

  // ================================================================
  // v13 — Content blocks: add show_in_toc column (idempotent)
  // ================================================================
  if (ver < 13) {
    try { run("ALTER TABLE content_blocks ADD COLUMN show_in_toc INTEGER DEFAULT 0"); } catch (e) { if (!/duplicate column name/i.test(e.message)) throw e; }
    setVersion(13); forceSave();
    logger.log('[DB] v13: Content blocks show_in_toc ensured.');
  }

  // ================================================================
  // v14 — Users: add job_role, job_role_approved (idempotent)
  // ================================================================
  if (ver < 14) {
    try { run("ALTER TABLE users ADD COLUMN job_role TEXT DEFAULT NULL"); } catch (e) { if (!/duplicate column name/i.test(e.message)) throw e; }
    try { run("ALTER TABLE users ADD COLUMN job_role_approved INTEGER DEFAULT 0"); } catch (e) { if (!/duplicate column name/i.test(e.message)) throw e; }
    setVersion(14); forceSave();
    logger.log('[DB] v14: Job role columns ensured.');
  }

  // ================================================================
  // v15 — Posts: add job location/salary columns (idempotent)
  // ================================================================
  if (ver < 15) {
    var cols = ['job_location_type','job_location_city','job_location_detail','job_salary_min','job_salary_max','job_type'];
    for (var k = 0; k < cols.length; k++) {
      try { run("ALTER TABLE posts ADD COLUMN " + cols[k] + " TEXT DEFAULT NULL"); } catch (e) { if (!/duplicate column name/i.test(e.message)) throw e; }
    }
    setVersion(15); forceSave();
    logger.log('[DB] v15: Job location/salary columns ensured.');
  }

  // ================================================================
  // v16 — User profiles: add job_rating, job_completed (idempotent)
  // ================================================================
  if (ver < 16) {
    try { run("ALTER TABLE user_profiles ADD COLUMN job_rating REAL DEFAULT 0"); } catch (e) { if (!/duplicate column name/i.test(e.message)) throw e; }
    try { run("ALTER TABLE user_profiles ADD COLUMN job_completed INTEGER DEFAULT 0"); } catch (e) { if (!/duplicate column name/i.test(e.message)) throw e; }
    setVersion(16); forceSave();
    logger.log('[DB] v16: Job rating columns ensured.');
  }

  // ================================================================
  // v17 — Level config: add 'job' zone to existing configs
  // ================================================================
  if (ver < 17) {
    try {
      var rows = all("SELECT level, zones FROM level_config WHERE zones NOT LIKE '%job%'");
      for (var j = 0; j < rows.length; j++) {
        var rz = JSON.parse(rows[j].zones);
        if (!rz.includes('job')) {
          rz.push('job');
          run("UPDATE level_config SET zones = ? WHERE level = ?", [JSON.stringify(rz), rows[j].level]);
        }
      }
      setVersion(17); forceSave();
      logger.log('[DB] v17: Level configs updated to include job zone.');
    } catch (e) {
      logger.error('[DB] v17 FAILED:', e.message);
      throw new Error('Migration v17 (level config job zone) failed: ' + e.message);
    }
  }

  // ================================================================
  // v18 — Ads: add 'jobs' to display_pages
  // ================================================================
  if (ver < 18) {
    try {
      var adsRows = all("SELECT id, display_pages FROM ads WHERE display_pages NOT LIKE '%jobs%'");
      for (var a = 0; a < adsRows.length; a++) {
        var pages = adsRows[a].display_pages.split(',').map(function(s) { return s.trim(); });
        if (!pages.includes('jobs')) {
          pages.push('jobs');
          run("UPDATE ads SET display_pages = ? WHERE id = ?", [pages.join(','), adsRows[a].id]);
        }
      }
      setVersion(18); forceSave();
      logger.log('[DB] v18: Ads updated to include jobs page.');
    } catch (e) {
      logger.error('[DB] v18 FAILED:', e.message);
      throw new Error('Migration v18 (ads jobs page) failed: ' + e.message);
    }
  }

  // ================================================================
  // v19 — Notifications: add message, target_url columns (idempotent)
  // ================================================================
  if (ver < 19) {
    try { run("ALTER TABLE notifications ADD COLUMN message TEXT DEFAULT ''"); } catch (e) { if (!/duplicate column name/i.test(e.message)) throw e; }
    try { run("ALTER TABLE notifications ADD COLUMN target_url TEXT DEFAULT ''"); } catch (e) { if (!/duplicate column name/i.test(e.message)) throw e; }
    setVersion(19); forceSave();
    logger.log('[DB] v19: Admin notification fields ensured.');
  }

  // ================================================================
  // v20 — Zone stats: seed defaults
  // ================================================================
  if (ver < 20) {
    try {
      run("INSERT OR IGNORE INTO zone_stats (zone_name, post_count, reply_count) VALUES ('works', 0, 0)");
      run("INSERT OR IGNORE INTO zone_stats (zone_name, post_count, reply_count) VALUES ('chat', 0, 0)");
      setVersion(20); forceSave();
      logger.log('[DB] v20: Zone stats defaults seeded.');
    } catch (e) {
      logger.error('[DB] v20 FAILED:', e.message);
      throw new Error('Migration v20 (zone stats) failed: ' + e.message);
    }
  }

  // ================================================================
  // ADD NEW MIGRATIONS ABOVE THIS LINE, with the next integer version.
  // ================================================================
}

module.exports = { runMigrations };
