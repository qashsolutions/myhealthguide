'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
// import { withAuth } from '@/hooks/useAuth'; // Removed for public access
import { ConflictResults } from '@/components/medication/ConflictResults';
import { Button } from '@/components/ui/Button';
import { MedicationCheckResult } from '@/types';
import { ROUTES } from '@/lib/constants';
import { ArrowLeft, Plus, AlertCircle } from 'lucide-react';

/**
 * Medication check results page
 * Displays AI analysis with traffic light system
 */
function MedicationCheckResultsPage() {
  const router = useRouter();
  const [result, setResult] = useState<MedicationCheckResult | null>(null);
  const [medications, setMedications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Retrieve results from session storage
    if (typeof window !== 'undefined') {
      const storedResult = sessionStorage.getItem('medicationCheckResult');
      const storedMedications = sessionStorage.getItem('medicationsList');
      
      if (storedResult && storedMedications) {
        try {
          setResult(JSON.parse(storedResult));
          setMedications(JSON.parse(storedMedications));
        } catch (error) {
          console.error('Failed to parse stored results:', error);
          router.push(ROUTES.MEDICATION_CHECK);
        }
      } else {
        // No results, redirect back
        router.push(ROUTES.MEDICATION_CHECK);
      }
    }
    
    setLoading(false);
  }, [router]);

  // Navigate back to check
  const handleBackToCheck = () => {
    router.push(ROUTES.MEDICATION_CHECK);
  };

  // Start new check
  const handleNewCheck = () => {
    // Clear session storage
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('medicationCheckResult');
      sessionStorage.removeItem('checkedMedications');
    }
    router.push(ROUTES.MEDICATION_CHECK);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <div className="animate-pulse">
          <div className="h-12 bg-elder-background rounded-elder w-3/4 mb-4" />
          <div className="h-64 bg-elder-background rounded-elder" />
        </div>
      </div>
    );
  }

  if (!result) {
    return null; // Will redirect
  }

  return (
    <div className="max-w-4xl mx-auto py-8">
      {/* Back button */}
      <button
        onClick={handleBackToCheck}
        className="inline-flex items-center gap-2 text-elder-base text-primary-600 hover:text-primary-700 mb-6 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
      >
        <ArrowLeft className="h-5 w-5" />
        Back to Medication Check
      </button>

      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-elder-lg elder-tablet:text-elder-xl font-bold text-elder-text">
          Overall assessment: {
            result.overallRisk === 'safe' ? 'Safe' :
            result.overallRisk === 'warning' ? 'Caution' :
            result.overallRisk === 'danger' ? 'Warning' :
            'Review Needed'
          }
        </h1>
      </div>

      {/* Results display with Important reminder integrated */}
      <ConflictResults 
        result={result} 
        medications={medications}
        importantReminder={{
          title: "Important: Always consult your healthcare provider",
          message: "These results are AI-generated and should not replace professional medical advice. Share these results with your doctor or pharmacist for personalized guidance."
        }}
      />


      {/* Action buttons - moved to bottom */}
      <div className="mt-8 flex flex-col elder-tablet:flex-row gap-4">
        <Button
          variant="primary"
          size="large"
          onClick={handleNewCheck}
          icon={<Plus className="h-6 w-6" />}
          className="elder-tablet:flex-1"
        >
          Start New Check
        </Button>
        
        <Button
          variant="secondary"
          size="large"
          onClick={() => router.push(ROUTES.DASHBOARD)}
          className="elder-tablet:flex-1"
        >
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
}

export default MedicationCheckResultsPage;