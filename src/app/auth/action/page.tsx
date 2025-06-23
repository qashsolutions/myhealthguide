'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { completeSignupWithEmailLink, isSignInWithEmailLink } from '@/lib/firebase/auth';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@/lib/constants';
import { auth } from '@/lib/firebase/config';

/**
 * Email link action handler page
 * Handles magic link verification for signup and login
 */
export default function AuthActionPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email...');

  useEffect(() => {
    const handleEmailLink = async () => {
      try {
        // Get the email from storage or URL params
        let email = window.localStorage.getItem('emailForSignIn');
        
        // Also check URL params
        const urlParams = new URLSearchParams(window.location.search);
        const emailFromUrl = urlParams.get('email');
        
        if (!email && emailFromUrl) {
          email = decodeURIComponent(emailFromUrl);
        }
        
        if (!email) {
          // Ask user to provide email
          const userEmail = window.prompt('Please provide your email for confirmation');
          if (!userEmail) {
            throw new Error('Email is required to complete sign in');
          }
          email = userEmail;
        }

        const emailToUse = email;
        const url = window.location.href;

        // Check if this is a valid sign-in link
        if (!isSignInWithEmailLink(auth, url)) {
          throw new Error('Invalid verification link');
        }

        // Complete the signup/signin
        setMessage('Completing your registration...');
        const result = await completeSignupWithEmailLink(emailToUse, url);

        if (!result.success) {
          throw new Error(result.error || 'Failed to verify email');
        }

        if (result.user) {
          // User is already logged in via Firebase auth
          // No need to call login function as auth state will update automatically
          
          setStatus('success');
          setMessage('Email verified successfully! Redirecting...');
          
          // Redirect to medical disclaimer or dashboard
          setTimeout(() => {
            if (!result.user?.disclaimerAccepted) {
              router.push(ROUTES.MEDICAL_DISCLAIMER);
            } else {
              router.push(ROUTES.DASHBOARD);
            }
          }, 2000);
        }
      } catch (error: any) {
        console.error('Email link error:', error);
        setStatus('error');
        setMessage(error.message || 'Failed to verify email. Please try again.');
      }
    };

    handleEmailLink();
  }, [router, login]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-elder-background">
      <div className="max-w-md w-full mx-auto p-8">
        <div className="bg-white rounded-elder-lg shadow-lg p-8 text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="h-16 w-16 text-primary-600 animate-spin mx-auto mb-4" />
              <h2 className="text-elder-xl font-semibold text-elder-text mb-2">
                Verifying Your Email
              </h2>
              <p className="text-elder-base text-elder-text-secondary">
                {message}
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="h-16 w-16 text-health-safe mx-auto mb-4" />
              <h2 className="text-elder-xl font-semibold text-elder-text mb-2">
                Success!
              </h2>
              <p className="text-elder-base text-elder-text-secondary">
                {message}
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="h-16 w-16 text-health-danger mx-auto mb-4" />
              <h2 className="text-elder-xl font-semibold text-elder-text mb-2">
                Verification Failed
              </h2>
              <p className="text-elder-base text-elder-text-secondary mb-6">
                {message}
              </p>
              <button
                onClick={() => router.push(ROUTES.AUTH)}
                className="text-elder-base text-primary-600 hover:text-primary-700 font-medium"
              >
                Return to Sign In
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}