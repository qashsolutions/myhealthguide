'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { Ticket, Loader2, CheckCircle, AlertCircle, Mail } from 'lucide-react';
import {
  parseInviteCode,
  validateInviteCodeFormat,
  getInviteTypeDescription,
  getSignupRouteForInviteType
} from '@/lib/utils/inviteCode';
import {
  AccessibleButton,
  AccessibleInput,
  AccessibleLink,
  AccessiblePageWrapper,
} from '@/components/accessibility';
import { getFirebaseErrorMessage } from '@/lib/utils/errorMessages';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailVerifiedSuccess, setEmailVerifiedSuccess] = useState(false);

  // Invite code state
  const [showInviteCode, setShowInviteCode] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [inviteCodeError, setInviteCodeError] = useState('');
  const [inviteCodeValidating, setInviteCodeValidating] = useState(false);
  const [inviteCodeValid, setInviteCodeValid] = useState(false);
  const [inviteType, setInviteType] = useState<string | null>(null);

  // Check for emailVerified query param (redirect from email verification)
  useEffect(() => {
    if (searchParams.get('emailVerified') === 'true') {
      setEmailVerifiedSuccess(true);
      // Auto-hide the success message after 10 seconds
      const timer = setTimeout(() => setEmailVerifiedSuccess(false), 10000);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

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
      setError(getFirebaseErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AccessiblePageWrapper title="Sign In">
      <Card>
        <CardHeader>
          <CardTitle>Sign In</CardTitle>
          <CardDescription>
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Email verified success banner */}
          {emailVerifiedSuccess && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="font-medium text-green-800 dark:text-green-200">
                    Email verified successfully!
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    You can now sign in to your account.
                  </p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <AccessibleInput
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              error={error && error.includes('email') ? error : undefined}
            />

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-base font-medium text-gray-900 dark:text-gray-100">
                  Password
                </span>
                <AccessibleLink href="/forgot-password" size="sm" variant="subtle">
                  Forgot password?
                </AccessibleLink>
              </div>
              <AccessibleInput
                label="Password"
                hideLabel
                type="password"
                placeholder="8+ chars: A-Z, a-z, 0-9, special"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                showPasswordToggle
              />
            </div>

            {error && !error.includes('email') && (
              <div className="flex items-center gap-2 text-base text-red-600 dark:text-red-400" role="alert">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                {error}
              </div>
            )}

            <AccessibleButton
              type="submit"
              fullWidth
              loading={loading}
              loadingText="Signing in to your account"
            >
              Sign In
            </AccessibleButton>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-sm uppercase">
                <span className="bg-white dark:bg-gray-950 px-2 text-gray-500">
                  Or continue with
                </span>
              </div>
            </div>

            <AccessibleLink href="/phone-login" variant="button" className="w-full justify-center">
              Sign in with Phone Number
            </AccessibleLink>
          </form>

          {/* Invite Code Section */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            {!showInviteCode ? (
              <AccessibleButton
                variant="ghost"
                fullWidth
                onClick={() => setShowInviteCode(true)}
                iconLeft={<Ticket className="w-5 h-5" />}
              >
                Have an invite code?
              </AccessibleButton>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-base font-medium">Enter Invite Code</span>
                  <AccessibleButton
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowInviteCode(false);
                      setInviteCode('');
                      setInviteCodeError('');
                      setInviteCodeValid(false);
                      setInviteType(null);
                    }}
                  >
                    Cancel
                  </AccessibleButton>
                </div>
                <AccessibleInput
                  label="Invite Code"
                  hideLabel
                  type="text"
                  placeholder="e.g., FAM-AB12 or MAG-C-XY34"
                  value={inviteCode}
                  onChange={(e) => handleInviteCodeChange(e.target.value)}
                  error={inviteCodeError}
                  success={inviteCodeValid && inviteType ? `Valid code for: ${inviteType}` : undefined}
                  className="font-mono uppercase"
                />
                <AccessibleButton
                  fullWidth
                  onClick={handleInviteCodeSubmit}
                  disabled={!inviteCode}
                  loading={inviteCodeValidating}
                  loadingText="Validating invite code"
                >
                  Continue with Invite Code
                </AccessibleButton>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-base text-gray-600 dark:text-gray-400">
            Don&apos;t have an account?{' '}
            <AccessibleLink href="/signup">Sign up</AccessibleLink>
          </p>
        </CardFooter>
      </Card>
    </AccessiblePageWrapper>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}
