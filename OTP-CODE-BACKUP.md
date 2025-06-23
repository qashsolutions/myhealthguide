# OTP Code Backup - Complete Reference

This document contains the complete source code of all OTP-related files that were removed during the migration to email verification links.

## File Structure
```
deleted-otp-files/
├── components/
│   └── auth/
│       └── OTPVerification.tsx
├── lib/
│   └── auth/
│       └── otp.ts
└── app/
    └── api/
        └── auth/
            ├── verify-otp/
            │   └── route.ts
            └── complete-profile/
                └── route.ts
```

---

## 1. OTPVerification Component

**Path:** `/src/components/auth/OTPVerification.tsx`

```typescript
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { APP_NAME, ROUTES } from '@/lib/constants';
import { createUser } from '@/lib/firebase/auth';

/**
 * OTP Verification Component
 * Handles 6-digit OTP input for signup and account deletion
 * 
 * Features:
 * - Auto-focus and auto-advance between digits
 * - Paste support for copying OTP from email
 * - Countdown timer for OTP expiration
 * - Resend OTP functionality
 */

interface OTPVerificationProps {
  email: string;
  purpose: 'signup' | 'delete';
  expiresAt?: string; // ISO timestamp from server
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function OTPVerification({ email, purpose, expiresAt, onSuccess, onCancel }: OTPVerificationProps) {
  const router = useRouter();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Calculate time left based on server timestamp
  useEffect(() => {
    const calculateTimeLeft = () => {
      if (!expiresAt) {
        // Fallback to 10 minutes if no server time
        return 600;
      }
      
      const expiry = new Date(expiresAt).getTime();
      const now = new Date().getTime();
      const secondsLeft = Math.max(0, Math.floor((expiry - now) / 1000));
      
      return secondsLeft;
    };

    const initialTime = calculateTimeLeft();
    setTimeLeft(initialTime);

    // Update countdown every second
    const timer = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);
      
      if (remaining <= 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresAt]);

  // Format time display
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle OTP input change
  const handleChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const pastedValue = value.slice(0, 6).split('');
      const newOtp = [...otp];
      pastedValue.forEach((digit, i) => {
        if (i < 6 && /[0-9]/.test(digit)) {
          newOtp[i] = digit;
        }
      });
      setOtp(newOtp);
      
      // Focus last filled input or last input
      const lastFilledIndex = newOtp.findLastIndex(digit => digit !== '');
      const focusIndex = Math.min(lastFilledIndex + 1, 5);
      inputRefs.current[focusIndex]?.focus();
    } else if (/[0-9]/.test(value) || value === '') {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);

      // Auto-focus next input
      if (value && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  // Handle backspace
  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Handle OTP verification
  const handleVerify = async () => {
    const otpString = otp.join('');
    
    if (otpString.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    if (showPasswordFields && purpose === 'signup') {
      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
    }

    setError(null);
    setIsLoading(true);

    try {
      if (purpose === 'signup') {
        // First verify OTP
        const verifyResponse = await fetch('/api/auth/verify-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            email, 
            otp: otpString,
            purpose: 'signup'
          }),
        });

        const verifyData = await verifyResponse.json();

        if (!verifyResponse.ok || !verifyData.success) {
          throw new Error(verifyData.error || 'Failed to verify OTP');
        }

        // OTP is valid, show password fields if not already shown
        if (!showPasswordFields) {
          setShowPasswordFields(true);
          setIsLoading(false);
          return;
        }

        // Complete profile with password
        const completeResponse = await fetch('/api/auth/complete-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password,
            otp: otpString,
            userData: verifyData.data?.pendingSignup,
          }),
        });

        const completeData = await completeResponse.json();

        if (!completeResponse.ok || !completeData.success) {
          throw new Error(completeData.error || 'Failed to complete registration');
        }

        setSuccess(true);
        
        // Store auth token if provided
        if (completeData.data?.token) {
          localStorage.setItem('auth-token', completeData.data.token);
        }

        // Redirect to dashboard after short delay
        setTimeout(() => {
          router.push(ROUTES.DASHBOARD);
        }, 2000);
        
      } else if (purpose === 'delete') {
        // Handle account deletion
        const response = await fetch('/api/account/verify-deletion', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, otp: otpString }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to verify OTP');
        }

        setSuccess(true);
        if (onSuccess) {
          onSuccess();
        } else {
          // Redirect to goodbye page
          setTimeout(() => {
            router.push(ROUTES.GOODBYE);
          }, 2000);
        }
      }
    } catch (error: any) {
      setError(error.message || 'Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle resend OTP
  const handleResend = async () => {
    setError(null);
    setIsLoading(true);

    try {
      const endpoint = purpose === 'signup' ? '/api/auth/signup' : '/api/account/request-deletion';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email,
          // For signup, we need to resend with the same user data
          ...(purpose === 'signup' && typeof window !== 'undefined' 
            ? JSON.parse(window.sessionStorage.getItem('pendingSignup') || '{}')
            : {})
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to resend code');
      }

      // Reset OTP input
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      
      // Update expiry time if provided
      if (data.data?.expiresAt) {
        // Force re-render of timer by updating key
        setTimeLeft(0);
        setTimeout(() => {
          const newExpiry = new Date(data.data.expiresAt).getTime();
          const now = new Date().getTime();
          setTimeLeft(Math.max(0, Math.floor((newExpiry - now) / 1000)));
        }, 100);
      }
      
      setError(null);
      // Show success message briefly
      const successMsg = document.createElement('div');
      successMsg.className = 'text-health-safe text-elder-base mt-2';
      successMsg.textContent = 'New code sent! Check your email.';
      document.querySelector('.otp-container')?.appendChild(successMsg);
      setTimeout(() => successMsg.remove(), 3000);
      
    } catch (error: any) {
      setError(error.message || 'Failed to resend code');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center py-8">
        <div className="mb-6">
          <div className="w-20 h-20 bg-health-safe-bg rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-12 w-12 text-health-safe" />
          </div>
          <h3 className="text-elder-xl font-semibold text-elder-text mb-2">
            {purpose === 'signup' ? 'Registration Complete!' : 'Verification Successful!'}
          </h3>
          <p className="text-elder-base text-elder-text-secondary">
            {purpose === 'signup' 
              ? 'Welcome to ' + APP_NAME + '! Redirecting to your dashboard...'
              : 'Your request has been confirmed.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="otp-container space-y-6">
      <div className="text-center">
        <h3 className="text-elder-xl font-semibold text-elder-text mb-2">
          {!showPasswordFields ? 'Enter Verification Code' : 'Create Your Password'}
        </h3>
        <p className="text-elder-base text-elder-text-secondary">
          {!showPasswordFields 
            ? `We sent a 6-digit code to ${email}`
            : 'Your email is verified! Now create a secure password.'}
        </p>
      </div>

      {!showPasswordFields ? (
        <>
          {/* OTP Input */}
          <div className="flex justify-center gap-3">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                pattern="[0-9]"
                maxLength={6} // Allow paste of full OTP
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="w-16 h-16 text-center text-2xl font-bold border-2 border-elder-border rounded-elder focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/20"
                aria-label={`Digit ${index + 1}`}
                autoFocus={index === 0}
              />
            ))}
          </div>

          {/* Timer */}
          <div className="text-center">
            <p className="text-elder-base text-elder-text-secondary">
              Code expires in{' '}
              <span className={`font-semibold ${timeLeft < 60 ? 'text-health-danger' : 'text-elder-text'}`}>
                {formatTime(timeLeft)}
              </span>
            </p>
          </div>
        </>
      ) : (
        <>
          {/* Password Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-elder-base font-medium mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 text-elder-base border-2 border-elder-border rounded-elder focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/20"
                placeholder="At least 6 characters"
                autoFocus
              />
            </div>
            
            <div>
              <label className="block text-elder-base font-medium mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 text-elder-base border-2 border-elder-border rounded-elder focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/20"
                placeholder="Enter password again"
              />
            </div>
          </div>
        </>
      )}

      {/* Error message */}
      {error && (
        <div className="p-4 bg-health-danger-bg border-2 border-health-danger rounded-elder flex items-start gap-3">
          <AlertCircle className="h-6 w-6 text-health-danger flex-shrink-0 mt-1" />
          <p className="text-elder-base text-health-danger">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-4">
        <Button
          variant="primary"
          size="large"
          fullWidth
          onClick={handleVerify}
          loading={isLoading}
          disabled={(!showPasswordFields && otp.some(d => !d)) || (showPasswordFields && (!password || !confirmPassword))}
        >
          {!showPasswordFields ? 'Verify Code' : 'Complete Registration'}
        </Button>

        {!showPasswordFields && (
          <div className="text-center space-y-4">
            <button
              onClick={handleResend}
              disabled={isLoading || timeLeft > 540} // Can resend after 1 minute
              className="text-elder-base text-primary-600 hover:text-primary-700 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Resend code
            </button>
            
            {onCancel && (
              <button
                onClick={onCancel}
                className="block w-full text-elder-base text-elder-text-secondary hover:text-elder-text"
              >
                Cancel
              </button>
            )}
          </div>
        )}
      </div>

      {/* Help text */}
      <p className="text-elder-sm text-elder-text-secondary text-center">
        {purpose === 'signup' 
          ? 'Didn\'t receive the code? Check your spam folder.'
          : 'This code helps us verify your identity for account deletion.'}
      </p>
    </div>
  );
}
```

---

## 2. OTP Library

**Path:** `/src/lib/auth/otp.ts`

```typescript
import crypto from 'crypto';

/**
 * OTP (One-Time Password) management
 * Handles generation, storage, and verification of OTPs
 * 
 * NOTE: This uses in-memory storage which doesn't work well
 * in serverless environments. In production, use a persistent
 * store like Redis or a database.
 */

// OTP storage interface
interface OTPData {
  code: string;
  email: string;
  purpose: 'signup' | 'login' | 'delete';
  createdAt: Date;
  expiresAt: Date;
  attempts: number;
  metadata?: Record<string, any>;
}

// In-memory storage (not suitable for serverless)
// In production, replace with Redis or database
const otpStore = new Map<string, OTPData>();

// Configuration
const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;
const MAX_ATTEMPTS = 3;
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

/**
 * Generate a random OTP
 */
export function generateOTP(length: number = OTP_LENGTH): string {
  const digits = '0123456789';
  let otp = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, digits.length);
    otp += digits[randomIndex];
  }
  
  return otp;
}

/**
 * Store OTP with metadata
 */
export function storeOTP(
  email: string,
  purpose: OTPData['purpose'],
  metadata?: Record<string, any>
): OTPData {
  const code = generateOTP();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000);
  
  const otpData: OTPData = {
    code,
    email: email.toLowerCase(),
    purpose,
    createdAt: now,
    expiresAt,
    attempts: 0,
    metadata,
  };
  
  // Store with composite key
  const key = `${email.toLowerCase()}:${purpose}`;
  otpStore.set(key, otpData);
  
  return otpData;
}

/**
 * Verify OTP
 */
export function verifyOTP(
  email: string,
  code: string,
  purpose: OTPData['purpose']
): { success: boolean; error?: string; data?: OTPData } {
  const key = `${email.toLowerCase()}:${purpose}`;
  const otpData = otpStore.get(key);
  
  if (!otpData) {
    return { 
      success: false, 
      error: 'No OTP found for this email. Please request a new code.' 
    };
  }
  
  // Check expiration
  if (new Date() > otpData.expiresAt) {
    otpStore.delete(key);
    return { 
      success: false, 
      error: 'OTP has expired. Please request a new code.' 
    };
  }
  
  // Check attempts
  if (otpData.attempts >= MAX_ATTEMPTS) {
    otpStore.delete(key);
    return { 
      success: false, 
      error: 'Too many failed attempts. Please request a new code.' 
    };
  }
  
  // Verify code
  if (otpData.code !== code) {
    otpData.attempts++;
    const remaining = MAX_ATTEMPTS - otpData.attempts;
    
    if (remaining === 0) {
      otpStore.delete(key);
      return { 
        success: false, 
        error: 'Too many failed attempts. Please request a new code.' 
      };
    }
    
    return { 
      success: false, 
      error: `Invalid code. ${remaining} attempt${remaining > 1 ? 's' : ''} remaining.` 
    };
  }
  
  // Success - OTP is valid but not consumed yet
  return { 
    success: true, 
    data: otpData 
  };
}

/**
 * Consume OTP (mark as used after successful verification)
 */
export function consumeOTP(
  email: string,
  purpose: OTPData['purpose']
): boolean {
  const key = `${email.toLowerCase()}:${purpose}`;
  const exists = otpStore.has(key);
  
  if (exists) {
    otpStore.delete(key);
  }
  
  return exists;
}

/**
 * Check if user has a valid OTP
 */
export function hasValidOTP(
  email: string,
  purpose: OTPData['purpose']
): boolean {
  const key = `${email.toLowerCase()}:${purpose}`;
  const otpData = otpStore.get(key);
  
  if (!otpData) {
    return false;
  }
  
  // Check if expired
  if (new Date() > otpData.expiresAt) {
    otpStore.delete(key);
    return false;
  }
  
  return true;
}

/**
 * Get OTP data (for debugging/admin purposes)
 */
export function getOTPData(
  email: string,
  purpose: OTPData['purpose']
): OTPData | null {
  const key = `${email.toLowerCase()}:${purpose}`;
  return otpStore.get(key) || null;
}

/**
 * Get remaining time for OTP in seconds
 */
export function getOTPRemainingTime(
  email: string,
  purpose: OTPData['purpose']
): number {
  const otpData = getOTPData(email, purpose);
  
  if (!otpData) {
    return 0;
  }
  
  const remaining = otpData.expiresAt.getTime() - new Date().getTime();
  return Math.max(0, Math.floor(remaining / 1000));
}

/**
 * Clear expired OTPs
 */
export function clearExpiredOTPs(): number {
  const now = new Date();
  let cleared = 0;
  
  for (const [key, data] of otpStore.entries()) {
    if (now > data.expiresAt) {
      otpStore.delete(key);
      cleared++;
    }
  }
  
  return cleared;
}

/**
 * Clear all OTPs (for testing)
 */
export function clearAllOTPs(): void {
  otpStore.clear();
}

/**
 * Get OTP store size (for monitoring)
 */
export function getOTPStoreSize(): number {
  return otpStore.size;
}

// Set up periodic cleanup
if (typeof window === 'undefined') {
  // Only run cleanup on server
  setInterval(() => {
    const cleared = clearExpiredOTPs();
    if (cleared > 0) {
      console.log(`[OTP Cleanup] Cleared ${cleared} expired OTPs`);
    }
  }, CLEANUP_INTERVAL);
}

// Log store size periodically in development
if (process.env.NODE_ENV === 'development') {
  setInterval(() => {
    const size = getOTPStoreSize();
    if (size > 0) {
      console.log(`[OTP Store] Current size: ${size} OTPs`);
    }
  }, 60000); // Every minute
}
```

---

## 3. Verify OTP API Route

**Path:** `/src/app/api/auth/verify-otp/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyOTP, getOTPData } from '@/lib/auth/otp';
import { ApiResponse } from '@/types';
import { VALIDATION_MESSAGES, ERROR_MESSAGES } from '@/lib/constants';

/**
 * POST /api/auth/verify-otp
 * Verify OTP for signup flow
 * 
 * This endpoint only validates the OTP. Actual user creation
 * happens in complete-profile endpoint to ensure we have
 * password before creating Firebase user.
 */

const verifyOTPSchema = z.object({
  email: z.string().email(VALIDATION_MESSAGES.EMAIL_INVALID),
  otp: z.string().length(6, 'OTP must be 6 digits'),
  purpose: z.enum(['signup', 'login', 'delete']),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validationResult = verifyOTPSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'Invalid request data',
          errors: validationResult.error.issues.map(issue => ({
            field: issue.path[0] as string,
            message: issue.message,
          })),
        },
        { status: 400 }
      );
    }
    
    const { email, otp, purpose } = validationResult.data;
    
    // Verify OTP
    const result = verifyOTP(email, otp, purpose);
    
    if (!result.success) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: result.error,
          code: 'auth/invalid-otp',
        },
        { status: 400 }
      );
    }
    
    // For signup, return the stored metadata (user data)
    // but don't consume the OTP yet - that happens in complete-profile
    if (purpose === 'signup' && result.data) {
      return NextResponse.json<ApiResponse>(
        {
          success: true,
          message: 'OTP verified successfully',
          data: {
            pendingSignup: result.data.metadata,
            expiresAt: result.data.expiresAt,
          },
        },
        { status: 200 }
      );
    }
    
    // For other purposes, we might consume the OTP here
    // (not implemented in this version)
    
    return NextResponse.json<ApiResponse>(
      {
        success: true,
        message: 'OTP verified successfully',
      },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('OTP verification error:', error);
    
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: ERROR_MESSAGES.GENERIC,
      },
      { status: 500 }
    );
  }
}
```

---

## 4. Complete Profile API Route

**Path:** `/src/app/api/auth/complete-profile/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/config';
import { verifyOTP, consumeOTP } from '@/lib/auth/otp';
import { sendWelcomeEmail } from '@/lib/email/resend';
import { ApiResponse, User } from '@/types';
import { VALIDATION_MESSAGES, ERROR_MESSAGES, SUCCESS_MESSAGES } from '@/lib/constants';

/**
 * POST /api/auth/complete-profile
 * Complete user registration after OTP verification
 * 
 * Flow:
 * 1. Re-verify OTP (security check)
 * 2. Create Firebase Auth user with password
 * 3. Create user profile in Firestore
 * 4. Consume OTP (mark as used)
 * 5. Send welcome email
 * 6. Return user data with auth token
 */

const completeProfileSchema = z.object({
  email: z.string().email(VALIDATION_MESSAGES.EMAIL_INVALID),
  password: z.string().min(6, VALIDATION_MESSAGES.PASSWORD_MIN),
  otp: z.string().length(6, 'OTP must be 6 digits'),
  userData: z.object({
    name: z.string().min(1, VALIDATION_MESSAGES.REQUIRED),
    phoneNumber: z.string().optional(),
  }).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validationResult = completeProfileSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'Invalid request data',
          errors: validationResult.error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        },
        { status: 400 }
      );
    }
    
    const { email, password, otp, userData } = validationResult.data;
    
    // Re-verify OTP before creating user
    const otpResult = verifyOTP(email, otp, 'signup');
    
    if (!otpResult.success) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: otpResult.error || 'Invalid or expired OTP',
          code: 'auth/invalid-otp',
        },
        { status: 400 }
      );
    }
    
    // Get user data from OTP metadata or request body
    const userInfo = userData || otpResult.data?.metadata;
    
    if (!userInfo?.name) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'User information missing',
          code: 'auth/missing-data',
        },
        { status: 400 }
      );
    }
    
    try {
      // Check if user already exists
      const userQuery = await getDoc(doc(db, 'users', email));
      if (userQuery.exists()) {
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: 'An account with this email already exists',
            code: 'auth/email-already-exists',
          },
          { status: 400 }
        );
      }
      
      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      // Create user profile in Firestore
      const userProfile: Partial<User> = {
        id: firebaseUser.uid,
        email: email,
        name: userInfo.name,
        phoneNumber: userInfo.phoneNumber || null,
        emailVerified: true, // Verified via OTP
        createdAt: new Date(),
        updatedAt: new Date(),
        disclaimerAccepted: false,
        status: 'active',
      };
      
      await setDoc(doc(db, 'users', firebaseUser.uid), {
        ...userProfile,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      // Consume OTP after successful user creation
      consumeOTP(email, 'signup');
      
      // Get auth token
      const token = await firebaseUser.getIdToken();
      
      // Send welcome email
      try {
        await sendWelcomeEmail({
          userName: userInfo.name,
          userEmail: email,
        });
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
        // Don't fail the registration if email fails
      }
      
      // Return success response
      return NextResponse.json<ApiResponse>(
        {
          success: true,
          message: SUCCESS_MESSAGES.SIGNUP,
          data: {
            user: userProfile,
            token,
          },
        },
        { status: 201 }
      );
      
    } catch (firebaseError: any) {
      console.error('Firebase error:', firebaseError);
      
      // Handle specific Firebase errors
      if (firebaseError.code === 'auth/email-already-in-use') {
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: 'An account with this email already exists',
            code: 'auth/email-already-exists',
          },
          { status: 400 }
        );
      }
      
      if (firebaseError.code === 'auth/weak-password') {
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: 'Password is too weak. Please use a stronger password.',
            code: 'auth/weak-password',
          },
          { status: 400 }
        );
      }
      
      throw firebaseError;
    }
    
  } catch (error) {
    console.error('Complete profile error:', error);
    
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: ERROR_MESSAGES.GENERIC,
      },
      { status: 500 }
    );
  }
}
```

---

## Important Notes

### Why OTP Failed in Production

1. **Serverless Architecture**: Vercel runs each API request in a separate function instance
2. **No Shared Memory**: The `Map` used for OTP storage exists only in each instance
3. **Instance Mismatch**: OTP stored in instance A, but verification request hits instance B
4. **Result**: "OTP not found" errors in production

### The Solution

The email verification link system solves these issues by:
- Storing tokens in Firestore (persistent database)
- No reliance on in-memory storage
- Works perfectly across serverless instances
- Better user experience (one click vs typing 6 digits)

### If You Need OTP Functionality

If you need to implement OTP for other features (like 2FA), consider:
1. Using a persistent store (Redis, Firestore, DynamoDB)
2. Implementing proper cleanup jobs
3. Adding rate limiting at the database level
4. Using a service like Twilio for SMS OTP