/**
 * API Key Authorization Middleware
 * Verifies Bearer token against the configured API_KEY env variable.
 */
function authorize(req, res, next) {
  const authHeader = req.headers.authorization;
  const configuredKey = process.env.API_KEY || 'afnan-secret-key';

  if (!authHeader) {
    const err = new Error('Unauthorized. Authorization header is missing.');
    err.status = 401;
    return next(err);
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    const err = new Error('Unauthorized. Invalid Authorization scheme. Use "Bearer <key>".');
    err.status = 401;
    return next(err);
  }

  const token = parts[1];
  if (token !== configuredKey) {
    const err = new Error('Unauthorized. The provided API key is invalid.');
    err.status = 401;
    return next(err);
  }

  // Token is valid, proceed
  next();
}

export default authorize;
