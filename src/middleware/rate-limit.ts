import rateLimit from 'express-rate-limit';

// General API rate limiter
export const rateLimiter = rateLimit({
  windowMs: 60000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Rate limiter for dispense endpoint
 * Prevents abuse - max 5 dispense attempts per minute per user
 */
export const dispenseLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 10, // Max 10 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  
  // Key by user ID (requires auth middleware to run first)
  keyGenerator: (req) => {
    return req.user?.id || req.ip; // Fallback to IP if no user
  },
  
  // Custom error message
  handler: (req, res) => {
    const resetTime = (req as any).rateLimit?.resetTime || Date.now() + 60000;
    res.status(429).json({
      success: false,
      message: 'Too many dispense attempts. Please wait a moment and try again.',
      retryAfter: Math.ceil(resetTime / 1000)
    });
  }
});
