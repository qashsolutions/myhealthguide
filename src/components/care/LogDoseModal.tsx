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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, CheckCircle, XCircle, Ban, AlertTriangle, Info } from 'lucide-react';
import { logMedicationDoseOfflineAware } from '@/lib/offline';
import { useAuth } from '@/contexts/AuthContext';

interface ExistingDose {
  id: string;
  status: 'taken' | 'missed' | 'skipped';
  loggedAt: Date;
  notes?: string;
}

interface LogDoseModalProps {
  open: boolean;
  onClose: () => void;
  medication: Medication;
  elder?: Elder;
  existingDose?: ExistingDose; // If provided, shows already-logged state
  onSubmit?: (data: any) => Promise<void>;
}

export function LogDoseModal({ open, onClose, medication, elder, existingDose, onSubmit }: LogDoseModalProps) {
  const { user } = useAuth();
  const [status, setStatus] = useState<'taken' | 'missed' | 'skipped'>('taken');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if notes are required (for skipped status)
  const notesRequired = status === 'skipped';

  const handleSubmit = async () => {
    // Clear previous error
    setError(null);

    // FIX 10B.1: Validate that skipped medications have a reason
    if (status === 'skipped' && (!notes || !notes.trim())) {
      setError('Please provide a reason for skipping this medication');
      return;
    }

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

        // Check both groups (family plan) and agencies (multi-agency plan) for role
        let userRole: 'admin' | 'caregiver' | 'member' | undefined;

        // First check family plan groups
        if (user.groups && user.groups.length > 0) {
          userRole = user.groups[0]?.role as 'admin' | 'caregiver' | 'member';
        }

        // If no group role, check agency membership
        if (!userRole && user.agencies && user.agencies.length > 0) {
          const agencyRole = user.agencies[0]?.role;
          // Map agency roles to standard roles
          if (agencyRole === 'super_admin' || agencyRole === 'caregiver_admin') {
            userRole = 'admin';
          } else if (agencyRole === 'caregiver') {
            userRole = 'caregiver';
          }
        }

        if (!userRole) {
          throw new Error('Unable to determine user role');
        }

        const doseData: any = {
          medicationId: medication.id,
          groupId: medication.groupId,
          elderId: medication.elderId,
          scheduledTime: new Date(),
          status,
          method: 'manual',
          loggedBy: userId,
          createdAt: new Date()
        };

        // Only add optional fields if they have values (Firestore rejects undefined)
        if (status === 'taken') {
          doseData.actualTime = new Date();
        }
        if (notes && notes.trim()) {
          doseData.notes = notes.trim();
        }

        const result = await logMedicationDoseOfflineAware(doseData, userId, userRole);

        if (!result.success) {
          throw new Error(result.error || 'Failed to log medication');
        }
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

  // FIX 10B.2: If dose was already logged today, show info instead of form
  if (existingDose) {
    const statusLabels = {
      taken: { label: 'Taken', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
      missed: { label: 'Missed', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
      skipped: { label: 'Skipped', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' }
    };
    const statusInfo = statusLabels[existingDose.status];

    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Dose Already Logged</DialogTitle>
            <DialogDescription>
              This medication has already been recorded today
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Info Alert */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                This dose was already logged and cannot be modified.
              </AlertDescription>
            </Alert>

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
            </div>

            {/* Existing Log Details */}
            <div className="space-y-2">
              <Label>Recorded Status</Label>
              <div className="flex items-center gap-2">
                <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  at {existingDose.loggedAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </span>
              </div>
            </div>

            {existingDose.notes && (
              <div className="space-y-2">
                <Label>Notes</Label>
                <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-2 rounded">
                  {existingDose.notes}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button onClick={onClose}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

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
          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

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
                    onClick={() => {
                      setStatus(option.value);
                      setError(null); // Clear error when changing status
                    }}
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

          {/* Notes - Required for skipped, Optional for others */}
          <div className="space-y-2">
            <Label htmlFor="notes">
              {notesRequired ? (
                <>Reason for Skipping <span className="text-red-500">*</span></>
              ) : (
                'Notes (Optional)'
              )}
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                if (error) setError(null); // Clear error when typing
              }}
              placeholder={notesRequired
                ? "Please explain why this medication was skipped (e.g., doctor advised, side effects)..."
                : "Any observations, side effects, or reasons for missing..."
              }
              rows={3}
              className={`resize-none ${notesRequired && error ? 'border-red-500 focus:ring-red-500' : ''}`}
            />
            {notesRequired && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                A reason is required when skipping medication for safety tracking
              </p>
            )}
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
