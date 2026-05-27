import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

/**
 * Rate Limiter Middleware — Railway-Compatible
 *
 * Railway deploys behind a reverse proxy. We set `app.set('trust proxy', 1)` in server.js
 * so req.ip reflects the real client IP from X-Forwarded-For.
 *
 * Uses ipKeyGenerator from express-rate-limit for correct IPv6 handling.
 */

// Per-API-key key resolver — falls back to real client IP for unauthenticated requests
function resolveKey(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token) return `key:${token.substring(0, 24)}`; // first 24 chars as bucket key
  }
  return ipKeyGenerator(req); // uses express-rate-limit's IPv6-safe generator
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
 * Blocks bots and scrapers. 300 requests / 5 minutes per IP.
 * Health check is excluded so Railway health probes never get rate limited.
 */
export const globalLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 300,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: ipKeyGenerator,
  message: 'Too many requests from this IP address. Please slow down and try again shortly.',
  handler: rateLimitHandler,
  skip: (req) => req.path === '/health',
});

/**
 * TIER 2 — Auth / token provisioning limiter
 * Prevents token farming and brute force on POST /v1/auth/token.
 * 10 requests / 15 minutes per IP.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: ipKeyGenerator,
  message: 'Too many token provisioning requests. Please wait 15 minutes before trying again.',
  handler: rateLimitHandler,
});

/**
 * TIER 3 — AI completions limiter (the expensive endpoint)
 * Authenticated callers (Bearer token): 60 requests / minute per API key.
 * Unauthenticated callers (will fail auth anyway): 20 requests / minute per IP.
 */
export const completionsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: (req) => {
    const authHeader = req.headers.authorization;
    return authHeader && authHeader.startsWith('Bearer ') ? 60 : 20;
  },
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: resolveKey,
  message: 'AI completions rate limit exceeded. Authenticated users may send up to 60 requests per minute per API key.',
  handler: rateLimitHandler,
});

/**
 * TIER 4 — Streaming completions limiter
 * Streaming holds connections open longer → stricter limit.
 * 20 streaming requests / minute per API key.
 * Skips non-streaming requests entirely.
 */
export const streamingLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: resolveKey,
  message: 'Streaming rate limit exceeded. You may send up to 20 streaming requests per minute per API key.',
  handler: rateLimitHandler,
  skip: (req) => !req.body?.stream,
});
