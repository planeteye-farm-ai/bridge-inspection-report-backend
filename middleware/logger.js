// Request logging middleware for API routes
export const apiLogger = (req, res, next) => {
  console.log(`[API] ${req.method} ${req.path}`);
  next();
};

