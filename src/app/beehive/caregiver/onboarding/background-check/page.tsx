'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { supabase } from '@/lib/supabase';
import { getStripe, BACKGROUND_CHECK } from '@/lib/beehive/stripe';
import Link from 'next/link';

export default function BackgroundCheckPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState<any>(null);
  const [caregiverName, setCaregiverName] = useState('');
  const [consent, setConsent] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setUser(user);
        // Load caregiver name from profile
        const { data } = await supabase
          .from('caregiver_profiles')
          .select('first_name, last_name')
          .eq('user_id', user.uid)
          .single();
        
        if (data) {
          setCaregiverName(`${data.first_name} ${data.last_name}`);
        }
      } else {
        router.push('/beehive/login');
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handlePayment = async () => {
    if (!user) {
      setError('Please sign in to continue');
      return;
    }

    if (!consent) {
      setError('You must consent to the background check');
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
          name: caregiverName,
          type: 'caregiver_background_check',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create payment session');
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
      setError(err.message || 'Failed to start payment');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">
                ✓
              </div>
              <span className="ml-3 text-elder-base font-medium">Assessment</span>
            </div>
            <div className="flex-1 h-1 bg-green-600 mx-4"></div>
            <div className="flex items-center">
              <div className="w-10 h-10 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">
                ✓
              </div>
              <span className="ml-3 text-elder-base font-medium">Profile</span>
            </div>
            <div className="flex-1 h-1 bg-green-600 mx-4"></div>
            <div className="flex items-center">
              <div className="w-10 h-10 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">
                ✓
              </div>
              <span className="ml-3 text-elder-base font-medium">References</span>
            </div>
            <div className="flex-1 h-1 bg-gray-300 mx-4"></div>
            <div className="flex items-center">
              <div className="w-10 h-10 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold">
                4
              </div>
              <span className="ml-3 text-elder-base font-medium">Background Check</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-elder-lg shadow-elder p-8 border border-elder-border">
          <h1 className="text-elder-2xl font-bold text-elder-text mb-2">
            Background Check Required
          </h1>
          <p className="text-elder-base text-elder-text-secondary mb-8">
            All caregivers must pass a comprehensive background check for safety
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-elder text-elder-sm">
              {error}
            </div>
          )}

          {/* Background Check Details */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-elder-lg p-6 mb-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-elder-xl font-bold text-elder-text">
                  {BACKGROUND_CHECK.description}
                </h2>
                <p className="text-elder-base text-elder-text-secondary mt-1">
                  Powered by trusted verification partners
                </p>
              </div>
              <div className="text-right">
                <p className="text-elder-2xl font-bold text-primary-600">
                  ${(BACKGROUND_CHECK.basePrice / 100).toFixed(2)}
                </p>
                <p className="text-elder-sm text-elder-text-secondary">
                  one-time fee
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-elder-base font-semibold text-elder-text">
                What's Included:
              </h3>
              {BACKGROUND_CHECK.features.map((feature, index) => (
                <div key={index} className="flex items-start">
                  <svg className="w-6 h-6 text-green-600 mt-0.5 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-elder-base text-elder-text">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Why It's Important */}
          <div className="mb-8">
            <h3 className="text-elder-lg font-semibold text-elder-text mb-4">
              Why Background Checks Matter
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start">
                <div className="w-12 h-12 bg-red-100 rounded-elder flex items-center justify-center flex-shrink-0 mr-3">
                  <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-elder-base font-semibold text-elder-text">
                    Safety First
                  </h4>
                  <p className="text-elder-sm text-elder-text-secondary">
                    Protects vulnerable elderly patients from potential harm
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="w-12 h-12 bg-blue-100 rounded-elder flex items-center justify-center flex-shrink-0 mr-3">
                  <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-elder-base font-semibold text-elder-text">
                    Trust & Confidence
                  </h4>
                  <p className="text-elder-sm text-elder-text-secondary">
                    Families can hire with complete peace of mind
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="w-12 h-12 bg-green-100 rounded-elder flex items-center justify-center flex-shrink-0 mr-3">
                  <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-elder-base font-semibold text-elder-text">
                    Professional Standard
                  </h4>
                  <p className="text-elder-sm text-elder-text-secondary">
                    Industry-standard verification for professional caregivers
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="w-12 h-12 bg-purple-100 rounded-elder flex items-center justify-center flex-shrink-0 mr-3">
                  <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-elder-base font-semibold text-elder-text">
                    Fast Processing
                  </h4>
                  <p className="text-elder-sm text-elder-text-secondary">
                    Results typically available within 24-48 hours
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Consent Section */}
          <div className="bg-amber-50 border border-amber-200 rounded-elder p-6 mb-8">
            <h3 className="text-elder-base font-semibold text-amber-900 mb-3">
              Important Information
            </h3>
            <ul className="space-y-2 text-elder-sm text-amber-800">
              <li>• Results will be shared with potential families</li>
              <li>• You'll receive a copy of your background check report</li>
              <li>• The check is valid for 1 year from completion date</li>
              <li>• Additional state-specific checks may be required</li>
              <li>• You have the right to dispute any incorrect information</li>
            </ul>
          </div>

          {/* Consent Checkbox */}
          <div className="mb-8">
            <label className="flex items-start cursor-pointer">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-1 h-5 w-5 text-primary-600 border-2 border-elder-border rounded focus:ring-primary-500"
              />
              <span className="ml-3 text-elder-base text-elder-text">
                I consent to a comprehensive background check and understand that the results will be used to verify my eligibility as a caregiver on the Beehive platform. I certify that all information I have provided is accurate and complete.
              </span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center">
            <Link
              href="/beehive/caregiver/onboarding/references"
              className="text-elder-base text-primary-600 hover:text-primary-700 font-medium"
            >
              ← Back to References
            </Link>
            
            <button
              onClick={handlePayment}
              disabled={loading || !consent}
              className="px-8 py-3 bg-primary-600 text-white text-elder-base font-medium rounded-elder hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {loading ? (
                <span>Processing...</span>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  Pay $20 & Complete Registration
                </>
              )}
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
                <p>Your payment is processed securely through Stripe. Background check results are handled confidentially by our trusted verification partner.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}