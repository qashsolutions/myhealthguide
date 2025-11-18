'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useElder } from '@/contexts/ElderContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Loader2, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { runScheduleConflictCheck } from '@/lib/medical/scheduleConflictDetection';
import type { MedicationScheduleConflict } from '@/types';

export default function ScheduleConflictsPage() {
  const { user } = useAuth();
  const { selectedElder } = useElder();
  const groupId = selectedElder?.groupId || user?.groups?.[0]?.groupId;
  const elderId = selectedElder?.id;

  const [loading, setLoading] = useState(false);
  const [conflicts, setConflicts] = useState<MedicationScheduleConflict[]>([]);

  useEffect(() => {
    loadConflicts();
  }, [groupId, elderId]);

  async function loadConflicts() {
    if (!groupId || !elderId) return;

    setLoading(true);
    try {
      const result = await runScheduleConflictCheck(groupId, elderId);
      setConflicts(result.conflicts);
    } catch (error) {
      console.error('Error loading conflicts:', error);
    } finally {
      setLoading(false);
    }
  }

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

      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 p-4">
        <div className="flex items-start gap-3">
          <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-blue-900 dark:text-blue-100">
              Scheduling Information Only
            </p>
            <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
              These are potential timing conflicts based on common medication requirements. Always
              consult your doctor or pharmacist about medication timing.
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
            <div className="p-4 bg-green-100 dark:bg-green-900/20 rounded-full inline-block mb-4">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              No Schedule Conflicts Detected
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Current medication schedules appear to be compatible. However, always verify timing
              with your healthcare provider.
            </p>
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
