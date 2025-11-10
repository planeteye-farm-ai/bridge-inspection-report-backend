import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// Helper to extract user ID from authorization header
const getUserId = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  
  // Handle both "Bearer token-123" and "token-123" formats
  const token = authHeader.replace('Bearer ', '').replace('token-', '');
  return token ? parseInt(token) : null;
};

const saveInspection = async (req, res, type) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const data = req.body;

    const result = await pool.query(
      `INSERT INTO inspections (user_id, type, data) 
       VALUES ($1, $2, $3) 
       RETURNING id, created_at, updated_at`,
      [userId, type, JSON.stringify(data)]
    );

    console.log(`💾 ${type.toUpperCase()} inspection saved: ID ${result.rows[0].id}`);

    res.status(201).json({
      success: true,
      id: result.rows[0].id,
      createdAt: result.rows[0].created_at,
      updatedAt: result.rows[0].updated_at,
      message: `${type.toUpperCase()} inspection saved successfully`
    });
  } catch (err) {
    console.error(`❌ Error saving ${type} inspection:`, err);
    res.status(500).json({
      success: false,
      error: 'Failed to save inspection data: ' + err.message
    });
  }
};

// Save LiDAR inspection data
router.post('/api/inspections/lidar', (req, res) => saveInspection(req, res, 'lidar'));

// Save SAR inspection data
router.post('/api/inspections/sar', (req, res) => saveInspection(req, res, 'sar'));

// Get all inspections
router.get('/api/inspections', async (req, res) => {
  try {
    const type = req.query.type; // 'lidar' or 'sar'
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const params = [userId];
    let query = 'SELECT id, type, data, created_at, updated_at FROM inspections WHERE user_id = $1';
    if (type === 'lidar' || type === 'sar') {
      query += ' AND type = $2';
      params.push(type);
    }
    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows.map(row => ({
        id: row.id,
        reportType: row.type.toUpperCase(),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        data: row.data
      }))
    });
  } catch (err) {
    console.error('❌ Error fetching inspections:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch inspections: ' + err.message
    });
  }
});

// Update inspection
router.put('/api/inspections/:id', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const inspectionId = parseInt(req.params.id, 10);
    const { type, data } = req.body;

    const result = await pool.query(
      `UPDATE inspections 
       SET type = $1, data = $2, updated_at = NOW() 
       WHERE id = $3 AND user_id = $4 
       RETURNING id, created_at, updated_at`,
      [type, JSON.stringify(data), inspectionId, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Inspection not found' });
    }

    res.json({
      success: true,
      id: result.rows[0].id,
      createdAt: result.rows[0].created_at,
      updatedAt: result.rows[0].updated_at,
      message: 'Inspection updated successfully'
    });
  } catch (err) {
    console.error('❌ Error updating inspection:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to update inspection: ' + err.message
    });
  }
});

// Delete inspection
router.delete('/api/inspections/:id', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const inspectionId = parseInt(req.params.id, 10);
    const result = await pool.query(
      'DELETE FROM inspections WHERE id = $1 AND user_id = $2',
      [inspectionId, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Inspection not found' });
    }

    res.json({ success: true, message: 'Inspection deleted successfully' });
  } catch (err) {
    console.error('❌ Error deleting inspection:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to delete inspection: ' + err.message
    });
  }
});

export default router;

