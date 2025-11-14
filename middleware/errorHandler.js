// Error handling middleware
export const errorHandler = (err, req, res, next) => {
  console.error('❌ Error Handler:', err);
  console.error('❌ Error Stack:', err.stack);
  console.error('❌ Request URL:', req.url);
  console.error('❌ Request Method:', req.method);
  
  // Don't send error response if headers already sent
  if (res.headersSent) {
    return next(err);
  }
  
  // Handle CORS errors
  if (err.message && err.message.includes('CORS')) {
    return res.status(403).json({
      success: false,
      error: 'CORS error: ' + err.message
    });
  }
  
  // Handle database errors
  if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    return res.status(503).json({
      success: false,
      error: 'Database connection failed. Please try again later.',
      message: err.message
    });
  }
  
  // Default error response
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Something went wrong!',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

