'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface VerificationStatus {
  assessment_passed: boolean;
  profile_complete: boolean;
  references_verified: boolean;
  background_check_cleared: boolean;
  fully_verified: boolean;
}

interface CaregiverAccessGateProps {
  children: React.ReactNode;
  requiredAccess?: 'full' | 'partial';
  fallbackPath?: string;
}

export default function CaregiverAccessGate({
  children,
  requiredAccess = 'full',
  fallbackPath = '/beehive/caregiver/onboarding',
}: CaregiverAccessGateProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus | null>(null);
  const [blockedReason, setBlockedReason] = useState<string>('');
  const [nextStep, setNextStep] = useState<string>('');

  useEffect(() => {
    checkVerificationStatus();
  }, []);

  const checkVerificationStatus = async () => {
    const user = auth.currentUser;
    if (!user) {
      router.push('/beehive/login');
      return;
    }

    try {
      // Get user from database
      const { data: userData } = await supabase
        .from('users')
        .select('id, role')
        .eq('firebase_uid', user.uid)
        .single();

      if (!userData || userData.role !== 'caregiver') {
        router.push('/beehive/login');
        return;
      }

      // Check caregiver profile
      const { data: profile } = await supabase
        .from('caregiver_profiles')
        .select('*')
        .eq('user_id', userData.id)
        .single();

      // Check assessment
      const { data: assessment } = await supabase
        .from('psychometric_assessments')
        .select('overall_risk_level')
        .eq('caregiver_id', userData.id)
        .order('completed_at', { ascending: false })
        .limit(1)
        .single();

      const assessmentPassed = assessment && 
        ['very_low', 'low', 'moderate'].includes(assessment.overall_risk_level);

      // Check profile completeness
      const profileComplete = profile && !!(
        profile.first_name &&
        profile.last_name &&
        profile.date_of_birth &&
        profile.hourly_rate &&
        profile.bio &&
        profile.languages?.length > 0
      );

      // Check references
      const { count: refCount } = await supabase
        .from('references')
        .select('*', { count: 'exact' })
        .eq('caregiver_id', userData.id)
        .eq('is_verified', true);

      const referencesVerified = (refCount || 0) >= 2;

      // Check background check
      const backgroundCheckCleared = profile && 
        profile.background_check_status === 'clear';

      const fullyVerified = 
        assessmentPassed &&
        profileComplete &&
        referencesVerified &&
        backgroundCheckCleared;

      // Determine next step and blocking reason
      let reason = '';
      let next = '';

      if (!assessmentPassed) {
        reason = 'You must complete and pass the psychometric assessment';
        next = '/beehive/assessment';
      } else if (!profileComplete) {
        reason = 'You must complete your profile information';
        next = '/beehive/caregiver/onboarding/profile';
      } else if (!referencesVerified) {
        reason = 'You must provide and verify 2 references';
        next = '/beehive/caregiver/onboarding/references';
      } else if (!backgroundCheckCleared) {
        reason = 'You must complete the background check';
        next = '/beehive/caregiver/onboarding/background-check';
      }

      setVerificationStatus({
        assessment_passed: assessmentPassed || false,
        profile_complete: profileComplete || false,
        references_verified: referencesVerified,
        background_check_cleared: backgroundCheckCleared || false,
        fully_verified: fullyVerified,
      });
      setBlockedReason(reason);
      setNextStep(next);

      // Redirect if not fully verified and full access required
      if (requiredAccess === 'full' && !fullyVerified) {
        setTimeout(() => {
          router.push(next || fallbackPath);
        }, 3000);
      }

      setLoading(false);
    } catch (error) {
      console.error('Verification check error:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-elder-base text-elder-text">
            Checking verification status...
          </p>
        </div>
      </div>
    );
  }

  // If not fully verified, show blocking screen
  if (!verificationStatus?.fully_verified && requiredAccess === 'full') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white rounded-elder-lg shadow-elder p-8 border border-elder-border">
          <div className="text-center mb-8">
            <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-12 h-12 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-elder-2xl font-bold text-elder-text mb-2">
              Access Restricted
            </h1>
            <p className="text-elder-lg text-red-600 font-medium mb-4">
              {blockedReason}
            </p>
            <p className="text-elder-base text-elder-text-secondary">
              Complete all onboarding steps to access caregiver features
            </p>
          </div>

          <div className="bg-gray-50 rounded-elder p-6 mb-8">
            <h2 className="text-elder-lg font-semibold text-elder-text mb-4">
              Verification Checklist
            </h2>
            <div className="space-y-3">
              <div className="flex items-center">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 ${
                  verificationStatus?.assessment_passed ? 'bg-green-500' : 'bg-gray-300'
                }`}>
                  {verificationStatus?.assessment_passed ? '✓' : '1'}
                </span>
                <span className={`text-elder-base ${
                  verificationStatus?.assessment_passed ? 'text-green-700 font-medium' : 'text-elder-text'
                }`}>
                  Psychometric Assessment
                </span>
              </div>

              <div className="flex items-center">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 ${
                  verificationStatus?.profile_complete ? 'bg-green-500' : 'bg-gray-300'
                }`}>
                  {verificationStatus?.profile_complete ? '✓' : '2'}
                </span>
                <span className={`text-elder-base ${
                  verificationStatus?.profile_complete ? 'text-green-700 font-medium' : 'text-elder-text'
                }`}>
                  Complete Profile
                </span>
              </div>

              <div className="flex items-center">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 ${
                  verificationStatus?.references_verified ? 'bg-green-500' : 'bg-gray-300'
                }`}>
                  {verificationStatus?.references_verified ? '✓' : '3'}
                </span>
                <span className={`text-elder-base ${
                  verificationStatus?.references_verified ? 'text-green-700 font-medium' : 'text-elder-text'
                }`}>
                  Two Verified References
                </span>
              </div>

              <div className="flex items-center">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 ${
                  verificationStatus?.background_check_cleared ? 'bg-green-500' : 'bg-gray-300'
                }`}>
                  {verificationStatus?.background_check_cleared ? '✓' : '4'}
                </span>
                <span className={`text-elder-base ${
                  verificationStatus?.background_check_cleared ? 'text-green-700 font-medium' : 'text-elder-text'
                }`}>
                  Background Check Cleared
                </span>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-elder p-4 mb-6">
            <div className="flex">
              <svg className="w-5 h-5 text-amber-600 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div className="text-elder-sm text-amber-800">
                <p className="font-medium mb-1">Why is verification required?</p>
                <p>
                  We require complete verification to ensure the safety of elderly patients.
                  This includes background checks, reference verification, and psychometric assessments.
                </p>
              </div>
            </div>
          </div>

          <div className="text-center">
            <p className="text-elder-sm text-elder-text-secondary mb-4">
              Redirecting to next step in 3 seconds...
            </p>
            <Link
              href={nextStep || fallbackPath}
              className="inline-flex items-center px-6 py-3 bg-primary-600 text-white text-elder-base font-medium rounded-elder hover:bg-primary-700 transition-colors"
            >
              Continue Onboarding
              <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // If verified or partial access allowed, render children
  return <>{children}</>;
}