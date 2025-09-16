'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

export default function BeehiveAuthPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(true);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {isSignUp ? 'Join Beehive' : 'Welcome Back'}
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            {isSignUp
              ? 'Sign up to connect with trusted caregivers'
              : 'Sign in to your Beehive account'
            }
          </p>

          <div className="bg-white rounded-lg shadow-lg p-8">
            {/* Toggle Tabs */}
            <div className="flex mb-8 border-b">
              <button
                onClick={() => setIsSignUp(true)}
                className={`flex-1 pb-4 text-lg font-medium transition-colors ${
                  isSignUp
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Sign Up
              </button>
              <button
                onClick={() => setIsSignUp(false)}
                className={`flex-1 pb-4 text-lg font-medium transition-colors ${
                  !isSignUp
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Sign In
              </button>
            </div>

            {/* Form Content */}
            <div className="space-y-4">
              {isSignUp ? (
                <>
                  <h2 className="text-2xl font-semibold mb-6">Coming Soon!</h2>
                  <p className="text-gray-600 mb-6">
                    We're currently building our secure signup process.
                    Join our waitlist to be notified when Beehive launches.
                  </p>

                  <div className="flex flex-col gap-4 max-w-md mx-auto">
                    <input
                      type="text"
                      placeholder="Full Name"
                      className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="email"
                      placeholder="Email Address"
                      className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <select
                      className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">I am a...</option>
                      <option value="care-seeker">Care Seeker</option>
                      <option value="caregiver">Caregiver</option>
                    </select>
                    <Button
                      onClick={() => alert('Thank you! We\'ll notify you when signup is available.')}
                      className="w-full"
                    >
                      Join Waitlist
                    </Button>
                  </div>

                  <p className="text-sm text-gray-600 mt-6">
                    Are you a caregiver?{' '}
                    <button
                      onClick={() => router.push('/beehive/refer')}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      Get Referred
                    </button>
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-semibold mb-6">Sign In</h2>
                  <p className="text-gray-600 mb-6">
                    Our secure sign-in process is coming soon.
                  </p>

                  <div className="flex flex-col gap-4 max-w-md mx-auto">
                    <input
                      type="email"
                      placeholder="Email Address"
                      className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="password"
                      placeholder="Password"
                      className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled
                    />
                    <Button
                      onClick={() => alert('Sign in coming soon! We\'ll notify you when it\'s ready.')}
                      className="w-full"
                    >
                      Sign In (Coming Soon)
                    </Button>
                  </div>

                  <p className="text-sm text-gray-600 mt-6">
                    <button className="text-blue-600 hover:underline">
                      Forgot Password?
                    </button>
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="mt-8">
            <Button
              variant="secondary"
              onClick={() => router.push('/beehive')}
            >
              ← Back to Beehive
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}