'use client';

import { useRouter } from 'next/navigation';

export default function AssessmentFailedPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-elder-lg shadow-elder p-8 border border-elder-border text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          
          <h1 className="text-elder-2xl font-bold text-elder-text mb-4">
            Assessment Not Passed
          </h1>
          
          <p className="text-elder-lg text-elder-text-secondary mb-8">
            Thank you for your interest in becoming a caregiver with Beehive.
          </p>
          
          <div className="bg-gray-50 rounded-elder p-6 mb-8 text-left">
            <p className="text-elder-base text-elder-text mb-4">
              Based on your assessment responses, we are unable to proceed with your application at this time.
              This decision is made to ensure the safety and well-being of the vulnerable elderly patients on our platform.
            </p>
            <p className="text-elder-base text-elder-text">
              You may retake the assessment after <strong>90 days</strong> from today. 
              We encourage you to use this time to gain more experience and training in elder care.
            </p>
          </div>
          
          <div className="border-t pt-6">
            <h2 className="text-elder-lg font-semibold text-elder-text mb-4">
              Recommended Resources
            </h2>
            <ul className="text-left space-y-2 text-elder-base text-elder-text-secondary mb-6">
              <li>• Consider volunteering at local senior centers</li>
              <li>• Take courses in elder care and patient safety</li>
              <li>• Gain experience with family members or friends</li>
              <li>• Study professional boundaries and ethics in caregiving</li>
            </ul>
          </div>
          
          <button
            onClick={() => router.push('/beehive')}
            className="py-3 px-8 bg-gray-600 text-white text-elder-base font-medium rounded-elder hover:bg-gray-700 transition-colors"
          >
            Return to Home
          </button>
        </div>
      </div>
    </div>
  );
}