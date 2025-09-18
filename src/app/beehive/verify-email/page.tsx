'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { sendEmailVerification, onAuthStateChanged, reload } from 'firebase/auth';
import { Mail, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [emailSent, setEmailSent] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [checkingVerification, setCheckingVerification] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserEmail(user.email || '');

        // Check if already verified
        if (user.emailVerified) {
          setIsVerified(true);
          // Redirect to profile after 2 seconds
          setTimeout(() => {
            router.push('/beehive/profile');
          }, 2000);
        }
      } else {
        // No user, redirect to auth
        router.push('/beehive/auth');
      }
    });

    return () => unsubscribe();
  }, [router]);

  const resendVerificationEmail = async () => {
    try {
      setError('');
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
        setEmailSent(true);
        setTimeout(() => setEmailSent(false), 5000);
      }
    } catch (err: any) {
      if (err.code === 'auth/too-many-requests') {
        setError('Too many requests. Please wait a few minutes before trying again.');
      } else {
        setError('Failed to send email. Please try again.');
      }
    }
  };

  const checkVerificationStatus = async () => {
    try {
      setCheckingVerification(true);
      setError('');

      if (auth.currentUser) {
        // Reload user to get latest verification status
        await reload(auth.currentUser);

        if (auth.currentUser.emailVerified) {
          setIsVerified(true);
          setTimeout(() => {
            router.push('/beehive/profile');
          }, 2000);
        } else {
          setError('Email not verified yet. Please check your inbox.');
        }
      }
    } catch (err) {
      setError('Failed to check verification status.');
    } finally {
      setCheckingVerification(false);
    }
  };

  if (isVerified) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-elder shadow-lg p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Email Verified!
          </h1>
          <p className="text-gray-600 mb-6">
            Your email has been verified successfully. Redirecting to your profile...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-elder shadow-lg p-8">
        <div className="text-center">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-10 h-10 text-blue-600" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Verify Your Email
          </h1>

          <p className="text-gray-600 mb-6">
            We've sent a verification email to:
            <br />
            <strong className="text-gray-900">{userEmail}</strong>
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-elder p-4 mb-6">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-3" />
              <div className="text-left text-sm text-blue-800">
                <p className="font-medium mb-1">Next Steps:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Check your email inbox</li>
                  <li>Click the verification link</li>
                  <li>Return here to continue</li>
                </ol>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-elder">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {emailSent && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-elder">
              <p className="text-sm text-green-700">
                Verification email sent! Check your inbox.
              </p>
            </div>
          )}

          <div className="space-y-3">
            <Button
              onClick={checkVerificationStatus}
              disabled={checkingVerification}
              className="w-full"
            >
              {checkingVerification ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                "I've Verified My Email"
              )}
            </Button>

            <button
              onClick={resendVerificationEmail}
              className="text-sm text-blue-600 hover:underline"
            >
              Didn't receive the email? Click to resend
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Check your spam folder if you don't see the email.
              <br />
              The verification link expires in 24 hours.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}