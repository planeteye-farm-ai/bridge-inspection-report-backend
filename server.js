import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
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

// Serve frontend (production build)
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// Catch-all handler: serve index.html for non-API routes
// Compatible with Express 5.x - use middleware instead of wildcard route
app.use((req, res, next) => {
  // Skip API routes
  if (req.path.startsWith('/api')) {
    return next();
  }
  // Skip static file requests (already handled by express.static)
  if (req.path.includes('.')) {
    return next();
  }
  // Serve index.html for all other routes (SPA routing)
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      console.error('Error sending index.html:', err);
      res.status(404).json({ success: false, error: 'Page not found' });
    }
  });
});

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

