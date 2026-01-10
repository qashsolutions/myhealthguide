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
import { SetPasswordModal } from '@/components/auth/SetPasswordModal';
import { AgencyService } from '@/lib/firebase/agencies';
import { ContinueSessionDialog } from '@/components/session/ContinueSessionDialog';
import { useSessionTracking } from '@/hooks/useSessionTracking';

// Component that uses session tracking - must be inside ElderProvider
function SessionTracker() {
  useSessionTracking();
  return null;
}

// Inner component that can access auth context
function DashboardContent({ children }: { children: ReactNode }) {
  const { user, refreshUser } = useAuth();
  const { hasPendingApproval, pendingAgencies } = useCaregiverApprovalStatus(user);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [pendingAgencyName, setPendingAgencyName] = useState<string | undefined>(undefined);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Check if user needs to set password (caregiver first login)
  useEffect(() => {
    if (user?.passwordSetupRequired) {
      setShowPasswordModal(true);
    }
  }, [user?.passwordSetupRequired]);

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

  // Fetch agency name for pending approval message
  useEffect(() => {
    const fetchAgencyName = async () => {
      if (pendingAgencies.length > 0 && pendingAgencies[0].agencyId) {
        try {
          const agency = await AgencyService.getAgency(pendingAgencies[0].agencyId);
          if (agency) {
            setPendingAgencyName(agency.name);
          }
        } catch (error) {
          console.error('Error fetching agency name:', error);
        }
      }
    };

    if (hasPendingApproval) {
      fetchAgencyName();
    }
  }, [hasPendingApproval, pendingAgencies]);

  return (
    <ElderProvider>
      {/* Session tracking - inside ElderProvider */}
      <SessionTracker />
      {/* Password setup modal for caregivers on first login */}
      {showPasswordModal && user?.email && (
        <SetPasswordModal
          open={showPasswordModal}
          email={user.email}
          onComplete={() => setShowPasswordModal(false)}
        />
      )}

      {/* Cross-device session continuity dialog */}
      <ContinueSessionDialog />

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
