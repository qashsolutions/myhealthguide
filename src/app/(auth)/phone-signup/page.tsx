'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AuthService } from '@/lib/firebase/auth';
import { RecaptchaVerifier, ConfirmationResult } from 'firebase/auth';
import { Loader2, Mail, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { auth } from '@/lib/firebase/config';
import { getFirebaseErrorMessage } from '@/lib/utils/errorMessages';

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
  const [step, setStep] = useState<'phone' | 'verify' | 'complete_profile'>('phone');

  // Check for redirected user from phone-login (already authenticated via Firebase)
  useEffect(() => {
    const phoneParam = searchParams.get('phone');
    if (phoneParam && auth.currentUser) {
      // User was redirected from phone-login and is already authenticated
      // They just need to complete their profile
      console.log('📞 [PHONE-SIGNUP] Redirected from phone-login, user already authenticated');
      const digitsOnly = phoneParam.replace(/\D/g, '').replace(/^1/, ''); // Remove +1 prefix
      setPhoneNumber(digitsOnly);
      setStep('complete_profile');
    }
  }, [searchParams]);

  useEffect(() => {
    // Initialize reCAPTCHA only when on phone step (not needed for complete_profile)
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

      // Validate 10-digit format
      const digitsOnly = phoneNumber.replace(/\D/g, '');
      if (digitsOnly.length !== 10) {
        throw new Error('Please enter a valid 10-digit phone number');
      }

      // Send verification code (automatically prepend +1 for US numbers)
      const formattedPhone = `+1${digitsOnly}`;
      console.log('📞 [PHONE-SIGNUP] Sending verification to:', formattedPhone);
      const result = await AuthService.sendPhoneVerification(formattedPhone, recaptchaVerifier);
      setConfirmationResult(result);
      setStep('verify');
    } catch (err: any) {
      console.error('Error sending code:', err);
      setError(getFirebaseErrorMessage(err));

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

      // Complete signup with phone auth (automatically prepend +1 for US numbers)
      const digitsOnly = phoneNumber.replace(/\D/g, '');
      const formattedPhone = `+1${digitsOnly}`;
      console.log('📞 [PHONE-SIGNUP] Completing signup with phone:', formattedPhone);
      console.log('📞 [PHONE-SIGNUP] User data:', { firstName: formData.firstName, lastName: formData.lastName });

      const user = await AuthService.signInWithPhone(
        formattedPhone,
        verificationCode,
        confirmationResult,
        {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: ''
        }
      );

      console.log('✅ [PHONE-SIGNUP] Sign in successful! User ID:', user.id);
      console.log('✅ [PHONE-SIGNUP] User phone in DB:', user.phoneNumber);

      // Redirect to dashboard (verification banner will prompt for email)
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Error completing signup:', err);
      setError(getFirebaseErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    await completeSignup();
  };

  // Handle profile completion for users redirected from phone-login
  // (already authenticated via Firebase, just need Firestore document)
  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!formData.firstName || !formData.lastName) {
        throw new Error('Please fill in all fields');
      }

      const firebaseUser = auth.currentUser;
      if (!firebaseUser) {
        throw new Error('Authentication session expired. Please try again.');
      }

      const digitsOnly = phoneNumber.replace(/\D/g, '');
      const formattedPhone = `+1${digitsOnly}`;

      console.log('📞 [PHONE-SIGNUP] Creating user document for already-authenticated user');
      console.log('📞 [PHONE-SIGNUP] Firebase UID:', firebaseUser.uid);
      console.log('📞 [PHONE-SIGNUP] Phone:', formattedPhone);

      // Create user document directly using AuthService.createPhoneUser
      const user = await AuthService.createPhoneUser(firebaseUser, formattedPhone, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: ''
      });

      console.log('✅ [PHONE-SIGNUP] User document created! User ID:', user.id);
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Error completing profile:', err);
      setError(getFirebaseErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Account with Phone</CardTitle>
        <CardDescription>
          {step === 'phone' && 'Enter your information and phone number'}
          {step === 'verify' && 'Verify your phone number'}
          {step === 'complete_profile' && 'Complete your profile to finish signup'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Step: Complete profile for redirected users (already authenticated) */}
        {step === 'complete_profile' && (
          <form onSubmit={handleCompleteProfile} className="space-y-4">
            {/* Phone verified indicator */}
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg mb-4">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-sm text-green-700 dark:text-green-400">
                Phone +1 {phoneNumber} verified
              </span>
            </div>

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
                  onChange={(e) => {
                    // Only allow digits, limit to 10 characters
                    const cleaned = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setPhoneNumber(cleaned);
                  }}
                  required
                  disabled={loading}
                  className="rounded-l-none"
                  maxLength={10}
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
                Enter the 6-digit code sent to +1 {phoneNumber}
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

      {/* Navigation links */}
      <div className="px-6 pb-6 space-y-4">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white dark:bg-gray-950 px-2 text-gray-500 dark:text-gray-400">
              Or
            </span>
          </div>
        </div>

        <Link href="/signup" className="w-full">
          <Button variant="outline" className="w-full">
            <Mail className="mr-2 h-4 w-4" />
            Sign up with email
          </Button>
        </Link>

        <p className="text-center text-sm text-gray-600 dark:text-gray-400">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
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
