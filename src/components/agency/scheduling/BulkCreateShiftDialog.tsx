'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { AlertTriangle, Clock, Calendar, CheckCircle, Users, UserCheck } from 'lucide-react';
import { format, getDay } from 'date-fns';
import { createScheduledShift, createCascadeShift } from '@/lib/firebase/scheduleShifts';
import type { Elder } from '@/types';

type AssignmentMode = 'cascade' | 'direct';

interface CaregiverInfo {
  id: string;
  name: string;
  color: { bg: string; border: string; text: string };
}

interface BulkCreateShiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agencyId: string;
  groupId: string;
  userId: string;
  selectedDates: Date[];
  caregivers: CaregiverInfo[];
  elders: Elder[];
  onShiftsCreated: () => void;
  onClearSelection: () => void;
  preSelectedCaregiverId?: string; // Pre-select if caregiver filter is active
}

interface CreationResult {
  date: Date;
  success: boolean;
  error?: string;
}

export function BulkCreateShiftDialog({
  open,
  onOpenChange,
  agencyId,
  groupId,
  userId,
  selectedDates,
  caregivers,
  elders,
  onShiftsCreated,
  onClearSelection,
  preSelectedCaregiverId
}: BulkCreateShiftDialogProps) {
  const [assignmentMode, setAssignmentMode] = useState<AssignmentMode>('cascade');
  const [selectedCaregiver, setSelectedCaregiver] = useState<string>('');
  const [selectedElder, setSelectedElder] = useState<string>('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<CreationResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  // Store created shift details for success message
  const [createdShiftDetails, setCreatedShiftDetails] = useState<{
    caregiverName: string;
    elderName: string;
    startTime: string;
    endTime: string;
    totalHours: number;
  } | null>(null);

  // Pre-select caregiver if filter is active
  useEffect(() => {
    if (open && preSelectedCaregiverId) {
      setSelectedCaregiver(preSelectedCaregiverId);
    }
  }, [open, preSelectedCaregiverId]);

  const sortedDates = [...selectedDates].sort((a, b) => a.getTime() - b.getTime());

  // Generate smart summary of selected dates
  const getDatesSummary = () => {
    if (sortedDates.length === 0) return '';
    if (sortedDates.length === 1) return format(sortedDates[0], 'EEE, MMM d, yyyy');

    const firstDate = sortedDates[0];
    const lastDate = sortedDates[sortedDates.length - 1];
    const dateRange = `${format(firstDate, 'MMM d')} - ${format(lastDate, 'MMM d, yyyy')}`;

    // Check which days of week are included
    const daysIncluded = new Set(sortedDates.map(d => getDay(d)));
    const weekdays = [1, 2, 3, 4, 5]; // Mon-Fri
    const weekends = [0, 6]; // Sun, Sat

    const isAllWeekdays = weekdays.every(d => daysIncluded.has(d)) &&
                          !weekends.some(d => daysIncluded.has(d));
    const isAllWeekends = weekends.every(d => daysIncluded.has(d)) &&
                          !weekdays.some(d => daysIncluded.has(d));

    // Check for single day pattern (all Mondays, all Tuesdays, etc.)
    const dayNames = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];
    if (daysIncluded.size === 1) {
      const dayIndex = Array.from(daysIncluded)[0];
      return `${dateRange} • All ${dayNames[dayIndex]}`;
    }

    if (isAllWeekdays) {
      return `${dateRange} • Weekdays (Mon-Fri)`;
    }

    if (isAllWeekends) {
      return `${dateRange} • Weekends (Sat-Sun)`;
    }

    // Custom selection - show which days
    const selectedDayNames = Array.from(daysIncluded)
      .sort()
      .map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]);

    return `${dateRange} • ${selectedDayNames.join(', ')}`;
  };

  const calculateDuration = () => {
    if (!startTime || !endTime) return 0;
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    return Math.max(0, endMinutes - startMinutes);
  };

  const duration = calculateDuration();
  const hours = Math.floor(duration / 60);
  const minutes = duration % 60;

  // Helper to validate time format (HH:MM)
  const isValidTime = (time: string): boolean => {
    if (!time || time.length !== 5) return false;
    const [hoursStr, minutesStr] = time.split(':');
    const h = parseInt(hoursStr, 10);
    const m = parseInt(minutesStr, 10);
    return !isNaN(h) && !isNaN(m) && h >= 0 && h <= 23 && m >= 0 && m <= 59;
  };

  // Helper to convert time string to minutes for comparison
  const timeToMinutes = (time: string): number => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  const handleSubmit = async () => {
    // Clear previous error
    setError(null);

    // Validate required fields (caregiver optional in cascade mode)
    if (assignmentMode === 'direct' && !selectedCaregiver) {
      setError('Please select a caregiver for direct assignment');
      return;
    }
    if (!selectedElder || selectedDates.length === 0) {
      setError('Please fill in all required fields');
      return;
    }

    // BUG-018 FIX: Validate no past dates in selection
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const pastDates = selectedDates.filter(date => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      return d < today;
    });

    if (pastDates.length > 0) {
      setError(`Cannot create shifts for past dates. ${pastDates.length} date(s) in the past.`);
      return;
    }

    // BUG-019 FIX: Validate time formats
    if (!isValidTime(startTime)) {
      setError('Please enter a valid start time (HH:MM format)');
      return;
    }

    if (!isValidTime(endTime)) {
      setError('Please enter a valid end time (HH:MM format)');
      return;
    }

    // BUG-020 FIX: Validate end time is after start time using numeric comparison
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);

    if (endMinutes <= startMinutes) {
      setError('End time must be after start time');
      return;
    }

    setLoading(true);
    setProgress(0);
    setResults([]);
    setShowResults(false);

    const elder = elders.find(e => e.id === selectedElder);
    if (!elder) {
      setError('Invalid loved one selection');
      setLoading(false);
      return;
    }

    const caregiver = assignmentMode === 'direct' ? caregivers.find(c => c.id === selectedCaregiver) : null;
    if (assignmentMode === 'direct' && !caregiver) {
      setError('Invalid caregiver selection');
      setLoading(false);
      return;
    }

    const creationResults: CreationResult[] = [];
    const preferredId = selectedCaregiver && selectedCaregiver !== 'none' ? selectedCaregiver : undefined;

    for (let i = 0; i < sortedDates.length; i++) {
      const date = sortedDates[i];

      try {
        let result: { success: boolean; shiftId?: string; error?: string };

        if (assignmentMode === 'cascade') {
          result = await createCascadeShift(
            agencyId,
            elder.groupId || groupId,
            elder.id!,
            elder.name,
            date,
            startTime,
            endTime,
            notes || undefined,
            userId,
            preferredId,
            userId
          );
        } else {
          result = await createScheduledShift(
            agencyId,
            elder.groupId || groupId,
            elder.id!,
            elder.name,
            selectedCaregiver,
            caregiver!.name,
            date,
            startTime,
            endTime,
            notes || undefined,
            userId,
            false
          );
        }

        creationResults.push({
          date,
          success: result.success,
          error: result.error
        });
      } catch (err: any) {
        creationResults.push({
          date,
          success: false,
          error: err.message || 'Unknown error'
        });
      }

      setProgress(Math.round(((i + 1) / sortedDates.length) * 100));
    }

    setResults(creationResults);
    setShowResults(true);
    setLoading(false);

    const successCount = creationResults.filter(r => r.success).length;
    if (successCount > 0) {
      // Store details for success message
      setCreatedShiftDetails({
        caregiverName: assignmentMode === 'cascade' ? 'Auto-Assigned' : caregiver!.name,
        elderName: elder.name,
        startTime,
        endTime,
        totalHours: (duration * successCount) / 60
      });
      onShiftsCreated();
    }
  };

  const handleClose = () => {
    if (!loading) {
      // Reset form
      setAssignmentMode('cascade');
      setSelectedCaregiver(preSelectedCaregiverId || '');
      setSelectedElder('');
      setStartTime('09:00');
      setEndTime('17:00');
      setNotes('');
      setError(null);
      setProgress(0);
      setResults([]);
      setShowResults(false);
      setCreatedShiftDetails(null);
      onOpenChange(false);
    }
  };

  const handleDone = () => {
    onClearSelection();
    handleClose();
  };

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Create Shifts for {selectedDates.length} Date{selectedDates.length > 1 ? 's' : ''}
          </DialogTitle>
          <DialogDescription>
            Create the same shift for all selected dates at once
          </DialogDescription>
        </DialogHeader>

        {showResults ? (
          // Results View
          <div className="space-y-4 py-4">
            <div className="text-center">
              {failCount === 0 ? (
                <div className="flex flex-col items-center gap-2">
                  <CheckCircle className="w-12 h-12 text-green-500" />
                  <h3 className="text-lg font-semibold text-green-700 dark:text-green-300">
                    All {successCount} shifts created successfully!
                  </h3>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <AlertTriangle className="w-12 h-12 text-amber-500" />
                  <h3 className="text-lg font-semibold">
                    {successCount} created, {failCount} failed
                  </h3>
                </div>
              )}
            </div>

            {/* Show created shift details */}
            {createdShiftDetails && successCount > 0 && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 space-y-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-gray-600 dark:text-gray-400">Caregiver:</div>
                  <div className="font-medium">{createdShiftDetails.caregiverName}</div>

                  <div className="text-gray-600 dark:text-gray-400">Loved One:</div>
                  <div className="font-medium">{createdShiftDetails.elderName}</div>

                  <div className="text-gray-600 dark:text-gray-400">Time:</div>
                  <div className="font-medium">{createdShiftDetails.startTime} - {createdShiftDetails.endTime}</div>

                  <div className="text-gray-600 dark:text-gray-400">Total Hours:</div>
                  <div className="font-medium">{createdShiftDetails.totalHours.toFixed(1)} hours</div>
                </div>
              </div>
            )}

            {failCount > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-red-600">Failed shifts:</h4>
                {results.filter(r => !r.success).map((result, idx) => (
                  <div key={idx} className="text-sm bg-red-50 dark:bg-red-900/20 p-2 rounded">
                    <span className="font-medium">{format(result.date, 'MMM d, yyyy')}</span>
                    <span className="text-red-600 dark:text-red-400 ml-2">{result.error}</span>
                  </div>
                ))}
              </div>
            )}

            <DialogFooter>
              <Button onClick={handleDone}>
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          // Form View
          <div className="space-y-4 py-4">
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Selected Dates Summary */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-blue-800 dark:text-blue-200">
                  {sortedDates.length} date{sortedDates.length > 1 ? 's' : ''} selected
                </span>
              </div>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                {getDatesSummary()}
              </p>
            </div>

            {/* Assignment Mode Toggle */}
            <div className="space-y-2">
              <Label className="text-xs text-gray-500 uppercase tracking-wide">Assignment Mode</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAssignmentMode('cascade')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                    assignmentMode === 'cascade'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <div className="text-left">
                    <div className="font-medium">Auto-Assign</div>
                    <div className="text-xs text-gray-500">Recommended</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setAssignmentMode('direct')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                    assignmentMode === 'direct'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  <UserCheck className="w-4 h-4" />
                  <div className="text-left">
                    <div className="font-medium">Direct Assign</div>
                    <div className="text-xs text-gray-500">Pick caregiver</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Caregiver Selection */}
            <div className="space-y-2">
              <Label>
                {assignmentMode === 'cascade' ? 'Preferred First (optional)' : 'Caregiver *'}
              </Label>
              <Select value={selectedCaregiver} onValueChange={setSelectedCaregiver} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder={assignmentMode === 'cascade' ? 'None — system picks best fit' : 'Select caregiver'} />
                </SelectTrigger>
                <SelectContent>
                  {assignmentMode === 'cascade' && (
                    <SelectItem value="none">
                      <span className="text-gray-500">None — system picks best fit</span>
                    </SelectItem>
                  )}
                  {caregivers.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${c.color.bg} ${c.color.border} border`} />
                        {c.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {assignmentMode === 'cascade' && (
                <p className="text-xs text-gray-500">Each date gets its own independent cascade offer.</p>
              )}
            </div>

            {/* Elder Selection */}
            <div className="space-y-2">
              <Label>Loved One *</Label>
              <Select value={selectedElder} onValueChange={setSelectedElder} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select loved one" />
                </SelectTrigger>
                <SelectContent>
                  {elders.map(e => (
                    <SelectItem key={e.id} value={e.id!}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Time Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time *</Label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label>End Time *</Label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Duration Display */}
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Clock className="w-4 h-4" />
              <span>
                Duration: {hours > 0 ? `${hours}h ` : ''}{minutes > 0 ? `${minutes}m` : hours === 0 ? '0m' : ''}
                {' '} per shift
              </span>
            </div>

            {/* Total Hours */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
              <div className="text-sm text-blue-700 dark:text-blue-300">
                <strong>Total:</strong> {selectedDates.length} shifts = {((duration * selectedDates.length) / 60).toFixed(1)} hours
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special instructions (applies to all shifts)..."
                rows={2}
                disabled={loading}
              />
            </div>

            {/* Progress */}
            {loading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Creating shifts...</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={handleClose} disabled={loading}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={loading || selectedDates.length === 0}>
                {loading ? 'Creating...' : `Create ${selectedDates.length} Shift${selectedDates.length > 1 ? 's' : ''}`}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
