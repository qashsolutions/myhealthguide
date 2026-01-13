'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { Building2, CheckCircle } from 'lucide-react';

export default function AgencySignupPage() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    agencyName: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const validatePassword = (password: string): boolean => {
    setPasswordError('');

    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters long');
      return false;
    }

    if (!/[A-Z]/.test(password)) {
      setPasswordError('Password must contain at least one uppercase letter (A-Z)');
      return false;
    }

    if (!/[a-z]/.test(password)) {
      setPasswordError('Password must contain at least one lowercase letter (a-z)');
      return false;
    }

    if (!/[0-9]/.test(password)) {
      setPasswordError('Password must contain at least one number (0-9)');
      return false;
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      setPasswordError('Password must contain at least one special character');
      return false;
    }

    return true;
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setFormData({...formData, password: newPassword});

    if (passwordError) {
      setPasswordError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setPasswordError('');

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

      router.push('/dashboard');
    } catch (err: any) {
      console.error('Sign up error:', err);

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
    <div className="space-y-6">
      {/* Benefits reminder */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 text-purple-600 dark:text-purple-400">
          <Building2 className="w-5 h-5" />
          <span className="font-semibold">Multi-Agency Plan</span>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Professional tools for care agencies at scale
        </p>
      </div>

      <Card className="border-purple-200 dark:border-purple-800">
        <CardHeader>
          <CardTitle>Create Agency Account</CardTitle>
          <CardDescription>
            Start your 30-day free trial - no credit card required
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="agencyName">Agency Name</Label>
              <Input
                id="agencyName"
                placeholder="Your Care Agency"
                value={formData.agencyName}
                onChange={(e) => setFormData({...formData, agencyName: e.target.value})}
                required
              />
            </div>

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
              <Label htmlFor="email">Work Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@agency.com"
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
                placeholder="Enter password"
                value={formData.password}
                onChange={handlePasswordChange}
                required
                className={passwordError ? 'border-red-500 focus-visible:ring-red-500' : ''}
              />
              <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                <p>Password requirements:</p>
                <ul className="list-disc list-inside pl-1 space-y-0.5">
                  <li className={formData.password.length >= 8 ? 'text-green-600 dark:text-green-400' : ''}>
                    At least 8 characters
                  </li>
                  <li className={/[A-Z]/.test(formData.password) ? 'text-green-600 dark:text-green-400' : ''}>
                    At least one uppercase letter (A-Z)
                  </li>
                  <li className={/[a-z]/.test(formData.password) ? 'text-green-600 dark:text-green-400' : ''}>
                    At least one lowercase letter (a-z)
                  </li>
                  <li className={/[0-9]/.test(formData.password) ? 'text-green-600 dark:text-green-400' : ''}>
                    At least one number (0-9)
                  </li>
                  <li className={/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password) ? 'text-green-600 dark:text-green-400' : ''}>
                    At least one special character
                  </li>
                </ul>
              </div>
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

            <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700" disabled={loading}>
              {loading ? 'Creating account...' : 'Start Free Trial'}
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
            <Link href="/agency/login" className="text-purple-600 hover:underline">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>

      {/* What's included */}
      <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
        <p className="text-sm font-medium text-purple-900 dark:text-purple-100 mb-2">
          Multi-Agency Plan includes:
        </p>
        <ul className="space-y-1">
          {[
            'Up to 10 caregivers',
            'Up to 30 clients',
            'Shift scheduling & handoff',
            'Timesheet management',
            'HIPAA-compliant documentation',
            'Priority support'
          ].map((feature) => (
            <li key={feature} className="flex items-center gap-2 text-sm text-purple-800 dark:text-purple-200">
              <CheckCircle className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              {feature}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
