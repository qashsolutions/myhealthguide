'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

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

    // Exactly 8 or more characters
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

    // Only alphanumeric characters allowed
    if (!/^[a-zA-Z0-9]+$/.test(password)) {
      setPasswordError('Password must contain only letters and numbers');
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Account</CardTitle>
        <CardDescription>
          Start your 14-day free trial - no credit card required
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                placeholder="John"
                value={formData.firstName}
                onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                placeholder="Smith"
                value={formData.lastName}
                onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="8+ alphanumeric characters"
              value={formData.password}
              onChange={handlePasswordChange}
              required
              className={passwordError ? 'border-red-500 focus-visible:ring-red-500' : ''}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Minimum 8 characters using only letters and numbers
            </p>
            {passwordError && (
              <div className="text-sm text-red-600 dark:text-red-400">
                {passwordError}
              </div>
            )}
          </div>

          {error && (
            <div className="text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </Button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-gray-950 px-2 text-gray-500">
                Or sign up with
              </span>
            </div>
          </div>

          <Link href="/phone-signup" className="block">
            <Button type="button" variant="outline" className="w-full">
              Sign up with Phone Number
            </Button>
          </Link>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-600 hover:underline">
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
