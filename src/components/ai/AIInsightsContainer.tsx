'use client';

import { useEffect, useState } from 'react';
import { HealthChangeAlert } from './HealthChangeAlert';
import { MedicationTimeOptimizationCard } from './MedicationTimeOptimizationCard';
import { EmergencyPatternAlert } from './EmergencyPatternAlert';
import { MedicationRefillAlert } from './MedicationRefillAlert';
import { detectHealthChanges, HealthChangeAlert as HealthChangeAlertType } from '@/lib/ai/healthChangeDetection';
import { analyzeAllMedicationTimes } from '@/lib/ai/medicationTimeOptimization';
import { detectEmergencyPatterns } from '@/lib/ai/emergencyPatternDetection';
import { calculateRefillPredictions } from '@/lib/ai/medicationRefillPrediction';
import { getUserAlertPreferences } from '@/lib/ai/userAlertPreferences';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import type { EmergencyPattern } from '@/types';

interface AIInsightsContainerProps {
  elderId: string;
  elderName?: string;
  groupId: string;
  showHealthChanges?: boolean;
  showMedicationOptimization?: boolean;
  showEmergencyPatterns?: boolean;
  showRefillAlerts?: boolean;
  onApplySuggestion?: (medicationId: string, suggestedTime: string) => void;
  onOrderRefill?: (medicationId: string) => void;
}

export function AIInsightsContainer({
  elderId,
  elderName,
  groupId,
  showHealthChanges = true,
  showMedicationOptimization = true,
  showEmergencyPatterns = true,
  showRefillAlerts = true,
  onApplySuggestion,
  onOrderRefill
}: AIInsightsContainerProps) {
  const { user } = useAuth();
  const [healthChanges, setHealthChanges] = useState<HealthChangeAlertType | null>(null);
  const [medicationOptimizations, setMedicationOptimizations] = useState<Array<{
    medicationId: string;
    medicationName: string;
    optimization: any;
  }> | null>(null);
  const [emergencyPattern, setEmergencyPattern] = useState<EmergencyPattern | null>(null);
  const [refillPredictions, setRefillPredictions] = useState<any[] | null>(null);
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

        if (showEmergencyPatterns && elderName) {
          promises.push(
            // Load user preferences to get sensitivity level
            getUserAlertPreferences(userId, groupId)
              .then(prefs => {
                const sensitivity = prefs.preferences.emergencyAlerts.sensitivity;
                return detectEmergencyPatterns(groupId, elderId, elderName, sensitivity);
              })
              .then(result => setEmergencyPattern(result))
              .catch(err => {
                console.error('Error detecting emergency patterns:', err);
              })
          );
        }

        if (showRefillAlerts) {
          promises.push(
            calculateRefillPredictions(groupId, elderId)
              .then(predictions => {
                // Map to component format
                const mapped = predictions
                  .filter(p => p.shouldAlert)
                  .map(p => ({
                    medicationId: p.medicationId,
                    medicationName: p.medicationName,
                    daysUntilEmpty: p.daysRemaining,
                    currentSupply: p.currentQuantity,
                    dailyUsageRate: p.dailyUsageRate,
                    predictedEmptyDate: p.estimatedRunOutDate,
                    urgency: p.daysRemaining <= 3 ? 'critical' :
                             p.daysRemaining <= 7 ? 'high' :
                             p.daysRemaining <= 14 ? 'medium' : 'low',
                    recommendation: p.alertReason || `Only ${p.daysRemaining} days of supply remaining. Order refill soon.`,
                    confidence: p.confidence === 'high' ? 95 :
                               p.confidence === 'medium' ? 75 : 60
                  }));
                setRefillPredictions(mapped);
              })
              .catch(err => {
                console.error('Error predicting refills:', err);
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
      {/* PRIORITY 1: Emergency Patterns (Most Critical) */}
      {showEmergencyPatterns && emergencyPattern && (
        <EmergencyPatternAlert
          pattern={emergencyPattern}
          elderName={elderName}
          onViewDetails={() => {
            // Navigate to full emergency details if needed
          }}
        />
      )}

      {/* PRIORITY 2: Medication Refill Alerts */}
      {showRefillAlerts && refillPredictions && refillPredictions.length > 0 && (
        <MedicationRefillAlert
          predictions={refillPredictions}
          onOrderRefill={onOrderRefill}
          compact={false}
        />
      )}

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
