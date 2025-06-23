'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MedicationForm } from '@/components/medication/MedicationForm';
import { MedicationList } from '@/components/medication/MedicationList';
import { Button } from '@/components/ui/Button';
import { withAuth, useAuth } from '@/hooks/useAuth';
import { Medication } from '@/types';
import { ROUTES, DISCLAIMERS } from '@/lib/constants';
import { AlertCircle, ArrowLeft } from 'lucide-react';

/**
 * Medication check page with voice input
 * Step-by-step medication entry with AI conflict detection
 */
function MedicationCheckPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add medication to list
  const handleAddMedication = (medication: Medication) => {
    setMedications([...medications, { ...medication, id: Date.now().toString() }]);
  };

  // Remove medication from list
  const handleRemoveMedication = (id: string) => {
    setMedications(medications.filter(med => med.id !== id));
  };

  // Edit medication
  const handleEditMedication = (id: string, updated: Medication) => {
    setMedications(medications.map(med => 
      med.id === id ? { ...updated, id } : med
    ));
  };

  // Check medications for conflicts
  const handleCheckMedications = async () => {
    if (medications.length === 0) {
      setError('Please add at least one medication to check');
      return;
    }

    setError(null);
    setIsChecking(true);

    try {
      const response = await fetch('/api/medication/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify({
          medications,
          checkType: 'detailed',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to check medications');
      }

      // Store results in session storage
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('medicationCheckResult', JSON.stringify(data.data));
        sessionStorage.setItem('checkedMedications', JSON.stringify(medications));
      }
      
      // Navigate to results page
      router.push(`${ROUTES.MEDICATION_CHECK}/results`);
    } catch (err) {
      console.error('Medication check error:', err);
      setError(err instanceof Error ? err.message : 'Failed to check medications');
    } finally {
      setIsChecking(false);
    }
  };

  // Clear all medications
  const handleClearAll = () => {
    setMedications([]);
    setError(null);
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      {/* Back button */}
      <button
        onClick={() => router.push(ROUTES.DASHBOARD)}
        className="inline-flex items-center gap-2 text-elder-base text-primary-600 hover:text-primary-700 mb-6 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
      >
        <ArrowLeft className="h-5 w-5" />
        Back to Dashboard
      </button>

      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-elder-2xl elder-tablet:text-elder-3xl font-bold text-elder-text mb-3">
          Check Your Medications
        </h1>
        <p className="text-elder-lg text-elder-text-secondary">
          Add your medications below, then we'll check for potential conflicts
        </p>
      </div>

      {/* Disclaimer banner */}
      <div className="bg-primary-50 border-2 border-primary-200 rounded-elder p-4 mb-8">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-6 w-6 text-primary-600 flex-shrink-0 mt-1" />
          <p className="text-elder-base text-primary-800">
            {DISCLAIMERS.AI_LIMITATIONS}
          </p>
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

      {/* Medication list */}
      {medications.length > 0 && (
        <>
          <MedicationList
            medications={medications}
            onRemove={handleRemoveMedication}
            onEdit={handleEditMedication}
          />

          {/* Action buttons */}
          <div className="mt-8 flex flex-col elder-tablet:flex-row gap-4">
            <Button
              variant="primary"
              size="large"
              onClick={handleCheckMedications}
              loading={isChecking}
              disabled={medications.length === 0}
              className="elder-tablet:flex-1"
            >
              Check for Conflicts ({medications.length} medication{medications.length !== 1 ? 's' : ''})
            </Button>
            
            <Button
              variant="secondary"
              size="large"
              onClick={handleClearAll}
              disabled={isChecking}
            >
              Clear All
            </Button>
          </div>
        </>
      )}

      {/* Help text */}
      <div className="mt-12 p-6 bg-elder-background-alt rounded-elder-lg">
        <h2 className="text-elder-lg font-semibold mb-3">
          Tips for Best Results
        </h2>
        <ul className="space-y-2">
          <li className="flex items-start gap-3">
            <span className="text-primary-600">•</span>
            <p className="text-elder-base text-elder-text-secondary">
              Include all medications, vitamins, and supplements you take regularly
            </p>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-primary-600">•</span>
            <p className="text-elder-base text-elder-text-secondary">
              Add dosage information when possible for more accurate results
            </p>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-primary-600">•</span>
            <p className="text-elder-base text-elder-text-secondary">
              Use the microphone button to speak medication names
            </p>
          </li>
        </ul>
      </div>
    </div>
  );
}

export default withAuth(MedicationCheckPage, { requireDisclaimer: true });