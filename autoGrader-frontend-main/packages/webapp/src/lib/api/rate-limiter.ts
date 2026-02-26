/**
 * Rate Limiting Middleware
 * Prevents API abuse and DDoS attacks
 */

import type { NextApiRequest, NextApiResponse } from 'next';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store (use Redis in production)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  windowMs: number;  // Time window in milliseconds
  maxRequests: number;  // Max requests per window
  keyGenerator?: (req: NextApiRequest) => string;
}

/**
 * Default rate limit configurations
 */
export const RATE_LIMITS = {
  // Strict limit for authentication endpoints
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5
  },
  // Standard limit for API endpoints
  API: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60
  },
  // Generous limit for read operations
  READ: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 120
  },
  // Strict limit for AI operations (expensive)
  AI: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10
  },
  // Very strict for database writes
  WRITE: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30
  }
};

/**
 * Get client identifier from request
 */
function getClientId(req: NextApiRequest): string {
  // Try to get user ID from auth (if authenticated)
  const userId = (req as any).user?.id;
  if (userId) {
    return `user:${userId}`;
  }

  // Fall back to IP address
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded
    ? (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0])
    : req.socket.remoteAddress || 'unknown';

  return `ip:${ip}`;
}

/**
 * Rate limiting middleware
 */
export function rateLimit(config: RateLimitConfig) {
  return async (
    req: NextApiRequest,
    res: NextApiResponse
  ): Promise<boolean> => {
    const keyGenerator = config.keyGenerator || getClientId;
    const clientId = keyGenerator(req);
    const key = `${req.url}:${clientId}`;
    const now = Date.now();

    let entry = rateLimitStore.get(key);

    // Create new entry if doesn't exist or expired
    if (!entry || entry.resetTime < now) {
      entry = {
        count: 0,
        resetTime: now + config.windowMs
      };
      rateLimitStore.set(key, entry);
    }

    entry.count++;

    // Check if limit exceeded
    if (entry.count > config.maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      
      res.setHeader('X-RateLimit-Limit', config.maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('X-RateLimit-Reset', entry.resetTime.toString());
      res.setHeader('Retry-After', retryAfter.toString());

      res.status(429).json({
        success: false,
        error: 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter,
        limit: config.maxRequests,
        window: config.windowMs / 1000
      });

      return false;
    }

    // Set rate limit headers
    const remaining = config.maxRequests - entry.count;
    res.setHeader('X-RateLimit-Limit', config.maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-RateLimit-Reset', entry.resetTime.toString());

    return true;
  };
}

/**
 * Helper to apply rate limit to handler
 */
export function withRateLimit(
  config: RateLimitConfig,
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const limiter = rateLimit(config);
    const allowed = await limiter(req, res);
    
    if (!allowed) {
      return;
    }

    return handler(req, res);
  };
}
