import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import chatRoutes from './routes/chatRoutes.js';
import errorHandler from './middleware/errorHandler.js';
import requestLogger from './utils/logger.js';
import { generate2HourToken } from './middleware/auth.js';
import { saveUserApiKey } from './services/dbService.js';
import { verifyClerkSession } from './services/clerkService.js';
import {
  globalLimiter,
  authLimiter,
  completionsLimiter,
  streamingLimiter,
} from './middleware/rateLimiter.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Trust Railway's reverse proxy so req.ip is the real client IP
// (Railway sets X-Forwarded-For; without this, req.ip is always the proxy IP)
app.set('trust proxy', 1);

// Enable Cross-Origin Resource Sharing (CORS)
app.use(cors());

// Parse incoming JSON requests
app.use(express.json());

// Apply global rate limiter to all routes (protects every endpoint)
app.use(globalLimiter);

// Serve static assets from public directory (API Key Dashboard website)
app.use(express.static(path.join(__dirname, '../public')));

// Enable Request Logger
app.use(requestLogger);

// Base health check route
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is healthy and running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Retrieve Clerk authentication public configurations
app.get('/v1/auth/config', (req, res) => {
  res.status(200).json({
    clerkPublishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || ''
  });
});

// Dynamic Client Token Provisioning Endpoint (Clerk OTP verify & Supabase write)
// authLimiter: 10 requests per 15 minutes per IP (prevents token farming)
app.post('/v1/auth/token', authLimiter, async (req, res) => {
  const { name, email, clerkSessionToken } = req.body;
  
  if (!name) {
    return res.status(400).json({
      success: false,
      error: {
        message: "Invalid request payload. 'name' is required to provision a credentials token.",
        status: 400
      }
    });
  }

  // 1. Optional Clerk OTP Session Verification
  if (clerkSessionToken) {
    const clerkResult = await verifyClerkSession(clerkSessionToken);
    if (!clerkResult.success) {
      return res.status(401).json({
        success: false,
        error: {
          message: `Clerk verification failed: ${clerkResult.error || 'Invalid session token'}`,
          status: 401
        }
      });
    }
  }

  const token = generate2HourToken(name.trim());
  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  const userEmail = email ? email.trim() : 'anonymous_visitor@example.com';

  // 2. Persist credentials metadata to Supabase DB
  const dbResult = await saveUserApiKey(userEmail, name.trim(), token, expiresAt);

  res.status(200).json({
    success: true,
    token: token,
    expiresAt: expiresAt,
    scope: "soldier-boy.agent:read-write",
    persistence: dbResult.success ? 'supabase' : dbResult.mode || 'bypassed'
  });
});

// Register Core Chat completions router under the requested namespace
// completionsLimiter: 60 req/min per API key, 20 req/min per IP (unauthenticated)
// streamingLimiter:   20 streaming req/min per API key
app.use('/v1/chat', completionsLimiter, streamingLimiter, chatRoutes);

// 404 Route handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: {
      message: `Cannot ${req.method} ${req.originalUrl}`,
      status: 404
    }
  });
});

// Global Error Handler Middleware
app.use(errorHandler);

// Start the server
app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`  🚀 Server is running on port ${PORT}   `);
  console.log(`  👉 Health check: http://localhost:${PORT}/health`);
  console.log(`  Mode: ${process.env.NODE_ENV || 'development'}`);
  console.log(`=========================================`);
});
