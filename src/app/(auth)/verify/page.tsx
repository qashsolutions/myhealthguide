'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase/config';
import { sendEmailVerification, onAuthStateChanged, reload } from 'firebase/auth';
import { CheckCircle, AlertCircle, RefreshCw, Mail, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AuthService } from '@/lib/firebase/auth';
import { RecaptchaVerifier, ConfirmationResult } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

export default function VerifyPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [userId, setUserId] = useState('');

  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);

  const [emailSent, setEmailSent] = useState(false);
  const [phoneSent, setPhoneSent] = useState(false);

  const [phoneCode, setPhoneCode] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [verifyingPhone, setVerifyingPhone] = useState(false);
  const [addingPhone, setAddingPhone] = useState(false);
  const [addingEmail, setAddingEmail] = useState(false);

  const [error, setError] = useState('');
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserEmail(user.email || '');
        setUserId(user.uid);

        const userData = await AuthService.getCurrentUserData();
        if (userData) {
          setUserPhone(userData.phoneNumber);
          setEmailVerified(userData.emailVerified);
          setPhoneVerified(userData.phoneVerified);

          if (userData.emailVerified && user.emailVerified) {
            setEmailVerified(true);
          }

          if (userData.emailVerified && userData.phoneVerified) {
            setTimeout(() => router.push('/dashboard'), 2000);
          }
        }
      } else {
        router.push('/login');
      }
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!emailVerified || !phoneVerified) {
      if (!recaptchaVerifier) {
        try {
          const verifier = AuthService.setupRecaptchaVerifier('recaptcha-container');
          setRecaptchaVerifier(verifier);
        } catch (err) {
          console.error('Error setting up reCAPTCHA:', err);
        }
      }
    }
  }, [emailVerified, phoneVerified, recaptchaVerifier]);

  const addEmail = async () => {
    try {
      setAddingEmail(true);
      setError('');

      if (!emailInput) {
        throw new Error('Please enter an email address');
      }

      await updateDoc(doc(db, 'users', userId), {
        email: emailInput
      });

      setUserEmail(emailInput);
      setAddingEmail(false);

      // Send verification email
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
        setEmailSent(true);
      }
    } catch (err: any) {
      console.error('Error adding email:', err);
      setError(err.message || 'Failed to add email');
      setAddingEmail(false);
    }
  };

  const resendEmailVerification = async () => {
    try {
      setError('');
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
        setEmailSent(true);
        setTimeout(() => setEmailSent(false), 5000);
      }
    } catch (err: any) {
      if (err.code === 'auth/too-many-requests') {
        setError('Too many requests. Please wait a few minutes before trying again.');
      } else {
        setError('Failed to send email. Please try again.');
      }
    }
  };

  const checkEmailVerification = async () => {
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
      setError('Failed to check verification status.');
    } finally {
      setCheckingEmail(false);
    }
  };

  const addPhoneNumber = async () => {
    try {
      setAddingPhone(true);
      setError('');

      if (!phoneInput) {
        throw new Error('Please enter a phone number');
      }

      await AuthService.addPhoneNumber(userId, phoneInput);
      setUserPhone(phoneInput);
      setAddingPhone(false);
    } catch (err: any) {
      console.error('Error adding phone:', err);
      setError(err.message || 'Failed to add phone number');
      setAddingPhone(false);
    }
  };

  const sendPhoneCode = async () => {
    try {
      setError('');
      if (!recaptchaVerifier) {
        throw new Error('reCAPTCHA not initialized');
      }

      const phoneToVerify = userPhone || phoneInput;
      if (!phoneToVerify) {
        throw new Error('Please enter a phone number');
      }

      // If user hasn't added phone yet, add it first
      if (!userPhone && phoneInput) {
        await addPhoneNumber();
      }

      const result = await AuthService.sendPhoneVerificationCode(phoneToVerify, recaptchaVerifier);
      setConfirmationResult(result);
      setPhoneSent(true);
    } catch (err: any) {
      console.error('Error sending phone code:', err);
      setError(err.message || 'Failed to send verification code');

      if (recaptchaVerifier) {
        try {
          const verifier = AuthService.setupRecaptchaVerifier('recaptcha-container');
          setRecaptchaVerifier(verifier);
        } catch (resetErr) {
          console.error('Error resetting reCAPTCHA:', resetErr);
        }
      }
    }
  };

  const verifyPhoneCode = async () => {
    try {
      setVerifyingPhone(true);
      setError('');

      if (!confirmationResult) {
        throw new Error('Please request a verification code first');
      }

      if (!phoneCode || phoneCode.length !== 6) {
        throw new Error('Please enter a valid 6-digit code');
      }

      await AuthService.verifyPhoneCodeAndUpdate(confirmationResult, phoneCode, userId);
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

  if (emailVerified && phoneVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-2xl font-bold mb-2">
              All Set!
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Your email and phone are both verified.
            </p>
            <p className="text-sm text-gray-500">
              Redirecting to dashboard...
            </p>
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
          Please verify both your email and phone number to access all features
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
            Add your email for account recovery and legal notices
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4"">

          {!emailVerified ? (
            <>
              {!userEmail ? (
                <>
                  <div className="space-y-3">
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      className="text-lg h-12"
                    />
                    <Button
                      onClick={addEmail}
                      className="w-full h-12 text-lg"
                      disabled={addingEmail || !emailInput}
                      size="lg"
                    >
                      {addingEmail ? 'Adding email...' : 'Add and verify email'}
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-base text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                    We sent a verification link to <strong>{userEmail}</strong>
                  </p>

                  {emailSent && (
                    <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                      <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0" />
                      <p className="text-base text-green-600 dark:text-green-400 font-medium">
                        Email sent! Check your inbox.
                      </p>
                    </div>
                  )}

                  <div className="space-y-3">
                    <Button
                      onClick={checkEmailVerification}
                      disabled={checkingEmail}
                      className="w-full h-12 text-lg"
                      size="lg"
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
                      onClick={resendEmailVerification}
                      variant="outline"
                      className="w-full h-12 text-lg"
                      size="lg"
                      disabled={emailSent}
                    >
                      {emailSent ? 'Email sent!' : 'Resend email'}
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
            Add your phone number to enable emergency alerts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">

          {!phoneVerified ? (
            <>
              {!userPhone ? (
                <>
                  <div className="space-y-3">
                    <div className="flex">
                      <div className="flex items-center px-4 bg-gray-100 dark:bg-gray-800 border border-r-0 rounded-l-md h-12">
                        <span className="text-gray-600 dark:text-gray-400 text-lg font-medium">+1</span>
                      </div>
                      <Input
                        type="tel"
                        placeholder="(555) 123-4567"
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        className="rounded-l-none text-lg h-12"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-base text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  Verify <strong>{userPhone}</strong> to enable emergency alerts
                </p>
              )}

              {!phoneSent ? (
                <>
                  <div id="recaptcha-container" className="flex justify-center"></div>
                  <Button
                    onClick={sendPhoneCode}
                    className="w-full h-12 text-lg"
                    size="lg"
                    disabled={!userPhone && !phoneInput}
                  >
                    {!userPhone ? 'Add and verify phone' : 'Send code to phone'}
                  </Button>
                </>
              ) : (
                <div className="space-y-3">
                  <Input
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={phoneCode}
                    onChange={(e) => setPhoneCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    className="text-center text-3xl tracking-widest h-16 font-mono"
                  />
                  <p className="text-sm text-gray-500 text-center">
                    Enter the code sent to {userPhone}
                  </p>
                  <Button
                    onClick={verifyPhoneCode}
                    disabled={verifyingPhone || phoneCode.length !== 6}
                    className="w-full h-12 text-lg"
                    size="lg"
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
                    onClick={sendPhoneCode}
                    variant="outline"
                    className="w-full h-12 text-lg"
                    size="lg"
                  >
                    Resend code
                  </Button>
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

      <Card className="bg-gray-50 dark:bg-gray-800">
        <CardContent className="pt-6 text-center">
          <p className="text-base text-gray-600 dark:text-gray-400">
            {emailVerified || phoneVerified ? (
              <>You can access the dashboard with one verified contact method, but both are required for emergency alerts.</>
            ) : (
              <>Verify at least one contact method to continue.</>
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
