'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, User, Phone, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { signUp, signIn } from '@/lib/firebase/auth';
import { SignupData, LoginData } from '@/types';
import { VALIDATION_MESSAGES, SUCCESS_MESSAGES, ROUTES } from '@/lib/constants';

/**
 * Single-page authentication component with toggle between signup/login
 * Eldercare-optimized with progressive onboarding
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
  const [mode, setMode] = useState<'signup' | 'login'>(defaultMode);
  const [showPhoneField, setShowPhoneField] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

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
    
    const signupData: SignupData = {
      email: data.email,
      password: data.password,
      name: data.name,
      phoneNumber: data.phoneNumber || undefined,
    };

    const response = await signUp(signupData);

    if (response.success) {
      // Check for redirect
      const redirect = sessionStorage.getItem('authRedirect');
      sessionStorage.removeItem('authRedirect');
      
      router.push(redirect || ROUTES.DASHBOARD);
    } else {
      setAuthError(response.error || 'Signup failed');
    }
  };

  // Handle login
  const handleLogin = async (data: LoginFormData) => {
    setAuthError(null);

    const loginData: LoginData = {
      email: data.email,
      password: data.password,
    };

    const response = await signIn(loginData);

    if (response.success) {
      // Check for redirect
      const redirect = sessionStorage.getItem('authRedirect');
      sessionStorage.removeItem('authRedirect');
      
      router.push(redirect || ROUTES.DASHBOARD);
    } else {
      setAuthError(response.error || 'Login failed');
    }
  };

  // Toggle between modes
  const toggleMode = () => {
    setMode(mode === 'signup' ? 'login' : 'signup');
    setAuthError(null);
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
        <div className="mb-6 p-4 bg-health-danger-bg border-2 border-health-danger rounded-elder flex items-start gap-3">
          <AlertCircle className="h-6 w-6 text-health-danger flex-shrink-0 mt-1" />
          <p className="text-elder-base text-health-danger">{authError}</p>
        </div>
      )}

      {/* Signup Form */}
      {mode === 'signup' && (
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
            helpText="Must be at least 6 characters"
            icon={<Lock className="h-5 w-5" />}
            error={signupForm.formState.errors.password?.message}
            showPasswordToggle
            required
          />

          <Input
            {...signupForm.register('confirmPassword')}
            type="password"
            label="Confirm Password"
            placeholder="Re-enter your password"
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
            Create My Account
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