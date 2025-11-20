import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

// PostgreSQL connection pool configuration
const poolConfig = {
  connectionString: process.env.DATABASE_URL || 
    'postgresql://bridge_inspection_db_vo5e_user:r163EbcZhjnLZPFHWxRmINnEG3ECVlKl@dpg-d42a0neuk2gs73bds170-a.oregon-postgres.render.com/bridge_inspection_db_vo5e',
  ssl: {
    rejectUnauthorized: false // For Render PostgreSQL
  },
  // Pool configuration to prevent premature closure
  max: 20, // Maximum number of clients in the pool
  min: 2, // Minimum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection cannot be established
  // Prevent pool from closing on errors
  allowExitOnIdle: false
};

const pool = new Pool(poolConfig);

// Test database connection
pool.on('connect', (client) => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle database client', err);
  console.error('❌ Error code:', err.code);
  console.error('❌ Error message:', err.message);
  // Don't exit the process - let it try to reconnect
  // The connection pool will handle reconnection
  // DO NOT call pool.end() here - it will close the pool permanently
});

// Prevent pool from being closed accidentally
let poolClosed = false;
const originalEnd = pool.end.bind(pool);
pool.end = function(callback) {
  if (poolClosed) {
    console.warn('⚠️  Attempted to close pool that is already closed');
    if (callback) callback();
    return Promise.resolve();
  }
  poolClosed = true;
  console.log('🛑 Closing database pool...');
  return originalEnd(callback);
};

// Test connection on startup
pool.query('SELECT NOW()')
  .then(() => {
    console.log('✅ Database pool initialized and connected');
  })
  .catch((err) => {
    console.error('❌ Database pool initialization failed:', err.message);
    console.error('⚠️  Server will continue but database operations may fail');
  });

export default pool;

