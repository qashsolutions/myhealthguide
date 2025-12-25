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
  // Redirects from old routes to new merged pages
  async redirects() {
    return [
      // Daily Care tab redirects
      {
        source: '/dashboard/medications',
        destination: '/dashboard/daily-care?tab=medications',
        permanent: false,
      },
      {
        source: '/dashboard/supplements',
        destination: '/dashboard/daily-care?tab=supplements',
        permanent: false,
      },
      {
        source: '/dashboard/diet',
        destination: '/dashboard/daily-care?tab=diet',
        permanent: false,
      },
      {
        source: '/dashboard/activity',
        destination: '/dashboard/daily-care?tab=activity',
        permanent: false,
      },
      // Safety Alerts tab redirects
      {
        source: '/dashboard/drug-interactions',
        destination: '/dashboard/safety-alerts?tab=interactions',
        permanent: false,
      },
      {
        source: '/dashboard/incidents',
        destination: '/dashboard/safety-alerts?tab=incidents',
        permanent: false,
      },
      {
        source: '/dashboard/schedule-conflicts',
        destination: '/dashboard/safety-alerts?tab=conflicts',
        permanent: false,
      },
      {
        source: '/dashboard/dementia-screening',
        destination: '/dashboard/safety-alerts?tab=screening',
        permanent: false,
      },
      // Analytics tab redirects
      {
        source: '/dashboard/medication-adherence',
        destination: '/dashboard/analytics?tab=adherence',
        permanent: false,
      },
      {
        source: '/dashboard/nutrition-analysis',
        destination: '/dashboard/analytics?tab=nutrition',
        permanent: false,
      },
      {
        source: '/dashboard/insights',
        destination: '/dashboard/analytics?tab=trends',
        permanent: false,
      },
      // Ask AI tab redirects
      {
        source: '/dashboard/medgemma',
        destination: '/dashboard/ask-ai?tab=chat',
        permanent: false,
      },
      {
        source: '/dashboard/health-chat',
        destination: '/dashboard/ask-ai?tab=chat',
        permanent: false,
      },
      {
        source: '/dashboard/clinical-notes',
        destination: '/dashboard/ask-ai?tab=clinical-notes',
        permanent: false,
      },
      {
        source: '/dashboard/reports',
        destination: '/dashboard/ask-ai?tab=reports',
        permanent: false,
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
            value: 'camera=(), microphone=(), geolocation=()',
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

module.exports = nextConfig
