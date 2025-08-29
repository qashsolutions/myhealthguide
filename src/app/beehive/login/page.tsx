'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import Link from 'next/link';

export default function BeehiveLoginPage() {
  const router = useRouter();
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/beehive');
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!confirmationResult) {
        // Send verification code
        const recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
        });
        const result = await signInWithPhoneNumber(auth, phone, recaptchaVerifier);
        setConfirmationResult(result);
      } else {
        // Verify code
        await confirmationResult.confirm(verificationCode);
        router.push('/beehive');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl w-full space-y-6">
        <div>
          <h2 className="mt-6 text-center text-elder-2xl font-bold text-elder-text">
            Sign in to Beehive
          </h2>
          <p className="mt-2 text-center text-elder-base text-elder-text-secondary">
            Access your caregiver or patient account
          </p>
        </div>

        <div className="bg-white rounded-elder-lg shadow-elder p-8 border border-elder-border">
          {/* Login Method Toggle */}
          <div className="flex rounded-elder bg-gray-100 p-1 mb-6">
            <button
              type="button"
              onClick={() => setLoginMethod('email')}
              className={`flex-1 py-2 px-4 text-elder-base font-medium rounded-elder transition-colors ${
                loginMethod === 'email'
                  ? 'bg-white text-primary-600 shadow'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Email
            </button>
            <button
              type="button"
              onClick={() => setLoginMethod('phone')}
              className={`flex-1 py-2 px-4 text-elder-base font-medium rounded-elder transition-colors ${
                loginMethod === 'phone'
                  ? 'bg-white text-primary-600 shadow'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Phone
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-elder text-elder-sm">
              {error}
            </div>
          )}

          {loginMethod === 'email' ? (
            <form onSubmit={handleEmailLogin} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-elder-base font-medium text-elder-text">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full px-4 py-3 text-elder-base border-2 border-elder-border rounded-elder focus:border-primary-500 focus:outline-none"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-elder-base font-medium text-elder-text">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full px-4 py-3 text-elder-base border-2 border-elder-border rounded-elder focus:border-primary-500 focus:outline-none"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-6 bg-primary-600 text-white text-elder-base font-medium rounded-elder hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          ) : (
            <form onSubmit={handlePhoneLogin} className="space-y-6">
              {!confirmationResult ? (
                <div>
                  <label htmlFor="phone" className="block text-elder-base font-medium text-elder-text">
                    Phone number
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1 w-full px-4 py-3 text-elder-base border-2 border-elder-border rounded-elder focus:border-primary-500 focus:outline-none"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
              ) : (
                <div>
                  <label htmlFor="code" className="block text-elder-base font-medium text-elder-text">
                    Verification code
                  </label>
                  <input
                    id="code"
                    type="text"
                    required
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    className="mt-1 w-full px-4 py-3 text-elder-base border-2 border-elder-border rounded-elder focus:border-primary-500 focus:outline-none"
                    placeholder="123456"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-6 bg-primary-600 text-white text-elder-base font-medium rounded-elder hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : confirmationResult ? 'Verify Code' : 'Send Code'}
              </button>
            </form>
          )}

          <div id="recaptcha-container"></div>

          <div className="mt-6 text-center space-y-2">
            <p className="text-elder-sm text-elder-text-secondary">
              Don't have an account?
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/beehive/patient/signup"
                className="text-elder-base text-primary-600 hover:text-primary-700 font-medium"
              >
                Sign up as Patient
              </Link>
              <span className="text-gray-400 hidden sm:inline">|</span>
              <Link
                href="/beehive/caregiver/signup"
                className="text-elder-base text-primary-600 hover:text-primary-700 font-medium"
              >
                Sign up as Caregiver
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}