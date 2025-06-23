'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

function DeleteConfirmationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'confirming' | 'deleting' | 'success' | 'error'>('confirming');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const token = searchParams.get('token');

  const handleDeleteAccount = async () => {
    if (!token) {
      setError('Invalid deletion link');
      setStatus('error');
      return;
    }

    setStatus('deleting');
    setError('');

    try {
      const response = await fetch('/api/account/verify-deletion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (data.success) {
        setStatus('success');
        setMessage('Your account has been successfully deleted.');
        // Redirect to homepage after 5 seconds
        setTimeout(() => router.push('/'), 5000);
      } else {
        setStatus('error');
        setError(data.error || 'Failed to delete account');
      }
    } catch (err) {
      setStatus('error');
      setError('Something went wrong. Please try again.');
    }
  };

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setError('Invalid deletion link. Please request a new deletion link.');
    }
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          {status === 'confirming' && (
            <>
              <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-red-100 mb-6">
                <svg
                  className="h-10 w-10 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                Confirm Account Deletion
              </h1>
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
                <h2 className="text-xl font-semibold text-red-800 mb-3">
                  Warning: This action cannot be undone
                </h2>
                <p className="text-red-700 mb-4">
                  Deleting your account will permanently remove:
                </p>
                <ul className="text-left text-red-700 space-y-2 mb-4">
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    All your medication history
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    All your saved health information
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    Your account and profile data
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    Access to MyHealth Guide services
                  </li>
                </ul>
              </div>
              <div className="space-y-4">
                <Button
                  onClick={handleDeleteAccount}
                  variant="danger"
                  size="large"
                  className="w-full"
                >
                  Yes, Delete My Account
                </Button>
                <Button
                  onClick={() => router.push('/dashboard')}
                  variant="secondary"
                  size="large"
                  className="w-full"
                >
                  Cancel - Keep My Account
                </Button>
              </div>
            </>
          )}

          {status === 'deleting' && (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
              <p className="text-xl text-gray-700">Deleting your account...</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-100 mb-6">
                <svg
                  className="h-10 w-10 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Account Deleted
              </h1>
              <p className="text-gray-600 mb-4">{message}</p>
              <p className="text-sm text-gray-500">
                Redirecting to homepage...
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-red-100 mb-6">
                <svg
                  className="h-10 w-10 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Deletion Failed
              </h1>
              <p className="text-red-600 mb-4">{error}</p>
              <Button
                onClick={() => router.push('/dashboard')}
                variant="primary"
                size="large"
              >
                Back to Dashboard
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DeleteConfirmationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    }>
      <DeleteConfirmationContent />
    </Suspense>
  );
}