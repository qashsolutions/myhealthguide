'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useElder } from '@/contexts/ElderContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  User,
  AlertCircle,
  CheckCircle,
  XCircle,
  Filter,
  Repeat,
  Bell
} from 'lucide-react';
import {
  getScheduledShifts,
  createScheduledShift,
  createShiftRequest,
  getShiftRequests,
  approveShiftRequest,
  rejectShiftRequest,
  confirmScheduledShift,
  cancelScheduledShift,
  checkScheduleConflicts
} from '@/lib/firebase/scheduleShifts';
import {
  createShiftSwapRequest,
  getSwapRequests,
  acceptShiftSwapRequest,
  rejectShiftSwapRequest
} from '@/lib/firebase/shiftSwap';
import { getUnreadNotificationCount } from '@/lib/notifications/caregiverNotifications';
import type { ScheduledShift, ShiftRequest, ShiftSwapRequest, AgencyRole } from '@/types';
import { format, startOfWeek, endOfWeek, addDays, addWeeks, subWeeks, isSameDay } from 'date-fns';

export default function CalendarPage() {
  const { user } = useAuth();
  const { selectedElder, availableElders } = useElder();

  // Check if user is multi-agency
  const isMultiAgency = user?.subscriptionTier === 'multi_agency';
  const userAgency = user?.agencies?.[0];
  const isSuperAdmin = userAgency?.role === 'super_admin';
  const isCaregiver = userAgency?.role === 'caregiver' || userAgency?.role === 'caregiver_admin';

  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date()));
  const [scheduledShifts, setScheduledShifts] = useState<ScheduledShift[]>([]);
  const [shiftRequests, setShiftRequests] = useState<ShiftRequest[]>([]);
  const [swapRequests, setSwapRequests] = useState<ShiftSwapRequest[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // View mode: 'calendar', 'requests', or 'swaps'
  const [viewMode, setViewMode] = useState<'calendar' | 'requests' | 'swaps'>('calendar');

  // Filter by caregiver (for superadmin)
  const [selectedCaregiverId, setSelectedCaregiverId] = useState<string>('all');

  // Modals
  const [showCreateShiftModal, setShowCreateShiftModal] = useState(false);
  const [showRequestShiftModal, setShowRequestShiftModal] = useState(false);
  const [showRequestReviewModal, setShowRequestReviewModal] = useState(false);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [showSwapReviewModal, setShowSwapReviewModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ShiftRequest | null>(null);
  const [selectedShift, setSelectedShift] = useState<ScheduledShift | null>(null);
  const [selectedSwapRequest, setSelectedSwapRequest] = useState<ShiftSwapRequest | null>(null);

  // Swap form
  const [swapForm, setSwapForm] = useState({
    targetCaregiverId: '',
    reason: ''
  });

  // Create shift form
  const [shiftForm, setShiftForm] = useState({
    caregiverId: '',
    elderId: '',
    date: '',
    startTime: '09:00',
    endTime: '17:00',
    notes: '',
    isRecurring: false,
    recurringDays: [] as number[]
  });

  // Request shift form
  const [requestForm, setRequestForm] = useState({
    requestType: 'specific' as 'specific' | 'recurring',
    specificDate: '',
    recurringDays: [] as number[],
    startTime: '09:00',
    endTime: '17:00',
    notes: ''
  });

  useEffect(() => {
    if (isMultiAgency && userAgency) {
      loadSchedule();
      if (isSuperAdmin) {
        loadShiftRequests();
      }
      if (isCaregiver) {
        loadSwapRequests();
        loadNotifications();
      }
    }
  }, [currentWeekStart, selectedCaregiverId, isMultiAgency, userAgency]);

  const loadSchedule = async () => {
    if (!userAgency) return;

    setLoading(true);
    setError(null);
    try {
      const weekStart = currentWeekStart;
      const weekEnd = endOfWeek(weekStart);

      // SuperAdmin sees all or filtered, Caregiver sees only their shifts
      const caregiverFilter = isSuperAdmin && selectedCaregiverId !== 'all'
        ? selectedCaregiverId
        : isCaregiver
        ? user.id
        : undefined;

      const shifts = await getScheduledShifts(
        userAgency.agencyId,
        weekStart,
        weekEnd,
        caregiverFilter
      );

      setScheduledShifts(shifts);
    } catch (err: any) {
      console.error('Error loading schedule:', err);
      setError('Failed to load schedule');
    } finally {
      setLoading(false);
    }
  };

  const loadShiftRequests = async () => {
    if (!userAgency) return;

    try {
      const requests = await getShiftRequests(userAgency.agencyId, 'pending');
      setShiftRequests(requests);
    } catch (err: any) {
      console.error('Error loading shift requests:', err);
    }
  };

  const loadSwapRequests = async () => {
    if (!user || !userAgency) return;

    try {
      const requests = await getSwapRequests(user.id, 'received', 'pending');
      setSwapRequests(requests);
    } catch (err: any) {
      console.error('Error loading swap requests:', err);
    }
  };

  const loadNotifications = async () => {
    if (!user || !userAgency) return;

    try {
      const count = await getUnreadNotificationCount(user.id, userAgency.agencyId);
      setUnreadNotifications(count);
    } catch (err: any) {
      console.error('Error loading notifications:', err);
    }
  };

  const handleCreateShift = async () => {
    if (!userAgency || !user) return;

    setError(null);
    try {
      const elder = availableElders.find(e => e.id === shiftForm.elderId);
      if (!elder) {
        setError('Please select an elder');
        return;
      }

      // Get caregiver name (simplified - would need to fetch from users collection)
      const caregiverName = shiftForm.caregiverId; // TODO: Fetch actual name

      const result = await createScheduledShift(
        userAgency.agencyId,
        elder.groupId,
        elder.id,
        elder.name,
        shiftForm.caregiverId,
        caregiverName,
        new Date(shiftForm.date),
        shiftForm.startTime,
        shiftForm.endTime,
        shiftForm.notes,
        user.id,
        shiftForm.isRecurring
      );

      if (result.success) {
        setShowCreateShiftModal(false);
        resetShiftForm();
        loadSchedule();
      } else {
        setError(result.error || 'Failed to create shift');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRequestShift = async () => {
    if (!userAgency || !user) return;

    setError(null);
    try {
      const result = await createShiftRequest(
        userAgency.agencyId,
        user.id,
        `${user.firstName} ${user.lastName}`,
        requestForm.requestType,
        requestForm.startTime,
        requestForm.endTime,
        requestForm.specificDate ? new Date(requestForm.specificDate) : undefined,
        requestForm.recurringDays.length > 0 ? requestForm.recurringDays : undefined,
        undefined, // preferredElders
        requestForm.notes
      );

      if (result.success) {
        setShowRequestShiftModal(false);
        resetRequestForm();
        alert('Shift request submitted successfully!');
      } else {
        setError(result.error || 'Failed to submit request');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleApproveRequest = async (assignedElderId: string, assignedElderName: string, assignedGroupId: string) => {
    if (!user || !selectedRequest) return;

    try {
      const result = await approveShiftRequest(
        selectedRequest.id,
        user.id,
        assignedElderId,
        assignedElderName,
        assignedGroupId,
        'Approved'
      );

      if (result.success) {
        setShowRequestReviewModal(false);
        setSelectedRequest(null);
        loadShiftRequests();
        loadSchedule();
      } else {
        setError(result.error || 'Failed to approve request');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRejectRequest = async (reason: string) => {
    if (!user || !selectedRequest) return;

    try {
      const result = await rejectShiftRequest(selectedRequest.id, user.id, reason);

      if (result.success) {
        setShowRequestReviewModal(false);
        setSelectedRequest(null);
        loadShiftRequests();
      } else {
        setError(result.error || 'Failed to reject request');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRequestSwap = async () => {
    if (!user || !userAgency || !selectedShift) return;

    setError(null);
    try {
      const result = await createShiftSwapRequest(
        userAgency.agencyId,
        user.id,
        `${user.firstName} ${user.lastName}`,
        selectedShift.id,
        {
          elderId: selectedShift.elderId,
          elderName: selectedShift.elderName,
          date: selectedShift.date,
          startTime: selectedShift.startTime,
          endTime: selectedShift.endTime
        },
        swapForm.targetCaregiverId || undefined,
        undefined, // targetCaregiverName - will be filled by the service
        undefined, // offerShiftId
        undefined, // offerShift
        swapForm.reason
      );

      if (result.success) {
        setShowSwapModal(false);
        setSelectedShift(null);
        resetSwapForm();
        alert('Swap request submitted successfully!');
      } else {
        setError(result.error || 'Failed to submit swap request');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAcceptSwap = async () => {
    if (!user || !selectedSwapRequest) return;

    try {
      const result = await acceptShiftSwapRequest(
        selectedSwapRequest.id,
        user.id,
        `${user.firstName} ${user.lastName}`
      );

      if (result.success) {
        setShowSwapReviewModal(false);
        setSelectedSwapRequest(null);
        loadSwapRequests();
        loadSchedule();
        alert('Swap accepted! The shift has been assigned to you.');
      } else {
        setError(result.error || 'Failed to accept swap');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRejectSwap = async (reason: string) => {
    if (!user || !selectedSwapRequest) return;

    try {
      const result = await rejectShiftSwapRequest(
        selectedSwapRequest.id,
        user.id,
        reason
      );

      if (result.success) {
        setShowSwapReviewModal(false);
        setSelectedSwapRequest(null);
        loadSwapRequests();
      } else {
        setError(result.error || 'Failed to reject swap');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const resetShiftForm = () => {
    setShiftForm({
      caregiverId: '',
      elderId: '',
      date: '',
      startTime: '09:00',
      endTime: '17:00',
      notes: '',
      isRecurring: false,
      recurringDays: []
    });
  };

  const resetRequestForm = () => {
    setRequestForm({
      requestType: 'specific',
      specificDate: '',
      recurringDays: [],
      startTime: '09:00',
      endTime: '17:00',
      notes: ''
    });
  };

  const resetSwapForm = () => {
    setSwapForm({
      targetCaregiverId: '',
      reason: ''
    });
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  const getShiftsForDate = (date: Date) => {
    return scheduledShifts.filter(shift => isSameDay(shift.date, date));
  };

  const getStatusColor = (status: ScheduledShift['status']) => {
    switch (status) {
      case 'scheduled':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'completed':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'no_show':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  if (!isMultiAgency) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="p-8">
          <CardContent>
            <div className="text-center">
              <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-center text-gray-600 dark:text-gray-400">
                Calendar is only available for Multi-Agency subscriptions
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Shift Calendar
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {isSuperAdmin ? 'Manage caregiver schedules' : 'View your schedule'}
          </p>
        </div>
        <div className="flex gap-2">
          {isCaregiver && unreadNotifications > 0 && (
            <Button variant="outline" onClick={() => window.location.href = '/dashboard/notifications/test'}>
              <Bell className="w-4 h-4 mr-2" />
              Notifications ({unreadNotifications})
            </Button>
          )}
          {isSuperAdmin && (
            <>
              <Button onClick={() => setViewMode('requests')} variant={viewMode === 'requests' ? 'default' : 'outline'}>
                <Filter className="w-4 h-4 mr-2" />
                Requests ({shiftRequests.length})
              </Button>
              <Button onClick={() => setShowCreateShiftModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Shift
              </Button>
            </>
          )}
          {isCaregiver && (
            <>
              <Button onClick={() => setViewMode('swaps')} variant={viewMode === 'swaps' ? 'default' : 'outline'}>
                <Repeat className="w-4 h-4 mr-2" />
                Swaps ({swapRequests.length})
              </Button>
              <Button onClick={() => setShowRequestShiftModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Request Shift
              </Button>
            </>
          )}
        </div>
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

      {viewMode === 'calendar' && (
        <>
          {/* Week Navigation */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <Button variant="outline" onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <h2 className="text-lg font-semibold">
                  {format(currentWeekStart, 'MMM d')} - {format(endOfWeek(currentWeekStart), 'MMM d, yyyy')}
                </h2>
                <Button variant="outline" onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              {isSuperAdmin && (
                <div className="mt-4">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Filter by Caregiver
                  </label>
                  <select
                    value={selectedCaregiverId}
                    onChange={(e) => setSelectedCaregiverId(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                  >
                    <option value="all">All Caregivers</option>
                    {/* TODO: Load caregivers from agency */}
                  </select>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Calendar Grid */}
          <Card>
            <CardContent className="pt-6">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-2">
                  {weekDays.map((day) => {
                    const dayShifts = getShiftsForDate(day);
                    const isToday = isSameDay(day, new Date());

                    return (
                      <div
                        key={day.toISOString()}
                        className={`border rounded-lg p-3 min-h-[200px] ${
                          isToday ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <div className="font-semibold text-sm mb-2">
                          <div>{format(day, 'EEE')}</div>
                          <div className="text-lg">{format(day, 'd')}</div>
                        </div>

                        <div className="space-y-2">
                          {dayShifts.map((shift) => (
                            <div
                              key={shift.id}
                              className={`text-xs p-2 rounded border ${getStatusColor(shift.status)}`}
                            >
                              <div className="font-medium">{shift.startTime} - {shift.endTime}</div>
                              {isSuperAdmin && (
                                <div className="mt-1">
                                  <div className="flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    {shift.caregiverName}
                                  </div>
                                </div>
                              )}
                              <div className="mt-1 truncate">{shift.elderName}</div>
                              <div className="mt-1 text-xs opacity-75 capitalize">{shift.status}</div>
                              {isCaregiver && shift.caregiverId === user.id && shift.status === 'scheduled' && (
                                <button
                                  onClick={() => {
                                    setSelectedShift(shift);
                                    setShowSwapModal(true);
                                  }}
                                  className="mt-2 w-full text-xs py-1 px-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded"
                                >
                                  Request Swap
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {viewMode === 'requests' && isSuperAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Shift Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {shiftRequests.length === 0 ? (
              <p className="text-center text-gray-600 dark:text-gray-400 py-8">
                No pending requests
              </p>
            ) : (
              <div className="space-y-4">
                {shiftRequests.map((request) => (
                  <div key={request.id} className="border rounded-lg p-4 dark:border-gray-700">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{request.caregiverName}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {request.requestType === 'specific'
                            ? `${format(request.specificDate!, 'MMM d, yyyy')} • ${request.startTime} - ${request.endTime}`
                            : `Recurring • ${request.recurringDays?.map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ')} • ${request.startTime} - ${request.endTime}`
                          }
                        </p>
                        {request.notes && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                            Note: {request.notes}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedRequest(request);
                            setShowRequestReviewModal(true);
                          }}
                        >
                          Review
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {viewMode === 'swaps' && isCaregiver && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Swap Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {swapRequests.length === 0 ? (
              <p className="text-center text-gray-600 dark:text-gray-400 py-8">
                No pending swap requests
              </p>
            ) : (
              <div className="space-y-4">
                {swapRequests.map((request) => (
                  <div key={request.id} className="border rounded-lg p-4 dark:border-gray-700">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{request.requestingCaregiverName}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {format(request.shiftToSwap.date, 'MMM d, yyyy')} • {request.shiftToSwap.startTime} - {request.shiftToSwap.endTime}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Elder: {request.shiftToSwap.elderName}
                        </p>
                        {request.reason && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                            Reason: {request.reason}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedSwapRequest(request);
                            setShowSwapReviewModal(true);
                          }}
                        >
                          Review
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create Shift Modal (SuperAdmin) */}
      {showCreateShiftModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Create Scheduled Shift</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Elder</label>
                <select
                  value={shiftForm.elderId}
                  onChange={(e) => setShiftForm({ ...shiftForm, elderId: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-lg"
                >
                  <option value="">Select elder...</option>
                  {availableElders.map((elder) => (
                    <option key={elder.id} value={elder.id}>{elder.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Caregiver ID</label>
                <Input
                  value={shiftForm.caregiverId}
                  onChange={(e) => setShiftForm({ ...shiftForm, caregiverId: e.target.value })}
                  placeholder="Enter caregiver ID"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Date</label>
                <Input
                  type="date"
                  value={shiftForm.date}
                  onChange={(e) => setShiftForm({ ...shiftForm, date: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Start Time</label>
                  <Input
                    type="time"
                    value={shiftForm.startTime}
                    onChange={(e) => setShiftForm({ ...shiftForm, startTime: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">End Time</label>
                  <Input
                    type="time"
                    value={shiftForm.endTime}
                    onChange={(e) => setShiftForm({ ...shiftForm, endTime: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Notes</label>
                <Input
                  value={shiftForm.notes}
                  onChange={(e) => setShiftForm({ ...shiftForm, notes: e.target.value })}
                  placeholder="Optional notes"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowCreateShiftModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateShift}>
                  Create Shift
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Request Shift Modal (Caregiver) */}
      {showRequestShiftModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Request Shift</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Request Type</label>
                <select
                  value={requestForm.requestType}
                  onChange={(e) => setRequestForm({ ...requestForm, requestType: e.target.value as 'specific' | 'recurring' })}
                  className="w-full mt-1 px-3 py-2 border rounded-lg"
                >
                  <option value="specific">Specific Date</option>
                  <option value="recurring">Recurring</option>
                </select>
              </div>

              {requestForm.requestType === 'specific' && (
                <div>
                  <label className="text-sm font-medium">Date</label>
                  <Input
                    type="date"
                    value={requestForm.specificDate}
                    onChange={(e) => setRequestForm({ ...requestForm, specificDate: e.target.value })}
                  />
                </div>
              )}

              {requestForm.requestType === 'recurring' && (
                <div>
                  <label className="text-sm font-medium">Days</label>
                  <div className="grid grid-cols-7 gap-2 mt-1">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                      <button
                        key={day}
                        onClick={() => {
                          const days = requestForm.recurringDays.includes(index)
                            ? requestForm.recurringDays.filter(d => d !== index)
                            : [...requestForm.recurringDays, index];
                          setRequestForm({ ...requestForm, recurringDays: days });
                        }}
                        className={`p-2 text-xs rounded border ${
                          requestForm.recurringDays.includes(index)
                            ? 'bg-blue-100 border-blue-500 text-blue-700'
                            : 'bg-gray-100 border-gray-300'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Start Time</label>
                  <Input
                    type="time"
                    value={requestForm.startTime}
                    onChange={(e) => setRequestForm({ ...requestForm, startTime: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">End Time</label>
                  <Input
                    type="time"
                    value={requestForm.endTime}
                    onChange={(e) => setRequestForm({ ...requestForm, endTime: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Notes</label>
                <Input
                  value={requestForm.notes}
                  onChange={(e) => setRequestForm({ ...requestForm, notes: e.target.value })}
                  placeholder="Why do you want this shift?"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowRequestShiftModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleRequestShift}>
                  Submit Request
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Request Swap Modal (Caregiver) */}
      {showSwapModal && selectedShift && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Request Shift Swap</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <p className="text-sm font-medium">Shift Details</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {format(selectedShift.date, 'MMM d, yyyy')} • {selectedShift.startTime} - {selectedShift.endTime}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Elder: {selectedShift.elderName}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium">Target Caregiver (Optional)</label>
                <Input
                  value={swapForm.targetCaregiverId}
                  onChange={(e) => setSwapForm({ ...swapForm, targetCaregiverId: e.target.value })}
                  placeholder="Leave blank to request any available caregiver"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Enter caregiver ID to request specific person
                </p>
              </div>

              <div>
                <label className="text-sm font-medium">Reason (Optional)</label>
                <Input
                  value={swapForm.reason}
                  onChange={(e) => setSwapForm({ ...swapForm, reason: e.target.value })}
                  placeholder="Why do you need to swap this shift?"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => {
                  setShowSwapModal(false);
                  setSelectedShift(null);
                  resetSwapForm();
                }}>
                  Cancel
                </Button>
                <Button onClick={handleRequestSwap}>
                  Submit Swap Request
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Review Swap Request Modal (Caregiver) */}
      {showSwapReviewModal && selectedSwapRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Review Swap Request</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <p className="text-sm font-medium">From: {selectedSwapRequest.requestingCaregiverName}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {format(selectedSwapRequest.shiftToSwap.date, 'MMM d, yyyy')} • {selectedSwapRequest.shiftToSwap.startTime} - {selectedSwapRequest.shiftToSwap.endTime}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Elder: {selectedSwapRequest.shiftToSwap.elderName}
                </p>
                {selectedSwapRequest.reason && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    Reason: {selectedSwapRequest.reason}
                  </p>
                )}
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <p className="text-xs text-blue-900 dark:text-blue-100">
                  By accepting, this shift will be assigned to you and the other caregiver will be notified.
                </p>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => handleRejectSwap('Not available')}>
                  Decline
                </Button>
                <Button onClick={handleAcceptSwap}>
                  Accept Swap
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
