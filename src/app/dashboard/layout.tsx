import { ReactNode } from 'react';
import { Sidebar } from '@/components/shared/Sidebar';
import { DashboardHeader } from '@/components/shared/DashboardHeader';
import { VerificationBanner } from '@/components/auth/VerificationBanner';
import { FCMProvider } from '@/components/notifications/FCMProvider';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <FCMProvider />
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <DashboardHeader />
        <VerificationBanner />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 min-h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
