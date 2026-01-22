'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth } from '@/lib/firebase/config';
import { sendEmailVerification, onAuthStateChanged, reload, getAuth, signOut } from 'firebase/auth';
import { CheckCircle, AlertCircle, RefreshCw, Mail, Smartphone, Eye, EyeOff, ShieldCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AuthService } from '@/lib/firebase/auth';
import { InviteService } from '@/lib/firebase/invites';
import { RecaptchaVerifier, ConfirmationResult } from 'firebase/auth';
import { getFirebaseErrorMessage } from '@/lib/utils/errorMessages';
import { useAuth } from '@/contexts/AuthContext';

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

// Loading fallback for Suspense
function VerifyPageLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin mx-auto text-blue-600 dark:text-blue-400" />
        <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    </div>
  );
}

// Main component wrapped in Suspense
export default function VerifyPage() {
  return (
    <Suspense fallback={<VerifyPageLoading />}>
      <VerifyPageContent />
    </Suspense>
  );
}

function VerifyPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser } = useAuth();

  // Check if this is a re-verification (10-day periodic check)
  const isReVerification = searchParams.get('mode') === 'reverify';

  // User state
  const [userId, setUserId] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [authProvider, setAuthProvider] = useState<'phone' | 'email' | null>(null);
  const [isReadOnlyMember, setIsReadOnlyMember] = useState(false); // Invited members don't need phone verification

  // Verification status
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);

  // Email linking/editing state
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [linkingEmail, setLinkingEmail] = useState(false);
  const [emailLinkSent, setEmailLinkSent] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);

  // Phone linking state (for email-auth users)
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [phoneSent, setPhoneSent] = useState(false);
  const [verifyingPhone, setVerifyingPhone] = useState(false);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [isEditingPhone, setIsEditingPhone] = useState(false);

  // Error state
  const [error, setError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Lock to prevent re-processing once verification is complete (prevents flickering)
  const verificationLockRef = useRef(false);
  // Track if redirect has been scheduled to prevent multiple redirects
  const redirectScheduledRef = useRef(false);

  // Load user data on mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // Skip processing if verification is already complete (prevents flickering)
      if (verificationLockRef.current) {
        return;
      }

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

          // Check if user is an invited read-only member
          // Read-only members only receive end-of-day email reports (no SMS)
          // They should skip phone verification
          // Check for pendingInviteCode (set during signup via invite link)
          const isInvitedMember = !!userData.pendingInviteCode;
          setIsReadOnlyMember(isInvitedMember);

          // Only update verification states if not already verified locally
          // This prevents race conditions when auth state changes after verification
          setEmailVerified(prev => prev || userData.emailVerified || false);
          setPhoneVerified(prev => prev || userData.phoneVerified || false);

          // If Firebase Auth says email is verified, sync to Firestore
          if (firebaseUser.emailVerified && !userData.emailVerified) {
            await AuthService.markEmailVerified(firebaseUser.uid);
            setEmailVerified(true);
          }

          // Redirect logic depends on verification mode
          const emailIsVerified = userData.emailVerified || firebaseUser.emailVerified;
          const phoneIsVerified = userData.phoneVerified;

          if (isReVerification) {
            // Re-verification: Only ONE method needs to be re-verified
            // Invited members only have email verified, regular users have both
            // This is a periodic check - redirect if user has verified what they need
            const isInvitedMember = !!userData.pendingInviteCode;
            const canProceed = isInvitedMember
              ? emailIsVerified  // Invited members only need email
              : (emailIsVerified && phoneIsVerified);

            if (canProceed) {
              // Set lock to prevent flickering from subsequent auth state changes
              verificationLockRef.current = true;
              // Update lastVerificationDate to prevent redirect loop
              try {
                await AuthService.updateLastVerificationDate(firebaseUser.uid);
                // Refresh AuthContext so ProtectedRoute sees updated lastVerificationDate
                await refreshUser();
                console.log('[Verify] Updated lastVerificationDate and refreshed user context');
              } catch (err) {
                console.error('Error updating lastVerificationDate:', err);
              }
              // Only schedule redirect once
              if (!redirectScheduledRef.current) {
                redirectScheduledRef.current = true;
                setTimeout(() => router.push('/dashboard'), 1000);
              }
            }
          } else {
            // Initial verification: Both must be verified (unless invited member)
            // Invited members (via invite code) only need email verification (they don't receive SMS)
            const memberOnlyNeedsEmail = !!userData.pendingInviteCode && emailIsVerified;
            const bothVerified = emailIsVerified && phoneIsVerified;

            if (memberOnlyNeedsEmail) {
              // Invited member verified email - add them to the admin's group
              verificationLockRef.current = true;

              try {
                // Accept the invite to join the admin's group
                const result = await InviteService.acceptInvite({
                  inviteCode: userData.pendingInviteCode!,
                  userId: firebaseUser.uid,
                  userName: `${userData.firstName} ${userData.lastName}`
                });

                if (result.success) {
                  console.log('[Verify] Invite accepted, member added to group:', result.groupId);
                  // Clear pendingInviteCode and update lastVerificationDate
                  await AuthService.clearPendingInviteCode(firebaseUser.uid);
                  await AuthService.updateLastVerificationDate(firebaseUser.uid);
                } else {
                  console.error('[Verify] Failed to accept invite:', result.error);
                }

                // Sign out the member - they don't need to be logged in
                // They will receive daily health reports via email
                await signOut(auth);
                console.log('[Verify] Member signed out after verification');
              } catch (err) {
                console.error('Error accepting invite:', err);
              }

              // Redirect to member-verified page (public page with success message)
              if (!redirectScheduledRef.current) {
                redirectScheduledRef.current = true;
                setTimeout(() => {
                  window.location.href = '/member-verified';
                }, 2000);
              }
            } else if (bothVerified) {
              // Regular user (admin) verified both email and phone
              verificationLockRef.current = true;
              try {
                await AuthService.updateLastVerificationDate(firebaseUser.uid);
                await refreshUser();
                console.log('[Verify] Initial verification complete - updated lastVerificationDate');
              } catch (err) {
                console.error('Error updating lastVerificationDate:', err);
              }
              // Only schedule redirect once
              if (!redirectScheduledRef.current) {
                redirectScheduledRef.current = true;
                setTimeout(() => router.push('/dashboard'), 2000);
              }
            }
          }
        }
      } else {
        router.push('/login');
      }
    });

    return () => unsubscribe();
  }, [router, refreshUser, isReVerification]);

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

  // Password validation - must have 8+ chars, uppercase, lowercase, numbers, and special character
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
      setError(getFirebaseErrorMessage(err));
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
        // continueUrl redirects user to login page with success message after verification
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.myguide.health';
        const actionCodeSettings = {
          url: `${baseUrl}/login?emailVerified=true`,
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

      setError(getFirebaseErrorMessage(err));
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

          // Check if this is an invited member (read-only)
          if (isReadOnlyMember) {
            // Get user data to get the invite code
            const userData = await AuthService.getCurrentUserData();
            if (userData?.pendingInviteCode) {
              verificationLockRef.current = true;

              try {
                // Accept the invite to join the admin's group
                const result = await InviteService.acceptInvite({
                  inviteCode: userData.pendingInviteCode,
                  userId: auth.currentUser.uid,
                  userName: `${userData.firstName} ${userData.lastName}`
                });

                if (result.success) {
                  console.log('[Verify] Invite accepted, member added to group:', result.groupId);
                  await AuthService.clearPendingInviteCode(auth.currentUser.uid);
                  await AuthService.updateLastVerificationDate(auth.currentUser.uid);
                } else {
                  console.error('[Verify] Failed to accept invite:', result.error);
                }

                // Sign out the member - they don't need to be logged in
                await signOut(auth);
                console.log('[Verify] Member signed out after verification');
              } catch (err) {
                console.error('Error accepting invite:', err);
              }

              // Redirect to member-verified page
              if (!redirectScheduledRef.current) {
                redirectScheduledRef.current = true;
              }
              window.location.href = '/member-verified';
              return;
            }
          }

          // Regular user - redirect to dashboard if phone also verified
          if (phoneVerified && !redirectScheduledRef.current) {
            redirectScheduledRef.current = true;
            setTimeout(() => router.push('/dashboard'), 2000);
          }
        } else {
          setError('Email not verified yet. Please check your inbox and click the verification link, then come back and click this button again.');
        }
      } else {
        // User session expired - show error instead of redirecting
        setError('Your session has expired. Please refresh the page to continue.');
      }
    } catch (err: any) {
      console.error('Check email verification error:', err);
      setError(getFirebaseErrorMessage(err));
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

      // Format phone number - handle both +1XXXXXXXXXX and XXXXXXXXXX formats
      let digitsOnly = phoneToVerify.replace(/\D/g, '');

      // If it starts with 1 and is 11 digits, remove the leading 1
      if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
        digitsOnly = digitsOnly.substring(1);
      }

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

      // Reset reCAPTCHA for potential resend - verifier is consumed after use
      try {
        const newVerifier = AuthService.setupRecaptchaVerifier('recaptcha-container');
        setRecaptchaVerifier(newVerifier);
      } catch (resetErr) {
        console.error('Error resetting reCAPTCHA for resend:', resetErr);
      }

    } catch (err: any) {
      console.error('Error sending phone code:', err);
      setError(getFirebaseErrorMessage(err));

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
      setPhoneSent(false); // Reset to hide the code input
      setPhoneCode(''); // Clear the code
      setUserPhone(userPhone || `+1${phoneInput.replace(/\D/g, '')}`); // Ensure phone is set

    } catch (err: any) {
      console.error('Error verifying phone:', err);
      setError(getFirebaseErrorMessage(err));
    } finally {
      setVerifyingPhone(false);
    }
  };

  // ==========================================
  // RENDER
  // ==========================================

  // Verification complete - redirect to dashboard
  // For initial verification: both must be verified (unless read-only member)
  // For re-verification: either one being re-verified is sufficient
  // For read-only members (invited via invite code): only email is required
  const verificationComplete = isReVerification
    ? (emailVerified || phoneVerified)
    : isReadOnlyMember
      ? emailVerified  // Read-only members only need email (no SMS sent to them)
      : (emailVerified && phoneVerified);

  useEffect(() => {
    // Only schedule redirect once - don't clear timeout on re-render
    // The cleanup was causing the redirect to never fire during rapid re-renders
    // Note: For invited members, redirect is handled in the initial verification logic above
    if (verificationComplete && !redirectScheduledRef.current && !isReadOnlyMember) {
      redirectScheduledRef.current = true;
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    }
  }, [verificationComplete, router, isReadOnlyMember]);

  if (verificationComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-2xl font-bold mb-2">
              {isReVerification ? 'Re-verification Complete!' : 'All Set!'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {isReVerification
                ? 'Your identity has been confirmed.'
                : isReadOnlyMember
                  ? 'Your email is verified. You\'ll receive daily health reports via email.'
                  : 'Your email and phone are both verified.'}
            </p>
            <p className="text-sm text-gray-500">
              {isReadOnlyMember ? 'Redirecting to homepage...' : 'Redirecting to dashboard...'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Re-verification banner */}
      {isReVerification && (
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-8 h-8 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <div>
                <p className="font-medium text-blue-800 dark:text-blue-200">
                  Periodic Security Check
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  For your protection, we require identity verification every 10 days. You only need to verify <strong>one</strong> method below.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {isReVerification ? 'Verify Your Identity' : 'Verify Your Contact Information'}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {isReVerification
            ? 'Choose one verification method below to continue'
            : isReadOnlyMember
              ? 'Please verify your email address to access your group'
              : 'For your security and HIPAA compliance, please verify both your email and phone number'}
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
                        placeholder="8+ chars, A-Z, a-z, 0-9, special"
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
                      Minimum 8 characters with uppercase (A-Z), lowercase (a-z), number (0-9), and special character
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
              {userEmail && !isEditingEmail && (
                <>
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center justify-between">
                      <p className="text-base text-gray-600 dark:text-gray-400">
                        Verification email sent to <strong>{userEmail}</strong>
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setIsEditingEmail(true);
                          setEmailInput('');
                          setPasswordInput('');
                          setConfirmPasswordInput('');
                          setEmailLinkSent(false);
                        }}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                      >
                        Change Email
                      </Button>
                    </div>
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
                          I&apos;ve verified my email
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

              {/* Email editing mode - show form to enter new email */}
              {isEditingEmail && (
                <div className="space-y-4">
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      Enter your corrected email address below. A verification email will be sent to the new address.
                      <span className="block mt-2 font-medium">
                        After changing your email, sign in using:
                      </span>
                      <span className="block text-xs mt-1">
                        • Phone number (recommended) - works immediately
                        <br />
                        • Email + password - use &quot;Forgot password&quot; on login page if needed
                      </span>
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newEmail">New Email Address</Label>
                    <Input
                      id="newEmail"
                      type="email"
                      placeholder="you@example.com"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      className="h-12"
                      disabled={linkingEmail}
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsEditingEmail(false);
                        setEmailInput('');
                      }}
                      className="flex-1 h-12"
                      disabled={linkingEmail}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={async () => {
                        // Update email via API (works for all auth types)
                        try {
                          setLinkingEmail(true);
                          setError('');

                          if (!emailInput) {
                            setError('Please enter an email address');
                            return;
                          }

                          // Use Firebase Admin to update email
                          const { auth: firebaseAuth } = await import('@/lib/firebase/config');
                          const token = await firebaseAuth.currentUser?.getIdToken();

                          if (!token) {
                            setError('Please sign in again');
                            return;
                          }

                          const response = await fetch('/api/auth/update-email', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({
                              newEmail: emailInput
                            })
                          });

                          if (!response.ok) {
                            const data = await response.json();
                            throw new Error(data.error || 'Failed to update email');
                          }

                          setUserEmail(emailInput);
                          setIsEditingEmail(false);
                          setEmailLinkSent(true);
                        } catch (err: any) {
                          console.error('Error updating email:', err);
                          setError(getFirebaseErrorMessage(err));
                        } finally {
                          setLinkingEmail(false);
                        }
                      }}
                      className="flex-1 h-12"
                      disabled={linkingEmail || !emailInput}
                    >
                      {linkingEmail ? (
                        <>
                          <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        'Update Email'
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0" />
              <div>
                <p className="text-base text-green-600 dark:text-green-400 font-medium">
                  Email verified!
                </p>
                {userEmail && (
                  <p className="text-sm text-green-600/80 dark:text-green-400/80">
                    {userEmail}
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Phone Verification Card - Hidden for read-only members who only receive emails */}
      {!isReadOnlyMember && (
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
          {/* reCAPTCHA container - always in DOM to prevent "element removed" errors */}
          <div
            id="recaptcha-container"
            className={`flex justify-center ${phoneVerified || phoneSent ? 'hidden' : ''}`}
          />

          {!phoneVerified ? (
            <>
              {/* Phone editing mode - show input to enter new phone */}
              {isEditingPhone && (
                <div className="space-y-4">
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      Enter a different phone number. A verification code will be sent to the new number.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="newPhone">New Phone Number (US only)</Label>
                    <div className="flex">
                      <div className="flex items-center px-4 bg-gray-100 dark:bg-gray-800 border border-r-0 rounded-l-md h-12">
                        <span className="text-gray-600 dark:text-gray-400 text-lg font-medium">+1</span>
                      </div>
                      <Input
                        id="newPhone"
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

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsEditingPhone(false);
                        setPhoneInput('');
                        setPhoneSent(false);
                        setPhoneCode('');
                        setError('');
                      }}
                      className="flex-1 h-12"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => {
                        if (phoneInput.length === 10) {
                          // Update userPhone to use the new number
                          setUserPhone(`+1${phoneInput}`);
                          setIsEditingPhone(false);
                          setPhoneSent(false);
                          setPhoneCode('');
                          setError('');
                        } else {
                          setError('Please enter a valid 10-digit phone number');
                        }
                      }}
                      className="flex-1 h-12"
                      disabled={phoneInput.length !== 10}
                    >
                      Use This Number
                    </Button>
                  </div>
                </div>
              )}

              {/* Not editing - show normal flow */}
              {!isEditingPhone && (
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

                  {/* Has phone - show verification with Change option */}
                  {(userPhone || phoneInput) && !phoneSent && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center justify-between">
                        <p className="text-base text-gray-600 dark:text-gray-400">
                          Verify <strong>{userPhone || `+1${phoneInput}`}</strong> to enable emergency alerts
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setIsEditingPhone(true);
                            setPhoneInput('');
                            setPhoneSent(false);
                            setPhoneCode('');
                            setError('');
                          }}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        >
                          Change Phone
                        </Button>
                      </div>
                    </div>
                  )}

                  {!phoneSent ? (
                    <Button
                      onClick={handleSendPhoneCode}
                      className="w-full h-12 text-lg"
                      disabled={authProvider === 'email' && !userPhone && !phoneInput}
                    >
                      {authProvider === 'phone' ? 'Phone already verified via sign-in' : 'Send verification code'}
                    </Button>
                  ) : (
                    <div className="space-y-3">
                      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Code sent to <strong>{userPhone || `+1${phoneInput}`}</strong>
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setIsEditingPhone(true);
                              setPhoneInput('');
                              setPhoneSent(false);
                              setPhoneCode('');
                              setError('');
                            }}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                          >
                            Change Phone
                          </Button>
                        </div>
                      </div>

                      <Label htmlFor="code">Enter 6-digit code</Label>
                      <Input
                        id="code"
                        type="text"
                        placeholder="------"
                        value={phoneCode}
                        onChange={(e) => setPhoneCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        maxLength={6}
                        className="text-center text-3xl tracking-widest h-16 font-mono placeholder:text-gray-300 dark:placeholder:text-gray-600"
                      />
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
              )}
            </>
          ) : (
            <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0" />
              <div>
                <p className="text-base text-green-600 dark:text-green-400 font-medium">
                  Phone verified!
                </p>
                {userPhone && (
                  <p className="text-sm text-green-600/80 dark:text-green-400/80">
                    {userPhone}
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      )}

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
            {verificationComplete ? (
              <>Verification complete! You can now access the app.</>
            ) : isReVerification ? (
              <>Verify your identity using <strong>either</strong> email or phone to continue.</>
            ) : isReadOnlyMember ? (
              <>Please verify your <strong>email</strong> to access your group.</>
            ) : (
              <>Please verify <strong>both</strong> email and phone to continue. This is required for HIPAA compliance and account security.</>
            )}
          </p>
          {verificationComplete && (
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
