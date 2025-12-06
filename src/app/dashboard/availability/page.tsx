'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useElder } from '@/contexts/ElderContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Calendar as CalendarIcon,
  Clock,
  AlertCircle,
  CheckCircle,
  Plus,
  X,
  Save
} from 'lucide-react';
import {
  getCaregiverAvailability,
  updateWeeklyAvailability,
  addDateOverride,
  removeDateOverride,
  updateAvailabilityPreferences
} from '@/lib/firebase/caregiverAvailability';
import type { CaregiverAvailability } from '@/types';
import { format } from 'date-fns';
import { validateNoProfanity } from '@/lib/utils/profanityFilter';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function AvailabilityPage() {
  const { user } = useAuth();
  const { availableElders } = useElder();

  // Check if user is multi-agency subscriber
  const isMultiAgency = user?.subscriptionTier === 'multi_agency';
  const userAgency = user?.agencies?.[0];
  const isCaregiver = userAgency?.role === 'caregiver' || userAgency?.role === 'caregiver_admin';

  const [availability, setAvailability] = useState<CaregiverAvailability | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Weekly availability state
  const [weeklyAvail, setWeeklyAvail] = useState<CaregiverAvailability['weeklyAvailability']>([]);

  // Date override form
  const [showOverrideForm, setShowOverrideForm] = useState(false);
  const [overrideForm, setOverrideForm] = useState({
    date: '',
    available: false,
    reason: '',
    hasTimeSlots: false,
    timeSlots: [{ startTime: '09:00', endTime: '17:00' }]
  });

  // Preferences
  const [preferences, setPreferences] = useState({
    maxShiftsPerWeek: 5,
    maxHoursPerWeek: 40,
    preferredElders: [] as string[],
    unavailableElders: [] as string[]
  });

  useEffect(() => {
    if (user && userAgency && isCaregiver && isMultiAgency) {
      loadAvailability();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, userAgency, isCaregiver, isMultiAgency]);

  const loadAvailability = async () => {
    if (!user || !userAgency) return;

    setLoading(true);
    setError(null);
    try {
      const data = await getCaregiverAvailability(user.id, userAgency.agencyId);

      if (data) {
        setAvailability(data);
        setWeeklyAvail(data.weeklyAvailability);
        setPreferences({
          maxShiftsPerWeek: data.maxShiftsPerWeek || 5,
          maxHoursPerWeek: data.maxHoursPerWeek || 40,
          preferredElders: data.preferredElders || [],
          unavailableElders: data.unavailableElders || []
        });
      }
    } catch (err: any) {
      console.error('Error loading availability:', err);
      setError('Failed to load availability');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveWeeklyAvailability = async () => {
    if (!availability) return;

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await updateWeeklyAvailability(availability.id, weeklyAvail);

      if (result.success) {
        setSuccess('Weekly availability updated successfully');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || 'Failed to update availability');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleDay = (dayOfWeek: number) => {
    setWeeklyAvail(prev => {
      const updated = [...prev];
      const dayIndex = updated.findIndex(d => d.dayOfWeek === dayOfWeek);

      if (dayIndex >= 0) {
        updated[dayIndex] = {
          ...updated[dayIndex],
          available: !updated[dayIndex].available
        };
      }

      return updated;
    });
  };

  const handleUpdateTimeSlot = (dayOfWeek: number, slotIndex: number, field: 'startTime' | 'endTime', value: string) => {
    setWeeklyAvail(prev => {
      const updated = [...prev];
      const dayIndex = updated.findIndex(d => d.dayOfWeek === dayOfWeek);

      if (dayIndex >= 0 && updated[dayIndex].timeSlots) {
        const slots = [...(updated[dayIndex].timeSlots || [])];
        slots[slotIndex] = { ...slots[slotIndex], [field]: value };
        updated[dayIndex] = { ...updated[dayIndex], timeSlots: slots };
      }

      return updated;
    });
  };

  const handleAddTimeSlot = (dayOfWeek: number) => {
    setWeeklyAvail(prev => {
      const updated = [...prev];
      const dayIndex = updated.findIndex(d => d.dayOfWeek === dayOfWeek);

      if (dayIndex >= 0) {
        const slots = updated[dayIndex].timeSlots || [];
        updated[dayIndex] = {
          ...updated[dayIndex],
          timeSlots: [...slots, { startTime: '09:00', endTime: '17:00' }]
        };
      }

      return updated;
    });
  };

  const handleRemoveTimeSlot = (dayOfWeek: number, slotIndex: number) => {
    setWeeklyAvail(prev => {
      const updated = [...prev];
      const dayIndex = updated.findIndex(d => d.dayOfWeek === dayOfWeek);

      if (dayIndex >= 0 && updated[dayIndex].timeSlots) {
        const slots = [...(updated[dayIndex].timeSlots || [])];
        slots.splice(slotIndex, 1);
        updated[dayIndex] = { ...updated[dayIndex], timeSlots: slots };
      }

      return updated;
    });
  };

  const handleAddDateOverride = async () => {
    if (!availability || !overrideForm.date) return;

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      // Check reason for profanity
      if (overrideForm.reason) {
        const profanityCheck = validateNoProfanity(overrideForm.reason, 'Reason');
        if (!profanityCheck.isValid) {
          setError(profanityCheck.error || 'Reason contains inappropriate language');
          setSaving(false);
          return;
        }
      }

      const result = await addDateOverride(
        availability.id,
        new Date(overrideForm.date),
        overrideForm.available,
        overrideForm.reason,
        overrideForm.hasTimeSlots ? overrideForm.timeSlots : undefined
      );

      if (result.success) {
        setSuccess('Date override added successfully');
        setShowOverrideForm(false);
        resetOverrideForm();
        await loadAvailability();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || 'Failed to add date override');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveDateOverride = async (date: Date) => {
    if (!availability) return;

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await removeDateOverride(availability.id, date);

      if (result.success) {
        setSuccess('Date override removed successfully');
        await loadAvailability();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || 'Failed to remove date override');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSavePreferences = async () => {
    if (!availability) return;

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await updateAvailabilityPreferences(
        availability.id,
        preferences.maxShiftsPerWeek,
        preferences.maxHoursPerWeek,
        preferences.preferredElders,
        preferences.unavailableElders
      );

      if (result.success) {
        setSuccess('Preferences updated successfully');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || 'Failed to update preferences');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const resetOverrideForm = () => {
    setOverrideForm({
      date: '',
      available: false,
      reason: '',
      hasTimeSlots: false,
      timeSlots: [{ startTime: '09:00', endTime: '17:00' }]
    });
  };

  if (!isMultiAgency) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="p-8">
          <CardContent>
            <div className="text-center">
              <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                Availability management is only available for Multi-Agency subscriptions
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isCaregiver) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="p-8">
          <CardContent>
            <div className="text-center">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                Availability management is only available for caregivers
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          My Availability
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Manage your schedule, time off, and preferences
        </p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <Card className="border-green-500 bg-green-50 dark:bg-green-900/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle className="w-5 h-5" />
              <p>{success}</p>
            </div>
          </CardContent>
        </Card>
      )}

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

      {/* Weekly Availability */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Weekly Availability
          </CardTitle>
          <CardDescription>
            Set your regular weekly schedule
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {weeklyAvail.map((day) => (
            <div key={day.dayOfWeek} className="border rounded-lg p-4 dark:border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={day.available}
                    onChange={() => handleToggleDay(day.dayOfWeek)}
                    className="w-5 h-5 rounded"
                  />
                  <span className="font-semibold">{DAYS_OF_WEEK[day.dayOfWeek]}</span>
                </div>
                {day.available && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAddTimeSlot(day.dayOfWeek)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Time Slot
                  </Button>
                )}
              </div>

              {day.available && day.timeSlots && (
                <div className="space-y-2 ml-8">
                  {day.timeSlots.map((slot, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={slot.startTime}
                        onChange={(e) => handleUpdateTimeSlot(day.dayOfWeek, idx, 'startTime', e.target.value)}
                        className="w-32"
                      />
                      <span className="text-gray-500">to</span>
                      <Input
                        type="time"
                        value={slot.endTime}
                        onChange={(e) => handleUpdateTimeSlot(day.dayOfWeek, idx, 'endTime', e.target.value)}
                        className="w-32"
                      />
                      {day.timeSlots!.length > 1 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveTimeSlot(day.dayOfWeek, idx)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          <div className="flex justify-end">
            <Button onClick={handleSaveWeeklyAvailability} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Weekly Availability'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Date Overrides (Time Off / Special Availability) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Time Off & Special Availability
          </CardTitle>
          <CardDescription>
            Request specific dates off or set special availability
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {availability?.dateOverrides && availability.dateOverrides.length > 0 && (
            <div className="space-y-2 mb-4">
              {availability.dateOverrides.map((override, idx) => (
                <div key={idx} className="flex items-center justify-between border rounded-lg p-3 dark:border-gray-700">
                  <div>
                    <p className="font-medium">
                      {format(override.date, 'MMM d, yyyy')}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {override.available ? 'Available' : 'Not Available'}
                      {override.reason && ` - ${override.reason}`}
                    </p>
                    {override.timeSlots && override.timeSlots.length > 0 && (
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        {override.timeSlots.map(slot => `${slot.startTime}-${slot.endTime}`).join(', ')}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemoveDateOverride(override.date)}
                    disabled={saving}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {!showOverrideForm ? (
            <Button onClick={() => setShowOverrideForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Date Override
            </Button>
          ) : (
            <div className="border rounded-lg p-4 space-y-4 dark:border-gray-700">
              <div>
                <label className="text-sm font-medium">Date</label>
                <Input
                  type="date"
                  value={overrideForm.date}
                  onChange={(e) => setOverrideForm({ ...overrideForm, date: e.target.value })}
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={overrideForm.available}
                  onChange={(e) => setOverrideForm({ ...overrideForm, available: e.target.checked })}
                  className="w-5 h-5 rounded"
                />
                <label className="text-sm font-medium">
                  I am available on this date
                </label>
              </div>

              <div>
                <label className="text-sm font-medium">Reason (optional)</label>
                <Input
                  value={overrideForm.reason}
                  onChange={(e) => setOverrideForm({ ...overrideForm, reason: e.target.value })}
                  placeholder="e.g., Vacation, Doctor appointment"
                />
              </div>

              {overrideForm.available && (
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={overrideForm.hasTimeSlots}
                    onChange={(e) => setOverrideForm({ ...overrideForm, hasTimeSlots: e.target.checked })}
                    className="w-5 h-5 rounded"
                  />
                  <label className="text-sm font-medium">
                    Specify time slots
                  </label>
                </div>
              )}

              {overrideForm.available && overrideForm.hasTimeSlots && (
                <div className="space-y-2 ml-8">
                  {overrideForm.timeSlots.map((slot, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={slot.startTime}
                        onChange={(e) => {
                          const slots = [...overrideForm.timeSlots];
                          slots[idx] = { ...slots[idx], startTime: e.target.value };
                          setOverrideForm({ ...overrideForm, timeSlots: slots });
                        }}
                        className="w-32"
                      />
                      <span className="text-gray-500">to</span>
                      <Input
                        type="time"
                        value={slot.endTime}
                        onChange={(e) => {
                          const slots = [...overrideForm.timeSlots];
                          slots[idx] = { ...slots[idx], endTime: e.target.value };
                          setOverrideForm({ ...overrideForm, timeSlots: slots });
                        }}
                        className="w-32"
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowOverrideForm(false);
                    resetOverrideForm();
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleAddDateOverride} disabled={saving}>
                  {saving ? 'Adding...' : 'Add Override'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Shift Preferences</CardTitle>
          <CardDescription>
            Set your maximum hours and elder preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Max Shifts Per Week</label>
              <Input
                type="number"
                min="1"
                max="7"
                value={preferences.maxShiftsPerWeek}
                onChange={(e) => setPreferences({ ...preferences, maxShiftsPerWeek: parseInt(e.target.value) })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Max Hours Per Week</label>
              <Input
                type="number"
                min="1"
                max="168"
                value={preferences.maxHoursPerWeek}
                onChange={(e) => setPreferences({ ...preferences, maxHoursPerWeek: parseInt(e.target.value) })}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Preferred Elders</label>
            <select
              multiple
              value={preferences.preferredElders}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, option => option.value);
                setPreferences({ ...preferences, preferredElders: selected });
              }}
              className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 min-h-[100px]"
            >
              {availableElders.map((elder) => (
                <option key={elder.id} value={elder.id}>
                  {elder.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Hold Ctrl/Cmd to select multiple
            </p>
          </div>

          <div>
            <label className="text-sm font-medium">Unavailable Elders</label>
            <select
              multiple
              value={preferences.unavailableElders}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, option => option.value);
                setPreferences({ ...preferences, unavailableElders: selected });
              }}
              className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 min-h-[100px]"
            >
              {availableElders.map((elder) => (
                <option key={elder.id} value={elder.id}>
                  {elder.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Hold Ctrl/Cmd to select multiple
            </p>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSavePreferences} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Preferences'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
