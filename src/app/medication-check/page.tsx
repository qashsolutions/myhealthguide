'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/Button';
import { Medication } from '@/types';
import { ROUTES, DISCLAIMERS } from '@/lib/constants';
import { AlertCircle, ArrowLeft } from 'lucide-react';

// Dynamic imports with loading states
const MedicationForm = dynamic(
  () => import('@/components/medication/MedicationForm').then(mod => ({ default: mod.MedicationForm })),
  {
    loading: () => (
      <div className="bg-white rounded-elder-lg shadow-elder p-6 border border-elder-border animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-12 bg-gray-200 rounded mb-4"></div>
        <div className="h-12 bg-gray-200 rounded"></div>
      </div>
    ),
    ssr: false
  }
);

const MedicationList = dynamic(
  () => import('@/components/medication/MedicationList').then(mod => ({ default: mod.MedicationList })),
  {
    loading: () => (
      <div className="bg-white rounded-elder-lg shadow-elder p-6 border border-elder-border animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="space-y-3">
          <div className="h-16 bg-gray-200 rounded"></div>
        </div>
      </div>
    ),
    ssr: false
  }
);

/**
 * Public medication check page
 * No authentication required
 */
export default function MedicationCheckPage() {
  const router = useRouter();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add medication to list
  const handleAddMedication = (medication: Medication) => {
    // Check if already at max (3 medications)
    if (medications.length >= 3) {
      setError('Maximum 3 medications can be compared at once. Please remove one to add another.');
      return;
    }

    // Check for duplicates (case-insensitive)
    const normalizedName = medication.name.toLowerCase().trim();
    const isDuplicate = medications.some(med => 
      med.name.toLowerCase().trim() === normalizedName
    );

    if (isDuplicate) {
      setError(`${medication.name} is already in your list. Please remove the duplicate or add a different medication.`);
      return;
    }

    setError(null);
    setMedications([...medications, { ...medication, id: Date.now().toString() }]);
  };

  // Remove medication from list
  const handleRemoveMedication = (id: string) => {
    setMedications(medications.filter(med => med.id !== id));
    setError(null); // Clear error when removing
  };

  // Check medications for conflicts
  const handleCheckMedications = async () => {
    if (medications.length === 0) {
      setError('Please add at least one medication to check.');
      return;
    }

    setIsChecking(true);
    setError(null);

    try {
      const response = await fetch('/api/medication/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          medications: medications.map(({ id, ...med }) => med),
          checkType: 'detailed',
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Store result in session storage for results page
        sessionStorage.setItem('medicationCheckResult', JSON.stringify(result.data));
        sessionStorage.setItem('medicationsList', JSON.stringify(medications));
        
        // Navigate to results
        router.push('/medication-check/results');
      } else {
        setError(result.error || 'Unable to check medications. Please try again.');
      }
    } catch (error) {
      console.error('Medication check error:', error);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      {/* Back button */}
      <Button
        variant="secondary"
        size="small"
        icon={<ArrowLeft className="h-5 w-5" />}
        onClick={() => router.push(ROUTES.DASHBOARD)}
        className="mb-6"
      >
        Back to Dashboard
      </Button>

      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-elder-2xl elder-tablet:text-elder-3xl font-bold text-elder-text mb-3">
          Check Medication Interactions
        </h1>
        <p className="text-elder-lg text-elder-text-secondary">
          Add up to 3 medications to check for potential conflicts using AI analysis.
        </p>
      </div>

      {/* Medical disclaimer */}
      <div className="bg-primary-50 border-2 border-primary-200 rounded-elder p-6 mb-8">
        <div className="flex gap-4">
          <AlertCircle className="h-6 w-6 text-primary-600 flex-shrink-0 mt-1" />
          <div>
            <h2 className="text-elder-lg font-semibold text-primary-900 mb-2">
              Important Information
            </h2>
            <p className="text-elder-base text-primary-800">
              {DISCLAIMERS.GENERAL}
            </p>
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-6 p-4 bg-health-danger-bg border-2 border-health-danger rounded-elder">
          <p className="text-elder-base text-health-danger">{error}</p>
        </div>
      )}

      {/* Medication form */}
      <div className="mb-8">
        <MedicationForm onAddMedication={handleAddMedication} />
      </div>

      {/* Medications list */}
      {medications.length > 0 && (
        <div className="mb-8">
          <MedicationList
            medications={medications}
            onRemove={handleRemoveMedication}
          />
        </div>
      )}

      {/* Check button */}
      {medications.length > 0 && (
        <div className="flex justify-center">
          <Button
            variant="primary"
            size="large"
            onClick={handleCheckMedications}
            loading={isChecking}
            disabled={isChecking}
          >
            {isChecking ? 'Checking Medications...' : 'Check for Interactions'}
          </Button>
        </div>
      )}

      {/* Instructions */}
      {medications.length === 0 && (
        <div className="text-center py-12">
          <p className="text-elder-lg text-elder-text-secondary mb-4">
            Start by adding your first medication above.
          </p>
          <p className="text-elder-base text-elder-text-secondary">
            You can add up to 3 medications to check for interactions.
          </p>
        </div>
      )}
    </div>
  );
}