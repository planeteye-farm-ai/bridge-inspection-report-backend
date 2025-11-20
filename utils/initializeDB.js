import bcrypt from 'bcryptjs';
import pool from '../config/database.js';

// Initialize database tables and ensure admin-ready schema
export const initializeDatabase = async () => {
  try {
    console.log('[DB] Initializing database tables...');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'inspector',
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        last_login_at TIMESTAMP,
        preferences JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) NOT NULL DEFAULT 'inspector'`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active'`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);

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

    await pool.query(`
      CREATE TABLE IF NOT EXISTS inspections (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255),
        data JSONB NOT NULL,
        status VARCHAR(20) DEFAULT 'completed',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`ALTER TABLE inspections ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'completed'`);
    await pool.query(`ALTER TABLE inspections ADD COLUMN IF NOT EXISTS title VARCHAR(255)`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        description TEXT,
        permissions JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_roles (
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
        PRIMARY KEY (user_id, role_id)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id SERIAL PRIMARY KEY,
        inspection_id INTEGER REFERENCES inspections(id) ON DELETE SET NULL,
        user_id INTEGER REFERENCES users(id),
        title VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        status VARCHAR(20) DEFAULT 'draft',
        summary TEXT,
        pdf_url TEXT,
        csv_url TEXT,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        key VARCHAR(100) UNIQUE NOT NULL,
        value JSONB NOT NULL,
        description TEXT,
        updated_by INTEGER REFERENCES users(id),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        actor_id INTEGER REFERENCES users(id),
        action VARCHAR(255) NOT NULL,
        entity VARCHAR(100),
        entity_id VARCHAR(100),
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS system_backups (
        id SERIAL PRIMARY KEY,
        initiated_by INTEGER REFERENCES users(id),
        status VARCHAR(20) DEFAULT 'pending',
        location TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Seed default roles
    const defaultRoles = [
      {
        name: 'admin',
        description: 'Full system access',
        permissions: {
          users: ['create', 'read', 'update', 'delete', 'assign-role'],
          reports: ['create', 'read', 'update', 'delete', 'export'],
          settings: ['read', 'update', 'backup'],
          logs: ['read'],
        },
      },
      {
        name: 'manager',
        description: 'Manage reports and inspectors',
        permissions: {
          users: ['read'],
          reports: ['create', 'read', 'update', 'export'],
          settings: [],
          logs: ['read-self'],
        },
      },
      {
        name: 'inspector',
        description: 'Create and view own reports',
        permissions: {
          reports: ['create', 'read-own', 'export-own'],
        },
      },
    ];

    for (const role of defaultRoles) {
      try {
        await pool.query(
          `
            INSERT INTO roles (name, description, permissions)
            VALUES ($1, $2, $3::jsonb)
            ON CONFLICT (name) DO NOTHING
          `,
          [role.name, role.description, JSON.stringify(role.permissions)]
        );
      } catch (e) {
        console.error('[DB] Failed inserting default role JSON permissions for role:', role.name, e.message);
        throw e;
      }
    }

    // Seed default admin user
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@bridge-inspection.local';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!';
    const adminName = process.env.ADMIN_NAME || 'System Admin';

    const existingAdmin = await pool.query('SELECT id FROM users WHERE email = $1', [adminEmail]);
    if (existingAdmin.rowCount === 0) {
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      const insertedAdmin = await pool.query(
        `
          INSERT INTO users (email, password, name, role, status)
          VALUES ($1, $2, $3, 'admin', 'active')
          RETURNING id
        `,
        [adminEmail, passwordHash, adminName]
      );

      const adminRoleRow = await pool.query('SELECT id FROM roles WHERE name = $1', ['admin']);
      if (adminRoleRow.rowCount > 0) {
        await pool.query(
          `
            INSERT INTO user_roles (user_id, role_id)
            VALUES ($1, $2)
            ON CONFLICT (user_id, role_id) DO NOTHING
          `,
          [insertedAdmin.rows[0].id, adminRoleRow.rows[0].id]
        );
      }

      console.log(`[DB] Seeded default admin user (${adminEmail})`);
    }

    // Seed default settings
    const defaultSettings = [
      { key: 'reportFormats', value: ['PDF', 'CSV'], description: 'Available report download formats' },
      { key: 'userLimit', value: 250, description: 'Maximum allowed active users' },
      { key: 'enableDarkMode', value: true, description: 'Dark mode toggle default' },
    ];

    for (const setting of defaultSettings) {
      try {
        await pool.query(
          `
            INSERT INTO settings (key, value, description)
            VALUES ($1, $2::jsonb, $3)
            ON CONFLICT (key) DO NOTHING
          `,
          [setting.key, JSON.stringify(setting.value), setting.description]
        );
      } catch (e) {
        console.error('[DB] Failed inserting default setting JSON value for key:', setting.key, e.message);
        throw e;
      }
    }

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_lidar_user_id ON lidar_inspections(user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_sar_user_id ON sar_inspections(user_id)`);
    // Critical index for user-specific inspection queries
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_inspections_user_id ON inspections(user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_inspections_user_type ON inspections(user_id, type)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_inspections_created_at ON inspections(created_at DESC)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_reports_type ON reports(type)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at)`);

    console.log('[DB] Database tables initialized successfully');
  } catch (err) {
    console.error('[DB] Error initializing database:', err.message);
    console.error(err.stack);
  }
};

