// Environment-specific CSP - only allow unsafe-eval in development
const isDevelopment = process.env.NODE_ENV !== 'production';

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: `default-src 'self'; script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""} https://apis.google.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://firebaseapp.com https://*.googleapis.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self';`
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(self), geolocation=()',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains; preload',
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  poweredByHeader: false,
  
  images: {
    domains: ['myguide.health'],
  },
  
  // Eldercare-specific performance optimizations
  experimental: {
    optimizeCss: true,
    strictNextHead: true,
  },
  
  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
  
  // Webpack configuration for security
  webpack: (config, { isServer }) => {
    // Add security monitoring in production
    if (!isServer && process.env.NODE_ENV === 'production') {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        crypto: require.resolve('crypto-browserify'),
        stream: require.resolve('stream-browserify'),
      };
    }
    
    return config;
  },
  
  // Environment variable validation
  env: {
    NEXT_PUBLIC_ENV_VALIDATION: 'true',
  },
};

module.exports = nextConfig;