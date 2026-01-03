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
import { AlertTriangle, Clock, Calendar, CheckCircle, X } from 'lucide-react';
import { format } from 'date-fns';
import { createScheduledShift } from '@/lib/firebase/scheduleShifts';
import type { Elder } from '@/types';

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

  const handleSubmit = async () => {
    if (!selectedCaregiver || !selectedElder || selectedDates.length === 0) {
      setError('Please fill in all required fields');
      return;
    }

    if (startTime >= endTime) {
      setError('End time must be after start time');
      return;
    }

    setLoading(true);
    setError(null);
    setProgress(0);
    setResults([]);
    setShowResults(false);

    const caregiver = caregivers.find(c => c.id === selectedCaregiver);
    const elder = elders.find(e => e.id === selectedElder);

    if (!caregiver || !elder) {
      setError('Invalid caregiver or elder selection');
      setLoading(false);
      return;
    }

    const creationResults: CreationResult[] = [];

    for (let i = 0; i < sortedDates.length; i++) {
      const date = sortedDates[i];

      try {
        const result = await createScheduledShift(
          agencyId,
          elder.groupId || groupId,
          elder.id!,
          elder.name,
          selectedCaregiver,
          caregiver.name,
          date,
          startTime,
          endTime,
          notes || undefined,
          userId,
          false
        );

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
        caregiverName: caregiver.name,
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

                  <div className="text-gray-600 dark:text-gray-400">Elder:</div>
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

            {/* Selected Dates Preview */}
            <div className="space-y-2">
              <Label>Selected Dates</Label>
              <div className="flex flex-wrap gap-1 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg max-h-24 overflow-y-auto">
                {sortedDates.map((date, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {format(date, 'EEE, MMM d')}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Caregiver Selection */}
            <div className="space-y-2">
              <Label>Caregiver *</Label>
              <Select value={selectedCaregiver} onValueChange={setSelectedCaregiver} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select caregiver" />
                </SelectTrigger>
                <SelectContent>
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
            </div>

            {/* Elder Selection */}
            <div className="space-y-2">
              <Label>Elder *</Label>
              <Select value={selectedElder} onValueChange={setSelectedElder} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select elder" />
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
