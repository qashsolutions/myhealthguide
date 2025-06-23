'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Trash2, ArrowLeft, Shield } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES, APP_NAME } from '@/lib/constants';
import { withAuth } from '@/hooks/useAuth';

/**
 * Account deletion page with re-authentication
 * Implements 30-day soft delete with recovery option
 */
function AccountDeletePage() {
  const router = useRouter();
  const { user, getAuthToken } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'warning' | 'email-sent'>('warning');

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      router.push(ROUTES.AUTH);
    }
  }, [user, router]);

  // Handle initial warning acceptance
  const handleAcceptWarning = () => {
    handleRequestDeletion();
  };

  // Handle account deletion request
  const handleRequestDeletion = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch('/api/account/request-deletion-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          reason: 'User requested deletion',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send deletion email');
      }

      // Show success message
      setStep('email-sent');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request deletion');
      setIsDeleting(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Back button */}
        <button
          onClick={() => router.push(ROUTES.ACCOUNT)}
          className="inline-flex items-center gap-2 text-elder-base text-primary-600 hover:text-primary-700 mb-6 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to Account
        </button>

        {/* Page header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-red-100 rounded-full">
              <Trash2 className="h-8 w-8 text-red-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Delete Your Account</h1>
              <p className="text-gray-600">Permanently remove your account and data</p>
            </div>
          </div>
        </div>

        {/* Warning Section */}
        {step === 'warning' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="mb-6">
              <div className="flex items-start gap-3 mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0 mt-1" />
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    Important: What happens when you delete your account
                  </h2>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start gap-2">
                      <span className="text-red-600">•</span>
                      <span>Your account will be deactivated immediately</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-600">•</span>
                      <span>You will have 30 days to recover your account</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-600">•</span>
                      <span>After 30 days, your data will be permanently deleted</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-600">•</span>
                      <span>This includes all medications, health data, and settings</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-600">•</span>
                      <span>Anonymous usage data may be retained for improvements</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-blue-900 mb-2">Recovery Period</h3>
                <p className="text-blue-800">
                  You can recover your account within 30 days by signing in again. 
                  After 30 days, recovery is not possible.
                </p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="font-semibold text-yellow-900 mb-2">Alternative Options</h3>
                <p className="text-yellow-800 mb-2">
                  Before deleting your account, consider:
                </p>
                <ul className="space-y-1 text-yellow-800">
                  <li>• Taking a break - you can always come back</li>
                  <li>• Exporting your data first (available in Account Settings)</li>
                  <li>• Contacting support if you're having issues</li>
                </ul>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            <div className="flex gap-4">
              <Button
                variant="secondary"
                size="large"
                onClick={() => router.push(ROUTES.ACCOUNT)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="large"
                onClick={handleAcceptWarning}
                icon={<AlertTriangle className="h-5 w-5" />}
                loading={isDeleting}
              >
                I Understand, Continue
              </Button>
            </div>
          </div>
        )}

        {/* Email Sent Confirmation */}
        {step === 'email-sent' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-center">
              <div className="mx-auto w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mb-6">
                <AlertTriangle className="h-10 w-10 text-yellow-600" />
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Check Your Email
              </h2>
              
              <p className="text-lg text-gray-700 mb-6">
                We've sent a confirmation email to <strong>{user?.email}</strong>
              </p>
              
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6 mb-6">
                <h3 className="font-semibold text-yellow-900 mb-2">Important:</h3>
                <ul className="text-left space-y-2 text-yellow-800">
                  <li>• The deletion link will expire in 1 hour</li>
                  <li>• Clicking the link will start the 30-day deletion process</li>
                  <li>• You can still recover your account within 30 days</li>
                  <li>• After 30 days, deletion is permanent</li>
                </ul>
              </div>
              
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
                  <p className="text-red-800">{error}</p>
                </div>
              )}
              
              <div className="flex gap-4">
                <Button
                  variant="secondary"
                  size="large"
                  onClick={() => router.push(ROUTES.ACCOUNT)}
                  fullWidth
                >
                  Back to Account
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default withAuth(AccountDeletePage);