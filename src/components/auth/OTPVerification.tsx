'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { APP_NAME, ROUTES } from '@/lib/constants';

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
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function OTPVerification({ email, purpose, onSuccess, onCancel }: OTPVerificationProps) {
  const router = useRouter();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle OTP input change
  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const pastedCode = value.slice(0, 6).split('');
      const newOtp = [...otp];
      pastedCode.forEach((digit, i) => {
        if (i < 6) {
          newOtp[i] = digit;
        }
      });
      setOtp(newOtp);
      
      // Focus last input or next empty one
      const nextIndex = Math.min(pastedCode.length, 5);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    // Single digit input
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-advance to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle backspace
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    setError(null);
    setIsLoading(true);

    try {
      const endpoint = purpose === 'signup' ? '/api/auth/signup' : '/api/account/request-deletion';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend code');
      }

      setTimeLeft(600); // Reset timer
      setOtp(['', '', '', '', '', '']); // Clear inputs
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Verify OTP
  const handleVerifyOTP = async () => {
    const otpCode = otp.join('');
    
    if (otpCode.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    if (purpose === 'signup' && (!password || password !== confirmPassword)) {
      if (!showPasswordFields) {
        setShowPasswordFields(true);
        return;
      }
      setError('Passwords do not match');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const endpoint = purpose === 'signup' 
        ? '/api/auth/verify-otp' 
        : '/api/account/verify-deletion';
      
      const body = purpose === 'signup'
        ? { email, otp: otpCode, password }
        : { email, otp: otpCode };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Verification failed');
      }

      setSuccess(true);
      
      if (purpose === 'signup') {
        // Store token and redirect to dashboard
        if (data.data?.token) {
          localStorage.setItem('authToken', data.data.token);
        }
        setTimeout(() => {
          router.push(ROUTES.DASHBOARD);
        }, 2000);
      } else {
        // Show deletion success
        onSuccess?.();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="h-16 w-16 text-health-safe mx-auto mb-4" />
        <h2 className="text-elder-2xl font-bold mb-2">
          {purpose === 'signup' ? 'Account Created!' : 'Account Deleted'}
        </h2>
        <p className="text-elder-text-secondary">
          {purpose === 'signup' 
            ? 'Redirecting to your dashboard...' 
            : 'Your account has been permanently deleted.'}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-elder-2xl font-bold mb-2">
          {purpose === 'signup' ? 'Verify Your Email' : 'Confirm Account Deletion'}
        </h2>
        <p className="text-elder-text-secondary">
          We sent a 6-digit code to<br />
          <strong className="text-elder-text">{email}</strong>
        </p>
      </div>

      {/* OTP Input */}
      <div className="flex justify-center gap-2 mb-6">
        {otp.map((digit, index) => (
          <input
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]"
            maxLength={1}
            value={digit}
            onChange={(e) => handleOtpChange(index, e.target.value.replace(/\D/g, ''))}
            onKeyDown={(e) => handleKeyDown(index, e)}
            className="w-14 h-14 text-center text-elder-2xl font-bold border-2 border-elder-border rounded-lg focus:border-primary-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            disabled={isLoading}
          />
        ))}
      </div>

      {/* Timer */}
      <div className="text-center mb-6">
        <p className="text-elder-text-secondary">
          Code expires in: <span className="font-mono font-bold">{formatTime(timeLeft)}</span>
        </p>
      </div>

      {/* Password fields for signup */}
      {purpose === 'signup' && showPasswordFields && (
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-elder-base font-medium mb-2">
              Create Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 text-elder-base border border-elder-border rounded-lg focus:border-primary-500 focus:outline-none"
              placeholder="Enter password"
              disabled={isLoading}
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
              className="w-full px-4 py-3 text-elder-base border border-elder-border rounded-lg focus:border-primary-500 focus:outline-none"
              placeholder="Confirm password"
              disabled={isLoading}
            />
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mb-6 p-4 bg-health-danger/10 border border-health-danger/20 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-health-danger flex-shrink-0 mt-0.5" />
          <p className="text-elder-base text-health-danger">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-3">
        <Button
          onClick={handleVerifyOTP}
          disabled={isLoading || timeLeft === 0}
          className="w-full"
          size="large"
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin h-5 w-5 mr-2" />
              Verifying...
            </>
          ) : (
            purpose === 'signup' ? 'Verify & Create Account' : 'Confirm Deletion'
          )}
        </Button>

        <Button
          variant="secondary"
          onClick={handleResendOTP}
          disabled={isLoading || timeLeft > 540} // Can resend after 1 minute
          className="w-full"
          size="large"
        >
          Resend Code
        </Button>

        {onCancel && (
          <Button
            variant="secondary"
            onClick={onCancel}
            disabled={isLoading}
            className="w-full"
            size="large"
          >
            Cancel
          </Button>
        )}
      </div>

      <p className="text-elder-sm text-elder-text-secondary text-center mt-6">
        Didn't receive the email? Check your spam folder or{' '}
        <button
          onClick={handleResendOTP}
          className="text-primary-600 hover:underline"
          disabled={isLoading || timeLeft > 540}
        >
          resend code
        </button>
      </p>
    </div>
  );
}