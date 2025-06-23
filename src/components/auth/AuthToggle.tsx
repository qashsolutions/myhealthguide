'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, User, Phone, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { SignupData, LoginData } from '@/types';
import { VALIDATION_MESSAGES, SUCCESS_MESSAGES, ROUTES } from '@/lib/constants';

/**
 * Single-page authentication component with toggle between signup/login
 * Eldercare-optimized with email verification flow
 */

// Validation schemas
const signupSchema = z.object({
  email: z.string().email(VALIDATION_MESSAGES.EMAIL_INVALID),
  password: z.string().min(6, VALIDATION_MESSAGES.PASSWORD_MIN),
  confirmPassword: z.string(),
  name: z.string().min(1, VALIDATION_MESSAGES.REQUIRED),
  phoneNumber: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: VALIDATION_MESSAGES.PASSWORD_MISMATCH,
  path: ['confirmPassword'],
});

const loginSchema = z.object({
  email: z.string().email(VALIDATION_MESSAGES.EMAIL_INVALID),
  password: z.string().min(1, VALIDATION_MESSAGES.REQUIRED),
});

type SignupFormData = z.infer<typeof signupSchema>;
type LoginFormData = z.infer<typeof loginSchema>;

interface AuthToggleProps {
  defaultMode?: 'signup' | 'login';
}

export function AuthToggle({ defaultMode = 'signup' }: AuthToggleProps): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<'signup' | 'login'>(defaultMode);
  const [showPhoneField, setShowPhoneField] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [signupEmail, setSignupEmail] = useState('');
  const [isResending, setIsResending] = useState(false);

  // Check URL params on mount
  useEffect(() => {
    const modeParam = searchParams.get('mode');
    if (modeParam === 'login' || modeParam === 'signup') {
      setMode(modeParam);
    }
    
    // Check if user just verified their email
    const verified = searchParams.get('verified');
    if (verified === 'true' && mode === 'login') {
      setAuthError(null);
      // Show success message
      setTimeout(() => {
        const successDiv = document.createElement('div');
        successDiv.className = 'mb-6 p-4 bg-health-safe-bg border-2 border-health-safe rounded-elder flex items-start gap-3';
        successDiv.innerHTML = `
          <svg class="h-6 w-6 text-health-safe flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <p class="text-elder-base text-health-safe">Email verified successfully! You can now sign in.</p>
        `;
        const form = document.querySelector('form');
        if (form && form.parentNode) {
          form.parentNode.insertBefore(successDiv, form);
          setTimeout(() => successDiv.remove(), 5000);
        }
      }, 100);
    }
  }, [searchParams, mode]);

  // Form setup for signup
  const signupForm = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      name: '',
      phoneNumber: '',
    },
  });

  // Form setup for login
  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Handle signup
  const handleSignup = async (data: SignupFormData) => {
    setAuthError(null);
    
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          name: data.name,
          phoneNumber: data.phoneNumber || undefined,
        }),
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        setSignupEmail(data.email);
        setSignupSuccess(true);
        signupForm.reset();
      } else {
        setAuthError(result.error || 'Failed to create account');
      }
    } catch (error) {
      setAuthError('Network error. Please check your connection and try again.');
    }
  };

  // Handle login
  const handleLogin = async (data: LoginFormData) => {
    setAuthError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Store token if provided
        if (result.data?.token && typeof window !== 'undefined') {
          localStorage.setItem('auth-token', result.data.token);
        }
        
        // Check for redirect
        const redirect = searchParams.get('redirect') || ROUTES.DASHBOARD;
        router.push(redirect);
      } else {
        setAuthError(result.error || 'Login failed');
        
        // Show resend verification option if email not verified
        if (result.code === 'auth/email-not-verified') {
          setSignupEmail(data.email);
        }
      }
    } catch (error) {
      setAuthError('Network error. Please check your connection and try again.');
    }
  };

  // Handle resend verification
  const handleResendVerification = async () => {
    if (!signupEmail) return;
    
    setIsResending(true);
    setAuthError(null);
    
    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: signupEmail }),
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        setSignupSuccess(true);
      } else {
        setAuthError(result.error || 'Failed to resend verification email');
      }
    } catch (error) {
      setAuthError('Network error. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  // Toggle between modes
  const toggleMode = () => {
    setMode(mode === 'signup' ? 'login' : 'signup');
    setAuthError(null);
    setSignupSuccess(false);
    signupForm.reset();
    loginForm.reset();
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Mode toggle */}
      <div className="bg-elder-background-alt rounded-elder-lg p-2 mb-8 flex gap-2">
        <button
          onClick={() => mode !== 'signup' && toggleMode()}
          className={`flex-1 py-3 px-4 rounded-elder text-elder-base font-medium transition-all ${
            mode === 'signup'
              ? 'bg-white shadow-sm text-primary-700'
              : 'text-elder-text-secondary hover:text-elder-text'
          }`}
        >
          Create Account
        </button>
        <button
          onClick={() => mode !== 'login' && toggleMode()}
          className={`flex-1 py-3 px-4 rounded-elder text-elder-base font-medium transition-all ${
            mode === 'login'
              ? 'bg-white shadow-sm text-primary-700'
              : 'text-elder-text-secondary hover:text-elder-text'
          }`}
        >
          Sign In
        </button>
      </div>

      {/* Error message */}
      {authError && (
        <div className="mb-6 p-4 bg-health-danger-bg border-2 border-health-danger rounded-elder flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-health-danger flex-shrink-0 mt-1" />
            <p className="text-elder-base text-health-danger">{authError}</p>
          </div>
          
          {/* Resend verification option */}
          {authError.includes('verify') && signupEmail && (
            <Button
              variant="secondary"
              size="medium"
              onClick={handleResendVerification}
              loading={isResending}
              className="self-start"
            >
              Resend Verification Email
            </Button>
          )}
        </div>
      )}

      {/* Signup Form */}
      {mode === 'signup' && (
        <>
          {signupSuccess ? (
            <div className="text-center py-8">
              <div className="mb-6">
                <div className="w-20 h-20 bg-health-safe-bg rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="h-10 w-10 text-health-safe" />
                </div>
                <h3 className="text-elder-xl font-semibold text-elder-text mb-2">
                  Check Your Email!
                </h3>
                <p className="text-elder-base text-elder-text-secondary mb-2">
                  We've sent a verification link to
                </p>
                <p className="text-elder-lg font-semibold text-elder-text mb-4">
                  {signupEmail}
                </p>
                <div className="bg-primary-50 rounded-elder p-4 mb-6">
                  <p className="text-elder-base text-primary-900">
                    Click the link in the email to verify your account and complete registration.
                  </p>
                </div>
                <p className="text-elder-sm text-elder-text-secondary">
                  Didn't receive the email? Check your spam folder or{' '}
                  <button
                    onClick={handleResendVerification}
                    disabled={isResending}
                    className="text-primary-600 hover:text-primary-700 hover:underline disabled:opacity-50"
                  >
                    {isResending ? 'sending...' : 'resend verification email'}
                  </button>
                </p>
              </div>
              <button
                onClick={() => {
                  setSignupSuccess(false);
                  setMode('login');
                }}
                className="text-elder-base text-primary-600 hover:text-primary-700 hover:underline"
              >
                Already verified? Sign in
              </button>
            </div>
          ) : (
            <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-6">
              <Input
                {...signupForm.register('name')}
                label="Full Name"
                placeholder="Enter your full name"
                icon={<User className="h-5 w-5" />}
                error={signupForm.formState.errors.name?.message}
                required
              />

              <Input
                {...signupForm.register('email')}
                type="email"
                label="Email Address"
                placeholder="your@email.com"
                icon={<Mail className="h-5 w-5" />}
                error={signupForm.formState.errors.email?.message}
                required
              />

              <Input
                {...signupForm.register('password')}
                type="password"
                label="Password"
                placeholder="At least 6 characters"
                icon={<Lock className="h-5 w-5" />}
                error={signupForm.formState.errors.password?.message}
                showPasswordToggle
                required
              />

              <Input
                {...signupForm.register('confirmPassword')}
                type="password"
                label="Confirm Password"
                placeholder="Enter password again"
                icon={<Lock className="h-5 w-5" />}
                error={signupForm.formState.errors.confirmPassword?.message}
                showPasswordToggle
                required
              />

              {/* Progressive phone field */}
              {showPhoneField ? (
                <Input
                  {...signupForm.register('phoneNumber')}
                  type="tel"
                  label="Phone Number (Optional)"
                  placeholder="+1 (555) 123-4567"
                  icon={<Phone className="h-5 w-5" />}
                  error={signupForm.formState.errors.phoneNumber?.message}
                  helpText="We'll use this for important health reminders"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setShowPhoneField(true)}
                  className="w-full text-left p-4 border-2 border-dashed border-elder-border rounded-elder hover:border-primary-500 transition-colors"
                >
                  <p className="text-elder-base text-elder-text-secondary">
                    + Add phone number (optional)
                  </p>
                  <p className="text-elder-sm text-elder-text-secondary mt-1">
                    For medication reminders
                  </p>
                </button>
              )}

              <Button
                type="submit"
                variant="primary"
                size="large"
                fullWidth
                loading={signupForm.formState.isSubmitting}
              >
                Create Account
              </Button>

              <p className="text-elder-sm text-elder-text-secondary text-center">
                By creating an account, you agree to our{' '}
                <a href={ROUTES.PRIVACY} className="text-primary-600 hover:underline">
                  Privacy Policy
                </a>{' '}
                and{' '}
                <a href={ROUTES.MEDICAL_DISCLAIMER} className="text-primary-600 hover:underline">
                  Medical Disclaimer
                </a>
              </p>
            </form>
          )}
        </>
      )}

      {/* Login Form */}
      {mode === 'login' && (
        <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-6">
          <Input
            {...loginForm.register('email')}
            type="email"
            label="Email Address"
            placeholder="your@email.com"
            icon={<Mail className="h-5 w-5" />}
            error={loginForm.formState.errors.email?.message}
            required
          />

          <Input
            {...loginForm.register('password')}
            type="password"
            label="Password"
            placeholder="Enter your password"
            icon={<Lock className="h-5 w-5" />}
            error={loginForm.formState.errors.password?.message}
            showPasswordToggle
            required
          />

          <div className="flex justify-end">
            <a
              href={`${ROUTES.AUTH}/reset-password`}
              className="text-elder-base text-primary-600 hover:text-primary-700 hover:underline"
            >
              Forgot password?
            </a>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="large"
            fullWidth
            loading={loginForm.formState.isSubmitting}
          >
            Sign In
          </Button>
        </form>
      )}
    </div>
  );
}