import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from './providers';
import { Header } from '@/components/shared/Header';
import { Footer } from '@/components/shared/Footer';
import { StructuredData } from '@/components/seo/StructuredData';
import { CookieConsent } from '@/components/cookies/CookieConsent';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

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
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
  },
  keywords: [
    'eldercare management',
    'caregiver app',
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
    'voice-enabled care tracking',
    'intelligent eldercare'
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
      </head>
      <body className={inter.className}>
        <Providers>
          <Header />
          {children}
          <Footer />
          <CookieConsent />
        </Providers>
      </body>
    </html>
  );
}
