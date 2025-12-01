'use client';

import { ReactNode, useState, useEffect } from 'react';
import { Sidebar } from '@/components/shared/Sidebar';
import { DashboardHeader } from '@/components/shared/DashboardHeader';
import { VerificationBanner } from '@/components/auth/VerificationBanner';
import { TrialExpirationBanner } from '@/components/auth/TrialExpirationBanner';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { FCMProvider } from '@/components/notifications/FCMProvider';
import { ElderProvider } from '@/contexts/ElderContext';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  // Mobile sidebar state (closed by default on mobile, open on desktop)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Auto-open sidebar on desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };

    // Set initial state
    handleResize();

    // Listen for window resize
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <ProtectedRoute>
      <ElderProvider>
        <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
          <FCMProvider />
          <Sidebar
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
          />
          <div className="flex-1 flex flex-col overflow-hidden w-full lg:w-auto">
            <DashboardHeader onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />
            <VerificationBanner />
            <TrialExpirationBanner />
            <main className="flex-1 overflow-y-auto">
              <div className="p-4 sm:p-6 min-h-full">
                {children}
              </div>
            </main>
          </div>
        </div>
      </ElderProvider>
    </ProtectedRoute>
  );
}
