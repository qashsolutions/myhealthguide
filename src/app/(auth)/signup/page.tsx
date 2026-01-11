'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { AlertCircle, CheckCircle } from 'lucide-react';
import {
  AccessibleButton,
  AccessibleInput,
  AccessibleLink,
  AccessiblePageWrapper,
} from '@/components/accessibility';

export default function SignupPage() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const validatePassword = (password: string): boolean => {
    setPasswordError('');

    // At least 8 characters
    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters long');
      return false;
    }

    // Must contain at least one letter
    if (!/[a-zA-Z]/.test(password)) {
      setPasswordError('Password must contain at least one letter');
      return false;
    }

    // Must contain at least one number
    if (!/[0-9]/.test(password)) {
      setPasswordError('Password must contain at least one number');
      return false;
    }

    // Must contain at least 2 special characters from !@#$%
    const specialChars = password.match(/[!@#$%]/g) || [];
    if (specialChars.length < 2) {
      setPasswordError('Password must contain at least 2 special characters (!@#$%)');
      return false;
    }

    // Only allow letters, numbers, and allowed special characters
    if (!/^[a-zA-Z0-9!@#$%]+$/.test(password)) {
      setPasswordError('Password can only contain letters, numbers, and !@#$%');
      return false;
    }

    return true;
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setFormData({...formData, password: newPassword});

    // Clear error when user starts typing
    if (passwordError) {
      setPasswordError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setPasswordError('');

    // Validate password before submitting
    if (!validatePassword(formData.password)) {
      return;
    }

    setLoading(true);

    try {
      await signUp(formData.email, formData.password, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phoneNumber: ''
      });

      // Redirect to dashboard (verification banner will show there)
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Sign up error:', err);

      // Check for specific Firebase error codes
      if (err.code === 'auth/email-already-in-use') {
        setError('Email already in use. Please Sign In.');
      } else {
        setError(err.message || 'Failed to create account. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Password validation indicators
  const passwordChecks = {
    length: formData.password.length >= 8,
    letter: /[a-zA-Z]/.test(formData.password),
    number: /[0-9]/.test(formData.password),
    special: (formData.password.match(/[!@#$%]/g) || []).length >= 2,
  };

  const PasswordCheck = ({ met, text }: { met: boolean; text: string }) => (
    <li className={`flex items-center gap-2 ${met ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
      {met ? (
        <CheckCircle className="h-4 w-4 flex-shrink-0" />
      ) : (
        <span className="h-4 w-4 rounded-full border border-current flex-shrink-0" />
      )}
      <span>{text}</span>
    </li>
  );

  return (
    <AccessiblePageWrapper title="Create Account">
      <Card>
        <CardHeader>
          <CardTitle>Create Account</CardTitle>
          <CardDescription>
            Start your 45-day free trial - no credit card required
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <AccessibleInput
                label="First Name"
                placeholder="John"
                value={formData.firstName}
                onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                required
              />
              <AccessibleInput
                label="Last Name"
                placeholder="Smith"
                value={formData.lastName}
                onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                required
              />
            </div>

            <AccessibleInput
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              required
            />

            <div className="space-y-2">
              <AccessibleInput
                label="Password"
                type="password"
                placeholder="Enter password"
                value={formData.password}
                onChange={handlePasswordChange}
                required
                showPasswordToggle
                error={passwordError}
              />
              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2 mt-3">
                <p className="font-medium">Password requirements:</p>
                <ul className="space-y-1.5">
                  <PasswordCheck met={passwordChecks.length} text="At least 8 characters" />
                  <PasswordCheck met={passwordChecks.letter} text="At least one letter (a-z, A-Z)" />
                  <PasswordCheck met={passwordChecks.number} text="At least one number (0-9)" />
                  <PasswordCheck met={passwordChecks.special} text="At least 2 special characters (!@#$%)" />
                </ul>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-base text-red-600 dark:text-red-400" role="alert">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                {error}
              </div>
            )}

            <AccessibleButton
              type="submit"
              fullWidth
              loading={loading}
              loadingText="Creating your account"
            >
              Create Account
            </AccessibleButton>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-sm uppercase">
                <span className="bg-white dark:bg-gray-950 px-2 text-gray-500">
                  Or sign up with
                </span>
              </div>
            </div>

            <AccessibleLink href="/phone-signup" variant="button" className="w-full justify-center">
              Sign up with Phone Number
            </AccessibleLink>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-base text-gray-600 dark:text-gray-400">
            Already have an account?{' '}
            <AccessibleLink href="/login">Sign in</AccessibleLink>
          </p>
        </CardFooter>
      </Card>
    </AccessiblePageWrapper>
  );
}
