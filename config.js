// Unified configuration - all env vars read here
require('dotenv').config();

const path = require('path');

const config = {
  port: parseInt(process.env.PORT, 10) || 3000,
  sessionSecret: process.env.SESSION_SECRET || 'portfolio-default-secret-change-me',
  adminSecret: process.env.ADMIN_SECRET || 'AdminKey123',
  dbPath: process.env.DB_PATH || path.join(__dirname, 'database.db'),
  uploadDir: path.join(__dirname, 'uploads'),
  logDir: path.join(__dirname, 'logs'),
  session: {
    name: 'portfolio_sid', // SECURITY: custom cookie name instead of default 'connect.sid'
    maxAge: 24 * 60 * 60 * 1000, // 24 hours (reduced from 7 days)
    httpOnly: true,
    sameSite: 'lax'
  }
};

module.exports = config;
