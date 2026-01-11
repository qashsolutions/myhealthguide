'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { Ticket, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import {
  parseInviteCode,
  validateInviteCodeFormat,
  getInviteTypeDescription,
  getSignupRouteForInviteType
} from '@/lib/utils/inviteCode';

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Invite code state
  const [showInviteCode, setShowInviteCode] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [inviteCodeError, setInviteCodeError] = useState('');
  const [inviteCodeValidating, setInviteCodeValidating] = useState(false);
  const [inviteCodeValid, setInviteCodeValid] = useState(false);
  const [inviteType, setInviteType] = useState<string | null>(null);

  const handleInviteCodeChange = (value: string) => {
    setInviteCode(value.toUpperCase());
    setInviteCodeError('');
    setInviteCodeValid(false);
    setInviteType(null);

    // Auto-validate when code looks complete
    if (validateInviteCodeFormat(value)) {
      const parsed = parseInviteCode(value);
      if (parsed) {
        setInviteCodeValid(true);
        setInviteType(getInviteTypeDescription(parsed.type));
      }
    }
  };

  const handleInviteCodeSubmit = async () => {
    if (!inviteCode) {
      setInviteCodeError('Please enter an invite code');
      return;
    }

    setInviteCodeValidating(true);
    setInviteCodeError('');

    try {
      const parsed = parseInviteCode(inviteCode);

      if (!parsed) {
        setInviteCodeError('Invalid invite code format. Please check and try again.');
        return;
      }

      // Get the signup route and redirect with code
      const signupRoute = getSignupRouteForInviteType(parsed.type);
      router.push(`${signupRoute}?code=${encodeURIComponent(parsed.fullCode)}`);
    } catch (err) {
      setInviteCodeError('Failed to validate invite code. Please try again.');
    } finally {
      setInviteCodeValidating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Sign in error:', err);

      // Map Firebase error codes to user-friendly messages
      let errorMessage = 'Failed to sign in. Please try again.';

      // Check error code (Firebase errors have this)
      const errorCode = err.code || '';
      // Also check if error message contains the code (fallback detection)
      const errorStr = err.message || '';

      if (errorCode === 'auth/invalid-credential' ||
          errorCode === 'auth/user-not-found' ||
          errorCode === 'auth/wrong-password' ||
          errorStr.includes('invalid-credential') ||
          errorStr.includes('user-not-found') ||
          errorStr.includes('wrong-password')) {
        errorMessage = 'Invalid email or password. Please check your credentials or create an account.';
      } else if (errorCode === 'auth/invalid-email' || errorStr.includes('invalid-email')) {
        errorMessage = 'Please enter a valid email address.';
      } else if (errorCode === 'auth/user-disabled' || errorStr.includes('user-disabled')) {
        errorMessage = 'This account has been disabled. Please contact support.';
      } else if (errorCode === 'auth/too-many-requests' || errorStr.includes('too-many-requests')) {
        errorMessage = 'Too many failed attempts. Please try again later or reset your password.';
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign In</CardTitle>
        <CardDescription>
          Enter your credentials to access your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="password">Password</Label>
              <Link href="/forgot-password" className="text-sm text-blue-600 hover:underline">
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="Minimum 8 characters: a-z, A-Z, 0-9, !@#$%"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-gray-950 px-2 text-gray-500">
                Or continue with
              </span>
            </div>
          </div>

          <Link href="/phone-login" className="block">
            <Button type="button" variant="outline" className="w-full">
              Sign in with Phone Number
            </Button>
          </Link>
        </form>

        {/* Invite Code Section */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          {!showInviteCode ? (
            <button
              type="button"
              onClick={() => setShowInviteCode(true)}
              className="w-full flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <Ticket className="w-4 h-4" />
              Have an invite code?
            </button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="inviteCode" className="text-sm font-medium">
                  Enter Invite Code
                </Label>
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteCode(false);
                    setInviteCode('');
                    setInviteCodeError('');
                    setInviteCodeValid(false);
                    setInviteType(null);
                  }}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>
              <div className="relative">
                <Input
                  id="inviteCode"
                  type="text"
                  placeholder="e.g., FAM-AB12 or MAG-C-XY34"
                  value={inviteCode}
                  onChange={(e) => handleInviteCodeChange(e.target.value)}
                  className={`font-mono uppercase ${
                    inviteCodeValid
                      ? 'border-green-500 focus:ring-green-500'
                      : inviteCodeError
                        ? 'border-red-500 focus:ring-red-500'
                        : ''
                  }`}
                />
                {inviteCodeValid && (
                  <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-600" />
                )}
              </div>
              {inviteCodeValid && inviteType && (
                <p className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  Valid code for: {inviteType}
                </p>
              )}
              {inviteCodeError && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {inviteCodeError}
                </p>
              )}
              <Button
                type="button"
                onClick={handleInviteCodeSubmit}
                disabled={inviteCodeValidating || !inviteCode}
                className="w-full"
              >
                {inviteCodeValidating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Validating...
                  </>
                ) : (
                  'Continue with Invite Code'
                )}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-blue-600 hover:underline">
            Sign up
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
