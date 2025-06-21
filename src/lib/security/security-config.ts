import crypto from 'crypto';

/**
 * Security configuration and utilities
 * Implements security best practices and monitoring
 */

// Security headers configuration
// Note: unsafe-eval is only added in development via next.config.js
export const SECURITY_HEADERS = {
  'Content-Security-Policy': 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' https://apis.google.com; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "font-src 'self'; " +
    "connect-src 'self' https://firebaseapp.com https://*.googleapis.com; " +
    "frame-ancestors 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self';",
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(self), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
};

// CORS configuration
export const CORS_CONFIG = {
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.NEXT_PUBLIC_APP_URL || 'https://myhealthguide.com']
    : ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// Generate cryptographically secure tokens
export const generateSecureToken = (length: number = 32): string => {
  return crypto.randomBytes(length).toString('hex');
};

// Hash sensitive data
export const hashData = (data: string): string => {
  return crypto.createHash('sha256').update(data).digest('hex');
};

// Verify data integrity
export const verifyIntegrity = (data: string, hash: string): boolean => {
  return hashData(data) === hash;
};

// Audit log events
export interface AuditEvent {
  eventType: 'auth_attempt' | 'auth_success' | 'auth_failure' | 'api_access' | 
             'data_access' | 'data_modification' | 'security_alert' | 'rate_limit';
  userId?: string;
  userEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  resource?: string;
  action?: string;
  result?: 'success' | 'failure';
  metadata?: Record<string, any>;
  timestamp: Date;
}

// Log security event (placeholder - implement with your logging service)
export const logSecurityEvent = async (event: AuditEvent): Promise<void> => {
  // In production, send to centralized logging service (e.g., Datadog, CloudWatch)
  console.log('[SECURITY AUDIT]', JSON.stringify({
    ...event,
    timestamp: event.timestamp.toISOString(),
  }));
  
  // TODO: Implement actual logging service integration
  // Example: await loggingService.log(event);
};

// Detect suspicious patterns
export const detectSuspiciousActivity = (
  recentEvents: AuditEvent[],
  timeWindowMs: number = 300000 // 5 minutes
): boolean => {
  const now = Date.now();
  const relevantEvents = recentEvents.filter(
    event => now - event.timestamp.getTime() < timeWindowMs
  );
  
  // Check for suspicious patterns
  const failedAuthAttempts = relevantEvents.filter(
    e => e.eventType === 'auth_failure'
  ).length;
  
  const rateLimitHits = relevantEvents.filter(
    e => e.eventType === 'rate_limit'
  ).length;
  
  // Thresholds for suspicious activity
  if (failedAuthAttempts > 10) return true;
  if (rateLimitHits > 20) return true;
  
  // Check for rapid API access from same IP
  const apiAccessByIp = new Map<string, number>();
  relevantEvents
    .filter(e => e.eventType === 'api_access' && e.ipAddress)
    .forEach(e => {
      const count = apiAccessByIp.get(e.ipAddress!) || 0;
      apiAccessByIp.set(e.ipAddress!, count + 1);
    });
  
  for (const [ip, count] of apiAccessByIp.entries()) {
    if (count > 100) return true; // 100 requests in 5 minutes from same IP
  }
  
  return false;
};

// Input sanitization
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
};

// Validate request origin
export const isValidOrigin = (origin: string | null): boolean => {
  if (!origin) return false;
  
  const allowedOrigins = CORS_CONFIG.origin;
  if (Array.isArray(allowedOrigins)) {
    return allowedOrigins.includes(origin);
  }
  
  return origin === allowedOrigins;
};

// Runtime security checks
export const performSecurityChecks = async (): Promise<{
  passed: boolean;
  issues: string[];
}> => {
  const issues: string[] = [];
  
  // Check for required environment variables
  const requiredEnvVars = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'GOOGLE_CLOUD_CREDENTIALS',
    'RESEND_API_KEY',
    'JWT_SECRET',
  ];
  
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      issues.push(`Missing required environment variable: ${envVar}`);
    }
  }
  
  // Check for development mode in production
  if (process.env.VERCEL_ENV === 'production' && process.env.NODE_ENV !== 'production') {
    issues.push('Application running in development mode in production environment');
  }
  
  // Check for secure headers
  if (process.env.NODE_ENV === 'production' && !process.env.HTTPS) {
    issues.push('HTTPS not enforced in production');
  }
  
  return {
    passed: issues.length === 0,
    issues,
  };
};