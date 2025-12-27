'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { applyActionCode, verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { CheckCircle, AlertCircle, Loader2, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

function ActionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const mode = searchParams.get('mode');
  const oobCode = searchParams.get('oobCode');
  const continueUrl = searchParams.get('continueUrl');

  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'reset-password'>('loading');
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');

  // Password reset state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (!mode || !oobCode) {
      setStatus('error');
      setError('Invalid action link. Please request a new one.');
      return;
    }

    const processAction = async () => {
      try {
        switch (mode) {
          case 'verifyEmail':
            await applyActionCode(auth, oobCode);
            setStatus('success');
            // Auto redirect after 3 seconds
            setTimeout(() => {
              router.push(continueUrl || '/dashboard');
            }, 3000);
            break;

          case 'resetPassword':
            // Verify the code and get the email
            const verifiedEmail = await verifyPasswordResetCode(auth, oobCode);
            setEmail(verifiedEmail);
            setStatus('reset-password');
            break;

          case 'recoverEmail':
            await applyActionCode(auth, oobCode);
            setStatus('success');
            break;

          default:
            setStatus('error');
            setError('Unknown action type.');
        }
      } catch (err: any) {
        console.error('Action error:', err);
        setStatus('error');

        // Handle specific Firebase errors
        switch (err.code) {
          case 'auth/expired-action-code':
            setError('This link has expired. Please request a new one.');
            break;
          case 'auth/invalid-action-code':
            setError('This link is invalid or has already been used. Please request a new one.');
            break;
          case 'auth/user-disabled':
            setError('This account has been disabled.');
            break;
          case 'auth/user-not-found':
            setError('Account not found.');
            break;
          default:
            setError('Something went wrong. Please try again or request a new link.');
        }
      }
    };

    processAction();
  }, [mode, oobCode, continueUrl, router]);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (!oobCode) return;

    setResetting(true);
    setError('');

    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      setStatus('success');
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err: any) {
      console.error('Password reset error:', err);
      if (err.code === 'auth/expired-action-code') {
        setError('This link has expired. Please request a new password reset.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak. Please use a stronger password.');
      } else {
        setError('Failed to reset password. Please try again.');
      }
    } finally {
      setResetting(false);
    }
  };

  // Loading state
  if (status === 'loading') {
    return (
      <Card className="max-w-md w-full mx-auto">
        <CardContent className="pt-6 text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            {mode === 'verifyEmail' && 'Verifying your email...'}
            {mode === 'resetPassword' && 'Validating reset link...'}
            {mode === 'recoverEmail' && 'Recovering your email...'}
            {!mode && 'Processing...'}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (status === 'error') {
    return (
      <Card className="max-w-md w-full mx-auto">
        <CardContent className="pt-6 text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Action Failed</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <div className="space-y-2">
            <Link href="/login">
              <Button className="w-full">Go to Login</Button>
            </Link>
            <Link href="/forgot-password">
              <Button variant="outline" className="w-full">Request New Link</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Success state
  if (status === 'success') {
    return (
      <Card className="max-w-md w-full mx-auto">
        <CardContent className="pt-6 text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-xl font-semibold mb-2">
            {mode === 'verifyEmail' && 'Email Verified!'}
            {mode === 'resetPassword' && 'Password Reset!'}
            {mode === 'recoverEmail' && 'Email Recovered!'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {mode === 'verifyEmail' && 'Your email has been verified successfully. You can now access all features.'}
            {mode === 'resetPassword' && 'Your password has been reset successfully. You can now sign in with your new password.'}
            {mode === 'recoverEmail' && 'Your email has been recovered successfully.'}
          </p>
          <p className="text-sm text-gray-500">
            Redirecting you automatically...
          </p>
        </CardContent>
      </Card>
    );
  }

  // Password reset form
  if (status === 'reset-password') {
    return (
      <Card className="max-w-md w-full mx-auto">
        <CardHeader className="text-center">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-2">
            <Lock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle>Reset Your Password</CardTitle>
          <CardDescription>
            Enter a new password for {email}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordReset} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-md">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  minLength={8}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
              />
            </div>

            <p className="text-xs text-gray-500">
              Password must be at least 8 characters long.
            </p>

            <Button type="submit" className="w-full" disabled={resetting}>
              {resetting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Resetting...
                </>
              ) : (
                'Reset Password'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  return null;
}

export default function AuthActionPage() {
  return (
    <Suspense
      fallback={
        <Card className="max-w-md w-full mx-auto">
          <CardContent className="pt-6 text-center">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading...</p>
          </CardContent>
        </Card>
      }
    >
      <ActionContent />
    </Suspense>
  );
}
