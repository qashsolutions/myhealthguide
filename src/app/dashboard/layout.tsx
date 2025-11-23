import { ReactNode } from 'react';
import { Sidebar } from '@/components/shared/Sidebar';
import { DashboardHeader } from '@/components/shared/DashboardHeader';
import { QuickActions } from '@/components/shared/QuickActions';
import { VerificationBanner } from '@/components/auth/VerificationBanner';
import { TrialExpirationBanner } from '@/components/auth/TrialExpirationBanner';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { FCMProvider } from '@/components/notifications/FCMProvider';
import { ElderProvider } from '@/contexts/ElderContext';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <ElderProvider>
        <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
          <FCMProvider />
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <DashboardHeader />
            <VerificationBanner />
            <TrialExpirationBanner />
            <main className="flex-1 overflow-y-auto">
              <div className="p-6 min-h-full">
                {children}
              </div>
            </main>
          </div>
          {/* Floating Quick Action Buttons */}
          <QuickActions />
        </div>
      </ElderProvider>
    </ProtectedRoute>
  );
}
