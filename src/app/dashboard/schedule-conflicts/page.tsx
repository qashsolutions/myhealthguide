'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useElder } from '@/contexts/ElderContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, CheckCircle, RefreshCw, Pill, Clock } from 'lucide-react';
import { runScheduleConflictCheck } from '@/lib/medical/scheduleConflictDetection';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { MedicationScheduleConflict } from '@/types';

export default function ScheduleConflictsPage() {
  const { user } = useAuth();
  const { selectedElder } = useElder();
  const groupId = selectedElder?.groupId || user?.groups?.[0]?.groupId;
  const elderId = selectedElder?.id;

  const [loading, setLoading] = useState(false);
  const [conflicts, setConflicts] = useState<MedicationScheduleConflict[]>([]);
  const [hasMedications, setHasMedications] = useState<boolean | null>(null);

  const loadConflicts = async () => {
    if (!groupId || !elderId) {
      setHasMedications(null);
      return;
    }

    setLoading(true);
    try {
      // Check if elder has any medications
      const medicationsQuery = query(
        collection(db, 'medications'),
        where('groupId', '==', groupId),
        where('elderId', '==', elderId)
      );
      const medicationsSnap = await getDocs(medicationsQuery);
      setHasMedications(medicationsSnap.docs.length > 0);

      const result = await runScheduleConflictCheck(groupId, elderId);
      setConflicts(result.conflicts);
    } catch (error) {
      console.error('Error loading conflicts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConflicts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, elderId]);

  const getConflictIcon = (type: string) => {
    switch (type) {
      case 'food_required':
      case 'empty_stomach':
        return <AlertCircle className="h-6 w-6 text-yellow-600" />;
      case 'avoid_combination':
        return <AlertCircle className="h-6 w-6 text-red-600" />;
      default:
        return <Clock className="h-6 w-6 text-blue-600" />;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Schedule Conflicts
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Medication timing and scheduling recommendations
          </p>
        </div>
        <Button onClick={loadConflicts} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Check Conflicts
        </Button>
      </div>

      <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-amber-900 dark:text-amber-100">
              Informational Alerts Only — Not Medical Advice
            </p>
            <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
              Any conflicts shown are informational notifications based on general medication guidelines.
              <strong> Always follow your physician&apos;s, PCP&apos;s, or pharmacist&apos;s instructions.</strong> Do not
              change your medication schedule without consulting your healthcare provider.
            </p>
          </div>
        </div>
      </Card>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      )}

      {!loading && conflicts.length === 0 && (
        <Card className="p-12 text-center">
          <div className="max-w-md mx-auto">
            {!selectedElder ? (
              <>
                <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full inline-block mb-4">
                  <AlertCircle className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  No Loved One Selected
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Please select a loved one from the dropdown above to check for medication timing conflicts.
                </p>
              </>
            ) : hasMedications === false ? (
              <>
                <div className="p-4 bg-blue-100 dark:bg-blue-900/20 rounded-full inline-block mb-4">
                  <Pill className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  No Medications Added
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Please add medications for {selectedElder.name} to check for potential timing conflicts.
                </p>
              </>
            ) : (
              <>
                <div className="p-4 bg-green-100 dark:bg-green-900/20 rounded-full inline-block mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  No Schedule Conflicts Detected
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Current medication schedules appear to be compatible. However, always verify timing with your healthcare provider.
                </p>
              </>
            )}
          </div>
        </Card>
      )}

      {!loading && conflicts.length > 0 && (
        <div className="space-y-4">
          {conflicts.map((conflict) => (
            <Card key={conflict.id} className="border-l-4 border-yellow-500 p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                  {getConflictIcon(conflict.conflictType)}
                </div>

                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    {conflict.medicationName}
                  </h3>

                  <div className="space-y-2 text-sm">
                    <p className="text-gray-700 dark:text-gray-300">
                      <strong>Issue:</strong> {conflict.description}
                    </p>
                    <p className="text-gray-700 dark:text-gray-300">
                      <strong>Current Schedule:</strong>{' '}
                      {conflict.currentSchedule.times.join(', ')}
                    </p>
                    <p className="text-gray-700 dark:text-gray-300">
                      <strong>Conflict:</strong> {conflict.conflict}
                    </p>
                    {conflict.fdaGuidance && (
                      <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                        <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-1">
                          Typical Guidance:
                        </p>
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                          {conflict.fdaGuidance}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
                    <p className="text-xs text-yellow-800 dark:text-yellow-200">
                      ⚠️ Discuss this timing with your doctor or pharmacist. Do not change
                      medication schedules without professional guidance.
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
