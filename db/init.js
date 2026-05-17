const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const { createTables } = require('./schema');
const { runMigrations } = require('./migrations');
const { seedData } = require('./seeds');

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
    console.log('[DB] ⚠ WARNING: Database file not found at ' + DB_PATH);
    console.log('[DB] ⚠ A new empty database will be created. All existing data will be LOST!');
    console.log('[DB] ⚠ To use an existing database, set DB_PATH env var:');
    console.log('[DB] ⚠   set DB_PATH=F:\\path\\to\\database.db && node server.js');
    db = new SQL.Database();
    console.log('[DB] Created new database');
  }

  // Enable WAL mode and foreign keys
  db.run('PRAGMA journal_mode = WAL');
  db.run('PRAGMA foreign_keys = ON');

  // Create all tables
  createTables(run);

  // Run all migrations
  runMigrations(run, get, all, forceSave);

  // Seed default data
  seedData(run, get, getFirst, all, forceSave, saveDB);

  saveDB();
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

// Add XP to a user, handle level-up, and return new state
function addXP(userId, amount) {
  if (amount <= 0) return null;
  const user = getFirst('SELECT xp, level, points FROM users WHERE id = ?', [userId]);
  if (!user) return null;
  let newXP = (user.xp || 0) + amount;
  let newLevel = user.level || 1;
  let newPoints = (user.points || 0) + amount;
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
  run('UPDATE users SET xp = ?, level = ?, points = ? WHERE id = ?', [newXP, newLevel, newPoints, userId]);
  return { xp: newXP, level: newLevel, points: newPoints };
}

module.exports = { initDatabase, getDb, run, get, getFirst, all, forceSave, addXP };
