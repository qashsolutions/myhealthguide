import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from './providers';
import { Footer } from '@/components/shared/Footer';
import { StructuredData } from '@/components/seo/StructuredData';
import { CookieConsent } from '@/components/cookies/CookieConsent';
import { ServiceWorkerRegistration } from '@/components/pwa/ServiceWorkerRegistration';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  metadataBase: new URL('https://www.myguide.health'),
  title: {
    default: 'myguide.health - AI-Powered Eldercare & Caregiver Management Platform',
    template: '%s | myguide.health'
  },
  description: 'AI-powered caregiving platform for families and agencies. Automated medication tracking, voice-enabled logging, and intelligent insights for eldercare management. Streamline caregiver workflows with AI agentic automation.',
  alternates: {
    canonical: '/',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'MyHealthGuide',
  },
  formatDetection: {
    telephone: false,
  },
  keywords: [
    // Primary target keywords
    'caregiver app',
    'eldercare management',
    'eldercare app',
    'voice enabled care tracking',
    'dementia screening',
    'dementia assessment tool',
    'care community',
    'family caregiver plan',
    'agency caregiver plan',
    // Secondary keywords
    'caregiver agencies',
    'AI caregiving',
    'AI agentic automation',
    'automated medication tracking',
    'elderly care platform',
    'senior care software',
    'caregiver workflow automation',
    'AI-powered healthcare',
    'medication reminder app',
    'family caregiving tools',
    'agency caregiver management',
    'intelligent eldercare',
    // Long-tail keywords for USA
    'best caregiver app USA',
    'eldercare software for families',
    'voice medication tracking',
    'cognitive screening for elderly',
    'caregiver support community',
    'affordable eldercare plans',
  ],
  authors: [{ name: 'myguide.health' }],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://www.myguide.health',
    title: 'myguide.health - AI-Powered Eldercare & Caregiver Management',
    description: 'AI-powered caregiving platform for families and agencies. Automated medication tracking and intelligent insights for eldercare.',
    siteName: 'myguide.health'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'myguide.health - AI-Powered Eldercare & Caregiver Management',
    description: 'AI-powered caregiving platform for families and agencies. Automated medication tracking and intelligent insights.',
    creator: '@myguidehealth'
  },
  verification: {
    google: '9e30119a2aec4ced',
  },
  icons: {
    icon: [
      { url: '/icon.png', sizes: '512x512', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' }
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }
    ],
  },
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <StructuredData />
        {/* PWA meta tags for cross-platform compatibility */}
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={inter.className}>
        <Providers>
          {children}
          <Footer />
          <CookieConsent />
          <ServiceWorkerRegistration />
        </Providers>
      </body>
    </html>
  );
}
