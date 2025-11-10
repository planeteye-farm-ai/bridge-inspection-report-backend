import pool from '../config/database.js';

// Initialize database tables
export const initializeDatabase = async () => {
  try {
    console.log('📊 Initializing database tables...');

    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create LiDAR inspections table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS lidar_inspections (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        bridge_no VARCHAR(255) NOT NULL,
        chainage VARCHAR(255) NOT NULL,
        project_name VARCHAR(255) NOT NULL,
        location TEXT,
        scan_date DATE,
        operator_name VARCHAR(255),
        equipment_used VARCHAR(255),
        scan_density VARCHAR(255),
        accuracy VARCHAR(255),
        point_cloud_data TEXT,
        measurements TEXT,
        findings TEXT,
        recommendations TEXT,
        photos JSONB,
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        state VARCHAR(255),
        zone VARCHAR(255),
        structure_type VARCHAR(255),
        structural_measurements JSONB,
        technical_scope JSONB,
        structure_layout TEXT,
        layout_legends JSONB,
        distress_nomenclature JSONB,
        observations_lhs JSONB,
        observations_rhs JSONB,
        non_structural_observations JSONB,
        distress_photos JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create SAR inspections table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sar_inspections (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        bridge_no VARCHAR(255) NOT NULL,
        chainage VARCHAR(255) NOT NULL,
        project_name VARCHAR(255) NOT NULL,
        location TEXT,
        inspection_date DATE,
        inspector_name VARCHAR(255),
        equipment_used VARCHAR(255),
        methodology TEXT,
        findings TEXT,
        recommendations TEXT,
        photos JSONB,
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        state VARCHAR(255),
        zone VARCHAR(255),
        structure_type VARCHAR(255),
        structural_assessment JSONB,
        material_condition JSONB,
        corrosion_assessment JSONB,
        crack_analysis JSONB,
        spalling_analysis JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Unified inspections table for JSON storage
    await pool.query(`
      CREATE TABLE IF NOT EXISTS inspections (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        type VARCHAR(50) NOT NULL,
        data JSONB NOT NULL,
        status VARCHAR(20) DEFAULT 'completed',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`ALTER TABLE inspections ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'completed'`);

    // Create indexes
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_lidar_user_id ON lidar_inspections(user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_lidar_bridge_no ON lidar_inspections(bridge_no)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_lidar_created_at ON lidar_inspections(created_at)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_sar_user_id ON sar_inspections(user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_sar_bridge_no ON sar_inspections(bridge_no)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_sar_created_at ON sar_inspections(created_at)`);

    console.log('✅ Database tables initialized successfully');
  } catch (err) {
    console.error('❌ Error initializing database:', err.message);
  }
};

