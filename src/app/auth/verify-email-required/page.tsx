'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, RefreshCw, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { APP_NAME } from '@/lib/constants';

/**
 * Email verification required page
 * Shown when users try to access protected routes without verified email
 */

export default function VerifyEmailRequiredPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleResendVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    
    setIsResending(true);
    setError(null);
    
    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setResendSuccess(true);
      } else {
        setError(data.error || 'Failed to resend verification email');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-elder-background p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-elder-lg shadow-elder p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="h-20 w-20 bg-primary-50 rounded-full flex items-center justify-center">
                <Mail className="h-10 w-10 text-primary-600" />
              </div>
            </div>
            <h1 className="text-elder-2xl font-bold text-elder-text mb-2">
              Email Verification Required
            </h1>
            <p className="text-elder-base text-elder-text-secondary">
              Please verify your email to access {APP_NAME} features
            </p>
          </div>

          {!resendSuccess ? (
            <>
              {/* Info Box */}
              <div className="bg-elder-background-alt rounded-elder p-6 mb-6">
                <h2 className="text-elder-lg font-semibold mb-3">
                  Why verify your email?
                </h2>
                <ul className="space-y-2 text-elder-base text-elder-text-secondary">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-6 w-6 text-health-safe flex-shrink-0 mt-0.5" />
                    <span>Ensures your account security</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-6 w-6 text-health-safe flex-shrink-0 mt-0.5" />
                    <span>Allows us to send important health updates</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-6 w-6 text-health-safe flex-shrink-0 mt-0.5" />
                    <span>Enables password recovery if needed</span>
                  </li>
                </ul>
              </div>

              {/* Resend Form */}
              <form onSubmit={handleResendVerification} className="space-y-4">
                <div>
                  <label className="block text-elder-base font-medium mb-2">
                    Didn't receive the email?
                  </label>
                  <p className="text-elder-sm text-elder-text-secondary mb-4">
                    Enter your email address and we'll send a new verification link.
                  </p>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    error={error}
                    disabled={isResending}
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="large"
                  fullWidth
                  loading={isResending}
                  icon={<RefreshCw className="h-5 w-5" />}
                >
                  {isResending ? 'Sending...' : 'Resend Verification Email'}
                </Button>
              </form>

              {/* Additional Options */}
              <div className="mt-6 pt-6 border-t border-elder-border space-y-4">
                <Button
                  variant="secondary"
                  size="medium"
                  fullWidth
                  onClick={() => router.push('/auth?mode=login')}
                >
                  Back to Sign In
                </Button>
                
                <p className="text-elder-sm text-elder-text-secondary text-center">
                  Check your spam folder if you don't see the email in your inbox.
                </p>
              </div>
            </>
          ) : (
            /* Success State */
            <div className="text-center">
              <div className="flex justify-center mb-6">
                <div className="h-20 w-20 bg-health-safe-bg rounded-full flex items-center justify-center">
                  <Mail className="h-10 w-10 text-health-safe" />
                </div>
              </div>
              <h2 className="text-elder-xl font-semibold mb-4">
                Verification Email Sent!
              </h2>
              <p className="text-elder-base text-elder-text-secondary mb-2">
                We've sent a new verification link to
              </p>
              <p className="text-elder-lg font-semibold text-elder-text mb-6">
                {email}
              </p>
              
              <div className="bg-primary-50 rounded-elder p-4 mb-6">
                <p className="text-elder-base text-primary-900">
                  Please check your email and click the verification link to continue.
                </p>
              </div>
              
              <Button
                variant="secondary"
                size="medium"
                fullWidth
                onClick={() => router.push('/auth?mode=login')}
              >
                Back to Sign In
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}