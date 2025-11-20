import express from 'express';
import pool from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

const saveInspection = async (req, res, type) => {
  try {
    const userId = req.user.id;

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

// Get all inspections with pagination and timeout protection
// PERMANENT FIX: Load summaries without full data field to prevent timeout
router.get('/api/inspections', async (req, res) => {
  const startTime = Date.now();
  let queryTimeout;
  
  try {
    console.log('[INSPECTIONS] GET /api/inspections');
    console.log('[INSPECTIONS] Authorization header:', req.headers.authorization ? 'present' : 'missing');
    
    const type = req.query.type; // 'lidar' or 'sar'
    const userId = req.user.id;
    const includeData = req.query.includeData === 'true'; // Only load full data if explicitly requested
    const limit = Math.min(parseInt(req.query.limit) || 30, 100); // Reduced default: 30, max 100
    const offset = parseInt(req.query.offset) || 0;

    console.log(`[INSPECTIONS] Fetching inspections for user ${userId}, type: ${type || 'all'}, limit: ${limit}, offset: ${offset}, includeData: ${includeData}`);

    // OPTIMIZED: Don't load full data field unless requested (prevents timeout with large JSONB)
    const queryPromise = (async () => {
      const params = [userId];
      
      // Extract minimal info from JSONB without loading full field
      let query = `
        SELECT 
          id, 
          type, 
          status, 
          created_at, 
          updated_at,
          title,
          ${includeData ? 'data,' : ''}
          ${!includeData ? `
            CASE 
              WHEN data::text IS NOT NULL THEN 
                jsonb_build_object(
                  'bridgeNo', data->>'bridgeNo',
                  'reportTitle', data->>'reportTitle',
                  'projectName', data->>'projectName',
                  'location', data->>'location',
                  'chainage', data->>'chainage'
                )
              ELSE NULL
            END as summary
          ` : ''}
        FROM inspections 
        WHERE user_id = $1
      `;
      
      if (type === 'lidar' || type === 'sar') {
        query += ' AND type = $2';
        params.push(type);
      }
      
      query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
      params.push(limit, offset);

      console.log('[INSPECTIONS] Executing optimized query (data field excluded for performance)');
      console.log('[INSPECTIONS] Query params:', params);

      return await pool.query(query, params);
    })();

    // Reduced timeout to 15 seconds (faster failure for better UX)
    const timeoutPromise = new Promise((_, reject) => {
      queryTimeout = setTimeout(() => {
        reject(new Error('Query timeout: Database query took too long. Try with smaller limit or use search.'));
      }, 15000); // 15 second timeout
    });

    const result = await Promise.race([queryPromise, timeoutPromise]);
    clearTimeout(queryTimeout);

    const queryTime = Date.now() - startTime;
    console.log(`[INSPECTIONS] Query completed in ${queryTime}ms, found ${result.rows.length} inspections`);

    // Skip count query if it might be slow (optional optimization)
    let totalCount = null;
    if (offset === 0) { // Only get count on first page
      try {
        const countParams = [userId];
        let countQuery = 'SELECT COUNT(*) as total FROM inspections WHERE user_id = $1';
        if (type === 'lidar' || type === 'sar') {
          countQuery += ' AND type = $2';
          countParams.push(type);
        }
        
        const countResult = await Promise.race([
          pool.query(countQuery, countParams),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Count timeout')), 3000))
        ]);
        totalCount = parseInt(countResult.rows[0].total, 10);
      } catch (countErr) {
        console.warn('[INSPECTIONS] Could not get total count (skipping for performance):', countErr.message);
        // Continue without total count
      }
    }

    // Process results - much faster without parsing large JSONB
    const mappedData = result.rows.map((row) => {
      try {
        let dataField = null;
        
        if (includeData) {
          // Only parse if explicitly requested
          let parsedData = row.data;
          if (typeof parsedData === 'string') {
            try {
              parsedData = JSON.parse(parsedData);
            } catch (e) {
              console.warn(`[INSPECTIONS] Failed to parse JSON for inspection ${row.id}:`, e.message);
              parsedData = row.data;
            }
          }
          dataField = parsedData;
        } else {
          // Use lightweight summary
          dataField = row.summary || {};
        }

        return {
          id: row.id,
          reportType: row.type?.toUpperCase() || row.type,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          status: row.status ?? 'completed',
          title: row.title,
          data: dataField,
          // Flag to indicate if full data needs to be loaded
          _needsFullData: !includeData && row.summary !== null
        };
      } catch (err) {
        console.error(`[INSPECTIONS] Error processing row (id: ${row.id}):`, err.message);
        return {
          id: row.id,
          reportType: row.type?.toUpperCase() || row.type,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          status: row.status ?? 'completed',
          data: null,
          error: 'Failed to process data'
        };
      }
    });

    const totalTime = Date.now() - startTime;
    console.log(`[INSPECTIONS] Total processing time: ${totalTime}ms`);

    res.json({
      success: true,
      data: mappedData,
      pagination: {
        limit,
        offset,
        total: totalCount,
        hasMore: totalCount !== null ? (offset + limit < totalCount) : (result.rows.length === limit)
      },
      performance: {
        queryTime: queryTime,
        totalTime: totalTime
      }
    });
  } catch (err) {
    if (queryTimeout) clearTimeout(queryTimeout);
    
    const totalTime = Date.now() - startTime;
    console.error(`[INSPECTIONS] Error after ${totalTime}ms:`, err.message);
    console.error('[INSPECTIONS] User ID:', req.user?.id);
    console.error('❌ Error stack:', err.stack);
    
    // Handle timeout errors with helpful message
    if (err.message.includes('timeout') || err.message.includes('Query timeout')) {
      return res.status(504).json({
        success: false,
        error: 'Request timeout: Too many records. Use ?limit=20&offset=0 or search/filter to find specific reports.',
        suggestion: 'Try: /api/inspections?limit=20&offset=0'
      });
    }
    
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

// Get single inspection with full data (for when user views/edit specific report)
router.get('/api/inspections/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const inspectionId = parseInt(req.params.id, 10);
    
    const result = await pool.query(
      'SELECT id, type, data, status, created_at, updated_at, title FROM inspections WHERE id = $1 AND user_id = $2',
      [inspectionId, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Inspection not found' });
    }
    
    const row = result.rows[0];
    let parsedData = row.data;
    
    if (typeof parsedData === 'string') {
      try {
        parsedData = JSON.parse(parsedData);
      } catch (e) {
        console.warn(`[INSPECTIONS] Failed to parse JSON for inspection ${row.id}:`, e.message);
      }
    }
    
    res.json({
      success: true,
      data: {
        id: row.id,
        reportType: row.type?.toUpperCase() || row.type,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        status: row.status ?? 'completed',
        title: row.title,
        data: parsedData
      }
    });
  } catch (err) {
    console.error('❌ Error fetching inspection:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch inspection: ' + err.message
    });
  }
});

// Update inspection
router.put('/api/inspections/:id', async (req, res) => {
  try {
    const userId = req.user.id;

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
    const userId = req.user.id;

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

