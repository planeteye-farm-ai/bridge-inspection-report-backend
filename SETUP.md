# Backend Setup Guide

## 📦 Install Dependencies

Navigate to the backend folder and install packages:

```bash
cd backend
npm install
```

This will install:
- `express` - Web framework
- `cors` - CORS middleware
- `pg` - PostgreSQL client
- `dotenv` - Environment variables
- `jsonwebtoken` - JWT authentication

## ⚙️ Environment Variables

Create a `.env` file in the backend folder:

```env
PORT=4001
DATABASE_URL=postgresql://bridge_inspection_db_vo5e_user:r163EbcZhjnLZPFHWxRmINnEG3ECVlKl@dpg-d42a0neuk2gs73bds170-a.oregon-postgres.render.com/bridge_inspection_db_vo5e
JWT_SECRET=bridge-inspection-secret-2024
CORS_ORIGIN=http://localhost:5173,http://localhost:5174
NODE_ENV=development
```

## 🚀 Start Server

```bash
npm start
# or
node server.js
```

The server will start on port 4001 (or PORT from .env).

## ✅ Verify

Open in browser: http://https://bridge-inspection-report-backend.onrender.com/api/health

Should return JSON with `"status": "OK"`

## 📁 Project Structure

```
backend/
├── config/
│   ├── database.js      # PostgreSQL connection
│   └── cors.js          # CORS configuration
├── routes/
│   ├── health.js        # Health check
│   ├── auth.js          # Authentication
│   └── inspections.js   # Inspections CRUD
├── middleware/
│   ├── logger.js        # Request logging
│   └── errorHandler.js  # Error handling
├── utils/
│   └── initializeDB.js  # Database setup
├── server.js            # Main entry point
└── package.json         # Dependencies
```

## 🔧 Troubleshooting

### Port already in use
Change PORT in `.env` file

### Database connection failed
- Check `DATABASE_URL` is correct
- Verify internet connection (for remote DB)
- Check database is accessible

### Module not found
Run `npm install` again

