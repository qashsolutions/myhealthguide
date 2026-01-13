'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AuthService } from '@/lib/firebase/auth';
import { useAuth } from '@/contexts/AuthContext';
import { Lock, AlertTriangle, Shield, LogOut } from 'lucide-react';

function ChangePasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, signOut } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const reason = searchParams.get('reason');
  const isExpired = reason === 'expired';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }
    if (!/[A-Z]/.test(password)) {
      setError('Password must contain at least one uppercase letter (A-Z)');
      return;
    }
    if (!/[a-z]/.test(password)) {
      setError('Password must contain at least one lowercase letter (a-z)');
      return;
    }
    if (!/[0-9]/.test(password)) {
      setError('Password must contain at least one number (0-9)');
      return;
    }
    // Must contain at least 1 special character
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      setError('Password must contain at least one special character');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      await AuthService.changePassword(password);
      // Redirect to dashboard after successful password change
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Password change error:', err);

      const errorCode = err.code || '';
      const errorStr = err.message || '';

      if (errorCode === 'auth/requires-recent-login' || errorStr.includes('requires-recent-login')) {
        setError('For security, please sign out and sign back in before changing your password.');
      } else if (errorCode === 'auth/weak-password' || errorStr.includes('weak')) {
        setError('Password is too weak. Please use at least 8 characters with letters and numbers.');
      } else {
        setError(err.message || 'Failed to change password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  // Password strength indicators
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  const passwordsMatch = password && confirmPassword && password === confirmPassword;

  // Calculate days until password expires for non-expired users
  const daysUntilExpiry = user ? AuthService.getDaysUntilPasswordExpires(user) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isExpired ? (
            <>
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Password Expired
            </>
          ) : (
            <>
              <Lock className="w-5 h-5" />
              Change Password
            </>
          )}
        </CardTitle>
        <CardDescription>
          {isExpired
            ? 'Your password has expired and must be changed to continue'
            : 'Update your password for security'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isExpired && (
          <Alert className="mb-4 bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
            <Shield className="h-4 w-4 text-amber-600" />
            <AlertDescription className="ml-2 text-amber-800 dark:text-amber-200">
              <strong>HIPAA Security Requirement:</strong> Passwords must be changed every 75 days to maintain account security.
            </AlertDescription>
          </Alert>
        )}

        {daysUntilExpiry !== null && daysUntilExpiry <= 14 && !isExpired && (
          <Alert className="mb-4 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
            <AlertDescription className="text-blue-800 dark:text-blue-200">
              Your password will expire in {daysUntilExpiry} day{daysUntilExpiry !== 1 ? 's' : ''}.
            </AlertDescription>
          </Alert>
        )}

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
              <li className={hasUppercase ? 'text-green-600' : 'text-gray-500'}>
                {hasUppercase ? '✓' : '○'} At least one uppercase letter (A-Z)
              </li>
              <li className={hasLowercase ? 'text-green-600' : 'text-gray-500'}>
                {hasLowercase ? '✓' : '○'} At least one lowercase letter (a-z)
              </li>
              <li className={hasNumber ? 'text-green-600' : 'text-gray-500'}>
                {hasNumber ? '✓' : '○'} At least one number (0-9)
              </li>
              <li className={hasSpecialChar ? 'text-green-600' : 'text-gray-500'}>
                {hasSpecialChar ? '✓' : '○'} At least one special character
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
            disabled={loading || !hasMinLength || !hasUppercase || !hasLowercase || !hasNumber || !hasSpecialChar || !passwordsMatch}
          >
            {loading ? 'Changing Password...' : 'Change Password'}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <Button variant="ghost" onClick={handleSignOut} className="text-sm text-gray-600 gap-2">
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function ChangePasswordPage() {
  return (
    <Suspense fallback={
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-gray-600">Loading...</div>
        </CardContent>
      </Card>
    }>
      <ChangePasswordContent />
    </Suspense>
  );
}
