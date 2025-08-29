'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signUpWithEmail } from '@/lib/beehive/auth-integration';
import Link from 'next/link';

export default function PatientSignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [quickSignup, setQuickSignup] = useState(false);
  const [prefilledData, setPrefilledData] = useState<any>(null);

  useEffect(() => {
    // Check if this is a quick signup from find-caregivers
    if (searchParams.get('quick') === 'true') {
      const savedData = sessionStorage.getItem('patientRegistration');
      if (savedData) {
        const data = JSON.parse(savedData);
        setPrefilledData(data);
        setEmail(data.email || '');
        setQuickSignup(true);
        setAgreeToTerms(true); // They already agreed on previous page
      }
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    // Validate phone number (10 digits)
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length !== 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    if (!agreeToTerms) {
      setError('You must agree to the terms and conditions');
      return;
    }

    setLoading(true);

    try {
      // Format phone number (remove non-digits)
      const formattedPhone = phone.replace(/\D/g, '');
      
      // Sign up with Firebase and create Supabase user with phone
      const { user, error: signupError } = await signUpWithEmail(email, password, 'patient', formattedPhone);
      
      if (signupError) {
        setError(signupError);
        return;
      }

      if (user) {
        // Store emergency contact info and phone temporarily (will be saved in profile)
        sessionStorage.setItem('emergencyContact', JSON.stringify({
          name: emergencyName,
          phone: emergencyPhone
        }));
        sessionStorage.setItem('userPhone', formattedPhone);
        
        // If from quick signup, also store the prefilled data
        if (prefilledData) {
          sessionStorage.setItem('patientPreferences', JSON.stringify({
            ...prefilledData,
            phone: formattedPhone
          }));
        }
        
        // Redirect to subscription page
        router.push('/beehive/patient/subscription');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-elder-lg shadow-elder p-8 border border-elder-border">
          <h1 className="text-elder-2xl font-bold text-elder-text mb-2">
            {quickSignup ? 'Complete Your Registration' : 'Find a Trusted Caregiver'}
          </h1>
          <p className="text-elder-base text-elder-text-secondary mb-8">
            {quickSignup 
              ? `Welcome ${prefilledData?.firstName || ''}! Just a few more details to connect with caregivers.`
              : 'Join Beehive to connect with verified caregivers for your loved ones'}
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-elder text-elder-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-elder-base font-medium text-elder-text mb-1">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 text-elder-base border-2 border-elder-border rounded-elder focus:border-primary-500 focus:outline-none"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-elder-base font-medium text-elder-text mb-1">
                Mobile Phone Number
              </label>
              <p className="text-elder-sm text-gray-500 mb-2">
                For account security and important updates
              </p>
              <input
                id="phone"
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3 text-elder-base border-2 border-elder-border rounded-elder focus:border-primary-500 focus:outline-none"
                placeholder="(555) 123-4567"
                pattern="[0-9]{3}-?[0-9]{3}-?[0-9]{4}"
                title="Please enter a valid 10-digit phone number"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-elder-base font-medium text-elder-text mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 text-elder-base border-2 border-elder-border rounded-elder focus:border-primary-500 focus:outline-none"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-elder-base font-medium text-elder-text mb-1">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 text-elder-base border-2 border-elder-border rounded-elder focus:border-primary-500 focus:outline-none"
                placeholder="••••••••"
              />
            </div>

            <div className="border-t pt-4">
              <h3 className="text-elder-lg font-semibold text-elder-text mb-2">
                Emergency Contact
              </h3>
              <p className="text-elder-sm text-gray-500 mb-3">
                We'll only contact them in case of emergencies
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="emergencyName" className="block text-elder-base font-medium text-elder-text mb-1">
                    Contact Name
                  </label>
                  <input
                    id="emergencyName"
                    type="text"
                    required
                    value={emergencyName}
                    onChange={(e) => setEmergencyName(e.target.value)}
                    className="w-full px-4 py-3 text-elder-base border-2 border-elder-border rounded-elder focus:border-primary-500 focus:outline-none"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label htmlFor="emergencyPhone" className="block text-elder-base font-medium text-elder-text mb-1">
                    Contact Phone
                  </label>
                  <input
                    id="emergencyPhone"
                    type="tel"
                    required
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                    className="w-full px-4 py-3 text-elder-base border-2 border-elder-border rounded-elder focus:border-primary-500 focus:outline-none"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-elder p-4">
              <h3 className="text-elder-base font-semibold text-blue-900 mb-2">
                Subscription Information
              </h3>
              <p className="text-elder-sm text-blue-800">
                • $11/month for unlimited caregiver matching<br />
                • Cancel anytime<br />
                • First match guaranteed within 48 hours
              </p>
            </div>

            <div className="flex items-start">
              <input
                id="terms"
                type="checkbox"
                checked={agreeToTerms}
                onChange={(e) => setAgreeToTerms(e.target.checked)}
                className="mt-1 h-5 w-5 text-primary-600 border-2 border-elder-border rounded focus:ring-primary-500"
              />
              <label htmlFor="terms" className="ml-3 text-elder-sm text-elder-text-secondary">
                I agree to the{' '}
                <Link href="/terms" className="text-primary-600 hover:text-primary-700">
                  Terms of Service
                </Link>{' '}
                and understand the $11/month subscription fee.
              </label>
            </div>

            <button
              type="submit"
              disabled={loading || !agreeToTerms}
              className="w-full py-3 px-6 bg-primary-600 text-white text-elder-base font-medium rounded-elder hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating Account...' : 'Create Account & Continue'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-elder-base text-elder-text-secondary">
              Already have an account?{' '}
              <Link href="/beehive/login" className="text-primary-600 hover:text-primary-700 font-medium">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}