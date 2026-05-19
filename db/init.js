// db/init.js — database initialization and query helpers
// Driver: better-sqlite3 (synchronous, native, writes directly to disk)
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const { createTables } = require('./schema');
const { runMigrations } = require('./migrations');
const { seedData } = require('./seeds');

const DB_PATH = path.resolve(process.env.DB_PATH || './database.db');

let db = null;

// ===== Initialize database =====

function initDatabase() {
  console.log('[DB] Initializing database with better-sqlite3...');

  var exists = fs.existsSync(DB_PATH);

  if (!exists) {
    if (process.env.ALLOW_NEW_DB) {
      console.log('[DB] ALLOW_NEW_DB is set — creating new database.');
    } else {
      console.error('═══════════════════════════════════════════════════════');
      console.error('  ❌ 数据库文件不存在: ' + DB_PATH);
      console.error('  ⚠️  为避免数据丢失，服务器已停止启动');
      console.error('  💡 首次运行请设置环境变量绕过检查:');
      console.error('       set ALLOW_NEW_DB=1 && node server.js');
      console.error('  📁 如需使用已有数据库，请设置 DB_PATH:');
      console.error('       set DB_PATH=F:\\path\\to\\database.db && node server.js');
      console.error('═══════════════════════════════════════════════════════');
      process.exit(1);
    }
  }

  // Open (or create) the database file
  db = new Database(DB_PATH);
  console.log('[DB] ' + (exists ? 'Opened existing' : 'Created new') + ' database at ' + DB_PATH);

  // Performance and safety pragmas
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('synchronous = NORMAL');   // safe with WAL, much faster than FULL
  db.pragma('cache_size = -8000');     // 8 MB cache

  // Create all tables
  createTables(run);

  // Run all migrations
  runMigrations(run, get, all, forceSave);

  // Seed default data
  seedData(run, get, getFirst, all, forceSave, forceSave);

  console.log('[DB] Database initialization complete.');
}

// ===== Query Helpers (synchronous, using better-sqlite3) =====

function getDb() {
  if (!db) throw new Error('Database not initialized — call initDatabase() first');
  return db;
}

/**
 * Execute an INSERT/UPDATE/DELETE statement.
 * @returns {{ lastID: number, changes: number }}
 */
function run(sql, params) {
  var info = getDb().prepare(sql).run(params || []);
  return { lastID: Number(info.lastInsertRowid), changes: info.changes };
}

/**
 * Return the first row of a SELECT, or null.
 */
function getFirst(sql, params) {
  var row = getDb().prepare(sql).get(params || []);
  return row || null;
}

/**
 * Alias for getFirst — convenience for single-row gets.
 */
function get(sql, params) {
  return getFirst(sql, params);
}

/**
 * Return all rows of a SELECT as an array.
 */
function all(sql, params) {
  return getDb().prepare(sql).all(params || []);
}

/**
 * No-op with better-sqlite3 — every write is immediately durable via WAL.
 * Kept for API compatibility with migrations and seeds that call it.
 */
function forceSave() {
  // better-sqlite3 writes synchronously; no manual save needed
}

module.exports = { initDatabase, getDb, run, get, getFirst, all, forceSave };
