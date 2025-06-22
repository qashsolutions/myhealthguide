import React from 'react';
import Link from 'next/link';
import { Heart, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { APP_NAME, ROUTES } from '@/lib/constants';

/**
 * Goodbye page shown after account deletion
 * Simple, respectful farewell with recovery option reminder
 */
export default function GoodbyePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <div className="mx-auto w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mb-6">
            <Heart className="h-8 w-8 text-primary-600" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Thank You for Using {APP_NAME}
          </h1>
          
          <p className="text-gray-600 mb-6">
            Your account has been scheduled for deletion. We're sorry to see you go 
            and hope we were able to help you manage your health safely.
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-blue-800 text-sm">
              <strong>Remember:</strong> You have 30 days to reactivate your account 
              by signing in again. After that, your data will be permanently deleted.
            </p>
          </div>
          
          <div className="space-y-4">
            <p className="text-gray-600">
              If you change your mind:
            </p>
            
            <Link href={ROUTES.AUTH}>
              <Button
                variant="primary"
                size="large"
                icon={<ArrowRight className="h-5 w-5" />}
                className="w-full"
              >
                Sign In to Reactivate
              </Button>
            </Link>
            
            <Link href={ROUTES.HOME}>
              <Button
                variant="secondary"
                size="large"
                className="w-full"
              >
                Return to Homepage
              </Button>
            </Link>
          </div>
          
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Take care of yourself and stay healthy. 💙
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}