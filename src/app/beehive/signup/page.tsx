'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

export default function BeehiveSignUpPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Join Beehive
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Sign up to connect with trusted caregivers
          </p>

          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold mb-6">Coming Soon!</h2>
              <p className="text-gray-600 mb-6">
                We're currently building our secure signup process.
                Join our waitlist to be notified when Beehive launches.
              </p>

              <div className="flex flex-col gap-4 max-w-md mx-auto">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Button
                  onClick={() => alert('Thank you! We\'ll notify you when signup is available.')}
                  className="w-full"
                >
                  Join Waitlist
                </Button>
              </div>

              <div className="mt-8 pt-8 border-t">
                <p className="text-sm text-gray-600">
                  Already have an account?{' '}
                  <button
                    onClick={() => router.push('/beehive/signin')}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    Sign In
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