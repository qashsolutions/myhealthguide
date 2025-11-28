'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AuthService } from '@/lib/firebase/auth';
import Link from 'next/link';
import { Mail, ArrowLeft, Check } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!email.trim()) {
        throw new Error('Please enter your email address');
      }

      await AuthService.sendPasswordResetEmail(email.trim());
      setSuccess(true);
    } catch (err: any) {
      console.error('Password reset error:', err);

      // Map Firebase error codes to user-friendly messages
      const errorCode = err.code || '';
      const errorStr = err.message || '';

      if (errorCode === 'auth/user-not-found' || errorStr.includes('user-not-found')) {
        // For security, don't reveal if email exists
        setSuccess(true);
      } else if (errorCode === 'auth/invalid-email' || errorStr.includes('invalid-email')) {
        setError('Please enter a valid email address');
      } else if (errorCode === 'auth/too-many-requests' || errorStr.includes('too-many-requests')) {
        setError('Too many requests. Please try again later.');
      } else {
        setError(err.message || 'Failed to send reset email. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Check className="w-5 h-5 text-green-600" />
            Check Your Email
          </CardTitle>
          <CardDescription>
            Password reset instructions sent
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800">
            <Mail className="h-4 w-4 text-green-600" />
            <AlertDescription className="ml-2 text-green-800 dark:text-green-200">
              If an account exists for <strong>{email}</strong>, you will receive a password reset email shortly.
            </AlertDescription>
          </Alert>

          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
            <p>Please check your inbox and follow the instructions to reset your password.</p>
            <p>The link will expire in 1 hour.</p>
            <p>If you don't see the email, check your spam folder.</p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center">
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Forgot Password</CardTitle>
        <CardDescription>
          Enter your email address and we'll send you a link to reset your password
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          {error && (
            <Alert className="bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800">
              <AlertDescription className="text-red-800 dark:text-red-200">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Sending...' : 'Send Reset Link'}
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
