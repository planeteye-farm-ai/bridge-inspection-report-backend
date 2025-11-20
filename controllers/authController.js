import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import pool from '../config/database.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js';

const toSafeUser = ({ id, name, email, role, status }) => ({ id, name, email, role, status });

export const signup = async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ success: false, error: 'Email, password, and name are required' });
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rowCount > 0) {
      return res.status(400).json({ success: false, error: 'Email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `
        INSERT INTO users (email, password, name, role, status)
        VALUES ($1, $2, $3, 'inspector', 'active')
        RETURNING id, email, name, role, status
      `,
      [email.toLowerCase(), passwordHash, name]
    );

    const accessToken = signAccessToken({ sub: rows[0].id, role: rows[0].role });
    const refreshToken = signRefreshToken({ sub: rows[0].id });

    res.json({ success: true, user: toSafeUser(rows[0]), token: accessToken, refreshToken });
  } catch (err) {
    console.error('[AUTH] Signup error', err);
    res.status(500).json({ success: false, error: 'Failed to create user' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('[AUTH] Login attempt for email:', email ? email.toLowerCase() : 'missing');
    
    if (!email || !password) {
      console.log('[AUTH] Missing email or password');
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    console.log('[AUTH] User lookup result:', rows.length > 0 ? `Found user ID ${rows[0].id}` : 'User not found');
    
    if (!rows.length) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const user = rows[0];
    console.log('[AUTH] User found:', { id: user.id, email: user.email, role: user.role, status: user.status });
    
    // Check if user is active
    if (user.status && user.status !== 'active') {
      console.log('[AUTH] User is not active:', user.status);
      return res.status(403).json({ success: false, error: 'Account is inactive. Please contact administrator.' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    console.log('[AUTH] Password match:', passwordMatch);
    
    if (!passwordMatch) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    // Update last login
    try {
      await pool.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);
    } catch (updateErr) {
      console.warn('[AUTH] Failed to update last_login_at:', updateErr.message);
      // Continue anyway - not critical
    }

    // Generate tokens
    try {
      const accessToken = signAccessToken({ sub: user.id, role: user.role || 'inspector' });
      const refreshToken = signRefreshToken({ sub: user.id });
      
      console.log('[AUTH] Tokens generated successfully');
      
      const safeUser = toSafeUser(user);
      console.log('[AUTH] Login successful for user:', safeUser.email);
      
      res.json({
        success: true,
        user: safeUser,
        token: accessToken,
        refreshToken,
        message: 'Login successful',
      });
    } catch (tokenErr) {
      console.error('[AUTH] Token generation error:', tokenErr);
      console.error('[AUTH] JWT_SECRET exists:', !!process.env.JWT_SECRET);
      throw new Error('Failed to generate authentication token. Check JWT_SECRET configuration.');
    }
  } catch (err) {
    console.error('[AUTH] Login error:', err);
    console.error('[AUTH] Error stack:', err.stack);
    console.error('[AUTH] Error details:', {
      message: err.message,
      code: err.code,
      name: err.name
    });
    
    // Provide more specific error messages
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
      return res.status(503).json({ 
        success: false, 
        error: 'Database connection failed. Please try again later.' 
      });
    }
    
    if (err.message.includes('JWT_SECRET')) {
      return res.status(500).json({ 
        success: false, 
        error: 'Server configuration error. Please contact administrator.' 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      error: 'Login failed: ' + (err.message || 'Unknown error'),
      ...(process.env.NODE_ENV === 'development' && { details: err.message })
    });
  }
};

export const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, error: 'Missing refresh token' });
    }

    const payload = verifyRefreshToken(refreshToken);
    const { rows } = await pool.query('SELECT id, role FROM users WHERE id = $1', [payload.sub]);
    if (!rows.length) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    const accessToken = signAccessToken({ sub: rows[0].id, role: rows[0].role });
    res.json({ success: true, token: accessToken });
  } catch (err) {
    res.status(401).json({ success: false, error: 'Invalid refresh token' });
  }
};

export const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    const { rows } = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (!rows.length) {
      return res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await pool.query(
      `
        INSERT INTO password_reset_tokens (user_id, token, expires_at)
        VALUES ($1, $2, $3)
      `,
      [rows[0].id, token, expiresAt]
    );

    // In production this would email the token. For now, return token for testing.
    res.json({ success: true, token, message: 'Password reset token generated' });
  } catch (err) {
    console.error('[AUTH] requestPasswordReset error', err);
    res.status(500).json({ success: false, error: 'Failed to process password reset request' });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ success: false, error: 'Token and password are required' });
    }

    const { rows } = await pool.query(
      `
        SELECT user_id FROM password_reset_tokens
        WHERE token = $1 AND used = FALSE AND expires_at > NOW()
      `,
      [token]
    );

    if (!rows.length) {
      return res.status(400).json({ success: false, error: 'Invalid or expired token' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [passwordHash, rows[0].user_id]);
    await pool.query('UPDATE password_reset_tokens SET used = TRUE WHERE token = $1', [token]);

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error('[AUTH] resetPassword error', err);
    res.status(500).json({ success: false, error: 'Failed to reset password' });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'Current and new password required' });
    }

    const { rows } = await pool.query('SELECT password FROM users WHERE id = $1', [req.user.id]);
    if (!rows.length) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const match = await bcrypt.compare(currentPassword, rows[0].password);
    if (!match) {
      return res.status(400).json({ success: false, error: 'Current password incorrect' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [newHash, req.user.id]);

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error('[AUTH] changePassword error', err);
    res.status(500).json({ success: false, error: 'Failed to change password' });
  }
};

