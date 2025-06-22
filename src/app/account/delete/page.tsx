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
  const [showModal, setShowModal] = useState(false);
  const [password, setPassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'warning' | 'password' | 'confirm'>('warning');

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      router.push(ROUTES.AUTH);
    }
  }, [user, router]);

  // Handle initial warning acceptance
  const handleAcceptWarning = () => {
    setStep('password');
  };

  // Handle password verification
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password) {
      setError('Please enter your password');
      return;
    }

    try {
      // Re-authenticate user
      const response = await fetch('/api/auth/verify-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAuthToken()}`,
        },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Invalid password');
      }

      // Move to final confirmation
      setStep('confirm');
      setShowModal(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify password');
    }
  };

  // Handle account deletion
  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch('/api/account/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          password, // Include password for re-verification
          reason: 'User requested deletion',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete account');
      }

      // Redirect to goodbye page
      router.push('/goodbye');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete account');
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

            <div className="flex gap-4">
              <Button
                variant="secondary"
                size="large"
                onClick={() => router.push(ROUTES.ACCOUNT)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="large"
                onClick={handleAcceptWarning}
                icon={<AlertTriangle className="h-5 w-5" />}
              >
                I Understand, Continue
              </Button>
            </div>
          </div>
        )}

        {/* Password Verification */}
        {step === 'password' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-4">
                <Shield className="h-6 w-6 text-primary-600" />
                <h2 className="text-xl font-semibold text-gray-900">
                  Verify Your Identity
                </h2>
              </div>
              <p className="text-gray-600">
                For your security, please enter your password to continue with account deletion.
              </p>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter your password"
                  required
                />
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800">{error}</p>
                </div>
              )}

              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="secondary"
                  size="large"
                  onClick={() => setStep('warning')}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  size="large"
                >
                  Verify & Continue
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Final Confirmation Modal */}
        {showModal && step === 'confirm' && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="text-center mb-6">
                <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <Trash2 className="h-8 w-8 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Final Confirmation
                </h3>
                <p className="text-gray-600">
                  This will delete your account and all of your information with us.
                </p>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-800 text-sm text-center font-medium">
                  Type "DELETE" to confirm you want to permanently delete your account
                </p>
              </div>

              <input
                type="text"
                placeholder="Type DELETE"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-6 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                onChange={(e) => {
                  if (e.target.value === 'DELETE') {
                    // Enable delete button
                  }
                }}
              />

              <div className="flex gap-4">
                <Button
                  variant="secondary"
                  size="large"
                  onClick={() => {
                    setShowModal(false);
                    setStep('password');
                  }}
                  disabled={isDeleting}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  size="large"
                  onClick={handleDeleteAccount}
                  loading={isDeleting}
                  className="flex-1"
                >
                  Delete My Account
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