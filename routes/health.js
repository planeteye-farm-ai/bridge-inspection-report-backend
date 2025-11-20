import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// Health check endpoint
router.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    
    res.json({
      status: 'OK',
      timestamp: result.rows[0].now,
      database: 'Connected',
      users: userCount.rows[0].count,
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (err) {
    console.error('❌ Database health check failed:', err.message);
    res.status(500).json({
      status: 'ERROR',
      error: 'Database connection failed',
      message: err.message
    });
  }
});

// Diagnostic endpoint to check database tables
router.get('/api/health/db', async (req, res) => {
  try {
    // Test database connection
    const dbTest = await pool.query('SELECT NOW() as current_time, version() as pg_version');
    
    // Check if tables exist
    const tablesCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    const tableNames = tablesCheck.rows.map(r => r.table_name);
    const requiredTables = ['users', 'inspections', 'reports', 'settings', 'audit_logs'];
    const missingTables = requiredTables.filter(t => !tableNames.includes(t));
    
    res.json({
      status: 'OK',
      database: {
        connected: true,
        version: dbTest.rows[0].pg_version.split(',')[0],
        currentTime: dbTest.rows[0].current_time,
        tables: {
          found: tableNames,
          required: requiredTables,
          missing: missingTables,
        },
      },
    });
  } catch (err) {
    console.error('[HEALTH] Database check failed:', err);
    res.status(500).json({
      status: 'ERROR',
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
  }
});

export default router;

