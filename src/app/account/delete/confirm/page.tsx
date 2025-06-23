'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Trash2, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ROUTES, APP_NAME } from '@/lib/constants';
import { logOut } from '@/lib/firebase/auth';

/**
 * Deletion confirmation page content
 */
function DeleteConfirmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'invalid'>('loading');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    const confirmDeletion = async () => {
      const token = searchParams.get('token');
      const uid = searchParams.get('uid');

      if (!token || !uid) {
        setStatus('invalid');
        setMessage('Invalid deletion link. Please request a new deletion link from your account settings.');
        return;
      }

      try {
        const response = await fetch('/api/account/confirm-deletion', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token, uid }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          setStatus('success');
          setMessage(data.message || 'Your account has been successfully scheduled for deletion.');
          
          // Log out the user after successful deletion
          setTimeout(async () => {
            await logOut();
            router.push(ROUTES.HOME);
          }, 5000);
        } else {
          setStatus('error');
          setMessage(data.error || 'Failed to confirm account deletion. Please try again.');
        }
      } catch (error) {
        console.error('Deletion confirmation error:', error);
        setStatus('error');
        setMessage('An error occurred while processing your request. Please try again.');
      }
    };

    confirmDeletion();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-md mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm p-8">
          {/* Loading State */}
          {status === 'loading' && (
            <div className="text-center">
              <Loader2 className="h-12 w-12 text-primary-600 animate-spin mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Processing Your Request
              </h2>
              <p className="text-gray-600">
                Please wait while we confirm your account deletion...
              </p>
            </div>
          )}

          {/* Success State */}
          {status === 'success' && (
            <div className="text-center">
              <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Account Deletion Confirmed
              </h2>
              <p className="text-lg text-gray-700 mb-6">
                {message}
              </p>
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-blue-800 font-medium mb-2">Remember:</p>
                <ul className="text-left space-y-1 text-blue-700 text-sm">
                  <li>• You have 30 days to recover your account</li>
                  <li>• Simply sign in again to cancel deletion</li>
                  <li>• After 30 days, deletion is permanent</li>
                </ul>
              </div>
              <p className="text-gray-600 text-sm">
                You will be redirected to the homepage in 5 seconds...
              </p>
            </div>
          )}

          {/* Error State */}
          {status === 'error' && (
            <div className="text-center">
              <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
                <XCircle className="h-10 w-10 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Deletion Failed
              </h2>
              <p className="text-lg text-gray-700 mb-6">
                {message}
              </p>
              <div className="flex gap-4">
                <Button
                  variant="secondary"
                  size="large"
                  onClick={() => router.push(ROUTES.HOME)}
                  fullWidth
                >
                  Go to Homepage
                </Button>
                <Button
                  variant="primary"
                  size="large"
                  onClick={() => router.push(ROUTES.ACCOUNT)}
                  fullWidth
                >
                  Go to Account Settings
                </Button>
              </div>
            </div>
          )}

          {/* Invalid Link State */}
          {status === 'invalid' && (
            <div className="text-center">
              <div className="mx-auto w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mb-6">
                <Trash2 className="h-10 w-10 text-yellow-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Invalid Deletion Link
              </h2>
              <p className="text-lg text-gray-700 mb-6">
                {message}
              </p>
              <Button
                variant="primary"
                size="large"
                onClick={() => router.push(ROUTES.ACCOUNT)}
                fullWidth
              >
                Go to Account Settings
              </Button>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            Need help? Contact support at{' '}
            <a href="mailto:support@myguide.health" className="text-primary-600 hover:underline">
              support@myguide.health
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Account deletion confirmation page
 * Handles the deletion link from email
 */
export default function DeleteConfirmPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary-600 animate-spin" />
      </div>
    }>
      <DeleteConfirmContent />
    </Suspense>
  );
}