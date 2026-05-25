import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import chatRoutes from './routes/chatRoutes.js';
import errorHandler from './middleware/errorHandler.js';
import requestLogger from './utils/logger.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Enable Cross-Origin Resource Sharing (CORS)
app.use(cors());

// Parse incoming JSON requests
app.use(express.json());

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

// Register Core Chat completions router under the requested namespace
app.use('/v1/chat', chatRoutes);

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
