/**
 * Structured Data (Schema.org) for SEO
 * Provides rich snippets for Google Search
 */

export function StructuredData() {
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'myguide.health',
    url: 'https://www.myguide.health',
    logo: 'https://www.myguide.health/logo.png',
    description: 'AI-powered caregiving platform for families and agencies. Automated medication tracking and intelligent insights for eldercare management.',
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Support',
      email: 'support@myguide.health',
    },
    sameAs: [
      'https://twitter.com/myguidehealth',
    ],
  };

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'myguide.health',
    url: 'https://www.myguide.health',
    description: 'AI-powered eldercare and caregiver management platform',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://www.myguide.health/search?q={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  };

  const softwareApplicationSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'myguide.health',
    applicationCategory: 'HealthApplication',
    operatingSystem: 'Web, iOS, Android',
    offers: {
      '@type': 'Offer',
      price: '8.99',
      priceCurrency: 'USD',
      priceValidUntil: '2025-12-31',
    },
    description: 'AI-powered caregiving platform for families and agencies. Automated medication tracking, voice-enabled logging, and intelligent insights for eldercare management.',
    featureList: [
      'Automated medication tracking',
      'Voice-enabled logging',
      'AI-driven insights',
      'Real-time collaboration',
      'Caregiver workflow automation',
      'Emergency alerts',
      'Compliance monitoring',
    ],
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://www.myguide.health',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Features',
        item: 'https://www.myguide.health/features',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: 'Pricing',
        item: 'https://www.myguide.health/pricing',
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
    </>
  );
}
