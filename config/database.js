import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 
    'postgresql://bridge_inspection_db_vo5e_user:r163EbcZhjnLZPFHWxRmINnEG3ECVlKl@dpg-d42a0neuk2gs73bds170-a.oregon-postgres.render.com/bridge_inspection_db_vo5e',
  ssl: {
    rejectUnauthorized: false // For Render PostgreSQL
  }
});

// Test database connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client', err);
  process.exit(-1);
});

export default pool;

