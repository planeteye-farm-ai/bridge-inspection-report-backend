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

// Save LiDAR inspection data
router.post('/api/inspections/lidar', async (req, res) => {
  try {
    const data = req.body;
    const userId = getUserId(req) || 1;

    const query = `
      INSERT INTO lidar_inspections (
        user_id, bridge_no, chainage, project_name, location, scan_date, operator_name,
        equipment_used, scan_density, accuracy, point_cloud_data, measurements,
        findings, recommendations, photos, latitude, longitude, state, zone,
        structure_type, structural_measurements, technical_scope, structure_layout,
        layout_legends, distress_nomenclature, observations_lhs, observations_rhs,
        non_structural_observations, distress_photos
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
        $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28
      ) RETURNING id
    `;

    const values = [
      userId,
      data.bridgeNo,
      data.chainage,
      data.projectName,
      data.location,
      data.scanDate,
      data.operatorName,
      data.equipmentUsed,
      data.scanDensity,
      data.accuracy,
      data.pointCloudData,
      data.measurements,
      data.findings,
      data.recommendations,
      JSON.stringify(data.photos || []),
      data.latitude,
      data.longitude,
      data.state,
      data.zone,
      data.structureType,
      JSON.stringify(data.structuralMeasurements || {}),
      JSON.stringify(data.technicalScope || {}),
      data.structureLayout,
      JSON.stringify(data.layoutLegends || []),
      JSON.stringify(data.distressNomenclature || []),
      JSON.stringify(data.observationsLHS || []),
      JSON.stringify(data.observationsRHS || []),
      JSON.stringify(data.nonStructuralObservations || []),
      JSON.stringify(data.distressPhotos || [])
    ];

    const result = await pool.query(query, values);
    console.log(`💾 LiDAR inspection saved: ID ${result.rows[0].id}`);

    res.status(201).json({
      success: true,
      id: result.rows[0].id,
      message: 'LiDAR inspection data saved successfully'
    });
  } catch (err) {
    console.error('❌ Error saving LiDAR inspection:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to save inspection data: ' + err.message
    });
  }
});

// Save SAR inspection data
router.post('/api/inspections/sar', async (req, res) => {
  try {
    const data = req.body;
    const userId = getUserId(req) || 1;

    const query = `
      INSERT INTO sar_inspections (
        user_id, bridge_no, chainage, project_name, location, inspection_date, inspector_name,
        equipment_used, methodology, findings, recommendations, photos, latitude,
        longitude, state, zone, structure_type, structural_assessment,
        material_condition, corrosion_assessment, crack_analysis, spalling_analysis
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
        $17, $18, $19, $20, $21
      ) RETURNING id
    `;

    const values = [
      userId,
      data.bridgeNo,
      data.chainage,
      data.projectName,
      data.location,
      data.inspectionDate,
      data.inspectorName,
      data.equipmentUsed,
      data.methodology,
      data.findings,
      data.recommendations,
      JSON.stringify(data.photos || []),
      data.latitude,
      data.longitude,
      data.state,
      data.zone,
      data.structureType,
      JSON.stringify(data.structuralAssessment || {}),
      JSON.stringify(data.materialCondition || {}),
      JSON.stringify(data.corrosionAssessment || {}),
      JSON.stringify(data.crackAnalysis || {}),
      JSON.stringify(data.spallingAnalysis || {})
    ];

    const result = await pool.query(query, values);
    console.log(`💾 SAR inspection saved: ID ${result.rows[0].id}`);

    res.status(201).json({
      success: true,
      id: result.rows[0].id,
      message: 'SAR inspection data saved successfully'
    });
  } catch (err) {
    console.error('❌ Error saving SAR inspection:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to save inspection data: ' + err.message
    });
  }
});

// Get all inspections
router.get('/api/inspections', async (req, res) => {
  try {
    const type = req.query.type; // 'lidar' or 'sar'
    const userId = getUserId(req);

    let query;
    if (type === 'lidar') {
      query = userId 
        ? 'SELECT * FROM lidar_inspections WHERE user_id = $1 ORDER BY created_at DESC'
        : 'SELECT * FROM lidar_inspections ORDER BY created_at DESC';
    } else if (type === 'sar') {
      query = userId
        ? 'SELECT * FROM sar_inspections WHERE user_id = $1 ORDER BY created_at DESC'
        : 'SELECT * FROM sar_inspections ORDER BY created_at DESC';
    } else {
      query = userId
        ? `
          SELECT 'lidar' as type, id, bridge_no, chainage, project_name, created_at
          FROM lidar_inspections WHERE user_id = $1
          UNION ALL
          SELECT 'sar' as type, id, bridge_no, chainage, project_name, created_at
          FROM sar_inspections WHERE user_id = $1
          ORDER BY created_at DESC
        `
        : `
          SELECT 'lidar' as type, id, bridge_no, chainage, project_name, created_at
          FROM lidar_inspections
          UNION ALL
          SELECT 'sar' as type, id, bridge_no, chainage, project_name, created_at
          FROM sar_inspections
          ORDER BY created_at DESC
        `;
    }

    const result = userId && (type === 'lidar' || type === 'sar' || !type)
      ? await pool.query(query, [userId])
      : await pool.query(query);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    console.error('❌ Error fetching inspections:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch inspections: ' + err.message
    });
  }
});

export default router;

