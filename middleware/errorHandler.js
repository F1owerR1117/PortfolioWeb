// Global error handling middleware

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

// 404 handler for API routes
function apiNotFound(req, res, next) {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: '接口不存在' });
  }
  next();
}

// Global error handler
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : '服务器内部错误';

  // Log the error
  if (statusCode >= 500) {
    console.error(`[Error] ${req.method} ${req.path}:`, err.message, err.stack);
  }

  if (req.path.startsWith('/api/')) {
    return res.status(statusCode).json({ error: message });
  }
  // Non-API errors: pass to next
  if (res.headersSent) {
    return;
  }
  res.status(statusCode).send(message);
}

module.exports = { AppError, apiNotFound, errorHandler };
