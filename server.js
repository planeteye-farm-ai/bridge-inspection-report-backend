import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Import configurations
import corsOptions from './config/cors.js';
import pool from './config/database.js';

// Import middleware
import { apiLogger } from './middleware/logger.js';
import { errorHandler } from './middleware/errorHandler.js';

// Import routes
import healthRoutes from './routes/health.js';
import authRoutes from './routes/auth.js';
import inspectionRoutes from './routes/inspections.js';

// Import utilities
import { initializeDatabase } from './utils/initializeDB.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 4001;

// ESM __dirname replacement
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(corsOptions);
app.use(express.json({ limit: '50mb' })); // For handling large image data
app.use(apiLogger); // Request logging for API routes

// API Routes
app.use(healthRoutes);
app.use(authRoutes);
app.use(inspectionRoutes);

// Serve frontend (production build) if available
const distCandidates = [
  process.env.FRONTEND_DIST && path.resolve(process.env.FRONTEND_DIST),
  path.join(__dirname, '..', 'project', 'dist'),
  path.join(__dirname, '..', 'dist'),
].filter(Boolean);

const distPath = distCandidates.find((candidate) => fs.existsSync(candidate));

if (distPath) {
  console.log(`🗂  Serving frontend from: ${distPath}`);
  app.use(express.static(distPath));

  // Catch-all handler: serve index.html for non-API routes (SPA routing)
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    if (req.path.includes('.')) {
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
  app.get('/', (req, res) => {
    res.status(200).json({
      success: false,
      message: 'Frontend build not found. For UI, run npm run build in the frontend project and set FRONTEND_DIST if needed.',
    });
  });
}

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
app.listen(port, '0.0.0.0', async () => {
  console.log(`🚀 Bridge Inspection Server running on port ${port}`);
  console.log(`🌐 Access: http://localhost:${port}`);
  console.log(`📊 Health: http://localhost:${port}/api/health`);
  console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Initialize database tables on startup
  await initializeDatabase();
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 Shutting down gracefully...');
  pool.end(() => {
    console.log('📊 Database pool closed');
    process.exit(0);
  });
});

