'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase/config';
import { sendEmailVerification, onAuthStateChanged, reload } from 'firebase/auth';
import { CheckCircle, AlertCircle, RefreshCw, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

function VerifyEmailContent() {
  const router = useRouter();
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
          // Automatically redirect to dashboard after 2 seconds
          setTimeout(() => {
            router.push('/dashboard');
          }, 2000);
        }
      } else {
        // No user, redirect to login
        router.push('/login');
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
          // Automatically redirect to dashboard
          setTimeout(() => {
            router.push('/dashboard');
          }, 2000);
        } else {
          setError('Email not verified yet. Please check your inbox and click the verification link.');
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
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-2xl font-bold mb-2">
              Your email has been verified
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              You can now sign in with your new account
            </p>
            <p className="text-sm text-gray-500">
              Redirecting to dashboard...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Verify Your Email</CardTitle>
        <CardDescription>
          We sent a verification link to {userEmail}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-center p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <Mail className="w-12 h-12 text-blue-600 dark:text-blue-400" />
        </div>

        <div className="text-center space-y-2">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Please check your email and click the verification link to activate your account.
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            After verifying, click the button below to continue.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-md">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {emailSent && (
          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-md">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
            <p className="text-sm text-green-600 dark:text-green-400">
              Verification email sent! Please check your inbox.
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Button
            onClick={checkVerificationStatus}
            disabled={checkingVerification}
            className="w-full"
          >
            {checkingVerification ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                I've verified my email
              </>
            )}
          </Button>

          <Button
            onClick={resendVerificationEmail}
            variant="outline"
            className="w-full"
            disabled={emailSent}
          >
            {emailSent ? 'Email sent!' : "Didn't receive the email? Resend"}
          </Button>
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Wrong email?{' '}
            <button
              onClick={() => router.push('/login')}
              className="text-blue-600 hover:underline"
            >
              Sign in with a different account
            </button>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
