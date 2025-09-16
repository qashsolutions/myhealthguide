'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

export default function BeehiveSignInPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome Back
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Sign in to your Beehive account
          </p>

          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold mb-6">Sign In</h2>
              <p className="text-gray-600 mb-6">
                Our secure sign-in process is coming soon.
                Enter your email below to be notified when it's ready.
              </p>

              <div className="flex flex-col gap-4 max-w-md mx-auto">
                <input
                  type="email"
                  placeholder="Email address"
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

              <div className="mt-8 pt-8 border-t">
                <p className="text-sm text-gray-600">
                  Don't have an account?{' '}
                  <button
                    onClick={() => router.push('/beehive/signup')}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    Sign Up
                  </button>
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  Are you a caregiver?{' '}
                  <button
                    onClick={() => router.push('/beehive/refer')}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    Get Referred
                  </button>
                </p>
              </div>
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