# Backend Structure

This is the organized backend structure for the Bridge Inspection System.

## 📁 Folder Structure

```
backend/
├── config/           # Configuration files
│   ├── database.js   # PostgreSQL connection pool
│   └── cors.js       # CORS configuration
├── routes/           # API route handlers
│   ├── health.js     # Health check endpoint
│   ├── auth.js       # Authentication (signup/login)
│   └── inspections.js # Inspection CRUD operations
├── middleware/       # Express middleware
│   ├── logger.js     # Request logging
│   └── errorHandler.js # Error handling
├── utils/            # Utility functions
│   └── initializeDB.js # Database initialization
└── server.js         # Main entry point
```

## 🚀 Usage

### Start Server
```bash
npm run server
# or
npm start
```

### Development
The server will:
- Connect to PostgreSQL database
- Initialize tables on startup
- Serve API endpoints
- Serve frontend static files (from `dist/` folder)

## 📡 API Endpoints

### Health
- `GET /api/health` - Server and database health check

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login

### Inspections
- `POST /api/inspections/lidar` - Save LiDAR inspection
- `POST /api/inspections/sar` - Save SAR inspection
- `GET /api/inspections` - Get all inspections (optional: `?type=lidar` or `?type=sar`)

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
PORT=4001
DATABASE_URL=postgresql://user:pass@host:5432/dbname
JWT_SECRET=your-secret-key
CORS_ORIGIN=http://localhost:5173,http://localhost:5174
NODE_ENV=development
```

## 🔧 Adding New Features

### Add a New Route

1. Create a new file in `routes/`:
```javascript
// routes/example.js
import express from 'express';
const router = express.Router();

router.get('/api/example', (req, res) => {
  res.json({ message: 'Hello' });
});

export default router;
```

2. Import and use in `server.js`:
```javascript
import exampleRoutes from './routes/example.js';
app.use(exampleRoutes);
```

### Add New Middleware

1. Create in `middleware/`:
```javascript
// middleware/example.js
export const exampleMiddleware = (req, res, next) => {
  // Your logic
  next();
};
```

2. Use in `server.js`:
```javascript
import { exampleMiddleware } from './middleware/example.js';
app.use(exampleMiddleware);
```

## 📝 Notes

- All routes are prefixed with `/api`
- Database connection is managed in `config/database.js`
- CORS is configured in `config/cors.js`
- Error handling is centralized in `middleware/errorHandler.js`
- Frontend is served from `../dist/` folder

