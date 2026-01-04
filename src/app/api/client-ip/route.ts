/**
 * API Route: Get Client IP Address
 *
 * Returns the client's IP address from request headers.
 * This avoids CORS issues with external IP APIs.
 *
 * Vercel/Next.js provides the real IP in headers:
 * - x-forwarded-for: Client IP (may contain multiple IPs)
 * - x-real-ip: Alternative header
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Get IP from headers (Vercel provides these)
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');

  // x-forwarded-for may contain multiple IPs (client, proxies)
  // The first one is the original client IP
  let ip = 'unknown';

  if (forwardedFor) {
    ip = forwardedFor.split(',')[0].trim();
  } else if (realIp) {
    ip = realIp;
  }

  return NextResponse.json({ ip });
}
