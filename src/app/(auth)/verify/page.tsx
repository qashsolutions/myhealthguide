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
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Verify Your Contact Information</CardTitle>
        <CardDescription>
          Please verify both your email and phone number to access all features
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4 p-4 border rounded-lg">
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              <h3 className="font-semibold">Email Verification</h3>
              {emailVerified && <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 ml-auto" />}
            </div>

            {!emailVerified ? (
              <>
                {!userEmail ? (
                  <>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Add your email for account recovery and legal notices
                    </p>
                    <div className="space-y-2">
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                      />
                      <Button
                        onClick={addEmail}
                        className="w-full"
                        disabled={addingEmail || !emailInput}
                      >
                        {addingEmail ? 'Adding email...' : 'Add and verify email'}
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      We sent a verification link to {userEmail}
                    </p>

                    {emailSent && (
                      <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-md">
                        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                        <p className="text-sm text-green-600 dark:text-green-400">
                          Email sent! Check your inbox.
                        </p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Button
                        onClick={checkEmailVerification}
                        disabled={checkingEmail}
                        className="w-full"
                      >
                        {checkingEmail ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Checking...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            I've verified my email
                          </>
                        )}
                      </Button>

                      <Button
                        onClick={resendEmailVerification}
                        variant="outline"
                        className="w-full"
                        disabled={emailSent}
                      >
                        {emailSent ? 'Email sent!' : 'Resend email'}
                      </Button>
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-md">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                <p className="text-sm text-green-600 dark:text-green-400">
                  Email verified!
                </p>
              </div>
            )}
          </div>

          <div className="space-y-4 p-4 border rounded-lg">
            <div className="flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              <h3 className="font-semibold">Phone Verification</h3>
              {phoneVerified && <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 ml-auto" />}
            </div>

            {!phoneVerified ? (
              <>
                {!userPhone ? (
                  <>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Add your phone number to enable emergency alerts
                    </p>
                    <div className="space-y-2">
                      <div className="flex">
                        <div className="flex items-center px-3 bg-gray-100 dark:bg-gray-800 border border-r-0 rounded-l-md">
                          <span className="text-gray-600 dark:text-gray-400">+1</span>
                        </div>
                        <Input
                          type="tel"
                          placeholder="(555) 123-4567"
                          value={phoneInput}
                          onChange={(e) => setPhoneInput(e.target.value)}
                          className="rounded-l-none"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Verify {userPhone} to enable emergency alerts
                  </p>
                )}

                {!phoneSent ? (
                  <>
                    <div id="recaptcha-container" className="flex justify-center"></div>
                    <Button
                      onClick={sendPhoneCode}
                      className="w-full"
                      disabled={!userPhone && !phoneInput}
                    >
                      {!userPhone ? 'Add and verify phone' : 'Send code to phone'}
                    </Button>
                  </>
                ) : (
                  <div className="space-y-2">
                    <Input
                      type="text"
                      placeholder="Enter 6-digit code"
                      value={phoneCode}
                      onChange={(e) => setPhoneCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      maxLength={6}
                      className="text-center text-2xl tracking-widest"
                    />
                    <p className="text-xs text-gray-500">
                      Enter the code sent to {userPhone}
                    </p>
                    <Button
                      onClick={verifyPhoneCode}
                      disabled={verifyingPhone || phoneCode.length !== 6}
                      className="w-full"
                    >
                      {verifyingPhone ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        'Verify code'
                      )}
                    </Button>
                    <Button
                      onClick={sendPhoneCode}
                      variant="outline"
                      className="w-full"
                    >
                      Resend code
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-md">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                <p className="text-sm text-green-600 dark:text-green-400">
                  Phone verified!
                </p>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-md">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <div className="text-center pt-4 border-t">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {emailVerified || phoneVerified ? (
              <>You can access the dashboard with one verified contact method, but both are required for emergency alerts.</>
            ) : (
              <>Verify at least one contact method to continue.</>
            )}
          </p>
          {(emailVerified || phoneVerified) && (
            <Button
              onClick={() => router.push('/dashboard')}
              variant="link"
              className="mt-2"
            >
              Continue to dashboard →
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
