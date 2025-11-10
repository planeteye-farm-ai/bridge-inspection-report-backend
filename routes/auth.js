import express from 'express';
import pool from '../config/database.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

// User signup
router.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    console.log('[AUTH] signup payload:', { email, name, hasPassword: Boolean(password) });
    
    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        error: 'Email, password, and name are required'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    if (existingUser.rows.length > 0) {
      console.log(`❌ User already exists: ${normalizedEmail}`);
      return res.status(400).json({
        success: false,
        error: 'Email already exists'
      });
    }

    // Create new user
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      'INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING id, email, name',
      [normalizedEmail, hashedPassword, name]
    );

    const user = result.rows[0];
    console.log(`✅ User created: ${user.email} (ID: ${user.id})`);

    res.status(201).json({
      success: true,
      user: user,
      token: `token-${user.id}`,
      message: 'User created successfully'
    });
  } catch (err) {
    console.error('[AUTH] signup error:', err);
    if (err.code === '23505') {
      res.status(400).json({
        success: false,
        error: 'Email already exists'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to create user: ' + err.message
      });
    }
  }
});

// User login
router.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('[AUTH] login payload:', { email, hasPassword: Boolean(password) });

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const result = await pool.query(
      'SELECT id, email, name, password FROM users WHERE email = $1',
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      console.log(`❌ Login failed: ${normalizedEmail}`);
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    const userRow = result.rows[0];

    const passwordMatch = await bcrypt.compare(password, userRow.password);
    if (!passwordMatch) {
      console.log(`❌ Login failed (invalid password): ${normalizedEmail}`);
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    const user = {
      id: userRow.id,
      email: userRow.email,
      name: userRow.name
    };
    console.log(`✅ Login successful: ${user.email} (ID: ${user.id})`);

    res.json({
      success: true,
      user: user,
      token: `token-${user.id}`,
      message: 'Login successful'
    });
  } catch (err) {
    console.error('[AUTH] login error:', err);
    res.status(500).json({
      success: false,
      error: 'Login failed: ' + err.message
    });
  }
});

export default router;

