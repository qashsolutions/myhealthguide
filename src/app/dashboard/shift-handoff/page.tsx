'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useElder } from '@/contexts/ElderContext';
import { useSubscription } from '@/lib/subscription';
import { FeatureGate } from '@/components/shared/FeatureGate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, PlayCircle, StopCircle, FileText, AlertCircle, Calendar, Lock, ChevronDown, ChevronUp } from 'lucide-react';
import { startShiftSession, endShiftSession } from '@/lib/ai/shiftHandoffGeneration';
import { linkShiftToSession } from '@/lib/firebase/scheduleShifts';
import { authenticatedFetch } from '@/lib/api/authenticatedFetch';
import type { ShiftSession, ShiftHandoffNote, ScheduledShift } from '@/types';
import { format } from 'date-fns';
import { SOAPNoteDisplay } from '@/components/shift-handoff/SOAPNoteDisplay';

export default function ShiftHandoffPage() {
  const { user } = useAuth();
  const { selectedElder } = useElder();
  const { isMultiAgency } = useSubscription();

  // Check if user is a caregiver in an agency
  const isAgencyCaregiver = user?.agencies && user.agencies.length > 0 &&
    user.agencies.some(a => a.role === 'caregiver');

  // Check if user is a super_admin
  const isSuperAdmin = user?.agencies && user.agencies.length > 0 &&
    user.agencies.some(a => a.role === 'super_admin');

  // User can access if: multi-agency plan AND (is caregiver OR is super_admin)
  const canAccessShiftHandoff = isMultiAgency && (isAgencyCaregiver || isSuperAdmin);
  const [activeShift, setActiveShift] = useState<ShiftSession | null>(null);
  const [scheduledShift, setScheduledShift] = useState<ScheduledShift | null>(null);
  const [recentHandoffs, setRecentHandoffs] = useState<ShiftHandoffNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedHandoffId, setExpandedHandoffId] = useState<string | null>(null);

  // Load active shift, scheduled shift, and recent handoffs
  useEffect(() => {
    if (user && selectedElder) {
      loadActiveShift();
      loadScheduledShift();
      loadRecentHandoffs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, selectedElder]);

  const loadScheduledShift = async () => {
    if (!user || !selectedElder) return;

    try {
      const response = await authenticatedFetch(
        `/api/shift-handoff?elderId=${selectedElder.id}&type=scheduled`
      );
      const data = await response.json();

      if (data.success) {
        setScheduledShift(data.scheduledShift);
      }
    } catch (err: any) {
      console.error('Error loading scheduled shift:', err);
    }
  };

  const loadActiveShift = async () => {
    if (!user || !selectedElder) return;

    try {
      const response = await authenticatedFetch(
        `/api/shift-handoff?elderId=${selectedElder.id}&type=active`
      );
      const data = await response.json();

      if (data.success) {
        if (data.activeShift) {
          setActiveShift({
            ...data.activeShift,
            startTime: data.activeShift.startTime ? new Date(data.activeShift.startTime) : null,
            endTime: data.activeShift.endTime ? new Date(data.activeShift.endTime) : null,
            createdAt: data.activeShift.createdAt ? new Date(data.activeShift.createdAt) : null,
            updatedAt: data.activeShift.updatedAt ? new Date(data.activeShift.updatedAt) : null
          } as ShiftSession);
        } else {
          setActiveShift(null);
        }
      }
    } catch (err: any) {
      console.error('Error loading active shift:', err);
    }
  };

  const loadRecentHandoffs = async () => {
    if (!selectedElder) return;

    try {
      const response = await authenticatedFetch(
        `/api/shift-handoff?elderId=${selectedElder.id}&type=handoffs`
      );
      const data = await response.json();

      if (data.success) {
        const handoffs = data.handoffs.map((h: any) => ({
          ...h,
          generatedAt: h.generatedAt ? new Date(h.generatedAt) : null,
          shiftPeriod: {
            start: h.shiftPeriod?.start ? new Date(h.shiftPeriod.start) : null,
            end: h.shiftPeriod?.end ? new Date(h.shiftPeriod.end) : null
          }
        })) as ShiftHandoffNote[];
        setRecentHandoffs(handoffs);
      }
    } catch (err: any) {
      console.error('Error loading handoffs:', err);
    }
  };

  const handleClockIn = async () => {
    if (!user || !selectedElder) return;

    setLoading(true);
    setError(null);

    try {
      // Start shift session
      const shiftSessionId = await startShiftSession(
        user.groups?.[0]?.groupId || '',
        selectedElder.id,
        user.id,
        user.agencies?.[0]?.agencyId
      );

      // Link to scheduled shift if exists
      if (scheduledShift) {
        await linkShiftToSession(scheduledShift.id, shiftSessionId);
      }

      await loadActiveShift();
      setScheduledShift(null); // Clear scheduled shift after clock-in

      // TODO: Send notification to admin
    } catch (err: any) {
      setError('Failed to clock in: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!user || !selectedElder || !activeShift) return;

    setLoading(true);
    setError(null);

    try {
      await endShiftSession(
        activeShift.id,
        user.groups?.[0]?.groupId || '',
        selectedElder.id,
        selectedElder.name,
        user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.email || 'Caregiver' // Pass caregiver name for SOAP note
      );

      await loadActiveShift();
      await loadRecentHandoffs();

      // TODO: Send handoff note notification to next caregiver + admin
    } catch (err: any) {
      setError('Failed to clock out: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Gate: Multi-agency plan required
  if (!isMultiAgency) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-6">
        <FeatureGate feature="shift_handoff" promptVariant="card">
          <div />
        </FeatureGate>
      </div>
    );
  }

  // Gate: Must be caregiver or super_admin
  if (!canAccessShiftHandoff) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-6 h-6 text-amber-600" />
              Caregiver Access Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              This feature is only available to agency caregivers and administrators.
              Caregivers use this to clock in/out of shifts and view handoff notes.
            </p>
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                If you believe you should have access, please contact your agency administrator.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!selectedElder) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="p-8">
          <CardContent>
            <p className="text-center text-gray-600 dark:text-gray-400">
              Please select an elder to manage shift handoffs
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Shift Handoff
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Clock in/out and view handoff notes for {selectedElder.name}
        </p>
      </div>

      {error && (
        <Card className="border-red-500 bg-red-50 dark:bg-red-900/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="w-5 h-5" />
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Shift Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Current Shift
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeShift ? (
            <>
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-900 dark:text-green-100">
                      Shift Active
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      Started at {format(activeShift.startTime, 'h:mm a')} •
                      {format(activeShift.startTime, 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                </div>
              </div>

              <Button
                onClick={handleClockOut}
                disabled={loading}
                className="w-full"
                size="lg"
              >
                <StopCircle className="w-5 h-5 mr-2" />
                Clock Out & Generate Handoff Note
              </Button>
            </>
          ) : (
            <>
              <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                  No active shift. Clock in to start tracking your shift.
                </p>
              </div>

              {/* Scheduled Shift Indicator */}
              {scheduledShift && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        Scheduled Shift
                      </p>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        {scheduledShift.startTime} - {scheduledShift.endTime}
                      </p>
                      {scheduledShift.notes && (
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                          Note: {scheduledShift.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <Button
                onClick={handleClockIn}
                disabled={loading}
                className="w-full"
                size="lg"
              >
                <PlayCircle className="w-5 h-5 mr-2" />
                Clock In
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Recent Handoff Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Recent Handoff Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentHandoffs.length === 0 ? (
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center py-4">
              No handoff notes yet
            </p>
          ) : (
            <div className="space-y-4">
              {recentHandoffs.map((handoff) => {
                const isExpanded = expandedHandoffId === handoff.id;
                const hasSOAPNote = !!handoff.soapNote;

                return (
                  <Card key={handoff.id} className="border-2">
                    {/* Collapsed Header - Always visible */}
                    <button
                      onClick={() => setExpandedHandoffId(isExpanded ? null : handoff.id)}
                      className="w-full text-left"
                    >
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <div>
                                <p className="font-semibold text-gray-900 dark:text-white">
                                  {format(handoff.shiftPeriod.start, 'MMM d, yyyy')}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {format(handoff.shiftPeriod.start, 'h:mm a')} -
                                  {format(handoff.shiftPeriod.end, 'h:mm a')}
                                </p>
                              </div>
                            </div>

                            {/* Quick summary when collapsed */}
                            {!isExpanded && (
                              <div className="mt-2 flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                                <span>Mood: {handoff.summary.mood.overall}</span>
                                {handoff.summary.medicationsGiven.length > 0 && (
                                  <span>
                                    Meds: {handoff.summary.medicationsGiven.filter(m => m.status !== 'missed').length}/
                                    {handoff.summary.medicationsGiven.length} given
                                  </span>
                                )}
                                {handoff.soapNote?.plan.actions.some(a => a.priority === 'critical') && (
                                  <span className="text-red-600 font-medium">Action Required</span>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {handoff.isRoutineShift ? (
                              <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 text-xs font-medium rounded-full">
                                Routine
                              </span>
                            ) : (
                              <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 text-xs font-medium rounded-full">
                                Attention Needed
                              </span>
                            )}
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5 text-gray-400" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </button>

                    {/* Expanded Content - SOAP Note or Legacy Format */}
                    {isExpanded && (
                      <CardContent className="border-t pt-6">
                        {hasSOAPNote && handoff.soapNote ? (
                          <SOAPNoteDisplay
                            soapNote={handoff.soapNote}
                            elderName={selectedElder?.name || 'Elder'}
                            shiftStart={handoff.shiftPeriod.start}
                            shiftEnd={handoff.shiftPeriod.end}
                          />
                        ) : (
                          /* Legacy format for older handoff notes */
                          <div className="space-y-3">
                            {/* Mood */}
                            <div>
                              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                Mood
                              </p>
                              <p className="text-sm text-gray-900 dark:text-white capitalize">
                                {handoff.summary.mood.overall}
                                {handoff.summary.mood.notes && ` - ${handoff.summary.mood.notes}`}
                              </p>
                            </div>

                            {/* Medications */}
                            {handoff.summary.medicationsGiven.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">
                                  Medications Given
                                </p>
                                <div className="space-y-1">
                                  {handoff.summary.medicationsGiven.map((med, idx) => (
                                    <p key={idx} className="text-sm text-gray-900 dark:text-white">
                                      • {med.name} -
                                      <span className={
                                        med.status === 'missed' ? 'text-red-600' :
                                        med.status === 'late' ? 'text-yellow-600' :
                                        'text-green-600'
                                      }>
                                        {' '}{med.status}
                                      </span>
                                    </p>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Notes for Next Shift */}
                            {handoff.summary.notesForNextShift.length > 0 && (
                              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                                <p className="text-xs font-medium text-blue-900 dark:text-blue-100 uppercase mb-2">
                                  Important Notes
                                </p>
                                <div className="space-y-1">
                                  {handoff.summary.notesForNextShift.map((note, idx) => (
                                    <p key={idx} className="text-sm text-blue-800 dark:text-blue-200">
                                      • {note}
                                    </p>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
