'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle, XCircle, Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { APP_NAME } from '@/lib/constants';

/**
 * Email verification landing page
 * Users land here after clicking the verification link in their email
 */

type VerificationStatus = 'verifying' | 'success' | 'error' | 'invalid';

interface VerificationError {
  message: string;
  code?: string;
}

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<VerificationStatus>('verifying');
  const [error, setError] = useState<VerificationError | null>(null);
  const [userData, setUserData] = useState<{ email?: string; name?: string } | null>(null);

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get('token');
      
      if (!token) {
        setStatus('invalid');
        setError({ message: 'Invalid verification link' });
        return;
      }
      
      try {
        const response = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
          setStatus('success');
          setUserData(data.data || {});
          
          // Redirect to login after 3 seconds
          setTimeout(() => {
            router.push('/auth?mode=login&verified=true');
          }, 3000);
        } else {
          setStatus('error');
          setError({
            message: data.error || 'Verification failed',
            code: data.code,
          });
        }
      } catch (err) {
        setStatus('error');
        setError({
          message: 'Something went wrong. Please try again.',
        });
      }
    };
    
    verifyEmail();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-elder-background p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-elder-lg shadow-elder p-8">
          {/* Logo/Header */}
          <div className="text-center mb-8">
            <h1 className="text-elder-2xl font-bold text-elder-text">
              {APP_NAME}
            </h1>
            <p className="text-elder-base text-elder-text-secondary mt-2">
              Email Verification
            </p>
          </div>

          {/* Status Content */}
          {status === 'verifying' && (
            <div className="text-center">
              <div className="flex justify-center mb-6">
                <Loader2 className="h-16 w-16 text-primary-600 animate-spin" />
              </div>
              <h2 className="text-elder-xl font-semibold mb-2">
                Verifying your email...
              </h2>
              <p className="text-elder-base text-elder-text-secondary">
                Please wait while we verify your email address.
              </p>
            </div>
          )}
          
          {status === 'success' && (
            <div className="text-center">
              <div className="flex justify-center mb-6">
                <div className="h-20 w-20 bg-health-safe-bg rounded-full flex items-center justify-center">
                  <CheckCircle className="h-12 w-12 text-health-safe" />
                </div>
              </div>
              <h2 className="text-elder-xl font-semibold mb-2 text-health-safe">
                Email Verified Successfully!
              </h2>
              <p className="text-elder-base text-elder-text-secondary mb-2">
                {userData?.name && `Welcome, ${userData.name}! `}
                Your email has been verified.
              </p>
              <p className="text-elder-sm text-elder-text-secondary">
                Redirecting to login...
              </p>
            </div>
          )}
          
          {status === 'error' && (
            <div className="text-center">
              <div className="flex justify-center mb-6">
                <div className="h-20 w-20 bg-health-danger-bg rounded-full flex items-center justify-center">
                  <XCircle className="h-12 w-12 text-health-danger" />
                </div>
              </div>
              <h2 className="text-elder-xl font-semibold mb-2 text-health-danger">
                Verification Failed
              </h2>
              <p className="text-elder-base text-elder-text-secondary mb-6">
                {error?.message}
              </p>
              
              {/* Action buttons based on error type */}
              {error?.code === 'auth/token-expired' && (
                <div className="space-y-4">
                  <p className="text-elder-sm text-elder-text-secondary">
                    Your verification link has expired. Request a new one to continue.
                  </p>
                  <Button
                    variant="primary"
                    size="large"
                    fullWidth
                    onClick={() => router.push('/auth?mode=resend-verification')}
                  >
                    Request New Link
                  </Button>
                </div>
              )}
              
              {error?.code === 'auth/token-already-used' && (
                <div className="space-y-4">
                  <p className="text-elder-sm text-elder-text-secondary">
                    Your email has already been verified. You can sign in to your account.
                  </p>
                  <Button
                    variant="primary"
                    size="large"
                    fullWidth
                    onClick={() => router.push('/auth?mode=login')}
                  >
                    Sign In
                  </Button>
                </div>
              )}
              
              {!['auth/token-expired', 'auth/token-already-used'].includes(error?.code || '') && (
                <Button
                  variant="primary"
                  size="large"
                  fullWidth
                  onClick={() => router.push('/auth')}
                >
                  Back to Sign Up
                </Button>
              )}
            </div>
          )}
          
          {status === 'invalid' && (
            <div className="text-center">
              <div className="flex justify-center mb-6">
                <div className="h-20 w-20 bg-elder-background-alt rounded-full flex items-center justify-center">
                  <Mail className="h-12 w-12 text-elder-text-secondary" />
                </div>
              </div>
              <h2 className="text-elder-xl font-semibold mb-2">
                Invalid Verification Link
              </h2>
              <p className="text-elder-base text-elder-text-secondary mb-6">
                This verification link appears to be invalid or incomplete.
              </p>
              <Button
                variant="primary"
                size="large"
                fullWidth
                onClick={() => router.push('/auth')}
              >
                Back to Sign Up
              </Button>
            </div>
          )}
          
          {/* Help text */}
          <div className="mt-8 pt-6 border-t border-elder-border">
            <p className="text-elder-sm text-elder-text-secondary text-center">
              Having trouble? Contact our support team for assistance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}