import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

/**
 * Rate limiting middleware for Next.js API routes
 * Uses in-memory storage (consider Redis for production)
 */

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  message?: string; // Custom error message
  keyGenerator?: (req: NextRequest) => string; // Custom key generator
}

// In-memory store for rate limiting
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean up every minute

export function createRateLimiter(config: RateLimitConfig) {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes default
    maxRequests = 10,
    message = 'Too many requests. Please try again later.',
    keyGenerator,
  } = config;

  return async function rateLimitMiddleware(req: NextRequest) {
    try {
      // Generate unique key for the client
      const key = keyGenerator ? keyGenerator(req) : await getDefaultKey(req);
      
      const now = Date.now();
      const windowStart = now - windowMs;
      
      // Get or create rate limit entry
      let limitEntry = rateLimitStore.get(key);
      
      if (!limitEntry || limitEntry.resetTime < now) {
        // Create new window
        limitEntry = {
          count: 1,
          resetTime: now + windowMs,
        };
        rateLimitStore.set(key, limitEntry);
      } else {
        // Increment count in current window
        limitEntry.count++;
      }
      
      // Check if limit exceeded
      if (limitEntry.count > maxRequests) {
        const retryAfter = Math.ceil((limitEntry.resetTime - now) / 1000);
        
        return NextResponse.json(
          {
            error: message,
            retryAfter,
          },
          {
            status: 429,
            headers: {
              'Retry-After': retryAfter.toString(),
              'X-RateLimit-Limit': maxRequests.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': new Date(limitEntry.resetTime).toISOString(),
            },
          }
        );
      }
      
      // Add rate limit headers to successful response
      const response = NextResponse.next();
      response.headers.set('X-RateLimit-Limit', maxRequests.toString());
      response.headers.set('X-RateLimit-Remaining', (maxRequests - limitEntry.count).toString());
      response.headers.set('X-RateLimit-Reset', new Date(limitEntry.resetTime).toISOString());
      
      return response;
    } catch (error) {
      console.error('Rate limit middleware error:', error);
      // In case of error, allow the request
      return NextResponse.next();
    }
  };
}

// Default key generator using IP and user ID
async function getDefaultKey(req: NextRequest): Promise<string> {
  const headersList = headers();
  
  // Try to get IP address
  const forwardedFor = headersList.get('x-forwarded-for');
  const realIp = headersList.get('x-real-ip');
  const ip = forwardedFor?.split(',')[0] || realIp || 'unknown';
  
  // Try to get user ID from authorization header
  const authHeader = req.headers.get('authorization');
  let userId = 'anonymous';
  
  if (authHeader?.startsWith('Bearer ')) {
    // Extract user ID from token (simplified - in production, verify the token)
    try {
      const token = authHeader.substring(7);
      // TODO: Properly decode and verify JWT token
      userId = 'user'; // Placeholder
    } catch (error) {
      // Invalid token, use anonymous
    }
  }
  
  return `${ip}:${userId}`;
}

// Pre-configured rate limiters for different endpoints
export const rateLimiters = {
  // Medication check: 10 requests per 15 minutes
  medicationCheck: createRateLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: 10,
    message: 'Too many medication checks. Please wait before trying again.',
  }),
  
  // Auth endpoints: 5 requests per 15 minutes
  auth: createRateLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: 5,
    message: 'Too many authentication attempts. Please wait before trying again.',
  }),
  
  // Health questions: 10 requests per 15 minutes
  healthQuestion: createRateLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: 10,
    message: 'Too many health questions. Please wait before trying again.',
  }),
  
  // General API: 100 requests per 15 minutes
  general: createRateLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: 100,
    message: 'Too many requests. Please slow down.',
  }),
};

// Helper function to apply rate limiting in API routes
export async function withRateLimit(
  req: NextRequest,
  handler: () => Promise<NextResponse>,
  rateLimiter = rateLimiters.general
): Promise<NextResponse> {
  // Check rate limit
  const rateLimitResponse = await rateLimiter(req);
  
  // If rate limit exceeded, return error response
  if (rateLimitResponse.status === 429) {
    return rateLimitResponse;
  }
  
  // Otherwise, execute handler
  return handler();
}