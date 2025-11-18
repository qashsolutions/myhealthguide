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
