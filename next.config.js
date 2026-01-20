const withSerwist = require("@serwist/next").default({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development", // Disable in dev to avoid caching issues
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['firebasestorage.googleapis.com'],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Redirects
  async redirects() {
    return [
      {
        source: '/tips',
        destination: '/community',
        permanent: false,
      },
      // Redirect /auth to /login (auth/action is still accessible for Firebase callbacks)
      {
        source: '/auth',
        destination: '/login',
        permanent: true,
      },
      // Old removed routes - redirect to home (these no longer exist)
      {
        source: '/health-qa',
        destination: '/',
        permanent: true,
      },
      {
        source: '/medication-check',
        destination: '/',
        permanent: true,
      },
    ];
  },
  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
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
            value: 'camera=(self), microphone=(self), geolocation=(self)',
          },
        ],
      },
    ];
  },
  // Exclude Firebase Cloud Functions directory from Next.js build
  webpack: (config, { isServer }) => {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/functions/**', '**/node_modules/**'],
    };
    return config;
  },
}

module.exports = withSerwist(nextConfig);
