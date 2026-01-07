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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { AlertTriangle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { createScheduledShift } from '@/lib/firebase/scheduleShifts';
import { AgencyService } from '@/lib/firebase/agencies';
import type { Elder } from '@/types';

interface CaregiverInfo {
  id: string;
  name: string;
  color: { bg: string; border: string; text: string };
}

interface CreateShiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agencyId: string;
  groupId: string;
  userId: string;
  initialDate: Date | null;
  caregivers: CaregiverInfo[];
  onShiftCreated: () => void;
}

export function CreateShiftDialog({
  open,
  onOpenChange,
  agencyId,
  groupId,
  userId,
  initialDate,
  caregivers,
  onShiftCreated
}: CreateShiftDialogProps) {
  const [date, setDate] = useState<Date | undefined>(initialDate || undefined);
  const [selectedCaregiver, setSelectedCaregiver] = useState<string>('');
  const [selectedElder, setSelectedElder] = useState<string>('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [notes, setNotes] = useState('');
  const [elders, setElders] = useState<Elder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadElders();
      if (initialDate) {
        setDate(initialDate);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, agencyId, initialDate]);

  const loadElders = async () => {
    try {
      // Get elders from the elders collection via AgencyService
      const eldersData = await AgencyService.getAgencyElders(agencyId);
      setElders(eldersData);
    } catch (err) {
      console.error('Error loading elders:', err);
    }
  };

  const handleSubmit = async () => {
    if (!selectedCaregiver || !selectedElder || !date) {
      setError('Please fill in all required fields');
      return;
    }

    // Validate times
    if (startTime >= endTime) {
      setError('End time must be after start time');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get caregiver and elder names
      const caregiver = caregivers.find(c => c.id === selectedCaregiver);
      const elder = elders.find(e => e.id === selectedElder);

      if (!caregiver || !elder) {
        setError('Invalid caregiver or loved one selection');
        return;
      }

      const result = await createScheduledShift(
        agencyId,
        groupId,
        selectedElder,
        elder.name,
        selectedCaregiver,
        caregiver.name,
        date,
        startTime,
        endTime,
        notes || undefined,
        userId
      );

      if (result.success) {
        // Reset form
        setSelectedCaregiver('');
        setSelectedElder('');
        setStartTime('09:00');
        setEndTime('17:00');
        setNotes('');
        setDate(undefined);
        onShiftCreated();
      } else {
        setError(result.conflict?.message || result.error || 'Failed to create shift');
      }
    } catch (err: any) {
      console.error('Error creating shift:', err);
      setError(err.message || 'Failed to create shift');
    } finally {
      setLoading(false);
    }
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Shift</DialogTitle>
          <DialogDescription>
            Schedule a caregiver to work with a loved one
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Date Selection */}
          <div className="space-y-2">
            <Label>Date *</Label>
            <Input
              type="date"
              value={date ? format(date, 'yyyy-MM-dd') : ''}
              onChange={(e) => setDate(e.target.value ? new Date(e.target.value + 'T00:00:00') : undefined)}
              className="w-full"
            />
          </div>

          {/* Caregiver Selection */}
          <div className="space-y-2">
            <Label>Caregiver *</Label>
            <Select value={selectedCaregiver} onValueChange={setSelectedCaregiver}>
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
            <Label>Loved One *</Label>
            <Select value={selectedElder} onValueChange={setSelectedElder}>
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
              />
            </div>
            <div className="space-y-2">
              <Label>End Time *</Label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          {/* Duration Display */}
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Clock className="w-4 h-4" />
            <span>
              Duration: {hours > 0 ? `${hours}h ` : ''}{minutes > 0 ? `${minutes}m` : hours === 0 ? '0m' : ''}
            </span>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special instructions..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Creating...' : 'Create Shift'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
