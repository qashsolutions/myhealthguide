/**
 * Structured Data (Schema.org) for SEO
 * Provides rich snippets for Google Search
 * Target: USA users searching for caregiver, eldercare, voice enabled,
 * dementia screening, care community, family and agency plans
 */

export function StructuredData() {
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'myguide.health',
    url: 'https://www.myguide.health',
    logo: 'https://www.myguide.health/logo.png',
    description: 'AI-powered eldercare and caregiver management platform. Voice-enabled medication tracking, dementia screening, and care community for families and agencies in the USA.',
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Support',
      email: 'support@myguide.health',
      areaServed: 'US',
      availableLanguage: 'English',
    },
    sameAs: [
      'https://twitter.com/myguidehealth',
      'https://facebook.com/myguidehealth',
    ],
    areaServed: {
      '@type': 'Country',
      name: 'United States',
    },
  };

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'myguide.health',
    url: 'https://www.myguide.health',
    description: 'Eldercare and caregiver management made simple with voice-enabled tracking and AI-powered insights',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://www.myguide.health/search?q={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
    inLanguage: 'en-US',
  };

  const softwareApplicationSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'myguide.health - Eldercare & Caregiver App',
    applicationCategory: 'HealthApplication',
    applicationSubCategory: 'Eldercare Management',
    operatingSystem: 'Web, iOS, Android',
    offers: [
      {
        '@type': 'Offer',
        name: 'Family Plan A',
        price: '8.99',
        priceCurrency: 'USD',
        description: 'For families caring for 1 loved one',
      },
      {
        '@type': 'Offer',
        name: 'Family Plan B',
        price: '10.99',
        priceCurrency: 'USD',
        description: 'For families with extended care team',
      },
      {
        '@type': 'Offer',
        name: 'Agency Plan',
        price: '16.99',
        priceCurrency: 'USD',
        description: 'For caregiving agencies managing multiple clients',
      },
    ],
    description: 'Voice-enabled eldercare platform with dementia screening, medication tracking, and care community features. Built for families and caregiving agencies.',
    featureList: [
      'Voice-enabled medication logging',
      'Dementia screening assessments',
      'Care community and caregiver tips',
      'Daily health summaries',
      'Missed dose alerts',
      'Family collaboration tools',
      'Caregiver shift handoffs',
      'Emergency notifications',
      'Medication compliance tracking',
      'AI-powered health insights',
    ],
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '150',
      bestRating: '5',
      worstRating: '1',
    },
  };

  // FAQ Schema - great for Google rich snippets
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What is voice-enabled care tracking?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Voice-enabled care tracking allows caregivers to log medications, meals, and activities using voice commands instead of typing. Simply speak to record care activities hands-free.',
        },
      },
      {
        '@type': 'Question',
        name: 'How does the dementia screening work?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Our dementia screening uses AI-powered cognitive assessments based on MoCA (Montreal Cognitive Assessment) standards. Caregivers answer questions about their loved one to identify potential cognitive concerns for discussion with healthcare providers.',
        },
      },
      {
        '@type': 'Question',
        name: 'What is the difference between Family and Agency plans?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Family plans ($8.99-$10.99/month) are designed for individual families caring for 1 loved one. Agency plans ($16.99/elder/month) are for professional caregiving agencies managing multiple clients with multiple caregivers.',
        },
      },
      {
        '@type': 'Question',
        name: 'Is there a free trial?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes! Family plans include a 45-day free trial and Agency plans include a 30-day free trial. No credit card required to start.',
        },
      },
      {
        '@type': 'Question',
        name: 'What is the Care Community feature?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'The Care Community is a collection of caregiver tips, wisdom, and support resources. Caregivers can access helpful advice from experienced caregivers and healthcare professionals.',
        },
      },
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
    </>
  );
}
