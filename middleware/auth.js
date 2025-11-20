import pool from '../config/database.js';
import { verifyAccessToken } from '../utils/jwt.js';

export const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const token = header.replace('Bearer ', '').trim();
    const decoded = verifyAccessToken(token);

    const { rows } = await pool.query('SELECT id, email, name, role, status FROM users WHERE id = $1', [
      decoded.sub,
    ]);
    if (rows.length === 0 || rows[0].status !== 'active') {
      return res.status(401).json({ success: false, error: 'User disabled or missing' });
    }

    req.user = rows[0];
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
};

export const requireRoles = (...roles) => (req, res, next) => {
  if (!req.user || (roles.length && !roles.includes(req.user.role))) {
    return res.status(403).json({ success: false, error: 'Forbidden' });
  }
  next();
};

