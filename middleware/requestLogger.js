// Request logging middleware
const logger = require('../logger');

function requestLogger(req, res, next) {
  const start = Date.now();

  // Skip static files and non-API requests for cleaner logs
  if (!req.path.startsWith('/api/')) {
    return next();
  }

  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';

    logger[level](
      `[API] ${req.method} ${req.path} ${status} ${duration}ms` +
      (req.session && req.session.userId ? ` user=${req.session.userId}` : '')
    );
  });

  next();
}

module.exports = requestLogger;
