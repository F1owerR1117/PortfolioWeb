require('dotenv').config();

const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');

const { initDatabase, getDb, all, get, run, forceSave } = require('./db/init');

const app = express();
const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || 'portfolio-default-secret-change-me';

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration with custom SQLite store
class SQLiteSessionStore extends session.Store {
  constructor() {
    super();
    // Sessions table will be created after DB init
    this.ready = false;
  }

  ensureTable() {
    if (this.ready) return;
    try {
      run(`CREATE TABLE IF NOT EXISTS sessions (
        sid TEXT PRIMARY KEY,
        data TEXT,
        expires_at TEXT
      )`);
      // Migration: add user_id column for single-session enforcement
      try { run("ALTER TABLE sessions ADD COLUMN user_id INTEGER"); } catch (e) {}
      forceSave();
      this.ready = true;
    } catch (e) {
      console.error('[Session] Table create error:', e);
    }
  }

  get(sid, cb) {
    try {
      this.ensureTable();
      const row = get("SELECT data FROM sessions WHERE sid = ? AND (expires_at IS NULL OR expires_at > datetime('now'))", [sid]);
      if (row) {
        cb(null, JSON.parse(row.data));
      } else {
        cb(null, null);
      }
    } catch (err) {
      cb(err);
    }
  }

  set(sid, session, cb) {
    try {
      this.ensureTable();
      const data = JSON.stringify(session);
      const maxAge = session.cookie && session.cookie.maxAge;
      let expiresAt = null;
      if (maxAge) {
        expiresAt = new Date(Date.now() + maxAge).toISOString().replace('T', ' ').split('.')[0];
      }
      run("INSERT OR REPLACE INTO sessions (sid, data, expires_at, user_id) VALUES (?, ?, ?, ?)",
        [sid, data, expiresAt, session.userId || null]);
      cb(null);
    } catch (err) {
      cb(err);
    }
  }

  // Destroy all sessions for a given user (single-session enforcement)
  destroyByUserId(userId, cb) {
    try {
      this.ensureTable();
      run("DELETE FROM sessions WHERE user_id = ?", [userId]);
      forceSave();
      if (cb) cb(null);
    } catch (err) {
      if (cb) cb(err);
    }
  }

  destroy(sid, cb) {
    try {
      this.ensureTable();
      run("DELETE FROM sessions WHERE sid = ?", [sid]);
      cb(null);
    } catch (err) {
      cb(err);
    }
  }

  clear(cb) {
    try {
      this.ensureTable();
      run("DELETE FROM sessions");
      cb(null);
    } catch (err) {
      cb(err);
    }
  }

  length(cb) {
    try {
      this.ensureTable();
      const row = get("SELECT COUNT(*) as count FROM sessions");
      cb(null, row ? row.count : 0);
    } catch (err) {
      cb(err);
    }
  }
}

const sessionStore = new SQLiteSessionStore();

app.use(session({
  store: sessionStore,
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    httpOnly: true,
    sameSite: 'lax'
  }
}));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// API routes
const authRoutes = require('./routes/auth');
const postsRoutes = require('./routes/posts');
const uploadRoutes = require('./routes/upload');
const fileRoutes = require('./routes/file');
const settingsRoutes = require('./routes/settings');
const commentsRoutes = require('./routes/comments');
const notificationsRoutes = require('./routes/notifications');
const siteRoutes = require('./routes/site');
const userRoutes = require('./routes/users');
const friendsRoutes = require('./routes/friends');
const tagsRoutes = require('./routes/tags');
const reactionsRoutes = require('./routes/reactions');
const avatarRoutes = require('./routes/avatar');
const adminRoutes = require('./routes/admin');
const musicRoutes = require('./routes/music');
const bookmarksRoutes = require('./routes/bookmarks');
const reportsRoutes = require('./routes/reports');
const levelsRoutes = require('./routes/levels');

app.use('/api/auth', authRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/file', fileRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api', commentsRoutes);
app.use('/api', notificationsRoutes);
app.use('/api/site', siteRoutes);
app.use('/api', userRoutes);
app.use('/api', friendsRoutes);
app.use('/api/tags', tagsRoutes);
app.use('/api', reactionsRoutes);
app.use('/api', avatarRoutes);
app.use('/api', adminRoutes);
app.use('/api', musicRoutes);
app.use('/api', bookmarksRoutes);
app.use('/api', reportsRoutes);
app.use('/api', levelsRoutes);

// Fallback: serve index.html for SPA
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: '接口不存在' });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Server] Unhandled error:', err);
  if (req.path.startsWith('/api/')) {
    res.status(500).json({ error: err.message || '服务器内部错误' });
  } else {
    next();
  }
});

// Start server
async function start() {
  try {
    // Ensure uploads directories exist
    const dirs = ['./uploads', './uploads/sounds', './uploads/music', './uploads/music_covers'];
    dirs.forEach(d => {
      if (!fs.existsSync(d)) {
        fs.mkdirSync(d, { recursive: true });
        console.log(`[Server] Created directory: ${d}`);
      }
    });

    // Initialize database
    await initDatabase();

    app.listen(PORT, () => {
      console.log(`[Server] Portfolio app running at http://localhost:${PORT}`);
      console.log(`[Server] Default admin account: admin / admin123`);
      console.log(`[Server] Also accessible via network at http://0.0.0.0:${PORT}`);
    });
  } catch (err) {
    console.error('[Server] Startup error:', err);
    process.exit(1);
  }
}

start();
