'use client';

import { useState } from 'react';
import { Medication, Elder } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, XCircle, Ban } from 'lucide-react';
import { MedicationService } from '@/lib/firebase/medications';
import { useAuth } from '@/contexts/AuthContext';

interface LogDoseModalProps {
  open: boolean;
  onClose: () => void;
  medication: Medication;
  elder?: Elder;
  onSubmit?: (data: any) => Promise<void>;
}

export function LogDoseModal({ open, onClose, medication, elder, onSubmit }: LogDoseModalProps) {
  const { user } = useAuth();
  const [status, setStatus] = useState<'taken' | 'missed' | 'skipped'>('taken');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      setLoading(true);

      const logData = {
        medicationId: medication.id,
        elderId: medication.elderId,
        status,
        notes: notes || undefined,
        actualTime: status === 'taken' ? new Date() : undefined,
        scheduledTime: new Date(),
        method: 'manual' as const,
        createdAt: new Date()
      };

      if (onSubmit) {
        await onSubmit(logData);
      } else {
        // Save to Firebase
        if (!user) {
          throw new Error('You must be signed in to log medication');
        }

        const userId = user.id;
        const userRole = user.groups[0]?.role as 'admin' | 'caregiver' | 'member';

        if (!userRole) {
          throw new Error('Unable to determine user role');
        }

        await MedicationService.logDose({
          medicationId: medication.id,
          groupId: medication.groupId,
          elderId: medication.elderId,
          scheduledTime: new Date(),
          actualTime: status === 'taken' ? new Date() : undefined,
          status,
          notes: notes || undefined,
          method: 'manual',
          createdAt: new Date()
        }, userId, userRole);
      }

      onClose();
      setStatus('taken');
      setNotes('');
    } catch (error) {
      console.error('Error logging dose:', error);
      // You could add error state here to show to user
    } finally {
      setLoading(false);
    }
  };

  const statusOptions = [
    {
      value: 'taken' as const,
      label: 'Taken',
      icon: CheckCircle,
      description: 'Medication was taken as scheduled',
      color: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
    },
    {
      value: 'missed' as const,
      label: 'Missed',
      icon: XCircle,
      description: 'Medication was not taken',
      color: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
    },
    {
      value: 'skipped' as const,
      label: 'Skipped',
      icon: Ban,
      description: 'Intentionally skipped (e.g., doctor advised)',
      color: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300'
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log Medication Dose</DialogTitle>
          <DialogDescription>
            Record medication intake for tracking
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Medication Info */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
            <p className="font-semibold text-gray-900 dark:text-white">
              {medication.name}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {medication.dosage}
            </p>
            {elder && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                For: {elder.name}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 dark:text-gray-400">
              <Clock className="w-3 h-3" />
              <span>Now: {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
            </div>
          </div>

          {/* Status Selection */}
          <div className="space-y-2">
            <Label>Status</Label>
            <div className="grid grid-cols-1 gap-2">
              {statusOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = status === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setStatus(option.value)}
                    className={`flex items-start gap-3 p-3 rounded-lg border-2 transition-all ${
                      isSelected
                        ? option.color
                        : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <Icon className={`w-5 h-5 mt-0.5 ${isSelected ? '' : 'text-gray-400'}`} />
                    <div className="flex-1 text-left">
                      <p className={`font-medium ${isSelected ? '' : 'text-gray-900 dark:text-white'}`}>
                        {option.label}
                      </p>
                      <p className={`text-xs ${isSelected ? 'opacity-90' : 'text-gray-500 dark:text-gray-400'}`}>
                        {option.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any observations, side effects, or reasons for missing..."
              rows={3}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Saving...' : 'Log Dose'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
