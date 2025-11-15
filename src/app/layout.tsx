import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from './providers';
import { Footer } from '@/components/shared/Footer';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'myguide.health - Intelligent Caregiving Made Simple',
    template: '%s | myguide.health'
  },
  description: 'Voice-powered medication tracking, AI-driven insights, and real-time collaboration for families and caregiving agencies.',
  keywords: ['caregiving', 'medication tracking', 'elderly care', 'caregiver app', 'AI healthcare'],
  authors: [{ name: 'myguide.health' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://myguide.health',
    title: 'myguide.health - Intelligent Caregiving Made Simple',
    description: 'Voice-powered medication tracking, AI-driven insights, and real-time collaboration.',
    siteName: 'myguide.health'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'myguide.health - Intelligent Caregiving Made Simple',
    description: 'Voice-powered medication tracking, AI-driven insights, and real-time collaboration.',
    creator: '@myguidehealth'
  }
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          {children}
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
