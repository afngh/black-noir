/**
 * Custom High-Performance Request Logging Middleware
 */
function requestLogger(req, res, next) {
  const start = process.hrtime();
  
  // Intercept the response finish event to calculate elapsed time
  res.on('finish', () => {
    const diff = process.hrtime(start);
    // Convert duration to milliseconds
    const durationMs = ((diff[0] * 1e9 + diff[1]) / 1e6).toFixed(2);
    
    const method = req.method;
    const url = req.originalUrl || req.url;
    const status = res.statusCode;
    
    // Determine the status code color badge for console aesthetics
    let statusColor = '\x1b[32m'; // Green default
    if (status >= 400 && status < 500) {
      statusColor = '\x1b[33m'; // Yellow warnings
    } else if (status >= 500) {
      statusColor = '\x1b[31m'; // Red errors
    }
    
    const resetColor = '\x1b[0m';
    const dimColor = '\x1b[2m';
    
    // Check if req.body has model information to enrich the logs
    const modelTag = req.body?.model ? ` [Model: ${req.body.model}]` : '';
    
    console.log(
      `${dimColor}[${new Date().toISOString()}]${resetColor} ` +
      `${method} ${url} - ${statusColor}${status}${resetColor} ` +
      `${dimColor}(${durationMs}ms)${modelTag}${resetColor}`
    );
  });

  next();
}

export default requestLogger;
