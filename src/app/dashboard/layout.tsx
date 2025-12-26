'use client';

import { ReactNode, useState, useEffect } from 'react';
import { Sidebar } from '@/components/shared/Sidebar';
import { DashboardHeader } from '@/components/shared/DashboardHeader';
import { VerificationBanner } from '@/components/auth/VerificationBanner';
import { TrialExpirationBanner } from '@/components/auth/TrialExpirationBanner';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { FCMProvider } from '@/components/notifications/FCMProvider';
import { ElderProvider } from '@/contexts/ElderContext';
import { useAuth } from '@/contexts/AuthContext';
import { CaregiverApprovalBlocker, useCaregiverApprovalStatus } from '@/components/auth/CaregiverApprovalBlocker';

// Inner component that can access auth context
function DashboardContent({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { hasPendingApproval, pendingAgencies } = useCaregiverApprovalStatus(user);
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

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Get agency name for pending approval message
  const pendingAgencyName = pendingAgencies[0]?.agencyId
    ? user?.agencies?.find(a => a.agencyId === pendingAgencies[0].agencyId)?.agencyId
    : undefined;

  return (
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
              {hasPendingApproval ? (
                <div className="max-w-lg mx-auto mt-8">
                  <CaregiverApprovalBlocker
                    agencyName={pendingAgencyName}
                    onRefresh={() => window.location.reload()}
                  />
                </div>
              ) : (
                children
              )}
            </div>
          </main>
        </div>
      </div>
    </ElderProvider>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <DashboardContent>{children}</DashboardContent>
    </ProtectedRoute>
  );
}
