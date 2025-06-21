import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Providers } from './providers';
import { APP_NAME, APP_DESCRIPTION, APP_URL } from '@/lib/constants';

// Font optimization for better readability
const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} - AI-Powered Medication Safety for Seniors`,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  keywords: [
    'medication checker',
    'drug interactions',
    'eldercare',
    'senior health',
    'medication safety',
    'AI health assistant',
    'MedGemma',
  ],
  authors: [{ name: APP_NAME }],
  creator: APP_NAME,
  publisher: APP_NAME,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(APP_URL),
  openGraph: {
    title: APP_NAME,
    description: APP_DESCRIPTION,
    url: APP_URL,
    siteName: APP_NAME,
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: APP_NAME,
    description: APP_DESCRIPTION,
  },
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
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen flex flex-col text-selection">
        <Providers>
          <ErrorBoundary>
            {/* Skip to main content link for screen readers */}
            <a 
              href="#main-content" 
              className="skip-to-main"
            >
              Skip to main content
            </a>
            
            {/* Header */}
            <Header />
            
            {/* Main content */}
            <main 
              id="main-content"
              className="flex-1 container mx-auto px-4 py-8"
              role="main"
            >
              {children}
            </main>
            
            {/* Footer */}
            <Footer />
          </ErrorBoundary>
        </Providers>
      </body>
    </html>
  );
}