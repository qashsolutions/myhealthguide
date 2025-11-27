'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { applyActionCode, verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';
import { auth, db } from '@/lib/firebase/config';
import { doc, updateDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

type ActionMode = 'verifyEmail' | 'resetPassword' | 'recoverEmail' | null;

export default function AuthActionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mode, setMode] = useState<ActionMode>(null);
  const [actionCode, setActionCode] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'input'>('loading');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');

  // Password reset state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    const modeParam = searchParams.get('mode') as ActionMode;
    const oobCode = searchParams.get('oobCode');

    setMode(modeParam);
    setActionCode(oobCode);

    if (!oobCode) {
      setStatus('error');
      setMessage('Invalid or missing action code.');
      return;
    }

    if (modeParam === 'verifyEmail') {
      handleVerifyEmail(oobCode);
    } else if (modeParam === 'resetPassword') {
      handleVerifyResetCode(oobCode);
    } else if (modeParam === 'recoverEmail') {
      handleRecoverEmail(oobCode);
    } else {
      setStatus('error');
      setMessage('Unknown action type.');
    }
  }, [searchParams]);

  const handleVerifyEmail = async (code: string) => {
    try {
      await applyActionCode(auth, code);

      // Update Firestore user document if user is signed in
      if (auth.currentUser) {
        await updateDoc(doc(db, 'users', auth.currentUser.uid), {
          emailVerified: true,
          emailVerifiedAt: new Date()
        });
      }

      setStatus('success');
      setMessage('Your email has been verified successfully!');

      // Auto-redirect after 3 seconds
      setTimeout(() => {
        if (auth.currentUser) {
          router.push('/dashboard/settings');
        } else {
          router.push('/login');
        }
      }, 3000);
    } catch (error: any) {
      console.error('Email verification error:', error);
      setStatus('error');

      if (error.code === 'auth/expired-action-code') {
        setMessage('This verification link has expired. Please request a new one.');
      } else if (error.code === 'auth/invalid-action-code') {
        setMessage('This verification link is invalid or has already been used.');
      } else {
        setMessage('Failed to verify email. Please try again.');
      }
    }
  };

  const handleVerifyResetCode = async (code: string) => {
    try {
      const userEmail = await verifyPasswordResetCode(auth, code);
      setEmail(userEmail);
      setStatus('input');
    } catch (error: any) {
      console.error('Reset code verification error:', error);
      setStatus('error');

      if (error.code === 'auth/expired-action-code') {
        setMessage('This password reset link has expired. Please request a new one.');
      } else if (error.code === 'auth/invalid-action-code') {
        setMessage('This password reset link is invalid or has already been used.');
      } else {
        setMessage('Failed to verify reset link. Please try again.');
      }
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    // Validate passwords
    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters long');
      return;
    }
    if (!/[a-zA-Z]/.test(newPassword)) {
      setPasswordError('Password must contain at least one letter');
      return;
    }
    if (!/[0-9]/.test(newPassword)) {
      setPasswordError('Password must contain at least one number');
      return;
    }
    if (!/^[a-zA-Z0-9]+$/.test(newPassword)) {
      setPasswordError('Password must contain only letters and numbers');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    setResetting(true);

    try {
      await confirmPasswordReset(auth, actionCode!, newPassword);
      setStatus('success');
      setMessage('Your password has been reset successfully!');

      // Auto-redirect after 3 seconds
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (error: any) {
      console.error('Password reset error:', error);
      setPasswordError(error.message || 'Failed to reset password. Please try again.');
    } finally {
      setResetting(false);
    }
  };

  const handleRecoverEmail = async (code: string) => {
    try {
      await applyActionCode(auth, code);
      setStatus('success');
      setMessage('Your email has been recovered successfully!');

      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (error: any) {
      console.error('Email recovery error:', error);
      setStatus('error');
      setMessage('Failed to recover email. Please try again.');
    }
  };

  // Render password reset form
  if (mode === 'resetPassword' && status === 'input') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Reset Password</CardTitle>
            <CardDescription>
              Enter a new password for {email}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <p className="text-xs text-gray-500">
                  Minimum 8 characters, letters and numbers only
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              {passwordError && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {passwordError}
                </p>
              )}

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
      </div>
    );
  }

  // Render status screens (loading, success, error)
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="w-12 h-12 mx-auto text-blue-600 animate-spin mb-4" />
              <CardTitle>Processing...</CardTitle>
              <CardDescription>Please wait while we verify your request.</CardDescription>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="w-12 h-12 mx-auto text-green-600 mb-4" />
              <CardTitle className="text-green-600">Success!</CardTitle>
              <CardDescription>{message}</CardDescription>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="w-12 h-12 mx-auto text-red-600 mb-4" />
              <CardTitle className="text-red-600">Error</CardTitle>
              <CardDescription>{message}</CardDescription>
            </>
          )}
        </CardHeader>

        {(status === 'success' || status === 'error') && (
          <CardContent className="text-center space-y-4">
            {status === 'success' && (
              <p className="text-sm text-gray-500">
                Redirecting you automatically...
              </p>
            )}

            <div className="flex flex-col gap-2">
              {auth.currentUser ? (
                <Link href="/dashboard">
                  <Button variant="outline" className="w-full">
                    Go to Dashboard
                  </Button>
                </Link>
              ) : (
                <Link href="/login">
                  <Button variant="outline" className="w-full">
                    Go to Sign In
                  </Button>
                </Link>
              )}

              {status === 'error' && mode === 'verifyEmail' && (
                <Link href="/verify">
                  <Button className="w-full">
                    Request New Verification Email
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
