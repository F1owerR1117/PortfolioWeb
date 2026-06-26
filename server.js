const config = require('./config');
const logger = require('./logger');

const express = require('express');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');

const { initDatabase, getDb, all, get, run, forceSave } = require('./db/init');
const requestLogger = require('./middleware/requestLogger');
const { apiNotFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // 10 attempts per minute
  message: { error: '请求过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: { error: '请求过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for SPA compatibility
  crossOriginEmbedderPolicy: false,
}));

// Middleware
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(requestLogger);

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
      logger.error('Session table create error: ' + e.message);
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
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: config.session
}));

// Serve static files from public directory (disable caching for JS/CSS during development)
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js') || filePath.endsWith('.css')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

// CSRF protection: validate Origin/Referer for state-changing requests
app.use('/api', (req, res, next) => {
  const method = req.method.toUpperCase();
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    const origin = req.headers.origin || req.headers.referer;
    if (origin) {
      try {
        const url = new URL(origin);
        // Accept: localhost, loopback, LAN IPs, and any origin matching the Host header
        const reqHost = req.headers.host ? req.headers.host.split(':')[0] : '';
        const isLocal = ['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(url.hostname);
        const isLAN = /^\d{1,3}(\.\d{1,3}){3}$/.test(url.hostname) && !['127.0.0.1', '0.0.0.0'].includes(url.hostname);
        const matchesHost = url.hostname === reqHost;
        if (!isLocal && !isLAN && !matchesHost) {
          logger.warn(`[CSRF] Blocked request from origin: ${origin}`);
          return res.status(403).json({ error: '请求来源不允许' });
        }
      } catch (e) {
        // Invalid origin URL — block
        logger.warn(`[CSRF] Invalid origin: ${origin}`);
        return res.status(403).json({ error: '请求来源无效' });
      }
    }
    // No origin/referer header — allow (some legitimate clients don't send it)
  }
  next();
});

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
const loginNoticeRoutes = require('./routes/loginNotices');
const adsRoutes = require('./routes/ads');
const applicationsRoutes = require('./routes/applications');
const jobsStatsRoutes = require('./routes/jobs-stats');

app.use('/api/auth', authLimiter, authRoutes);
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
app.use('/api', loginNoticeRoutes);
app.use('/api', adsRoutes);
app.use('/api/applications', applicationsRoutes);
app.use('/api', jobsStatsRoutes);

// SPA fallback + API 404
app.get('*', apiNotFound, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Global error handler
app.use(errorHandler);

// Start server
function start() {
  try {
    // Ensure uploads directories exist
    var dirs = [
      config.uploadDir,
      path.join(config.uploadDir, 'sounds'),
      path.join(config.uploadDir, 'music'),
      path.join(config.uploadDir, 'music_covers')
    ];
    dirs.forEach(function(d) {
      if (!fs.existsSync(d)) {
        fs.mkdirSync(d, { recursive: true });
        logger.info('Created directory: ' + d);
      }
    });

    // Initialize database (handles file-existence check internally)
    initDatabase();

    app.listen(config.port, () => {
      logger.info('Portfolio app running at http://localhost:' + config.port);
      logger.info('Default admin account: admin / admin123');
    });
  } catch (err) {
    logger.error('Startup error: ' + err.message);
    process.exit(1);
  }
}

// Global error handlers
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception: ' + err.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection: ' + String(reason));
});

start();
