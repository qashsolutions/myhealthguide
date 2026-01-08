'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useElder } from '@/contexts/ElderContext';
import { useSubscription } from '@/lib/subscription';
import { FeatureGate } from '@/components/shared/FeatureGate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, PlayCircle, StopCircle, FileText, AlertCircle, Calendar, Lock, ChevronDown, ChevronUp, QrCode, MapPin } from 'lucide-react';
import { startShiftSession, endShiftSession } from '@/lib/ai/shiftHandoffGeneration';
import { linkShiftToSession } from '@/lib/firebase/scheduleShifts';
import { authenticatedFetch } from '@/lib/api/authenticatedFetch';
import type { ShiftSession, ShiftHandoffNote, ScheduledShift } from '@/types';
import { format } from 'date-fns';
import { SOAPNoteDisplay } from '@/components/shift-handoff/SOAPNoteDisplay';
import { QRScanner, LocationOverrideDialog, GPSStatus } from '@/components/shift-handoff/QRScanner';
import { validateQRCode } from '@/lib/qrcode/qrCodeService';
import { captureGPS, verifyLocation } from '@/lib/location/gpsService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { OverrideReason } from '@/types/timesheet';

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

  // QR Code scanning state
  const [clockInMethod, setClockInMethod] = useState<'schedule' | 'qr'>('schedule');
  const [qrProcessing, setQrProcessing] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'capturing' | 'verified' | 'override' | 'error'>('idle');
  const [gpsDistance, setGpsDistance] = useState<number | undefined>();
  const [gpsAccuracy, setGpsAccuracy] = useState<number | undefined>();
  const [gpsError, setGpsError] = useState<string | undefined>();
  const [showOverrideDialog, setShowOverrideDialog] = useState(false);
  const [pendingQrData, setPendingQrData] = useState<string | null>(null);
  const [overrideReason, setOverrideReason] = useState<OverrideReason | undefined>();

  // Check if elder has address for QR verification
  const elderHasAddress = selectedElder?.address?.coordinates?.latitude && selectedElder?.address?.coordinates?.longitude;

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
      console.log('[ShiftHandoff] Loading active shift for elder:', selectedElder.id);
      const response = await authenticatedFetch(
        `/api/shift-handoff?elderId=${selectedElder.id}&type=active`
      );
      const data = await response.json();
      console.log('[ShiftHandoff] API response:', data);

      if (data.success) {
        if (data.activeShift) {
          console.log('[ShiftHandoff] Active shift found:', {
            id: data.activeShift.id,
            caregiverId: data.activeShift.caregiverId,
            elderId: data.activeShift.elderId,
            status: data.activeShift.status,
            startTime: data.activeShift.startTime
          });
          setActiveShift({
            ...data.activeShift,
            startTime: data.activeShift.startTime ? new Date(data.activeShift.startTime) : null,
            endTime: data.activeShift.endTime ? new Date(data.activeShift.endTime) : null,
            createdAt: data.activeShift.createdAt ? new Date(data.activeShift.createdAt) : null,
            updatedAt: data.activeShift.updatedAt ? new Date(data.activeShift.updatedAt) : null
          } as ShiftSession);
        } else {
          console.log('[ShiftHandoff] No active shift found');
          setActiveShift(null);
        }
      }
    } catch (err: any) {
      console.error('[ShiftHandoff] Error loading active shift:', err);
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

  // Check if clock-in is allowed (within 10 minutes of scheduled start)
  const canClockIn = (): { allowed: boolean; reason?: string; minutesUntilStart?: number } => {
    if (!scheduledShift) {
      return { allowed: false, reason: 'No shift scheduled. Contact your supervisor to assign a shift.' };
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const shiftDate = scheduledShift.date instanceof Date ? scheduledShift.date : new Date(scheduledShift.date);
    const shiftDay = new Date(shiftDate.getFullYear(), shiftDate.getMonth(), shiftDate.getDate());

    // Check if shift is for today
    if (today.getTime() !== shiftDay.getTime()) {
      return { allowed: false, reason: `Shift is scheduled for ${format(shiftDate, 'MMM d, yyyy')}, not today.` };
    }

    // Parse scheduled start time
    const [hours, minutes] = scheduledShift.startTime.split(':').map(Number);
    const scheduledStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);

    const diffMinutes = (scheduledStart.getTime() - now.getTime()) / (1000 * 60);

    // Can't clock in more than 10 minutes early
    if (diffMinutes > 10) {
      return {
        allowed: false,
        reason: `Too early to clock in. Your shift starts at ${scheduledShift.startTime}.`,
        minutesUntilStart: Math.ceil(diffMinutes)
      };
    }

    // Can't clock in more than 30 minutes late (optional grace period)
    if (diffMinutes < -30) {
      return {
        allowed: false,
        reason: `Shift start time (${scheduledShift.startTime}) has passed by more than 30 minutes. Contact your supervisor.`
      };
    }

    return { allowed: true };
  };

  const handleClockIn = async () => {
    if (!user || !selectedElder) return;

    // Check if clock-in is allowed
    const clockInCheck = canClockIn();
    if (!clockInCheck.allowed) {
      setError(clockInCheck.reason || 'Cannot clock in at this time');
      return;
    }

    if (!scheduledShift) {
      setError('No scheduled shift found');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Use elder's groupId (caregivers don't have user.groups populated)
      const groupId = selectedElder.groupId;
      if (!groupId) {
        throw new Error('Elder does not have a group assigned');
      }

      // Start shift session with scheduled shift reference
      const shiftSessionId = await startShiftSession(
        groupId,
        selectedElder.id,
        user.id,
        user.agencies?.[0]?.agencyId,
        scheduledShift.duration, // Pass planned duration
        scheduledShift.id, // Pass scheduled shift ID
        scheduledShift.startTime, // Pass planned start time
        scheduledShift.endTime // Pass planned end time
      );

      // Link to scheduled shift (mandatory now)
      await linkShiftToSession(scheduledShift.id, shiftSessionId);

      await loadActiveShift();
      await loadScheduledShift(); // Refresh to show updated status

    } catch (err: any) {
      setError('Failed to clock in: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!user || !selectedElder || !activeShift) {
      console.log('[ShiftHandoff] Clock out blocked - missing data:', {
        user: !!user,
        selectedElder: !!selectedElder,
        activeShift: !!activeShift
      });
      return;
    }

    // Use elder's groupId (caregivers don't have user.groups populated)
    const groupId = selectedElder.groupId;
    if (!groupId) {
      setError('Elder does not have a group assigned');
      return;
    }

    console.log('[ShiftHandoff] Clocking out with:', {
      shiftSessionId: activeShift.id,
      groupId,
      elderId: selectedElder.id,
      elderName: selectedElder.name,
      activeShiftData: activeShift
    });

    setLoading(true);
    setError(null);

    try {
      await endShiftSession(
        activeShift.id,
        groupId,
        selectedElder.id,
        selectedElder.name,
        user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.email || 'Caregiver' // Pass caregiver name for SOAP note
      );

      await loadActiveShift();
      await loadRecentHandoffs();

      // TODO: Send handoff note notification to next caregiver + admin
    } catch (err: any) {
      console.error('[ShiftHandoff] Clock out error:', err);
      setError('Failed to clock out: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle QR code scan success
  const handleQRScanSuccess = async (decodedText: string) => {
    if (!user || !selectedElder) return;

    setQrProcessing(true);
    setError(null);
    setPendingQrData(decodedText);

    try {
      // Validate QR code
      const validation = await validateQRCode(decodedText);

      if (!validation.valid) {
        setError(validation.error || 'Invalid QR code');
        setQrProcessing(false);
        return;
      }

      // Verify QR code is for the selected elder
      if (validation.qrCode?.elderId !== selectedElder.id) {
        setError('QR code does not match the selected loved one');
        setQrProcessing(false);
        return;
      }

      // Capture GPS location
      setGpsStatus('capturing');
      const gpsResult = await captureGPS();

      if (!gpsResult.success || !gpsResult.gps) {
        setGpsError(gpsResult.error || 'Unable to capture location');
        setGpsStatus('error');
        setQrProcessing(false);
        return;
      }

      const gps = gpsResult.gps;
      setGpsAccuracy(gps.accuracy);

      // Verify location if elder has coordinates
      if (elderHasAddress && selectedElder.address?.coordinates) {
        const verification = verifyLocation(
          gps,
          {
            latitude: selectedElder.address.coordinates.latitude,
            longitude: selectedElder.address.coordinates.longitude,
          },
          100 // 100 meter radius
        );

        setGpsDistance(verification.distanceMeters);

        if (verification.verified) {
          setGpsStatus('verified');
          // Proceed with clock-in
          await handleQRClockIn({ latitude: gps.latitude, longitude: gps.longitude, accuracy: gps.accuracy }, undefined);
        } else {
          // Show override dialog
          setShowOverrideDialog(true);
        }
      } else {
        // No coordinates to verify against, proceed with clock-in
        setGpsStatus('verified');
        await handleQRClockIn({ latitude: gps.latitude, longitude: gps.longitude, accuracy: gps.accuracy }, undefined);
      }
    } catch (err: any) {
      console.error('QR scan error:', err);
      setError('QR verification failed: ' + err.message);
      setGpsStatus('error');
    } finally {
      setQrProcessing(false);
    }
  };

  // Handle location override confirmation
  const handleLocationOverride = async (reason: OverrideReason) => {
    setShowOverrideDialog(false);
    setOverrideReason(reason);
    setGpsStatus('override');

    try {
      const gpsResult = await captureGPS();
      if (gpsResult.success && gpsResult.gps) {
        const gps = gpsResult.gps;
        await handleQRClockIn({ latitude: gps.latitude, longitude: gps.longitude, accuracy: gps.accuracy }, reason);
      } else {
        setError(gpsResult.error || 'Failed to capture location');
      }
    } catch (err: any) {
      setError('Failed to clock in with override: ' + err.message);
    }
  };

  // Clock in via QR code
  const handleQRClockIn = async (
    location: { latitude: number; longitude: number; accuracy: number },
    overrideReason?: OverrideReason
  ) => {
    if (!user || !selectedElder) return;

    setLoading(true);

    try {
      const groupId = selectedElder.groupId;
      if (!groupId) {
        throw new Error('Elder does not have a group assigned');
      }

      // Start shift session with QR verification data
      const shiftSessionId = await startShiftSession(
        groupId,
        selectedElder.id,
        user.id,
        user.agencies?.[0]?.agencyId,
        undefined, // No planned duration for QR clock-in
        scheduledShift?.id, // Link to scheduled shift if exists
        scheduledShift?.startTime,
        scheduledShift?.endTime
      );

      // If there's a scheduled shift, link to it
      if (scheduledShift) {
        await linkShiftToSession(scheduledShift.id, shiftSessionId);
      }

      await loadActiveShift();
      await loadScheduledShift();

      // Reset QR state
      setPendingQrData(null);
      setGpsStatus('idle');
      setGpsDistance(undefined);
      setOverrideReason(undefined);
    } catch (err: any) {
      setError('Failed to clock in via QR: ' + err.message);
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
              Please select a loved one to manage shift handoffs
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
              {/* No Scheduled Shift */}
              {!scheduledShift && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                        No Shift Scheduled
                      </p>
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                        Contact your supervisor to assign a shift for today.
                      </p>
                    </div>
                  </div>
                </div>
              )}

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
                        {scheduledShift.date && (
                          <span className="ml-2">
                            ({format(scheduledShift.date instanceof Date ? scheduledShift.date : new Date(scheduledShift.date), 'MMM d')})
                          </span>
                        )}
                      </p>
                      {scheduledShift.notes && (
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                          Note: {scheduledShift.notes}
                        </p>
                      )}
                      {/* Clock-in status */}
                      {(() => {
                        const status = canClockIn();
                        if (status.allowed) {
                          return (
                            <p className="text-xs text-green-600 dark:text-green-400 mt-2 font-medium">
                              ✓ Ready to clock in
                            </p>
                          );
                        } else if (status.minutesUntilStart) {
                          return (
                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                              Clock-in available in {status.minutesUntilStart} minutes
                            </p>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {/* Clock-in Methods */}
              <Tabs value={clockInMethod} onValueChange={(v) => setClockInMethod(v as 'schedule' | 'qr')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="schedule" className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Schedule
                  </TabsTrigger>
                  <TabsTrigger value="qr" className="flex items-center gap-2">
                    <QrCode className="w-4 h-4" />
                    QR Code
                  </TabsTrigger>
                </TabsList>

                {/* Schedule-based Clock-in */}
                <TabsContent value="schedule" className="space-y-4">
                  <Button
                    onClick={handleClockIn}
                    disabled={loading || !canClockIn().allowed}
                    className="w-full"
                    size="lg"
                  >
                    <PlayCircle className="w-5 h-5 mr-2" />
                    {canClockIn().allowed ? 'Clock In' : 'Clock In (Not Available)'}
                  </Button>
                </TabsContent>

                {/* QR Code Clock-in */}
                <TabsContent value="qr" className="space-y-4">
                  {!elderHasAddress && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <MapPin className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                            Address Not Set
                          </p>
                          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                            Location verification requires an address. Ask your admin to add the address in the loved one&apos;s profile.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <QRScanner
                    onScanSuccess={handleQRScanSuccess}
                    onScanError={(err) => setError(err)}
                    isProcessing={qrProcessing}
                  />

                  <GPSStatus
                    status={gpsStatus}
                    distanceMeters={gpsDistance}
                    accuracy={gpsAccuracy}
                    errorMessage={gpsError}
                    overrideReason={overrideReason}
                  />
                </TabsContent>
              </Tabs>

              {/* Location Override Dialog */}
              <LocationOverrideDialog
                open={showOverrideDialog}
                onClose={() => setShowOverrideDialog(false)}
                onConfirm={handleLocationOverride}
                distanceMeters={gpsDistance || 0}
                elderName={selectedElder?.name || 'Loved One'}
              />
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
                            elderName={selectedElder?.name || 'Loved One'}
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
