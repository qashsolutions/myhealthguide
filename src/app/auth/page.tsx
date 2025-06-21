'use client';

import React, { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Shield, Heart, CheckCircle } from 'lucide-react';
import { AuthToggle } from '@/components/auth/AuthToggle';
import { APP_NAME } from '@/lib/constants';

/**
 * Authentication page content component
 */
function AuthPageContent() {
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode') as 'signup' | 'login' | null;

  const benefits = [
    {
      icon: <Shield className="h-8 w-8 text-primary-600" />,
      title: 'Your Data is Safe',
      description: 'We use bank-level security to protect your health information',
    },
    {
      icon: <Heart className="h-8 w-8 text-health-danger" />,
      title: 'Personalized for You',
      description: 'Get medication checks tailored to your age and health conditions',
    },
    {
      icon: <CheckCircle className="h-8 w-8 text-health-safe" />,
      title: 'Easy to Use',
      description: 'Large text, voice input, and simple navigation for seniors',
    },
  ];

  return (
    <div className="min-h-[calc(100vh-200px)] py-8">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 elder-desktop:grid-cols-2 gap-12 items-center">
          {/* Left side - Benefits */}
          <div className="order-2 elder-desktop:order-1">
            <h1 className="text-elder-2xl elder-tablet:text-elder-3xl font-bold text-elder-text mb-6">
              Welcome to {APP_NAME}
            </h1>
            
            <p className="text-elder-lg text-elder-text-secondary mb-8 leading-elder">
              Your trusted companion for medication safety. Join thousands of seniors who check their medications with confidence.
            </p>

            <div className="space-y-6">
              {benefits.map((benefit) => (
                <div key={benefit.title} className="flex gap-4">
                  <div className="flex-shrink-0">
                    {benefit.icon}
                  </div>
                  <div>
                    <h3 className="text-elder-lg font-semibold mb-2">
                      {benefit.title}
                    </h3>
                    <p className="text-elder-base text-elder-text-secondary">
                      {benefit.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Testimonial */}
            <div className="mt-12 p-6 bg-primary-50 rounded-elder-lg border-2 border-primary-200">
              <p className="text-elder-base text-primary-900 italic mb-4">
                "MyHealth Guide helped me discover a dangerous interaction between my medications. It may have saved my life!"
              </p>
              <p className="text-elder-sm text-primary-700 font-semibold">
                — Margaret, age 72
              </p>
            </div>
          </div>

          {/* Right side - Auth form */}
          <div className="order-1 elder-desktop:order-2">
            <div className="bg-white rounded-elder-lg shadow-elder-lg border border-elder-border p-8">
              <AuthToggle defaultMode={mode || 'signup'} />
            </div>

            {/* Help text */}
            <div className="mt-6 text-center">
              <p className="text-elder-base text-elder-text-secondary">
                Need help signing up?
              </p>
              <p className="text-elder-base text-primary-600">
                Call us at{' '}
                <a href="tel:1-800-MYHEALTH" className="font-semibold hover:underline">
                  1-800-MYHEALTH
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Authentication page with signup/login toggle
 * Eldercare-optimized with clear benefits messaging
 */
export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <AuthPageContent />
    </Suspense>
  );
}