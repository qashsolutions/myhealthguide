'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase/config';
import { sendEmailVerification, onAuthStateChanged, reload, getAuth } from 'firebase/auth';
import { CheckCircle, AlertCircle, RefreshCw, Mail, Smartphone, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AuthService } from '@/lib/firebase/auth';
import { RecaptchaVerifier, ConfirmationResult } from 'firebase/auth';

/**
 * Unified Verification Page
 *
 * This is the SINGLE source of truth for all email/phone verification and linking.
 *
 * Handles two scenarios:
 * 1. Phone-auth user adding email: Uses linkWithCredential(EmailAuthProvider)
 * 2. Email-auth user adding phone: Uses linkWithCredential(PhoneAuthProvider)
 *
 * All other pages (Settings, VerificationBanner) should redirect here.
 */
export default function VerifyPage() {
  const router = useRouter();

  // User state
  const [userId, setUserId] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [authProvider, setAuthProvider] = useState<'phone' | 'email' | null>(null);

  // Verification status
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);

  // Email linking state (for phone-auth users)
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [linkingEmail, setLinkingEmail] = useState(false);
  const [emailLinkSent, setEmailLinkSent] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);

  // Phone linking state (for email-auth users)
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [phoneSent, setPhoneSent] = useState(false);
  const [verifyingPhone, setVerifyingPhone] = useState(false);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  // Error state
  const [error, setError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Load user data on mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUserId(firebaseUser.uid);

        // Determine auth provider
        const providerData = firebaseUser.providerData;
        const hasEmailProvider = providerData.some(p => p.providerId === 'password');
        const hasPhoneProvider = providerData.some(p => p.providerId === 'phone');

        if (hasPhoneProvider && !hasEmailProvider) {
          setAuthProvider('phone');
        } else if (hasEmailProvider && !hasPhoneProvider) {
          setAuthProvider('email');
        } else if (hasEmailProvider && hasPhoneProvider) {
          // Both providers linked - user has full verification
          setAuthProvider('email'); // Default to email for display
        }

        // Get user data from Firestore
        const userData = await AuthService.getCurrentUserData();
        if (userData) {
          setUserEmail(userData.email || firebaseUser.email || '');
          setUserPhone(userData.phoneNumber || '');
          setEmailVerified(userData.emailVerified || false);
          setPhoneVerified(userData.phoneVerified || false);

          // If Firebase Auth says email is verified, sync to Firestore
          if (firebaseUser.emailVerified && !userData.emailVerified) {
            await AuthService.markEmailVerified(firebaseUser.uid);
            setEmailVerified(true);
          }

          // If both are verified, redirect to dashboard
          if ((userData.emailVerified || firebaseUser.emailVerified) && userData.phoneVerified) {
            setTimeout(() => router.push('/dashboard'), 2000);
          }
        }
      } else {
        router.push('/login');
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Initialize reCAPTCHA when needed
  useEffect(() => {
    if (authProvider === 'email' && !phoneVerified && !recaptchaVerifier) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        try {
          const container = document.getElementById('recaptcha-container');
          if (container) {
            const verifier = AuthService.setupRecaptchaVerifier('recaptcha-container');
            setRecaptchaVerifier(verifier);
          }
        } catch (err) {
          console.error('Error setting up reCAPTCHA:', err);
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [authProvider, phoneVerified, recaptchaVerifier]);

  // Password validation
  const validatePassword = (password: string): boolean => {
    setPasswordError('');

    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return false;
    }
    if (!/[a-zA-Z]/.test(password)) {
      setPasswordError('Password must contain at least one letter');
      return false;
    }
    if (!/[0-9]/.test(password)) {
      setPasswordError('Password must contain at least one number');
      return false;
    }
    if (!/^[a-zA-Z0-9]+$/.test(password)) {
      setPasswordError('Password must contain only letters and numbers');
      return false;
    }
    return true;
  };

  // ==========================================
  // EMAIL LINKING (for phone-auth users)
  // ==========================================

  const handleLinkEmail = async () => {
    try {
      setError('');
      setPasswordError('');

      console.log('=== handleLinkEmail START ===');

      if (!emailInput) {
        setError('Please enter an email address');
        return;
      }

      if (!passwordInput) {
        setError('Please create a password');
        return;
      }

      if (!validatePassword(passwordInput)) {
        return;
      }

      if (passwordInput !== confirmPasswordInput) {
        setPasswordError('Passwords do not match');
        return;
      }

      setLinkingEmail(true);

      console.log('Calling AuthService.linkEmailToAccount...');
      console.log('Email:', emailInput);

      // Link email/password to phone account
      await AuthService.linkEmailToAccount(emailInput, passwordInput);

      console.log('linkEmailToAccount completed successfully');

      // Verify the email was actually linked to Firebase Auth
      if (auth.currentUser) {
        await reload(auth.currentUser);
        console.log('After link - Firebase Auth email:', auth.currentUser.email);
        console.log('After link - Providers:', auth.currentUser.providerData.map(p => p.providerId));

        if (!auth.currentUser.email) {
          throw new Error('Email linking failed - email not found in Firebase Auth after linking');
        }
      }

      setUserEmail(emailInput);
      setEmailLinkSent(true);

      console.log('=== handleLinkEmail SUCCESS ===');

    } catch (err: any) {
      console.error('=== handleLinkEmail ERROR ===');
      console.error('Error linking email:', err);
      console.error('Error code:', err.code);
      console.error('Error message:', err.message);
      setError(err.message || 'Failed to link email. Please try again.');
      // Don't set userEmail or emailLinkSent on error
    } finally {
      setLinkingEmail(false);
    }
  };

  const handleResendEmailVerification = async () => {
    try {
      setError('');
      console.log('=== handleResendEmailVerification START ===');

      if (auth.currentUser) {
        console.log('Current user UID:', auth.currentUser.uid);
        console.log('Current user email (from auth.currentUser):', auth.currentUser.email);
        console.log('Current user emailVerified:', auth.currentUser.emailVerified);
        console.log('Provider count:', auth.currentUser.providerData.length);
        auth.currentUser.providerData.forEach((p, i) => {
          console.log(`Provider ${i}: providerId=${p.providerId}, email=${p.email}, uid=${p.uid}`);
        });

        // Reload user first to get latest state
        console.log('Reloading user...');
        await reload(auth.currentUser);
        console.log('After reload - email:', auth.currentUser.email);
        console.log('After reload - providers:', auth.currentUser.providerData.length);
        auth.currentUser.providerData.forEach((p, i) => {
          console.log(`After reload - Provider ${i}: providerId=${p.providerId}, email=${p.email}`);
        });

        // Check if email provider exists
        const emailProvider = auth.currentUser.providerData.find(p => p.providerId === 'password');
        console.log('Email provider found:', emailProvider ? 'YES' : 'NO');
        if (emailProvider) {
          console.log('Email from provider:', emailProvider.email);
        }

        if (!auth.currentUser.email) {
          console.error('No email in Firebase Auth!');
          console.log('This means linkWithCredential did not work properly.');
          console.log('The email in Firestore is only for display, Firebase Auth needs it for verification.');
          setError('Email not linked to Firebase Auth. Please sign out and try adding email again.');
          return;
        }

        console.log('Calling sendEmailVerification...');
        const actionCodeSettings = {
          url: process.env.NEXT_PUBLIC_APP_URL || 'https://www.myguide.health',
          handleCodeInApp: false
        };
        console.log('ActionCodeSettings:', actionCodeSettings);
        await sendEmailVerification(auth.currentUser, actionCodeSettings);
        console.log('Verification email sent successfully!');
        setEmailLinkSent(true);
        setTimeout(() => setEmailLinkSent(false), 5000);
      } else {
        console.error('No current user!');
        setError('Not signed in. Please refresh the page.');
      }
      console.log('=== handleResendEmailVerification END ===');
    } catch (err: any) {
      console.error('Resend verification error:', err);
      console.error('Error code:', err.code);
      console.error('Error message:', err.message);

      if (err.code === 'auth/too-many-requests') {
        setError('Too many requests. Please wait a few minutes.');
      } else {
        setError(`Failed to send: ${err.code || 'unknown'} - ${err.message || 'Check console for details'}`);
      }
    }
  };

  const handleCheckEmailVerification = async () => {
    try {
      setCheckingEmail(true);
      setError('');

      if (auth.currentUser) {
        await reload(auth.currentUser);

        if (auth.currentUser.emailVerified) {
          await AuthService.markEmailVerified(userId);
          setEmailVerified(true);

          if (phoneVerified) {
            setTimeout(() => router.push('/dashboard'), 2000);
          }
        } else {
          setError('Email not verified yet. Please check your inbox and click the verification link.');
        }
      }
    } catch (err) {
      setError('Failed to check verification status');
    } finally {
      setCheckingEmail(false);
    }
  };

  // ==========================================
  // PHONE LINKING (for email-auth users)
  // ==========================================

  const handleSendPhoneCode = async () => {
    try {
      setError('');

      if (!recaptchaVerifier) {
        setError('reCAPTCHA not initialized. Please refresh the page.');
        return;
      }

      const phoneToVerify = userPhone || phoneInput;
      if (!phoneToVerify) {
        setError('Please enter a phone number');
        return;
      }

      // Format phone number
      const digitsOnly = phoneToVerify.replace(/\D/g, '');
      if (digitsOnly.length !== 10) {
        setError('Please enter a valid 10-digit phone number');
        return;
      }

      const formattedPhone = `+1${digitsOnly}`;

      // Send verification code
      const result = await AuthService.sendPhoneVerificationCode(formattedPhone, recaptchaVerifier);
      setConfirmationResult(result);
      setPhoneSent(true);

      // Save phone to user profile if not already saved
      if (!userPhone && phoneInput) {
        await AuthService.addPhoneNumber(userId, formattedPhone);
        setUserPhone(formattedPhone);
      }

    } catch (err: any) {
      console.error('Error sending phone code:', err);
      setError(err.message || 'Failed to send verification code');

      // Reset reCAPTCHA on error
      try {
        const verifier = AuthService.setupRecaptchaVerifier('recaptcha-container');
        setRecaptchaVerifier(verifier);
      } catch (resetErr) {
        console.error('Error resetting reCAPTCHA:', resetErr);
      }
    }
  };

  const handleVerifyPhoneCode = async () => {
    try {
      setVerifyingPhone(true);
      setError('');

      if (!confirmationResult) {
        setError('Please request a verification code first');
        return;
      }

      if (!phoneCode || phoneCode.length !== 6) {
        setError('Please enter a valid 6-digit code');
        return;
      }

      // For email-auth users, we need to LINK the phone credential
      // For phone-auth users who already have phone, just verify
      const hasPhoneProvider = auth.currentUser?.providerData.some(p => p.providerId === 'phone');

      if (!hasPhoneProvider) {
        // Link phone to email account
        await AuthService.linkPhoneToAccount(
          userPhone || `+1${phoneInput.replace(/\D/g, '')}`,
          phoneCode,
          confirmationResult
        );
      } else {
        // Just verify the code
        await AuthService.verifyPhoneCodeAndUpdate(confirmationResult, phoneCode, userId);
      }

      setPhoneVerified(true);

      if (emailVerified) {
        setTimeout(() => router.push('/dashboard'), 2000);
      }

    } catch (err: any) {
      console.error('Error verifying phone:', err);
      setError(err.message || 'Invalid verification code');
    } finally {
      setVerifyingPhone(false);
    }
  };

  // ==========================================
  // RENDER
  // ==========================================

  // Both verified - success screen
  if (emailVerified && phoneVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-2xl font-bold mb-2">All Set!</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Your email and phone are both verified.
            </p>
            <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Verify Your Contact Information
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          For your security and HIPAA compliance, please verify both your email and phone number
        </p>
      </div>

      {/* Email Verification Card */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-2xl">
            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Mail className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            Email Verification
            {emailVerified && <CheckCircle className="w-7 h-7 text-green-600 dark:text-green-400 ml-auto" />}
          </CardTitle>
          <CardDescription className="text-base">
            {authProvider === 'phone'
              ? 'Add an email address for account recovery and legal notices'
              : 'Verify your email address'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!emailVerified ? (
            <>
              {/* Phone-auth user: needs to ADD email with password */}
              {authProvider === 'phone' && !userEmail && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      className="h-12"
                      disabled={linkingEmail}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Create Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="8+ alphanumeric characters"
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        className="h-12 pr-10"
                        disabled={linkingEmail}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500">
                      Minimum 8 characters using only letters and numbers
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Re-enter password"
                      value={confirmPasswordInput}
                      onChange={(e) => setConfirmPasswordInput(e.target.value)}
                      className="h-12"
                      disabled={linkingEmail}
                    />
                  </div>

                  {passwordError && (
                    <p className="text-sm text-red-600 dark:text-red-400">{passwordError}</p>
                  )}

                  <Button
                    onClick={handleLinkEmail}
                    className="w-full h-12 text-lg"
                    disabled={linkingEmail || !emailInput || !passwordInput}
                  >
                    {linkingEmail ? (
                      <>
                        <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                        Adding email...
                      </>
                    ) : (
                      'Add Email & Send Verification'
                    )}
                  </Button>

                  <p className="text-xs text-gray-500 text-center">
                    This password will allow you to sign in with email in addition to phone
                  </p>
                </div>
              )}

              {/* Has email but not verified - show verification options */}
              {userEmail && (
                <>
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-base text-gray-600 dark:text-gray-400">
                      Verification email sent to <strong>{userEmail}</strong>
                    </p>
                  </div>

                  {emailLinkSent && (
                    <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                      <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0" />
                      <p className="text-base text-green-600 dark:text-green-400 font-medium">
                        Email sent! Check your inbox.
                      </p>
                    </div>
                  )}

                  <div className="space-y-3">
                    <Button
                      onClick={handleCheckEmailVerification}
                      disabled={checkingEmail}
                      className="w-full h-12 text-lg"
                    >
                      {checkingEmail ? (
                        <>
                          <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                          Checking...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-5 w-5" />
                          I've verified my email
                        </>
                      )}
                    </Button>

                    <Button
                      onClick={handleResendEmailVerification}
                      variant="outline"
                      className="w-full h-12 text-lg"
                      disabled={emailLinkSent}
                    >
                      {emailLinkSent ? 'Email sent!' : 'Resend verification email'}
                    </Button>
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              <p className="text-base text-green-600 dark:text-green-400 font-medium">
                Email verified!
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Phone Verification Card */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-2xl">
            <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Smartphone className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            Phone Verification
            {phoneVerified && <CheckCircle className="w-7 h-7 text-green-600 dark:text-green-400 ml-auto" />}
          </CardTitle>
          <CardDescription className="text-base">
            {authProvider === 'email'
              ? 'Add your phone number for emergency alerts and two-factor authentication'
              : 'Your phone is your primary sign-in method'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!phoneVerified ? (
            <>
              {/* Email-auth user: needs to ADD phone */}
              {authProvider === 'email' && !userPhone && (
                <div className="space-y-3">
                  <Label htmlFor="phone">Phone Number (US only)</Label>
                  <div className="flex">
                    <div className="flex items-center px-4 bg-gray-100 dark:bg-gray-800 border border-r-0 rounded-l-md h-12">
                      <span className="text-gray-600 dark:text-gray-400 text-lg font-medium">+1</span>
                    </div>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="(555) 123-4567"
                      value={phoneInput}
                      onChange={(e) => {
                        const cleaned = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setPhoneInput(cleaned);
                      }}
                      className="rounded-l-none h-12 text-lg"
                      maxLength={10}
                    />
                  </div>
                </div>
              )}

              {/* Has phone - show verification */}
              {(userPhone || phoneInput) && (
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-base text-gray-600 dark:text-gray-400">
                    Verify <strong>{userPhone || `+1${phoneInput}`}</strong> to enable emergency alerts
                  </p>
                </div>
              )}

              {!phoneSent ? (
                <>
                  <div id="recaptcha-container" className="flex justify-center"></div>
                  <Button
                    onClick={handleSendPhoneCode}
                    className="w-full h-12 text-lg"
                    disabled={authProvider === 'email' && !userPhone && !phoneInput}
                  >
                    {authProvider === 'phone' ? 'Phone already verified via sign-in' : 'Send verification code'}
                  </Button>
                </>
              ) : (
                <div className="space-y-3">
                  <Label htmlFor="code">Enter 6-digit code</Label>
                  <Input
                    id="code"
                    type="text"
                    placeholder="123456"
                    value={phoneCode}
                    onChange={(e) => setPhoneCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    className="text-center text-3xl tracking-widest h-16 font-mono"
                  />
                  <p className="text-sm text-gray-500 text-center">
                    Code sent to {userPhone || `+1${phoneInput}`}
                  </p>
                  <Button
                    onClick={handleVerifyPhoneCode}
                    disabled={verifyingPhone || phoneCode.length !== 6}
                    className="w-full h-12 text-lg"
                  >
                    {verifyingPhone ? (
                      <>
                        <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      'Verify code'
                    )}
                  </Button>
                  <Button
                    onClick={handleSendPhoneCode}
                    variant="outline"
                    className="w-full h-12 text-lg"
                  >
                    Resend code
                  </Button>
                </div>
              )}

              {/* Phone-auth users already have phone verified */}
              {authProvider === 'phone' && (
                <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <CheckCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  <p className="text-base text-blue-600 dark:text-blue-400 font-medium">
                    Phone verified via sign-in
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              <p className="text-base text-green-600 dark:text-green-400 font-medium">
                Phone verified!
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-2 border-red-500 bg-red-50 dark:bg-red-900/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0" />
              <p className="text-base text-red-600 dark:text-red-400 font-medium">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Continue to Dashboard */}
      <Card className="bg-gray-50 dark:bg-gray-800">
        <CardContent className="pt-6 text-center">
          <p className="text-base text-gray-600 dark:text-gray-400">
            {emailVerified || phoneVerified ? (
              <>You can access the dashboard with one verified method, but both are required for full features.</>
            ) : (
              <>Please verify at least one contact method to continue.</>
            )}
          </p>
          {(emailVerified || phoneVerified) && (
            <Button
              onClick={() => router.push('/dashboard')}
              variant="default"
              size="lg"
              className="mt-4 h-12 text-lg"
            >
              Continue to dashboard →
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
