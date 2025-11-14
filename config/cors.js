import cors from 'cors';

// Default production origins that should always work out of the box
const defaultOrigins = [
  'https://bridge-inspection-report.onrender.com',
  'https://bridge-inspection-frontend.onrender.com'
];

// CORS configuration
const envOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const allowedOrigins = Array.from(new Set([...defaultOrigins, ...envOrigins]));

const devOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174'
];

const allowAnyRenderDomain = process.env.ALLOW_RENDER_ALL === 'true';
const isProduction = process.env.NODE_ENV === 'production';

// In production on Render, automatically allow all Render domains by default
// Set ALLOW_RENDER_ALL=false to disable this behavior
const autoAllowRenderDomains = isProduction && process.env.ALLOW_RENDER_ALL !== 'false';

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc)
    if (!origin) {
      console.log('[CORS] No origin header (allowed)');
      return callback(null, true);
    }

    console.log(`[CORS] Request from origin: ${origin}`);

    // Allow localhost in development
    if (devOrigins.includes(origin)) {
      console.log('[CORS] Localhost origin allowed');
      return callback(null, true);
    }

    // Allow configured origins or defaults
    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      console.log('[CORS] Origin in allowed list');
      return callback(null, true);
    }

    // Allow any *.onrender.com domain if enabled (useful for production)
    if (autoAllowRenderDomains || allowAnyRenderDomain) {
      const renderDomainPattern = /^https:\/\/([a-z0-9-]+\.)*onrender\.com$/;
      if (renderDomainPattern.test(origin)) {
        console.log('[CORS] Render domain allowed');
        return callback(null, true);
      }
    }

    console.error(`[CORS] ❌ Blocked origin: ${origin}`);
    console.error(`[CORS] Allowed origins: ${allowedOrigins.join(', ') || 'ALL'}`);
    console.error(`[CORS] Auto-allow Render domains: ${autoAllowRenderDomains}`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Authorization'],
  optionsSuccessStatus: 200 // Some legacy browsers choke on 204
};

// Log CORS configuration on import (for debugging)
console.log('[CORS] Configuration loaded:');
console.log(`[CORS]   Environment: ${isProduction ? 'production' : 'development'}`);
console.log(`[CORS]   Default origins: ${defaultOrigins.join(', ')}`);
console.log(`[CORS]   Environment origins: ${envOrigins.length > 0 ? envOrigins.join(', ') : 'none'}`);
console.log(`[CORS]   Auto-allow Render domains: ${autoAllowRenderDomains}`);
console.log(`[CORS]   Allowed origins: ${allowedOrigins.join(', ') || 'ALL'}`);

export default cors(corsOptions);

