// ===== Database Schema: All CREATE TABLE statements =====

function createTables(run) {
  // Core tables
  run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  run(`CREATE TABLE IF NOT EXISTS posts (
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

  run(`CREATE TABLE IF NOT EXISTS content_blocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('text','image','video','code')),
    value TEXT DEFAULT '',
    file_id INTEGER,
    allow_preview INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    label TEXT DEFAULT NULL,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
  )`);

  run(`CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    filepath TEXT NOT NULL,
    size INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  run(`CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  )`);

  run(`CREATE TABLE IF NOT EXISTS comments (
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

  // Notifications (nullable post_id for system notifications)
  run(`CREATE TABLE IF NOT EXISTS notifications (
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

  run(`CREATE TABLE IF NOT EXISTS site_info (
    key TEXT PRIMARY KEY,
    value TEXT
  )`);

  run(`CREATE TABLE IF NOT EXISTS user_profiles (
    user_id INTEGER PRIMARY KEY,
    bio TEXT DEFAULT '',
    avatar_url TEXT DEFAULT '',
    social TEXT DEFAULT '{}',
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  run(`CREATE TABLE IF NOT EXISTS friend_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_user_id INTEGER NOT NULL,
    to_user_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (from_user_id) REFERENCES users(id),
    FOREIGN KEY (to_user_id) REFERENCES users(id)
  )`);

  run(`CREATE TABLE IF NOT EXISTS friends (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    friend_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (friend_id) REFERENCES users(id)
  )`);

  run(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_user_id INTEGER NOT NULL,
    to_user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (from_user_id) REFERENCES users(id),
    FOREIGN KEY (to_user_id) REFERENCES users(id)
  )`);

  // Tags
  run(`CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  run(`CREATE TABLE IF NOT EXISTS post_tags (
    post_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (post_id, tag_id),
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
  )`);

  // Reactions
  run(`CREATE TABLE IF NOT EXISTS post_reactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    post_id INTEGER NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('like','dislike')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
  )`);

  // Level system
  run(`CREATE TABLE IF NOT EXISTS level_config (
    level INTEGER PRIMARY KEY,
    xp_required INTEGER NOT NULL,
    zones TEXT NOT NULL DEFAULT '["work","chat","music","job"]',
    name TEXT DEFAULT '',
    title_icon TEXT DEFAULT '',
    bg_image TEXT DEFAULT ''
  )`);

  // Music system
  run(`CREATE TABLE IF NOT EXISTS songs (
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

  run(`CREATE TABLE IF NOT EXISTS playlists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    cover_url TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  run(`CREATE TABLE IF NOT EXISTS playlist_songs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    playlist_id INTEGER NOT NULL,
    song_id INTEGER NOT NULL,
    sort_order INTEGER DEFAULT 0,
    FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
    FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
  )`);

  // Post views (cross-session)
  run(`CREATE TABLE IF NOT EXISTS post_views (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    post_id INTEGER NOT NULL,
    viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
  )`);

  // Playlist collections
  run(`CREATE TABLE IF NOT EXISTS playlist_collections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    playlist_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
  )`);

  // Bookmarks
  run(`CREATE TABLE IF NOT EXISTS bookmark_collections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  run(`CREATE TABLE IF NOT EXISTS post_bookmarks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    post_id INTEGER NOT NULL,
    collection_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (collection_id) REFERENCES bookmark_collections(id) ON DELETE CASCADE
  )`);

  // Reports
  run(`CREATE TABLE IF NOT EXISTS reports (
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

  // Zone stats
  run(`CREATE TABLE IF NOT EXISTS zone_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    zone_name TEXT NOT NULL UNIQUE,
    post_count INTEGER DEFAULT 0,
    reply_count INTEGER DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Login notices
  run(`CREATE TABLE IF NOT EXISTS login_notices (
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
  run(`CREATE TABLE IF NOT EXISTS login_notice_views (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    notice_id INTEGER NOT NULL,
    viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, notice_id)
  )`);

  // Attachment purchases
  run(`CREATE TABLE IF NOT EXISTS attachment_purchases (
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

  // Advertisement bars
  run(`CREATE TABLE IF NOT EXISTS ads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    image_file_id INTEGER,
    link_url TEXT DEFAULT '',
    position TEXT NOT NULL DEFAULT 'right' CHECK(position IN ('left','right')),
    sort_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    click_count INTEGER DEFAULT 0,
    display_pages TEXT DEFAULT 'works,chats,jobs',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (image_file_id) REFERENCES files(id)
  )`);

  // ===== Job Applications Table =====
  run(`CREATE TABLE IF NOT EXISTS job_applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('employer','seeker')),
    reason TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
    processed_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (processed_by) REFERENCES users(id)
  )`);

  // Indexes
  try { run("CREATE UNIQUE INDEX IF NOT EXISTS idx_post_reactions_user_post ON post_reactions(user_id, post_id)"); } catch (e) {}
  try { run("CREATE UNIQUE INDEX IF NOT EXISTS idx_post_views_user_post ON post_views(user_id, post_id)"); } catch (e) {}
  try { run("CREATE UNIQUE INDEX IF NOT EXISTS idx_playlist_collections ON playlist_collections(user_id, playlist_id)"); } catch (e) {}
  try { run("CREATE UNIQUE INDEX IF NOT EXISTS idx_post_bookmarks ON post_bookmarks(user_id, post_id, collection_id)"); } catch (e) {}

  // Performance indexes for scaling
  try { run("CREATE INDEX IF NOT EXISTS idx_posts_category_deleted ON posts(category, deleted_at)"); } catch (e) {}
  try { run("CREATE INDEX IF NOT EXISTS idx_posts_created_by ON posts(created_by)"); } catch (e) {}
  try { run("CREATE INDEX IF NOT EXISTS idx_posts_updated ON posts(updated_at)"); } catch (e) {}
  try { run("CREATE INDEX IF NOT EXISTS idx_posts_job_city ON posts(job_location_city)"); } catch (e) {}
  try { run("CREATE INDEX IF NOT EXISTS idx_posts_job_salary ON posts(job_salary_min)"); } catch (e) {}
  try { run("CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read)"); } catch (e) {}
  try { run("CREATE INDEX IF NOT EXISTS idx_comments_post_deleted ON comments(post_id, deleted_at)"); } catch (e) {}
  try { run("CREATE INDEX IF NOT EXISTS idx_job_applications_status ON job_applications(status)"); } catch (e) {}
  try { run("CREATE INDEX IF NOT EXISTS idx_post_tags_tag ON post_tags(tag_id)"); } catch (e) {}
  try { run("CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)"); } catch (e) {}
}

module.exports = { createTables };
