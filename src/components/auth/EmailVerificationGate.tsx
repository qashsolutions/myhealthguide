'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, AlertCircle, ShieldAlert } from 'lucide-react';

interface EmailVerificationGateProps {
  children: React.ReactNode;
  featureName?: string;
}

/**
 * Email Verification Gate Component
 *
 * Blocks access to protected features until user verifies their email.
 * Used for:
 * - Adding medications, elders, diet entries
 * - AI/agentic features (clinical notes, health chat, insights)
 * - Exporting data
 * - Any PHI-related features
 *
 * @param children - The protected content to render after verification
 * @param featureName - Optional name of the feature being protected (for display)
 */
export function EmailVerificationGate({ children, featureName }: EmailVerificationGateProps) {
  const { user, firebaseUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // User not authenticated
  if (!user || !firebaseUser) {
    return null; // Will redirect via useEffect
  }

  // Check if email is verified
  const isEmailVerified = firebaseUser.emailVerified || user.emailVerified;

  // Email not verified - show verification required message
  if (!isEmailVerified) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Card className="border-orange-200 dark:border-orange-800">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-full">
                <ShieldAlert className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <CardTitle className="text-orange-900 dark:text-orange-100">
                Email Verification Required
              </CardTitle>
            </div>
            <CardDescription>
              Please verify your email address to access {featureName || 'this feature'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-orange-50 dark:bg-orange-900/10 rounded-lg border border-orange-200 dark:border-orange-800">
              <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-orange-900 dark:text-orange-100 mb-1">
                  Security & HIPAA Compliance
                </p>
                <p className="text-sm text-orange-800 dark:text-orange-200">
                  To protect your health information and comply with HIPAA regulations,
                  we require all users to verify their email address before accessing any
                  medical data or smart features.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <Mail className="w-4 h-4" />
                <span>We sent a verification email to: <strong>{firebaseUser.email}</strong></span>
              </div>

              <div className="text-sm text-gray-600 dark:text-gray-400">
                <p className="mb-2">After verifying your email, you&apos;ll be able to:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Add and manage medications</li>
                  <li>Track loved ones and their health data</li>
                  <li>Use smart health insights</li>
                  <li>Generate clinical notes for doctors</li>
                  <li>Export your health data</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={() => router.push('/verify-email')}
                className="flex-1"
              >
                <Mail className="w-4 h-4 mr-2" />
                Verify Email
              </Button>
              <Button
                onClick={() => router.push('/dashboard')}
                variant="outline"
              >
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Email verified - render protected content
  return <>{children}</>;
}
