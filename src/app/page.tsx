'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ROUTES } from '@/lib/constants';

/**
 * Home page that redirects to dashboard
 * Since all features are now public, we go directly to the dashboard
 */
export default function HomePage() {
  const router = useRouter();

  React.useEffect(() => {
    // Redirect to dashboard immediately
    router.replace(ROUTES.DASHBOARD);
  }, [router]);

  // Show loading state while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="spinner mb-4 mx-auto"></div>
        <p className="text-elder-lg text-elder-text-secondary">Loading...</p>
      </div>
    </div>
  );
}