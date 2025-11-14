import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// Helper to extract user ID from authorization header
const getUserId = (req) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      console.log('[AUTH] No authorization header');
      return null;
    }
    
    // Handle both "Bearer token-123" and "token-123" formats
    let token = authHeader.replace(/^Bearer\s+/i, '').trim();
    token = token.replace(/^token-/i, '');
    
    if (!token) {
      console.log('[AUTH] Empty token after parsing');
      return null;
    }
    
    const userId = parseInt(token, 10);
    if (isNaN(userId) || userId <= 0) {
      console.log(`[AUTH] Invalid user ID from token: ${token}`);
      return null;
    }
    
    console.log(`[AUTH] Extracted user ID: ${userId}`);
    return userId;
  } catch (err) {
    console.error('[AUTH] Error parsing user ID:', err);
    return null;
  }
};

const saveInspection = async (req, res, type) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const payload = req.body?.data ?? req.body;
    const status = req.body?.status ?? 'completed';

    const result = await pool.query(
      `INSERT INTO inspections (user_id, type, data, status) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, created_at, updated_at, status`,
      [userId, type, JSON.stringify(payload), status]
    );

    console.log(`💾 ${type.toUpperCase()} inspection saved: ID ${result.rows[0].id}`);

    res.status(201).json({
      success: true,
      id: result.rows[0].id,
      createdAt: result.rows[0].created_at,
      updatedAt: result.rows[0].updated_at,
      status: result.rows[0].status ?? 'completed',
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
    console.log('[INSPECTIONS] GET /api/inspections');
    console.log('[INSPECTIONS] Authorization header:', req.headers.authorization ? 'present' : 'missing');
    
    const type = req.query.type; // 'lidar' or 'sar'
    const userId = getUserId(req);

    if (!userId) {
      console.log('[INSPECTIONS] Unauthorized - no valid user ID');
      return res.status(401).json({ success: false, error: 'Unauthorized - please login again' });
    }

    console.log(`[INSPECTIONS] Fetching inspections for user ${userId}, type: ${type || 'all'}`);

    const params = [userId];
    let query = 'SELECT id, type, data, status, created_at, updated_at FROM inspections WHERE user_id = $1';
    if (type === 'lidar' || type === 'sar') {
      query += ' AND type = $2';
      params.push(type);
    }
    query += ' ORDER BY created_at DESC';

    console.log('[INSPECTIONS] Executing query:', query);
    console.log('[INSPECTIONS] Query params:', params);

    const result = await pool.query(query, params);

    console.log(`[INSPECTIONS] Found ${result.rows.length} inspections`);

    // Handle JSON data parsing
    const mappedData = result.rows.map(row => {
      let parsedData = row.data;
      
      // If data is a string, try to parse it as JSON
      if (typeof parsedData === 'string') {
        try {
          parsedData = JSON.parse(parsedData);
        } catch (e) {
          console.warn(`[INSPECTIONS] Failed to parse JSON for inspection ${row.id}:`, e);
          parsedData = row.data; // Keep original if parsing fails
        }
      }

      return {
        id: row.id,
        reportType: row.type?.toUpperCase() || row.type,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        status: row.status ?? 'completed',
        data: parsedData
      };
    });

    res.json({
      success: true,
      data: mappedData
    });
  } catch (err) {
    console.error('❌ Error fetching inspections:', err);
    console.error('❌ Error stack:', err.stack);
    
    // Handle database connection errors
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
      return res.status(503).json({
        success: false,
        error: 'Database connection failed. Please try again later.'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch inspections: ' + (err.message || 'Unknown error')
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
    const { type, data, status } = req.body;

    const result = await pool.query(
      `UPDATE inspections 
       SET type = $1, data = $2, status = $3, updated_at = NOW() 
       WHERE id = $4 AND user_id = $5 
       RETURNING id, created_at, updated_at`,
      [
        type ?? 'sar',
        JSON.stringify(data),
        status ?? 'completed',
        inspectionId,
        userId,
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Inspection not found' });
    }

    res.json({
      success: true,
      id: result.rows[0].id,
      createdAt: result.rows[0].created_at,
      updatedAt: result.rows[0].updated_at,
      status: status ?? 'completed',
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

