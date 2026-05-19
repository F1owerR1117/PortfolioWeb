// Unified configuration - all env vars read here
require('dotenv').config();

const path = require('path');

// Validate required secrets at startup
if (!process.env.SESSION_SECRET) {
  console.error('❌ SESSION_SECRET 环境变量未设置。请复制 .env.example 为 .env 并填写随机字符串。');
  process.exit(1);
}

const config = {
  port: parseInt(process.env.PORT, 10) || 3000,
  sessionSecret: process.env.SESSION_SECRET,
  adminSecret: process.env.ADMIN_SECRET || 'AdminKey123',
  dbPath: process.env.DB_PATH || path.join(__dirname, 'database.db'),
  uploadDir: path.join(__dirname, 'uploads'),
  logDir: path.join(__dirname, 'logs'),
  session: {
    name: 'portfolio_sid',
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: false, // set to true if deploying with HTTPS
    sameSite: 'lax'
  }
};

module.exports = config;
