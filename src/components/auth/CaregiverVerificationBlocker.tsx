'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Phone, Mail, CheckCircle2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

interface CaregiverVerificationBlockerProps {
  emailVerified: boolean;
  phoneVerified: boolean;
  featureName?: string;
}

export function CaregiverVerificationBlocker({
  emailVerified,
  phoneVerified,
  featureName = 'loved one care features'
}: CaregiverVerificationBlockerProps) {
  const isFullyVerified = emailVerified && phoneVerified;

  if (isFullyVerified) {
    return null;
  }

  return (
    <Card className="border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          <CardTitle className="text-lg text-amber-800 dark:text-amber-200">
            Verification Required
          </CardTitle>
        </div>
        <CardDescription className="text-amber-700 dark:text-amber-300">
          Complete verification to access {featureName}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-amber-700 dark:text-amber-300">
          For security reasons, you must verify both your phone number and email address
          before accessing elder health information.
        </p>

        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              phoneVerified
                ? 'bg-green-100 dark:bg-green-900/30'
                : 'bg-gray-100 dark:bg-gray-800'
            }`}>
              {phoneVerified ? (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              ) : (
                <Phone className="w-4 h-4 text-gray-400" />
              )}
            </div>
            <div className="flex-1">
              <p className={`text-sm font-medium ${
                phoneVerified
                  ? 'text-green-700 dark:text-green-400'
                  : 'text-gray-600 dark:text-gray-400'
              }`}>
                Phone Number
              </p>
              <p className="text-xs text-gray-500">
                {phoneVerified ? 'Verified' : 'Not verified'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              emailVerified
                ? 'bg-green-100 dark:bg-green-900/30'
                : 'bg-gray-100 dark:bg-gray-800'
            }`}>
              {emailVerified ? (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              ) : (
                <Mail className="w-4 h-4 text-gray-400" />
              )}
            </div>
            <div className="flex-1">
              <p className={`text-sm font-medium ${
                emailVerified
                  ? 'text-green-700 dark:text-green-400'
                  : 'text-gray-600 dark:text-gray-400'
              }`}>
                Email Address
              </p>
              <p className="text-xs text-gray-500">
                {emailVerified ? 'Verified' : 'Not verified'}
              </p>
            </div>
          </div>
        </div>

        <Link href="/dashboard/settings?tab=profile">
          <Button className="w-full">
            <Shield className="w-4 h-4 mr-2" />
            Complete Verification
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

/**
 * Hook to check if caregiver is fully verified
 * Can be used in pages to conditionally render content
 */
export function useCaregiverVerificationStatus(user: {
  emailVerified?: boolean;
  phoneVerified?: boolean;
  agencies?: Array<{ role: string }>;
} | null) {
  const isCaregiver = user?.agencies?.some(a =>
    a.role === 'caregiver' || a.role === 'caregiver_admin'
  ) || false;

  const emailVerified = user?.emailVerified || false;
  const phoneVerified = user?.phoneVerified || false;
  const isFullyVerified = emailVerified && phoneVerified;

  return {
    isCaregiver,
    emailVerified,
    phoneVerified,
    isFullyVerified,
    needsVerification: isCaregiver && !isFullyVerified
  };
}
