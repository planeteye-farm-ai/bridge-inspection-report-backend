import express from 'express';
import pool from '../config/database.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

// Diagnostic endpoint to test login flow
router.post('/api/diagnostics/test-login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.json({
        success: false,
        error: 'Email and password required',
        checks: {
          emailProvided: !!email,
          passwordProvided: !!password
        }
      });
    }

    const diagnostics = {
      backendRunning: true,
      databaseConnected: false,
      userExists: false,
      passwordMatch: false,
      jwtSecretSet: !!process.env.JWT_SECRET,
      jwtRefreshSecretSet: !!process.env.JWT_REFRESH_SECRET,
      userStatus: null,
      userRole: null,
      errors: []
    };

    // Test database connection
    try {
      const dbTest = await pool.query('SELECT NOW()');
      diagnostics.databaseConnected = true;
    } catch (dbErr) {
      diagnostics.errors.push(`Database error: ${dbErr.message}`);
      return res.json({ success: false, diagnostics });
    }

    // Check if user exists
    try {
      const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
      if (rows.length > 0) {
        diagnostics.userExists = true;
        diagnostics.userStatus = rows[0].status;
        diagnostics.userRole = rows[0].role;
        
        // Test password
        try {
          const match = await bcrypt.compare(password, rows[0].password);
          diagnostics.passwordMatch = match;
        } catch (pwdErr) {
          diagnostics.errors.push(`Password check error: ${pwdErr.message}`);
        }
      } else {
        diagnostics.errors.push('User not found in database');
      }
    } catch (userErr) {
      diagnostics.errors.push(`User lookup error: ${userErr.message}`);
    }

    // Determine if login should work
    const shouldWork = diagnostics.databaseConnected && 
                       diagnostics.userExists && 
                       diagnostics.passwordMatch && 
                       diagnostics.jwtSecretSet &&
                       diagnostics.userStatus === 'active';

    res.json({
      success: shouldWork,
      diagnostics,
      recommendation: shouldWork 
        ? 'Login should work. Check frontend/network issues.'
        : diagnostics.errors.join('; ') || 'Check diagnostics above'
    });
  } catch (err) {
    res.json({
      success: false,
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

export default router;

