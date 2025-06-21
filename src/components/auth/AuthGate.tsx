'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { ROUTES } from '@/lib/constants';

/**
 * Authentication gate component
 * Shows modal prompting users to sign in/up before accessing features
 */
interface AuthGateProps {
  isOpen: boolean;
  onClose: () => void;
  feature?: string;
  redirectTo?: string;
}

export function AuthGate({ 
  isOpen, 
  onClose, 
  feature = 'this feature',
  redirectTo 
}: AuthGateProps): JSX.Element {
  const router = useRouter();

  const handleSignUp = () => {
    // Store intended destination
    if (redirectTo) {
      sessionStorage.setItem('authRedirect', redirectTo);
    }
    router.push(`${ROUTES.AUTH}?mode=signup`);
  };

  const handleSignIn = () => {
    // Store intended destination
    if (redirectTo) {
      sessionStorage.setItem('authRedirect', redirectTo);
    }
    router.push(`${ROUTES.AUTH}?mode=login`);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Sign In to Continue"
      description={`Create a free account to access ${feature} and keep your health information secure.`}
      size="medium"
    >
      <div className="space-y-6">
        {/* Benefits section */}
        <div className="bg-primary-50 rounded-elder p-6">
          <h3 className="text-elder-lg font-semibold mb-4">
            Why create an account?
          </h3>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <CheckCircle 
                className="h-6 w-6 text-health-safe flex-shrink-0 mt-1" 
                aria-hidden="true" 
              />
              <span className="text-elder-base text-elder-text-secondary">
                Save your medications for quick future checks
              </span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle 
                className="h-6 w-6 text-health-safe flex-shrink-0 mt-1" 
                aria-hidden="true" 
              />
              <span className="text-elder-base text-elder-text-secondary">
                Get personalized health insights and reminders
              </span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle 
                className="h-6 w-6 text-health-safe flex-shrink-0 mt-1" 
                aria-hidden="true" 
              />
              <span className="text-elder-base text-elder-text-secondary">
                Access voice-enabled features for easier use
              </span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle 
                className="h-6 w-6 text-health-safe flex-shrink-0 mt-1" 
                aria-hidden="true" 
              />
              <span className="text-elder-base text-elder-text-secondary">
                Keep your health information private and secure
              </span>
            </li>
          </ul>
        </div>

        {/* Action buttons */}
        <div className="space-y-4">
          <Button
            variant="primary"
            size="large"
            fullWidth
            onClick={handleSignUp}
          >
            Create Free Account
          </Button>
          
          <Button
            variant="secondary"
            size="large"
            fullWidth
            onClick={handleSignIn}
          >
            I Already Have an Account
          </Button>
        </div>

        {/* Privacy notice */}
        <p className="text-elder-sm text-elder-text-secondary text-center">
          By continuing, you agree to our{' '}
          <a 
            href={ROUTES.PRIVACY} 
            className="text-primary-600 hover:text-primary-700 underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Privacy Policy
          </a>{' '}
          and{' '}
          <a 
            href={ROUTES.MEDICAL_DISCLAIMER} 
            className="text-primary-600 hover:text-primary-700 underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Medical Disclaimer
          </a>
        </p>
      </div>
    </Modal>
  );
}