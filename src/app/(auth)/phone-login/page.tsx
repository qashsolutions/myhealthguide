'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AuthService } from '@/lib/firebase/auth';
import { RecaptchaVerifier, ConfirmationResult } from 'firebase/auth';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

export default function PhoneLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  useEffect(() => {
    // Initialize reCAPTCHA when component mounts
    if (step === 'phone' && !recaptchaVerifier) {
      try {
        const verifier = AuthService.setupRecaptchaVerifier('recaptcha-container');
        setRecaptchaVerifier(verifier);
      } catch (err) {
        console.error('Error setting up reCAPTCHA:', err);
        setError('Failed to initialize reCAPTCHA. Please refresh the page.');
      }
    }
  }, [step, recaptchaVerifier]);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!recaptchaVerifier) {
        throw new Error('reCAPTCHA not initialized');
      }

      if (!phoneNumber) {
        throw new Error('Please enter a phone number');
      }

      // Send verification code
      const result = await AuthService.sendPhoneVerification(phoneNumber, recaptchaVerifier);
      setConfirmationResult(result);
      setStep('code');
    } catch (err: any) {
      console.error('Error sending code:', err);
      setError(err.message || 'Failed to send verification code. Please try again.');

      // Reset reCAPTCHA on error
      if (recaptchaVerifier) {
        try {
          const verifier = AuthService.setupRecaptchaVerifier('recaptcha-container');
          setRecaptchaVerifier(verifier);
        } catch (resetErr) {
          console.error('Error resetting reCAPTCHA:', resetErr);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!confirmationResult) {
        throw new Error('No verification in progress');
      }

      if (!verificationCode || verificationCode.length !== 6) {
        throw new Error('Please enter a valid 6-digit code');
      }

      // Verify code and sign in
      // Note: For existing users, this will work. For new users, they need to sign up first
      await AuthService.signInWithPhone(
        phoneNumber,
        verificationCode,
        confirmationResult
      );

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Error verifying code:', err);

      if (err.message.includes('User data required')) {
        // New user - redirect to signup with phone
        router.push(`/phone-signup?phone=${encodeURIComponent(phoneNumber)}&code=${verificationCode}`);
      } else {
        setError(err.message || 'Invalid verification code. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep('phone');
    setVerificationCode('');
    setError('');

    // Reinitialize reCAPTCHA
    if (recaptchaVerifier) {
      try {
        const verifier = AuthService.setupRecaptchaVerifier('recaptcha-container');
        setRecaptchaVerifier(verifier);
      } catch (err) {
        console.error('Error resetting reCAPTCHA:', err);
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign In with Phone</CardTitle>
        <CardDescription>
          {step === 'phone'
            ? 'Enter your phone number to receive a verification code'
            : 'Enter the 6-digit code sent to your phone'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === 'phone' ? (
          <form onSubmit={handleSendCode} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number (US only)</Label>
              <Input
                id="phoneNumber"
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
                disabled={loading}
              />
              <p className="text-xs text-gray-500">
                Format: +1 followed by 10 digits
              </p>
            </div>

            {/* reCAPTCHA container */}
            <div id="recaptcha-container" className="flex justify-center"></div>

            {error && (
              <div className="text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending code...
                </>
              ) : (
                'Send Verification Code'
              )}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Verification Code</Label>
              <Input
                id="code"
                type="text"
                placeholder="123456"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                required
                disabled={loading}
                className="text-center text-2xl tracking-widest"
              />
              <p className="text-xs text-gray-500">
                Enter the 6-digit code sent to {phoneNumber}
              </p>
            </div>

            {error && (
              <div className="text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleBack}
                disabled={loading}
              >
                Back
              </Button>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify & Sign In'
                )}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
      <CardFooter className="flex flex-col space-y-2">
        <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
          Prefer email?{' '}
          <Link href="/login" className="text-blue-600 hover:underline">
            Sign in with email
          </Link>
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
          Don't have an account?{' '}
          <Link href="/signup" className="text-blue-600 hover:underline">
            Sign up
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
