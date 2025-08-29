'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentBeehiveUser } from '@/lib/beehive/auth-integration';

export default function BeehivePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const currentUser = await getCurrentBeehiveUser();
      setUser(currentUser);
      
      // If logged in, redirect to appropriate dashboard
      if (currentUser) {
        if (currentUser.role === 'caregiver') {
          router.push('/beehive/caregiver/dashboard');
        } else if (currentUser.role === 'patient') {
          router.push('/beehive/patient/dashboard');
        }
      }
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <div className="bg-white rounded-elder-lg shadow-elder p-8 border border-elder-border">
        <h1 className="text-elder-2xl font-bold text-elder-text mb-6">
          Welcome to Beehive
        </h1>
        
        <div className="bg-primary-50 rounded-elder p-6 mb-8">
          <h2 className="text-elder-lg font-semibold text-primary-900 mb-3">
            Trusted Caregiver-Patient Matching Platform
          </h2>
          <p className="text-elder-base text-primary-800">
            Beehive connects families with verified student nurses and caregivers, 
            solving the critical elder care shortage with an obsessive focus on safety and trust.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border-2 border-primary-200 rounded-elder p-6 hover:shadow-lg transition-shadow">
            <h3 className="text-elder-lg font-semibold text-elder-text mb-3">
              I'm a Family/Patient
            </h3>
            <p className="text-elder-base text-elder-text-secondary mb-4">
              Find trusted, verified caregivers who speak your language and match your needs.
            </p>
            <ul className="space-y-2 mb-6">
              <li className="flex items-start gap-2">
                <span className="text-primary-600">✓</span>
                <span className="text-elder-sm">$11/month unlimited matching</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary-600">✓</span>
                <span className="text-elder-sm">Rigorous safety assessments</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary-600">✓</span>
                <span className="text-elder-sm">Language-first matching</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary-600">✓</span>
                <span className="text-elder-sm">Video meet & greet</span>
              </li>
            </ul>
            <button
              onClick={() => router.push('/beehive/find-caregivers')}
              className="w-full py-3 px-6 bg-primary-600 text-white text-elder-base font-medium rounded-elder hover:bg-primary-700 transition-colors"
            >
              Find a Caregiver
            </button>
          </div>

          <div className="border-2 border-primary-200 rounded-elder p-6 hover:shadow-lg transition-shadow">
            <h3 className="text-elder-lg font-semibold text-elder-text mb-3">
              I'm a Caregiver/Student
            </h3>
            <p className="text-elder-base text-elder-text-secondary mb-4">
              Join free, build experience, and keep 100% of your earnings.
            </p>
            <ul className="space-y-2 mb-6">
              <li className="flex items-start gap-2">
                <span className="text-primary-600">✓</span>
                <span className="text-elder-sm">Free to join</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary-600">✓</span>
                <span className="text-elder-sm">Keep 100% of earnings</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary-600">✓</span>
                <span className="text-elder-sm">Flexible scheduling</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary-600">✓</span>
                <span className="text-elder-sm">Build nursing experience</span>
              </li>
            </ul>
            <button
              onClick={() => router.push('/beehive/caregiver/signup')}
              className="w-full py-3 px-6 bg-primary-600 text-white text-elder-base font-medium rounded-elder hover:bg-primary-700 transition-colors"
            >
              Become a Caregiver
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}