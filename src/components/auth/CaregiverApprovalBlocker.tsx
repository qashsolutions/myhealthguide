'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, CheckCircle2, Shield, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CaregiverApprovalBlockerProps {
  agencyName?: string;
  featureName?: string;
  onRefresh?: () => void;
}

export function CaregiverApprovalBlocker({
  agencyName = 'the agency',
  featureName = 'elder care features',
  onRefresh
}: CaregiverApprovalBlockerProps) {
  return (
    <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10 dark:border-yellow-800">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-yellow-600" />
          <CardTitle className="text-lg text-yellow-800 dark:text-yellow-200">
            Approval Pending
          </CardTitle>
        </div>
        <CardDescription className="text-yellow-700 dark:text-yellow-300">
          Your account is pending administrator approval
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-yellow-700 dark:text-yellow-300">
          An administrator from <strong>{agencyName}</strong> needs to review and approve your
          access before you can view {featureName}. This is a security measure to protect
          sensitive health information.
        </p>

        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-green-100 dark:bg-green-900/30">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-green-700 dark:text-green-400">
                Account Created
              </p>
              <p className="text-xs text-gray-500">
                Your account has been verified
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-yellow-100 dark:bg-yellow-900/30">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                Awaiting Approval
              </p>
              <p className="text-xs text-gray-500">
                Administrator review in progress
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
              <Shield className="w-4 h-4 text-gray-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Access Granted
              </p>
              <p className="text-xs text-gray-500">
                Pending administrator approval
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-yellow-200 dark:border-yellow-800">
          <p className="text-xs text-gray-600 dark:text-gray-400">
            You will be notified once your access has been approved. If you have questions,
            please contact your agency administrator.
          </p>
        </div>

        {onRefresh && (
          <Button
            variant="outline"
            onClick={onRefresh}
            className="w-full"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Check Approval Status
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Hook to check if caregiver is approved
 * Returns approval status for all agencies the user belongs to
 */
export function useCaregiverApprovalStatus(user: {
  agencies?: Array<{
    agencyId: string;
    role: string;
    status?: string;
  }>;
} | null) {
  const caregiverAgencies = user?.agencies?.filter(a =>
    a.role === 'caregiver' || a.role === 'caregiver_admin'
  ) || [];

  const pendingAgencies = caregiverAgencies.filter(a =>
    a.status === 'pending_approval'
  );

  const approvedAgencies = caregiverAgencies.filter(a =>
    a.status === 'active' || !a.status // Legacy users without status are considered active
  );

  const rejectedAgencies = caregiverAgencies.filter(a =>
    a.status === 'rejected'
  );

  return {
    isCaregiver: caregiverAgencies.length > 0,
    hasPendingApproval: pendingAgencies.length > 0,
    hasApprovedAccess: approvedAgencies.length > 0,
    pendingAgencies,
    approvedAgencies,
    rejectedAgencies,
    // Helper: Check if specific agency is approved
    isAgencyApproved: (agencyId: string) => {
      const agency = caregiverAgencies.find(a => a.agencyId === agencyId);
      return agency?.status === 'active' || (agency && !agency.status);
    },
    // Helper: Check if specific agency is pending
    isAgencyPending: (agencyId: string) => {
      const agency = caregiverAgencies.find(a => a.agencyId === agencyId);
      return agency?.status === 'pending_approval';
    },
  };
}
