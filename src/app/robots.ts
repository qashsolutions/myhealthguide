import { MetadataRoute } from 'next'

/**
 * robots.txt configuration for SEO
 * Target: USA users searching for caregiver, eldercare, voice enabled,
 * dementia screening, care community, family and agency plans
 */
export default function robots(): MetadataRoute.Robots {
  const privateRoutes = [
    '/dashboard/',
    '/api/',
    '/verify',
    '/verify-email',
    '/phone-login',
    '/phone-signup',
  ]

  return {
    rules: [
      // Default rule for all crawlers
      {
        userAgent: '*',
        allow: [
          '/',
          '/features',
          '/pricing',
          '/about',
          '/tips',
          '/symptom-checker',
          '/login',
          '/signup',
        ],
        disallow: privateRoutes,
      },
      // Google - most important for search
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: ['/dashboard/', '/api/'],
      },
      // Bing
      {
        userAgent: 'Bingbot',
        allow: '/',
        disallow: privateRoutes,
      },
      // Facebook crawler
      {
        userAgent: 'facebookexternalhit',
        allow: '/',
      },
      // Twitter crawler
      {
        userAgent: 'Twitterbot',
        allow: '/',
      },
      // LinkedIn crawler
      {
        userAgent: 'LinkedInBot',
        allow: '/',
      },
    ],
    sitemap: 'https://www.myguide.health/sitemap.xml',
    host: 'https://www.myguide.health',
  }
}
