'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AuthService } from '@/lib/firebase/auth';
import { RecaptchaVerifier, ConfirmationResult } from 'firebase/auth';
import { Loader2, Phone, Mail, User, CheckCircle2, ArrowLeft, Shield, Clock } from 'lucide-react';
import Link from 'next/link';

type Step = 'info' | 'phone' | 'email' | 'complete';

interface InviteData {
  agencyName: string;
  phoneNumber: string;
  token: string;
}

function CaregiverSignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: ''
  });
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');

  // Verification state
  const [step, setStep] = useState<Step>('info');
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [inviteLoading, setInviteLoading] = useState(true);
  const [inviteError, setInviteError] = useState('');

  // Verify invite token on mount
  useEffect(() => {
    if (!token) {
      setInviteError('No invite token provided');
      setInviteLoading(false);
      return;
    }

    const verifyInvite = async () => {
      try {
        const response = await fetch(`/api/caregiver-invite/verify?token=${token}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Invalid invite');
        }

        if (data.invite.status !== 'pending') {
          throw new Error('This invite has already been used or expired');
        }

        setInviteData({
          agencyName: data.invite.agencyName,
          phoneNumber: data.invite.phoneNumber,
          token
        });

        // Pre-fill phone number from invite (last 10 digits)
        const invitePhone = data.invite.phoneNumber.replace(/\D/g, '').slice(-10);
        setPhoneNumber(invitePhone);
      } catch (err: any) {
        setInviteError(err.message || 'Failed to verify invite');
      } finally {
        setInviteLoading(false);
      }
    };

    verifyInvite();
  }, [token]);

  // Initialize reCAPTCHA when on phone step
  useEffect(() => {
    if (step === 'phone' && !recaptchaVerifier) {
      const timer = setTimeout(() => {
        try {
          const container = document.getElementById('recaptcha-container');
          if (container) {
            const verifier = AuthService.setupRecaptchaVerifier('recaptcha-container');
            setRecaptchaVerifier(verifier);
          }
        } catch (err) {
          console.error('Error setting up reCAPTCHA:', err);
          setError('Failed to initialize verification. Please refresh the page.');
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [step, recaptchaVerifier]);

  // Accept invite and complete signup - defined before useEffect that uses it
  const acceptInviteAndComplete = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      // Get current user ID
      const currentUser = await AuthService.getCurrentUser();
      if (!currentUser) {
        throw new Error('User session lost. Please try again.');
      }

      // Accept the caregiver invite
      const digitsOnly = phoneNumber.replace(/\D/g, '');
      const formattedPhone = `+1${digitsOnly}`;

      const response = await fetch('/api/caregiver-invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: inviteData?.token,
          userId: currentUser.uid,
          phoneNumber: formattedPhone
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept invite');
      }

      setStep('complete');
      // No auto-redirect - caregiver must wait for admin approval
    } catch (err: any) {
      console.error('Error accepting invite:', err);
      setError(err.message || 'Failed to complete signup');
    } finally {
      setLoading(false);
    }
  }, [phoneNumber, inviteData?.token]);

  // Check email verification status periodically
  useEffect(() => {
    if (step === 'email' && emailSent && !emailVerified) {
      const checkInterval = setInterval(async () => {
        try {
          const isVerified = await AuthService.checkEmailVerified();
          if (isVerified) {
            setEmailVerified(true);
            clearInterval(checkInterval);
            // Accept the invite and complete signup
            await acceptInviteAndComplete();
          }
        } catch (err) {
          console.error('Error checking email verification:', err);
        }
      }, 3000); // Check every 3 seconds

      return () => clearInterval(checkInterval);
    }
  }, [step, emailSent, emailVerified, acceptInviteAndComplete]);

  const handleInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.firstName || !formData.lastName || !formData.email) {
      setError('Please fill in all fields');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    setStep('phone');
  };

  const handleSendPhoneCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!recaptchaVerifier) {
        throw new Error('Verification not ready. Please wait or refresh.');
      }

      // Validate phone matches invite
      const digitsOnly = phoneNumber.replace(/\D/g, '');
      if (digitsOnly.length !== 10) {
        throw new Error('Please enter a valid 10-digit phone number');
      }

      // Check that phone matches the invite phone
      if (inviteData) {
        const inviteDigits = inviteData.phoneNumber.replace(/\D/g, '').slice(-10);
        if (digitsOnly !== inviteDigits) {
          throw new Error('Phone number must match the number the invite was sent to');
        }
      }

      const formattedPhone = `+1${digitsOnly}`;
      const result = await AuthService.sendPhoneVerification(formattedPhone, recaptchaVerifier);
      setConfirmationResult(result);
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

  const handleVerifyPhoneCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!confirmationResult) {
        throw new Error('Please request a verification code first');
      }

      if (!verificationCode || verificationCode.length !== 6) {
        throw new Error('Please enter the 6-digit code');
      }

      // Create account with phone auth
      const digitsOnly = phoneNumber.replace(/\D/g, '');
      const formattedPhone = `+1${digitsOnly}`;

      const user = await AuthService.signInWithPhone(
        formattedPhone,
        verificationCode,
        confirmationResult,
        {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: '' // Email will be added in next step
        }
      );

      setPhoneVerified(true);
      setStep('email');

      // Now link email and send verification
      await linkEmailAndSendVerification();
    } catch (err: any) {
      console.error('Error verifying code:', err);
      setError(err.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const linkEmailAndSendVerification = async () => {
    setLoading(true);
    setError('');

    try {
      // Link email to the phone-authenticated account
      await AuthService.linkEmailToAccount(formData.email, generateTempPassword());
      setEmailSent(true);
    } catch (err: any) {
      console.error('Error linking email:', err);
      setError(err.message || 'Failed to send email verification');
    } finally {
      setLoading(false);
    }
  };

  const generateTempPassword = () => {
    // Generate a secure temporary password
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let password = '';
    for (let i = 0; i < 16; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleResendEmail = async () => {
    setLoading(true);
    setError('');

    try {
      await AuthService.resendVerificationEmail();
      setError(''); // Clear any previous error
    } catch (err: any) {
      setError(err.message || 'Failed to resend email');
    } finally {
      setLoading(false);
    }
  };

  // Loading state for invite verification
  if (inviteLoading) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
            <p className="text-gray-600">Verifying your invite...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state for invalid invite
  if (inviteError) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-red-600">Invalid Invite</CardTitle>
          <CardDescription>{inviteError}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Please contact your agency administrator for a new invite link.
          </p>
          <Link href="/">
            <Button variant="outline" className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-6 h-6 text-blue-600" />
          <span className="text-sm text-blue-600 font-medium">Secure Caregiver Signup</span>
        </div>
        <CardTitle>
          {step === 'info' && 'Create Caregiver Account'}
          {step === 'phone' && 'Verify Your Phone'}
          {step === 'email' && 'Verify Your Email'}
          {step === 'complete' && 'Welcome!'}
        </CardTitle>
        <CardDescription>
          {step === 'info' && `Join ${inviteData?.agencyName || 'the agency'} as a caregiver`}
          {step === 'phone' && 'We need to verify your phone number'}
          {step === 'email' && 'One more step - verify your email'}
          {step === 'complete' && 'Your account has been created successfully'}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
            step === 'info' ? 'bg-blue-600 text-white' : 'bg-green-500 text-white'
          }`}>
            {step !== 'info' ? <CheckCircle2 className="w-5 h-5" /> : <User className="w-4 h-4" />}
          </div>
          <div className={`h-1 w-8 ${phoneVerified ? 'bg-green-500' : 'bg-gray-200'}`} />
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
            step === 'phone' ? 'bg-blue-600 text-white' :
            phoneVerified ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'
          }`}>
            {phoneVerified ? <CheckCircle2 className="w-5 h-5" /> : <Phone className="w-4 h-4" />}
          </div>
          <div className={`h-1 w-8 ${emailVerified ? 'bg-green-500' : 'bg-gray-200'}`} />
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
            step === 'email' ? 'bg-blue-600 text-white' :
            emailVerified ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'
          }`}>
            {emailVerified ? <CheckCircle2 className="w-5 h-5" /> : <Mail className="w-4 h-4" />}
          </div>
        </div>

        {/* Step 1: Info */}
        {step === 'info' && (
          <form onSubmit={handleInfoSubmit} className="space-y-4">
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
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                disabled={loading}
              />
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>Phone number from invite:</strong> {inviteData?.phoneNumber}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                You must verify this phone number in the next step
              </p>
            </div>

            {error && (
              <div className="text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              Continue to Phone Verification
            </Button>
          </form>
        )}

        {/* Step 2: Phone Verification */}
        {step === 'phone' && (
          <>
            {!confirmationResult ? (
              <form onSubmit={handleSendPhoneCode} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number from Invite</Label>
                  <div className="flex">
                    <div className="flex items-center px-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 border-r-0 rounded-l-md">
                      <span className="text-blue-600 dark:text-blue-300 font-medium">+1</span>
                    </div>
                    <div className="flex-1 flex items-center px-3 py-2 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-r-md">
                      <span className="text-blue-700 dark:text-blue-200 font-medium tracking-wide">
                        {phoneNumber.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3')}
                      </span>
                    </div>
                    <input type="hidden" name="phoneNumber" value={phoneNumber} />
                  </div>
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    A verification code will be sent to this number
                  </p>
                </div>

                <div id="recaptcha-container" className="flex justify-center"></div>

                {error && (
                  <div className="text-sm text-red-600 dark:text-red-400">
                    {error}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep('info')}
                    disabled={loading}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button type="submit" className="flex-1" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      'Send Code'
                    )}
                  </Button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleVerifyPhoneCode} className="space-y-4">
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
                      Verifying...
                    </>
                  ) : (
                    'Verify Phone'
                  )}
                </Button>
              </form>
            )}
          </>
        )}

        {/* Step 3: Email Verification */}
        {step === 'email' && (
          <div className="space-y-4">
            {emailSent ? (
              <>
                <div className="text-center py-4">
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Mail className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="font-medium text-lg mb-2">Check Your Email</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    We sent a verification link to:
                  </p>
                  <p className="font-medium text-blue-600 mt-1">{formData.email}</p>
                </div>

                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Click the link in your email to complete verification. This page will update automatically.
                  </p>
                </div>

                {loading && (
                  <div className="flex items-center justify-center gap-2 text-gray-600">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Waiting for verification...</span>
                  </div>
                )}

                {error && (
                  <div className="text-sm text-red-600 dark:text-red-400">
                    {error}
                  </div>
                )}

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleResendEmail}
                  disabled={loading}
                >
                  Resend Verification Email
                </Button>
              </>
            ) : (
              <div className="text-center py-4">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-gray-600">Setting up email verification...</p>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Complete - Pending Approval */}
        {step === 'complete' && (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto">
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
            <div>
              <h3 className="font-medium text-lg mb-2">Account Created - Awaiting Approval</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Your account has been verified. An administrator from{' '}
                <strong>{inviteData?.agencyName || 'the agency'}</strong> will review
                and approve your access.
              </p>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 text-left">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Phone verified</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Email verified</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-yellow-600" />
                  <span className="text-sm text-yellow-700 dark:text-yellow-300">Administrator approval pending</span>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                You&apos;ll receive a push notification when your access is approved.
              </p>
            </div>

            <div className="space-y-3 w-full">
              <Link href="/dashboard" className="w-full block">
                <Button className="w-full">
                  Go to Dashboard
                </Button>
              </Link>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white dark:bg-gray-900 px-2 text-gray-500">
                    or if session expired
                  </span>
                </div>
              </div>

              <Link href="/phone-login" className="w-full block">
                <Button variant="outline" className="w-full">
                  <Phone className="w-4 h-4 mr-2" />
                  Sign in with Phone
                </Button>
              </Link>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function CaregiverSignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
      <Suspense fallback={
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          </CardContent>
        </Card>
      }>
        <CaregiverSignupForm />
      </Suspense>
    </div>
  );
}
