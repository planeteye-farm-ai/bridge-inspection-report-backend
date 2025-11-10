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

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc)
    if (!origin) return callback(null, true);

    // Allow localhost in development
    if (devOrigins.includes(origin)) return callback(null, true);

    // Allow configured origins or defaults
    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Optionally allow any *.onrender.com domain for quick testing
    if (allowAnyRenderDomain && /^https:\/\/([a-z0-9-]+\.)*onrender\.com$/.test(origin)) {
      return callback(null, true);
    }

    console.warn(`[CORS] Blocked origin: ${origin}`);
    console.warn(`[CORS] Allowed origins: ${allowedOrigins.join(', ') || 'ALL'}`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
};

export default cors(corsOptions);

