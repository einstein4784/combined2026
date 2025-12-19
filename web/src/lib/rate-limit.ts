import { LRUCache } from 'lru-cache';
import { NextRequest } from 'next/server';
import { json } from './utils';

/**
 * Rate limiting configuration
 */
const rateLimitCache = new LRUCache<string, number[]>({
  max: 500, // Maximum number of unique identifiers to track
  ttl: 60000, // 1 minute TTL
});

/**
 * Rate limit configuration per endpoint
 */
const RATE_LIMITS: Record<string, { limit: number; window: number }> = {
  '/api/customers': { limit: 100, window: 60000 }, // 100 requests per minute
  '/api/policies': { limit: 100, window: 60000 },
  '/api/payments': { limit: 100, window: 60000 },
  '/api/receipts': { limit: 100, window: 60000 },
  '/api/users': { limit: 50, window: 60000 }, // Lower limit for user management
  '/api/admin': { limit: 50, window: 60000 }, // Lower limit for admin operations
  default: { limit: 100, window: 60000 }, // Default limit
};

/**
 * Get rate limit configuration for a path
 */
function getRateLimitConfig(path: string): { limit: number; window: number } {
  // Check for exact match first
  if (RATE_LIMITS[path]) {
    return RATE_LIMITS[path];
  }

  // Check for prefix match (e.g., /api/admin/*)
  for (const [pattern, config] of Object.entries(RATE_LIMITS)) {
    if (pattern !== 'default' && path.startsWith(pattern)) {
      return config;
    }
  }

  return RATE_LIMITS.default;
}

/**
 * Check if a request should be rate limited
 * @param identifier Unique identifier for rate limiting (usually user ID or IP)
 * @param path The API path being accessed
 * @returns true if request should be allowed, false if rate limited
 */
export function checkRateLimit(identifier: string, path: string): { allowed: boolean; remaining: number; resetAt: number } {
  const config = getRateLimitConfig(path);
  const now = Date.now();
  const key = `${identifier}:${path}`;
  
  const requests = rateLimitCache.get(key) || [];
  
  // Filter out requests outside the time window
  const validRequests = requests.filter(time => now - time < config.window);
  
  if (validRequests.length >= config.limit) {
    const oldestRequest = validRequests[0];
    const resetAt = oldestRequest + config.window;
    return {
      allowed: false,
      remaining: 0,
      resetAt,
    };
  }
  
  // Add current request
  validRequests.push(now);
  rateLimitCache.set(key, validRequests);
  
  return {
    allowed: true,
    remaining: config.limit - validRequests.length,
    resetAt: now + config.window,
  };
}

/**
 * Rate limit middleware for API routes
 * Returns a response if rate limited, null if allowed
 */
export function rateLimitMiddleware(req: NextRequest, userId?: string): Response | null {
  // Get identifier (user ID if authenticated, IP otherwise)
  const identifier = userId || req.headers.get('x-forwarded-for')?.split(',')[0] || 
                     req.headers.get('x-real-ip') || 
                     'unknown';
  
  const path = new URL(req.url).pathname;
  const result = checkRateLimit(identifier, path);
  
  if (!result.allowed) {
    const resetDate = new Date(result.resetAt).toISOString();
    return json(
      {
        error: 'Rate limit exceeded',
        message: `Too many requests. Please try again after ${resetDate}`,
        resetAt: resetDate,
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': getRateLimitConfig(path).limit.toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': result.resetAt.toString(),
          'Retry-After': Math.ceil((result.resetAt - Date.now()) / 1000).toString(),
        },
      }
    );
  }
  
  return null;
}

