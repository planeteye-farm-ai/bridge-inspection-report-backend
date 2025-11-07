# Backend File Structure

```
backend/
│
├── server.js                    # 🚀 Main entry point - starts Express server
│
├── config/                      # ⚙️ Configuration files
│   ├── database.js             #   PostgreSQL connection pool
│   └── cors.js                 #   CORS middleware configuration
│
├── routes/                      # 🛣️ API route handlers
│   ├── health.js               #   GET /api/health
│   ├── auth.js                 #   POST /api/auth/signup, /api/auth/login
│   └── inspections.js          #   POST /api/inspections/lidar, /api/inspections/sar
│                                #   GET /api/inspections
│
├── middleware/                  # 🔧 Express middleware
│   ├── logger.js               #   Request logging middleware
│   └── errorHandler.js         #   Global error handler
│
├── utils/                       # 🛠️ Utility functions
│   └── initializeDB.js         #   Database table initialization
│
└── README.md                    # 📖 Documentation
```

## File Responsibilities

### `server.js`
- Initializes Express app
- Configures middleware (CORS, JSON parsing, logging)
- Registers all routes
- Serves static frontend files
- Starts the server
- Handles graceful shutdown

### `config/database.js`
- Creates PostgreSQL connection pool
- Handles connection events
- Exports pool for use in routes

### `config/cors.js`
- Configures CORS options
- Allows localhost in development
- Validates allowed origins

### `routes/health.js`
- Health check endpoint
- Tests database connection
- Returns server status

### `routes/auth.js`
- User signup endpoint
- User login endpoint
- Password validation
- Token generation

### `routes/inspections.js`
- Save LiDAR inspections
- Save SAR inspections
- Get all inspections (with filtering)
- User-specific data filtering

### `middleware/logger.js`
- Logs all API requests
- Format: `[API] METHOD /path`

### `middleware/errorHandler.js`
- Catches all unhandled errors
- Returns consistent error format
- Logs error details

### `utils/initializeDB.js`
- Creates database tables
- Creates indexes
- Handles initialization errors

## Data Flow

```
Request → CORS → Logger → Routes → Database → Response
                              ↓
                         Error Handler
```

## Adding New Features

### Example: Add a new endpoint `/api/reports`

1. **Create route file:**
   ```javascript
   // routes/reports.js
   import express from 'express';
   import pool from '../config/database.js';
   
   const router = express.Router();
   
   router.get('/api/reports', async (req, res) => {
     // Your logic
   });
   
   export default router;
   ```

2. **Register in server.js:**
   ```javascript
   import reportsRoutes from './routes/reports.js';
   app.use(reportsRoutes);
   ```

3. **Done!** The endpoint is now available at `/api/reports`

