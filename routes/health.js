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

export default router;

