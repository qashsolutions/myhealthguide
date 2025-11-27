'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, X, Mail, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/lib/firebase/config';
import { sendEmailVerification } from 'firebase/auth';

/**
 * Obfuscates an email address for privacy
 * e.g., "john.doe@example.com" -> "j***e@e***.com"
 */
function obfuscateEmail(email: string): string {
  if (!email || !email.includes('@')) return '***@***.***';

  const [localPart, domain] = email.split('@');
  const [domainName, ...domainExt] = domain.split('.');

  // Obfuscate local part: show first and last char
  let obfuscatedLocal = localPart;
  if (localPart.length <= 2) {
    obfuscatedLocal = localPart[0] + '***';
  } else {
    obfuscatedLocal = localPart[0] + '***' + localPart[localPart.length - 1];
  }

  // Obfuscate domain name: show first char only
  let obfuscatedDomain = domainName;
  if (domainName.length <= 2) {
    obfuscatedDomain = domainName[0] + '***';
  } else {
    obfuscatedDomain = domainName[0] + '***';
  }

  // Keep the extension (com, org, etc.)
  const extension = domainExt.join('.');

  return `${obfuscatedLocal}@${obfuscatedDomain}.${extension}`;
}

export function VerificationBanner() {
  const router = useRouter();
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState('');

  useEffect(() => {
    if (user && (!user.emailVerified || !user.phoneVerified)) {
      const dismissedTime = localStorage.getItem('verificationBannerDismissed');
      if (dismissedTime) {
        const dismissedDate = new Date(dismissedTime);
        const hoursSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60);
        if (hoursSinceDismissed < 24) {
          setDismissed(true);
          return;
        }
      }
      setShowBanner(true);
    } else {
      setShowBanner(false);
    }
  }, [user]);

  const handleDismiss = () => {
    localStorage.setItem('verificationBannerDismissed', new Date().toISOString());
    setDismissed(true);
    setShowBanner(false);
  };

  const handleVerify = () => {
    router.push('/verify');
  };

  const handleResendEmail = async () => {
    if (!auth.currentUser || resending) return;

    setResending(true);
    setResendError('');
    setResendSuccess(false);

    try {
      await sendEmailVerification(auth.currentUser);
      setResendSuccess(true);
      // Reset success message after 5 seconds
      setTimeout(() => setResendSuccess(false), 5000);
    } catch (error: any) {
      if (error.code === 'auth/too-many-requests') {
        setResendError('Too many requests. Please wait a few minutes.');
      } else {
        setResendError('Failed to send. Try again later.');
      }
      // Clear error after 5 seconds
      setTimeout(() => setResendError(''), 5000);
    } finally {
      setResending(false);
    }
  };

  if (!showBanner || dismissed || !user) {
    return null;
  }

  const needsEmail = !user.emailVerified;
  const needsPhone = !user.phoneVerified;
  const hasEmail = user.email && user.email.trim() !== '';

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800">
      <div className="px-4 sm:px-6">
        <div className="flex items-center justify-between py-3 gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                {needsEmail && needsPhone && 'Please verify your email and phone number'}
                {needsEmail && !needsPhone && 'Please verify your email address'}
                {!needsEmail && needsPhone && 'Please verify your phone number'}
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                {needsEmail && hasEmail && (
                  <>
                    Verification email sent to <span className="font-medium">{obfuscateEmail(user.email)}</span>
                    {resendSuccess && <span className="text-green-600 dark:text-green-400 ml-2">✓ Email sent!</span>}
                    {resendError && <span className="text-red-600 dark:text-red-400 ml-2">{resendError}</span>}
                  </>
                )}
                {needsEmail && !hasEmail && 'Add an email address for account recovery and legal notices'}
                {needsPhone && !needsEmail && 'Phone verification required for emergency alerts and prescription reminders'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {needsEmail && hasEmail && (
              <Button
                onClick={handleResendEmail}
                size="sm"
                variant="outline"
                disabled={resending || resendSuccess}
                className="border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-800"
              >
                {resending ? (
                  <>
                    <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                    Sending...
                  </>
                ) : resendSuccess ? (
                  'Sent!'
                ) : (
                  <>
                    <Mail className="w-3 h-3 mr-1" />
                    Resend
                  </>
                )}
              </Button>
            )}
            <Button
              onClick={handleVerify}
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600"
            >
              Verify now
            </Button>
            <button
              onClick={handleDismiss}
              className="p-1 rounded-md hover:bg-amber-100 dark:hover:bg-amber-800 transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
