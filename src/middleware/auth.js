import crypto from 'crypto';
import { verifyKeyInDatabase } from '../services/dbService.js';

const SECRET_KEY = process.env.API_KEY || 'afnan-secret-key';

/**
 * Generate a cryptographically signed token valid for 2 hours
 */
export function generate2HourToken(name) {
  const payload = {
    name: name,
    expiresAt: Date.now() + 2 * 60 * 60 * 1000 // 2 hours
  };
  const payloadStr = JSON.stringify(payload);
  const payloadB64 = Buffer.from(payloadStr).toString('base64url');
  
  const hmac = crypto.createHmac('sha256', SECRET_KEY);
  hmac.update(payloadB64);
  const signature = hmac.digest('base64url');
  
  return `bn_live_${payloadB64}.${signature}`;
}

/**
 * Verify and validate a token
 */
export function verifyToken(token) {
  try {
    // Strip prefix if present
    const rawToken = token.startsWith('bn_live_') ? token.substring(8) : token;
    
    const parts = rawToken.split('.');
    if (parts.length !== 2) return null;
    
    const [payloadB64, signature] = parts;
    const hmac = crypto.createHmac('sha256', SECRET_KEY);
    hmac.update(payloadB64);
    const expectedSignature = hmac.digest('base64url');
    
    if (signature !== expectedSignature) return null;
    
    const payloadStr = Buffer.from(payloadB64, 'base64url').toString('utf8');
    const payload = JSON.parse(payloadStr);
    
    if (Date.now() > payload.expiresAt) {
      return { expired: true };
    }
    
    return { valid: true, payload };
  } catch (err) {
    return null;
  }
}

/**
 * API Key Authorization Middleware
 * Verifies Bearer token against configured API_KEY env variable or signed expiring user tokens.
 */
async function authorize(req, res, next) {
  const authHeader = req.headers.authorization;
  const configuredKeys = (process.env.API_KEY || 'afnan-secret-key')
    .split(',')
    .map(key => key.trim());

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

  // 1. Allow any of the master API keys configured in env (static)
  if (configuredKeys.includes(token)) {
    return next();
  }

  // 2. Query Supabase database to verify dynamic keys if database is active
  try {
    const dbResult = await verifyKeyInDatabase(token);
    if (dbResult) {
      if (dbResult.expired) {
        const err = new Error('Unauthorized. Your temporary API key has expired inside Supabase.');
        err.status = 401;
        return next(err);
      }
      if (dbResult.valid) {
        req.client = dbResult.payload;
        return next();
      }
    }
  } catch (dbErr) {
    console.error('⚠️ Database auth verification failed, falling back to signature check:', dbErr.message);
  }

  // 3. Fallback: Allow our dynamic cryptographically signed tokens (stateless mode fallback)
  const tokenResult = verifyToken(token);
  if (tokenResult) {
    if (tokenResult.expired) {
      const err = new Error('Unauthorized. Your temporary API key has expired (2-hour limit reached).');
      err.status = 401;
      return next(err);
    }
    // Token is valid! Attach client metadata to request
    req.client = tokenResult.payload;
    return next();
  }

  const err = new Error('Unauthorized. The provided API key is invalid or has expired.');
  err.status = 401;
  return next(err);
}

export default authorize;
