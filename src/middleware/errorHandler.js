/**
 * Global Error Handling Middleware
 * Intercepts all throwables and returns a clean, structured JSON response.
 */
function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const message = err.message || 'An unexpected server error occurred';

  // Log error stack trace dynamically
  console.error(
    `\x1b[31m[Error]\x1b[0m ${req.method} ${req.originalUrl || req.url} - Status: ${status}`
  );
  console.error(err.stack || err);

  return res.status(status).json({
    success: false,
    error: {
      message: message,
      status: status
    }
  });
}

export default errorHandler;
