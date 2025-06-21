import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Edge middleware for security checks
 * Runs on Vercel's edge network before requests reach your application
 */

// Security configuration
const BLOCKED_COUNTRIES = process.env.BLOCKED_COUNTRIES?.split(',') || [];
const BLOCKED_IPS = process.env.BLOCKED_IPS?.split(',') || [];
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || [
  'https://myhealthguide.com',
  'https://www.myhealthguide.com',
];

export function middleware(request: NextRequest) {
  // Get request details
  const { pathname, origin } = request.nextUrl;
  const country = request.geo?.country || 'US';
  const city = request.geo?.city || 'Unknown';
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
  
  // 1. Block requests from specific countries
  if (BLOCKED_COUNTRIES.includes(country)) {
    return new NextResponse('Access denied', { status: 403 });
  }
  
  // 2. Block specific IPs
  if (BLOCKED_IPS.includes(ip)) {
    return new NextResponse('Access denied', { status: 403 });
  }
  
  // 3. CORS protection for API routes
  if (pathname.startsWith('/api/')) {
    const requestOrigin = request.headers.get('origin');
    
    // Check origin for API requests
    if (requestOrigin && !ALLOWED_ORIGINS.includes(requestOrigin)) {
      return new NextResponse('CORS policy violation', { status: 403 });
    }
    
    // Add security headers to API responses
    const response = NextResponse.next();
    response.headers.set('X-API-Version', 'v1');
    response.headers.set('X-Request-ID', crypto.randomUUID());
    response.headers.set('X-Geo-Country', country);
    response.headers.set('X-Geo-City', city);
    
    return response;
  }
  
  // 4. Security headers for all responses
  const response = NextResponse.next();
  
  // Additional security headers not in next.config.js
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');
  response.headers.set('X-Download-Options', 'noopen');
  response.headers.set('X-Request-ID', crypto.randomUUID());
  
  // Add geo information for logging
  response.headers.set('X-Vercel-IP-Country', country);
  response.headers.set('X-Vercel-IP-City', city);
  
  // 5. Protect against timing attacks on auth routes
  if (pathname.startsWith('/api/auth/')) {
    // Add random delay to prevent timing attacks
    const delay = Math.floor(Math.random() * 100) + 50; // 50-150ms
    return new Promise((resolve) => {
      setTimeout(() => resolve(response), delay);
    });
  }
  
  return response;
}

// Configure which routes use middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};