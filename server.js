import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Config
import corsOptions from './config/cors.js';
import pool from './config/database.js';

// Middleware
import { apiLogger } from './middleware/logger.js';
import { errorHandler } from './middleware/errorHandler.js';

// Routes
import healthRoutes from './routes/health.js';
import authRoutes from './routes/auth.js';
import inspectionRoutes from './routes/inspections.js';
import adminUserRoutes from './routes/adminUsers.js';
import adminReportRoutes from './routes/adminReports.js';
import adminSettingsRoutes from './routes/adminSettings.js';
import auditRoutes from './routes/auditLogs.js';
import diagnosticsRoutes from './routes/diagnostics.js';

// Utils
import { initializeDatabase } from './utils/initializeDB.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 4001;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Core middleware
app.use(corsOptions);
app.use(express.json({ limit: '50mb' }));
app.use(apiLogger);

// Root route - must be before API routes to avoid auth middleware
app.get('/', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Bridge Inspection API Server',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      healthDb: '/api/health/db',
      login: '/api/auth/login',
      signup: '/api/auth/signup',
    },
  });
});

// API routes - Health check first
app.use(healthRoutes);
app.use(authRoutes);
app.use(diagnosticsRoutes); // Diagnostic routes for troubleshooting
app.use(inspectionRoutes);
app.use(adminUserRoutes);
app.use(adminReportRoutes);
app.use(adminSettingsRoutes);
app.use(auditRoutes);

// Debug route registration
console.log('[SERVER] Routes registered:');
console.log('[SERVER]   - GET  /');
console.log('[SERVER]   - GET  /api/health');
console.log('[SERVER]   - GET  /api/health/db');
console.log('[SERVER]   - POST /api/auth/login');
console.log('[SERVER]   - POST /api/auth/signup');

// Serve frontend build when available
const distCandidates = [
  process.env.FRONTEND_DIST && path.resolve(process.env.FRONTEND_DIST),
  path.join(__dirname, '..', 'project', 'dist'),
  path.join(__dirname, '..', 'dist'),
].filter(Boolean);

const distPath = distCandidates.find((candidate) => fs.existsSync(candidate));

if (distPath) {
  console.log(`🗂  Serving frontend from: ${distPath}`);
  app.use(express.static(distPath));

  app.use((req, res, next) => {
    if (req.path.startsWith('/api') || req.path.includes('.')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'), (err) => {
      if (err) {
        console.error('Error sending index.html:', err);
        res.status(404).json({
          success: false,
          error: 'Frontend build not found. Run npm run build in the frontend project.',
        });
      }
    });
  });
} else {
  console.warn('⚠️  No frontend build found. Set FRONTEND_DIST or run npm run build in the frontend project.');
  // Root route is already defined above, no need to redefine
}

// Error handler
app.use(errorHandler);

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
});

// Store server instance for graceful shutdown
let server;

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
  
  // Stop accepting new requests
  if (server) {
    server.close(() => {
      console.log('✅ HTTP server closed');
      
      // Close database pool after server is closed
      pool.end((err) => {
        if (err) {
          console.error('❌ Error closing database pool:', err);
        } else {
          console.log('✅ Database pool closed');
        }
        process.exit(0);
      });
    });
    
    // Force close after 10 seconds if graceful shutdown fails
    setTimeout(() => {
      console.error('⚠️  Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  } else {
    // If server not started yet, just close pool
    pool.end(() => {
      console.log('✅ Database pool closed');
      process.exit(0);
    });
  }
};

// Handle shutdown signals
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Start server
server = app.listen(port, '0.0.0.0', async () => {
  console.log(`🚀 Bridge Inspection Server running on port ${port}`);
  console.log(`🌐 Access: http://localhost:${port}`);
  console.log(`📊 Health: http://localhost:${port}/api/health`);
  console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);

  try {
    await initializeDatabase();
    console.log('✅ Database initialized successfully');
    console.log('✅ Server ready to accept connections');
  } catch (err) {
    console.error('❌ Database initialization failed:', err);
    console.error('⚠️  Server started but database may not be available');
  }
});

