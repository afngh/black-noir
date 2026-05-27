import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

/**
 * Rate Limiter Middleware — Railway-Compatible
 *
 * NOTE: express-rate-limit v8 'draft-8' standardHeaders has a bug with Express 5
 * where it tries to hash req (IncomingMessage) as the partition key, crashing
 * with ERR_INVALID_ARG_TYPE. Use 'draft-7' (RateLimit-* headers) instead.
 *
 * Railway deploys behind a reverse proxy. We set `app.set('trust proxy', 1)` in server.js
 * so req.ip reflects the real client IP from X-Forwarded-For.
 */

// Per-API-key key resolver — falls back to real client IP for unauthenticated requests
function resolveKey(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token) return `key:${token.substring(0, 24)}`;
  }
  return ipKeyGenerator(req);
}

// Standard error response matching the rest of the API schema
function rateLimitHandler(req, res, options) {
  res.status(options.statusCode).json({
    success: false,
    error: {
      message: options.message,
      status: options.statusCode,
    }
  });
}

/**
 * TIER 1 — Global limiter (all routes)
 * 300 requests / 5 minutes per IP. Health check exempt.
 */
export const globalLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 300,
  standardHeaders: 'draft-7', // 'draft-8' crashes with Express 5 due to crypto partition bug
  legacyHeaders: false,
  keyGenerator: ipKeyGenerator,
  message: 'Too many requests from this IP address. Please slow down and try again shortly.',
  handler: rateLimitHandler,
  skip: (req) => req.path === '/health',
});

/**
 * TIER 2 — Auth / token provisioning limiter
 * 10 requests / 15 minutes per IP — prevents token farming.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: ipKeyGenerator,
  message: 'Too many token provisioning requests. Please wait 15 minutes before trying again.',
  handler: rateLimitHandler,
});

/**
 * TIER 3 — AI completions limiter
 * Authenticated: 60 req/min per API key.
 * Unauthenticated: 20 req/min per IP.
 */
export const completionsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: (req) => {
    const authHeader = req.headers.authorization;
    return authHeader && authHeader.startsWith('Bearer ') ? 60 : 20;
  },
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: resolveKey,
  message: 'AI completions rate limit exceeded. Authenticated users may send up to 60 requests per minute.',
  handler: rateLimitHandler,
});

/**
 * TIER 4 — Streaming completions limiter
 * 20 streaming requests / minute per API key. Skips non-streaming requests.
 */
export const streamingLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: resolveKey,
  message: 'Streaming rate limit exceeded. You may send up to 20 streaming requests per minute.',
  handler: rateLimitHandler,
  skip: (req) => !req.body?.stream,
});
