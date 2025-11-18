'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AuthService } from '@/lib/firebase/auth';
import { RecaptchaVerifier, ConfirmationResult } from 'firebase/auth';
import { Loader2 } from 'lucide-react';

function PhoneSignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: ''
  });
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [step, setStep] = useState<'phone' | 'verify'>('phone');

  useEffect(() => {
    // Initialize reCAPTCHA only when on phone step
    if (step === 'phone' && !recaptchaVerifier) {
      // Wait for DOM to be ready
      const timer = setTimeout(() => {
        try {
          const container = document.getElementById('recaptcha-container');
          if (container) {
            const verifier = AuthService.setupRecaptchaVerifier('recaptcha-container');
            setRecaptchaVerifier(verifier);
          }
        } catch (err) {
          console.error('Error setting up reCAPTCHA:', err);
          setError('Failed to initialize reCAPTCHA. Please refresh the page.');
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [step, recaptchaVerifier]);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!formData.firstName || !formData.lastName) {
        throw new Error('Please enter your name');
      }

      if (!recaptchaVerifier) {
        throw new Error('reCAPTCHA not initialized');
      }

      if (!phoneNumber) {
        throw new Error('Please enter a phone number');
      }

      // Send verification code
      const result = await AuthService.sendPhoneVerification(phoneNumber, recaptchaVerifier);
      setConfirmationResult(result);
      setStep('verify');
    } catch (err: any) {
      console.error('Error sending code:', err);
      setError(err.message || 'Failed to send verification code');

      // Reset reCAPTCHA
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

  const completeSignup = async () => {
    setError('');
    setLoading(true);

    try {
      if (!formData.firstName || !formData.lastName) {
        throw new Error('Please fill in all fields');
      }

      if (!phoneNumber || !verificationCode) {
        throw new Error('Phone verification required');
      }

      if (!confirmationResult) {
        throw new Error('Please verify your phone number first');
      }

      // Complete signup with phone auth
      await AuthService.signInWithPhone(
        phoneNumber,
        verificationCode,
        confirmationResult,
        {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: ''
        }
      );

      // Redirect to dashboard (verification banner will prompt for email)
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Error completing signup:', err);
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    await completeSignup();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Account with Phone</CardTitle>
        <CardDescription>
          {step === 'phone' && 'Enter your information and phone number'}
          {step === 'verify' && 'Verify your phone number'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === 'phone' && (
          <form onSubmit={handleSendCode} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  placeholder="John"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  placeholder="Smith"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number (US only)</Label>
              <div className="flex">
                <div className="flex items-center px-3 bg-gray-100 dark:bg-gray-800 border border-r-0 rounded-l-md">
                  <span className="text-gray-600 dark:text-gray-400">+1</span>
                </div>
                <Input
                  id="phoneNumber"
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                  disabled={loading}
                  className="rounded-l-none"
                />
              </div>
            </div>

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
                'Send verification code'
              )}
            </Button>
          </form>
        )}

        {step === 'verify' && (
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
                className="text-center text-2xl tracking-widest placeholder:text-gray-300 dark:placeholder:text-gray-600"
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

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Complete Sign Up'
              )}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

export default function PhoneSignupPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PhoneSignupForm />
    </Suspense>
  );
}
