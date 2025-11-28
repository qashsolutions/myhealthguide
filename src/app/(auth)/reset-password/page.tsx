'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AuthService } from '@/lib/firebase/auth';
import Link from 'next/link';
import { Check, AlertTriangle, Lock, ArrowLeft } from 'lucide-react';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState('');
  const [invalidCode, setInvalidCode] = useState(false);

  // Get the oobCode from URL (Firebase sends this)
  const oobCode = searchParams.get('oobCode');

  useEffect(() => {
    const verifyCode = async () => {
      if (!oobCode) {
        setInvalidCode(true);
        setVerifying(false);
        return;
      }

      try {
        const userEmail = await AuthService.verifyPasswordResetCode(oobCode);
        setEmail(userEmail);
        setVerifying(false);
      } catch (err: any) {
        console.error('Invalid reset code:', err);
        setInvalidCode(true);
        setVerifying(false);
      }
    };

    verifyCode();
  }, [oobCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }
    if (!/[a-zA-Z]/.test(password)) {
      setError('Password must contain at least one letter');
      return;
    }
    if (!/[0-9]/.test(password)) {
      setError('Password must contain at least one number');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      // Reset the password
      await AuthService.confirmPasswordReset(oobCode!, password);

      // Update password expiration in Firestore
      await AuthService.updatePasswordExpirationByEmail(email);

      setSuccess(true);

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err: any) {
      console.error('Password reset error:', err);

      const errorCode = err.code || '';
      const errorStr = err.message || '';

      if (errorCode === 'auth/expired-action-code' || errorStr.includes('expired')) {
        setError('This password reset link has expired. Please request a new one.');
      } else if (errorCode === 'auth/invalid-action-code' || errorStr.includes('invalid')) {
        setError('This password reset link is invalid. Please request a new one.');
      } else if (errorCode === 'auth/weak-password' || errorStr.includes('weak')) {
        setError('Password is too weak. Please use at least 8 characters with letters and numbers.');
      } else {
        setError(err.message || 'Failed to reset password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Password strength indicators
  const hasMinLength = password.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const passwordsMatch = password && confirmPassword && password === confirmPassword;

  if (verifying) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-gray-600">
            Verifying reset link...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (invalidCode) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            Invalid or Expired Link
          </CardTitle>
          <CardDescription>
            This password reset link is no longer valid
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="ml-2 text-red-800 dark:text-red-200">
              The password reset link has expired or has already been used. Password reset links expire after 1 hour.
            </AlertDescription>
          </Alert>

          <p className="text-sm text-gray-600 dark:text-gray-400">
            Please request a new password reset link.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center gap-4">
          <Link href="/forgot-password">
            <Button>Request New Link</Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Sign In
            </Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  if (success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Check className="w-5 h-5 text-green-600" />
            Password Reset Successful
          </CardTitle>
          <CardDescription>
            Your password has been updated
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800">
            <Check className="h-4 w-4 text-green-600" />
            <AlertDescription className="ml-2 text-green-800 dark:text-green-200">
              Your password has been successfully reset. You will be redirected to sign in shortly.
            </AlertDescription>
          </Alert>

          <p className="text-sm text-gray-600 dark:text-gray-400">
            Your password will expire in 75 days as per HIPAA security requirements.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Link href="/login">
            <Button className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Sign In Now
            </Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="w-5 h-5" />
          Reset Your Password
        </CardTitle>
        <CardDescription>
          Create a new password for <strong>{email}</strong>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter new password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
            {/* Password requirements checklist */}
            <ul className="text-xs space-y-1 mt-2">
              <li className={hasMinLength ? 'text-green-600' : 'text-gray-500'}>
                {hasMinLength ? '✓' : '○'} At least 8 characters
              </li>
              <li className={hasLetter ? 'text-green-600' : 'text-gray-500'}>
                {hasLetter ? '✓' : '○'} At least one letter (a-z, A-Z)
              </li>
              <li className={hasNumber ? 'text-green-600' : 'text-gray-500'}>
                {hasNumber ? '✓' : '○'} At least one number (0-9)
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
            />
            {confirmPassword && (
              <p className={`text-xs ${passwordsMatch ? 'text-green-600' : 'text-red-600'}`}>
                {passwordsMatch ? '✓ Passwords match' : '✗ Passwords do not match'}
              </p>
            )}
          </div>

          {error && (
            <Alert className="bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="ml-2 text-red-800 dark:text-red-200">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={loading || !hasMinLength || !hasLetter || !hasNumber || !passwordsMatch}
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <Link href="/login" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          Back to Sign In
        </Link>
      </CardFooter>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-gray-600">Loading...</div>
        </CardContent>
      </Card>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
