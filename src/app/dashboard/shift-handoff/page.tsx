'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useElder } from '@/contexts/ElderContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, PlayCircle, StopCircle, FileText, AlertCircle } from 'lucide-react';
import { startShiftSession, endShiftSession } from '@/lib/ai/shiftHandoffGeneration';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { ShiftSession, ShiftHandoffNote } from '@/types';
import { format } from 'date-fns';

export default function ShiftHandoffPage() {
  const { user } = useAuth();
  const { selectedElder } = useElder();
  const [activeShift, setActiveShift] = useState<ShiftSession | null>(null);
  const [recentHandoffs, setRecentHandoffs] = useState<ShiftHandoffNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load active shift and recent handoffs
  useEffect(() => {
    if (user && selectedElder) {
      loadActiveShift();
      loadRecentHandoffs();
    }
  }, [user, selectedElder]);

  const loadActiveShift = async () => {
    if (!user || !selectedElder) return;

    try {
      const shiftsQuery = query(
        collection(db, 'shiftSessions'),
        where('caregiverId', '==', user.uid),
        where('elderId', '==', selectedElder.id),
        where('status', '==', 'active'),
        orderBy('startTime', 'desc'),
        limit(1)
      );

      const snapshot = await getDocs(shiftsQuery);
      if (!snapshot.empty) {
        setActiveShift({
          id: snapshot.docs[0].id,
          ...snapshot.docs[0].data(),
          startTime: snapshot.docs[0].data().startTime?.toDate(),
          endTime: snapshot.docs[0].data().endTime?.toDate(),
          createdAt: snapshot.docs[0].data().createdAt?.toDate(),
          updatedAt: snapshot.docs[0].data().updatedAt?.toDate()
        } as ShiftSession);
      } else {
        setActiveShift(null);
      }
    } catch (err: any) {
      console.error('Error loading active shift:', err);
    }
  };

  const loadRecentHandoffs = async () => {
    if (!selectedElder) return;

    try {
      const handoffsQuery = query(
        collection(db, 'shiftHandoffNotes'),
        where('elderId', '==', selectedElder.id),
        orderBy('generatedAt', 'desc'),
        limit(5)
      );

      const snapshot = await getDocs(handoffsQuery);
      const handoffs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        generatedAt: doc.data().generatedAt?.toDate(),
        shiftPeriod: {
          start: doc.data().shiftPeriod?.start?.toDate(),
          end: doc.data().shiftPeriod?.end?.toDate()
        }
      })) as ShiftHandoffNote[];

      setRecentHandoffs(handoffs);
    } catch (err: any) {
      console.error('Error loading handoffs:', err);
    }
  };

  const handleClockIn = async () => {
    if (!user || !selectedElder) return;

    setLoading(true);
    setError(null);

    try {
      const shiftId = await startShiftSession(
        user.groups?.[0] || '',
        selectedElder.id,
        user.uid
      );

      await loadActiveShift();

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
        user.groups?.[0] || '',
        selectedElder.id,
        selectedElder.name
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
              {recentHandoffs.map((handoff) => (
                <Card key={handoff.id} className="border-2">
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {format(handoff.shiftPeriod.start, 'MMM d, yyyy')}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {format(handoff.shiftPeriod.start, 'h:mm a')} -
                            {format(handoff.shiftPeriod.end, 'h:mm a')}
                          </p>
                        </div>
                        {handoff.isRoutineShift ? (
                          <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 text-xs font-medium rounded-full">
                            Routine
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 text-xs font-medium rounded-full">
                            Attention Needed
                          </span>
                        )}
                      </div>

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
                                  {med.status}
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
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
