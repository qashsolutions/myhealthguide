'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { Heart } from 'lucide-react';

export default function FamilyLoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Sign in error:', err);

      let errorMessage = 'Failed to sign in. Please try again.';

      const errorCode = err.code || '';
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
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400">
          <Heart className="w-5 h-5" />
          <span className="font-semibold">Family Caregiver Portal</span>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Welcome back! Sign in to continue caring for your loved ones.
        </p>
      </div>

      <Card className="border-blue-200 dark:border-blue-800">
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
                placeholder="8+ alphanumeric characters"
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
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Don&apos;t have an account?{' '}
            <Link href="/family/signup" className="text-blue-600 hover:underline">
              Sign up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
