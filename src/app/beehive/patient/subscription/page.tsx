'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { getStripe, PLANS } from '@/lib/beehive/stripe';
import { loadStripe } from '@stripe/stripe-js';

export default function PatientSubscriptionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setUser(user);
      } else {
        router.push('/beehive/patient/signup');
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleSubscribe = async () => {
    if (!user) {
      setError('Please sign in to continue');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Call API to create Stripe checkout session
      const response = await fetch('/api/beehive/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.uid,
          email: user.email,
          type: 'patient_subscription',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { sessionId } = await response.json();

      // Redirect to Stripe checkout
      const stripe = await getStripe();
      if (stripe) {
        const { error } = await stripe.redirectToCheckout({ sessionId });
        if (error) {
          throw error;
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to start subscription');
      setLoading(false);
    }
  };

  const handleSkip = () => {
    // Allow skipping for now (can restrict later)
    router.push('/beehive/patient/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-elder-lg shadow-elder p-8 border border-elder-border">
          <div className="text-center mb-8">
            <h1 className="text-elder-2xl font-bold text-elder-text mb-2">
              Complete Your Subscription
            </h1>
            <p className="text-elder-base text-elder-text-secondary">
              Get unlimited access to verified caregivers
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-elder text-elder-sm">
              {error}
            </div>
          )}

          {/* Plan Details */}
          <div className="bg-gradient-to-br from-primary-50 to-blue-50 rounded-elder-lg p-8 mb-8 border-2 border-primary-200">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-elder-xl font-bold text-elder-text">
                  {PLANS.PATIENT_MONTHLY.name}
                </h2>
                <p className="text-elder-base text-elder-text-secondary mt-1">
                  Full access to Beehive platform
                </p>
              </div>
              <div className="text-right">
                <p className="text-elder-2xl font-bold text-primary-600">
                  ${(PLANS.PATIENT_MONTHLY.price / 100).toFixed(2)}
                </p>
                <p className="text-elder-sm text-elder-text-secondary">
                  per month
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {PLANS.PATIENT_MONTHLY.features.map((feature, index) => (
                <div key={index} className="flex items-start">
                  <svg className="w-6 h-6 text-green-600 mt-0.5 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-elder-base text-elder-text">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Benefits */}
          <div className="mb-8">
            <h3 className="text-elder-lg font-semibold text-elder-text mb-4">
              Why Subscribe?
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start">
                <div className="w-12 h-12 bg-blue-100 rounded-elder flex items-center justify-center flex-shrink-0 mr-3">
                  <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-elder-base font-semibold text-elder-text">
                    Verified Caregivers
                  </h4>
                  <p className="text-elder-sm text-elder-text-secondary">
                    All caregivers pass psychometric assessments and background checks
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="w-12 h-12 bg-green-100 rounded-elder flex items-center justify-center flex-shrink-0 mr-3">
                  <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-elder-base font-semibold text-elder-text">
                    Save Time
                  </h4>
                  <p className="text-elder-sm text-elder-text-secondary">
                    Find qualified caregivers in minutes, not weeks
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="w-12 h-12 bg-purple-100 rounded-elder flex items-center justify-center flex-shrink-0 mr-3">
                  <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-elder-base font-semibold text-elder-text">
                    Family Access
                  </h4>
                  <p className="text-elder-sm text-elder-text-secondary">
                    Share access with family members for coordinated care
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="w-12 h-12 bg-red-100 rounded-elder flex items-center justify-center flex-shrink-0 mr-3">
                  <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-elder-base font-semibold text-elder-text">
                    Peace of Mind
                  </h4>
                  <p className="text-elder-sm text-elder-text-secondary">
                    24/7 support and monitoring for safety
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Trust Badges */}
          <div className="flex items-center justify-center space-x-6 mb-8 py-4 border-y border-gray-200">
            <div className="text-center">
              <p className="text-elder-lg font-bold text-primary-600">10,000+</p>
              <p className="text-elder-sm text-elder-text-secondary">Happy Families</p>
            </div>
            <div className="text-center">
              <p className="text-elder-lg font-bold text-primary-600">98%</p>
              <p className="text-elder-sm text-elder-text-secondary">Satisfaction Rate</p>
            </div>
            <div className="text-center">
              <p className="text-elder-lg font-bold text-primary-600">48hr</p>
              <p className="text-elder-sm text-elder-text-secondary">Match Guarantee</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleSubscribe}
              disabled={loading}
              className="w-full py-4 px-6 bg-primary-600 text-white text-elder-base font-medium rounded-elder hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <span>Processing...</span>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  Subscribe Now - $11/month
                </>
              )}
            </button>

            <button
              onClick={handleSkip}
              disabled={loading}
              className="w-full py-3 px-6 text-elder-base text-elder-text-secondary hover:text-elder-text transition-colors disabled:opacity-50"
            >
              Skip for now (limited access)
            </button>
          </div>

          {/* Security Notice */}
          <div className="mt-6 p-4 bg-gray-50 rounded-elder">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-gray-400 mt-0.5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <div className="text-elder-sm text-elder-text-secondary">
                <p className="font-medium mb-1">Secure Payment</p>
                <p>Your payment information is encrypted and secure. You can cancel anytime from your account settings.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}