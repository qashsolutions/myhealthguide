import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth/session';

/**
 * Edge middleware for security checks and route protection
 * Runs on Vercel's edge network before requests reach your application
 */

// Security configuration
const BLOCKED_COUNTRIES = process.env.BLOCKED_COUNTRIES?.split(',') || [];
const BLOCKED_IPS = process.env.BLOCKED_IPS?.split(',') || [];
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || [
  'https://myguide.health',
  'https://www.myguide.health',
];

// Routes that require authentication
const PROTECTED_ROUTES = [
  '/dashboard',
  '/medication-check',
  '/health-qa',
  '/account',
];

// Routes that require email verification
const VERIFIED_ROUTES = [
  '/medication-check',
  '/health-qa',
];

// Routes that should redirect to dashboard if already authenticated
const AUTH_ROUTES = [
  '/auth',
];

export async function middleware(request: NextRequest) {
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
      // Allow localhost in development
      if (process.env.NODE_ENV === 'development' && 
          (requestOrigin.includes('localhost') || requestOrigin.includes('127.0.0.1'))) {
        // Allow development origins
      } else {
        return new NextResponse('CORS policy violation', { status: 403 });
      }
    }
    
    // Add security headers to API responses
    const response = NextResponse.next();
    response.headers.set('X-API-Version', 'v1');
    response.headers.set('X-Request-ID', crypto.randomUUID());
    response.headers.set('X-Geo-Country', country);
    response.headers.set('X-Geo-City', city);
    
    // Add timing attack protection for auth routes
    if (pathname.startsWith('/api/auth/')) {
      // Add random delay to prevent timing attacks
      const delay = Math.floor(Math.random() * 100) + 50; // 50-150ms
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    return response;
  }
  
  // 4. Route protection for authenticated pages
  const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route));
  const needsVerification = VERIFIED_ROUTES.some(route => pathname.startsWith(route));
  const isAuthRoute = AUTH_ROUTES.some(route => pathname.startsWith(route));
  
  if (isProtectedRoute || isAuthRoute) {
    // Note: getSession function needs to be adapted for edge runtime
    // For now, we'll check for the session cookie
    const sessionCookie = request.cookies.get('mhg-auth-session');
    
    // Debug logging for cookie checks (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log('[Middleware] Route check:', {
        pathname,
        isProtectedRoute,
        isAuthRoute,
        hasSessionCookie: !!sessionCookie,
        cookieValue: sessionCookie?.value ? 'present (hidden)' : 'missing',
        allCookies: request.cookies.getAll().map(c => c.name),
      });
    }
    
    if (isProtectedRoute && !sessionCookie) {
      // Not logged in - redirect to auth with return URL
      console.log('[Middleware] Redirecting to auth - no session cookie');
      const redirectUrl = new URL('/auth', request.url);
      redirectUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(redirectUrl);
    }
    
    if (isAuthRoute && sessionCookie && !pathname.includes('verify-email')) {
      // Already logged in - redirect to dashboard
      console.log('[Middleware] Redirecting to dashboard - user already authenticated');
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    
    // For routes that need email verification, we would need to decode the JWT
    // to check emailVerified status. This is better done in the actual page
    // or API route since edge runtime has limitations
  }
  
  // 5. Security headers for all responses
  const response = NextResponse.next();
  
  // Additional security headers not in next.config.js
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');
  response.headers.set('X-Download-Options', 'noopen');
  response.headers.set('X-Request-ID', crypto.randomUUID());
  
  // Add geo information for logging
  response.headers.set('X-Vercel-IP-Country', country);
  response.headers.set('X-Vercel-IP-City', city);
  
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
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};