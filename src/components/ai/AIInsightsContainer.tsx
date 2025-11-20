'use client';

import { useEffect, useState } from 'react';
import { HealthChangeAlert } from './HealthChangeAlert';
import { MedicationTimeOptimizationCard } from './MedicationTimeOptimizationCard';
import { detectHealthChanges, HealthChangeAlert as HealthChangeAlertType } from '@/lib/ai/healthChangeDetection';
import { analyzeAllMedicationTimes } from '@/lib/ai/medicationTimeOptimization';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';

interface AIInsightsContainerProps {
  elderId: string;
  elderName?: string;
  groupId: string;
  showHealthChanges?: boolean;
  showMedicationOptimization?: boolean;
  onApplySuggestion?: (medicationId: string, suggestedTime: string) => void;
}

export function AIInsightsContainer({
  elderId,
  elderName,
  groupId,
  showHealthChanges = true,
  showMedicationOptimization = true,
  onApplySuggestion
}: AIInsightsContainerProps) {
  const { user } = useAuth();
  const [healthChanges, setHealthChanges] = useState<HealthChangeAlertType | null>(null);
  const [medicationOptimizations, setMedicationOptimizations] = useState<Array<{
    medicationId: string;
    medicationName: string;
    optimization: any;
  }> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadInsights() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const userId = user.id;
        const userRole = user.groups[0]?.role as 'admin' | 'caregiver' | 'member';

        if (!userRole) {
          setError('Unable to determine user role');
          setLoading(false);
          return;
        }

        const promises = [];

        if (showHealthChanges) {
          promises.push(
            detectHealthChanges(elderId, groupId, userId, userRole)
              .then(result => setHealthChanges(result))
              .catch(err => {
                console.error('Error detecting health changes:', err);
                setError('Failed to load health change insights');
              })
          );
        }

        if (showMedicationOptimization) {
          promises.push(
            analyzeAllMedicationTimes(elderId, groupId, userId, userRole)
              .then(result => setMedicationOptimizations(result))
              .catch(err => {
                console.error('Error analyzing medication times:', err);
                setError('Failed to load medication optimization insights');
              })
          );
        }

        await Promise.all(promises);

      } finally {
        setLoading(false);
      }
    }

    loadInsights();
  }, [elderId, groupId, showHealthChanges, showMedicationOptimization, user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600 dark:text-gray-400">Loading AI insights...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800">
        <AlertDescription className="text-red-800 dark:text-red-200">
          {error}
        </AlertDescription>
      </Alert>
    );
  }

  // Check if AI features returned null (disabled)
  const aiDisabled = (showHealthChanges && healthChanges === null) ||
                      (showMedicationOptimization && medicationOptimizations === null);

  if (aiDisabled) {
    return null; // Don't show anything if AI is disabled
  }

  return (
    <div className="space-y-6">
      {/* Health Change Detection */}
      {showHealthChanges && healthChanges && (
        <HealthChangeAlert alert={healthChanges} elderName={elderName} />
      )}

      {/* Medication Time Optimization */}
      {showMedicationOptimization && medicationOptimizations && medicationOptimizations.length > 0 && (
        <div className="space-y-4">
          {medicationOptimizations.map(({ medicationId, medicationName, optimization }) => (
            <MedicationTimeOptimizationCard
              key={medicationId}
              medicationName={medicationName}
              optimization={optimization}
              onApplySuggestion={
                onApplySuggestion
                  ? (time) => onApplySuggestion(medicationId, time)
                  : undefined
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
