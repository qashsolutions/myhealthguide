'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { CheckCircle } from 'lucide-react';

export default function BeehiveReferPage() {
  const router = useRouter();

  const benefits = [
    'Earn rewards for successful referrals',
    'Help trusted caregivers find meaningful work',
    'Support families in need of quality care',
    'Build your professional network'
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Refer a Caregiver
            </h1>
            <p className="text-xl text-gray-600">
              Know a great caregiver? Help them join Beehive and earn rewards!
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-semibold mb-6">Referral Program Benefits</h2>
            <div className="space-y-4 mb-8">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">{benefit}</span>
                </div>
              ))}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-3">Coming Soon!</h3>
              <p className="text-gray-700 mb-4">
                Our caregiver referral program is launching soon. Join our waitlist to be
                among the first to refer caregivers and earn rewards.
              </p>

              <div className="flex flex-col gap-4">
                <input
                  type="email"
                  placeholder="Your email address"
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Caregiver's name (optional)"
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="email"
                  placeholder="Caregiver's email (optional)"
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Button
                  onClick={() => alert('Thank you! We\'ll notify you when the referral program launches.')}
                  className="w-full"
                >
                  Join Referral Waitlist
                </Button>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-8">
            <h2 className="text-xl font-semibold mb-4">How It Will Work</h2>
            <ol className="list-decimal list-inside space-y-3 text-gray-700">
              <li>Submit your referral through our secure platform</li>
              <li>Your referred caregiver completes our verification process</li>
              <li>They get matched with families needing care</li>
              <li>You earn rewards for each successful placement</li>
            </ol>
          </div>

          <div className="mt-8 flex gap-4 justify-center">
            <Button
              variant="secondary"
              onClick={() => router.push('/beehive')}
            >
              ← Back to Beehive
            </Button>
            <Button
              variant="secondary"
              onClick={() => router.push('/beehive/signup')}
            >
              Sign Up
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}