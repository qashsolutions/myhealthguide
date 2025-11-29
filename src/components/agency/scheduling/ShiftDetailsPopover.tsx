'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Clock,
  User,
  Users,
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Trash2,
  ArrowRightLeft
} from 'lucide-react';
import { format } from 'date-fns';
import { cancelScheduledShift, confirmScheduledShift } from '@/lib/firebase/scheduleShifts';
import type { ScheduledShift } from '@/types';

interface ShiftDetailsPopoverProps {
  shift: ScheduledShift;
  caregiverColor: { bg: string; border: string; text: string };
  onClose: () => void;
  onUpdate: () => void;
  agencyId: string;
  userId: string;
}

export function ShiftDetailsPopover({
  shift,
  caregiverColor,
  onClose,
  onUpdate,
  agencyId,
  userId
}: ShiftDetailsPopoverProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);

  const getStatusBadge = (status: ScheduledShift['status']) => {
    switch (status) {
      case 'scheduled':
        return <Badge className="bg-blue-100 text-blue-700">Scheduled</Badge>;
      case 'confirmed':
        return <Badge className="bg-green-100 text-green-700">Confirmed</Badge>;
      case 'in_progress':
        return <Badge className="bg-yellow-100 text-yellow-700">In Progress</Badge>;
      case 'completed':
        return <Badge className="bg-gray-100 text-gray-700">Completed</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-700">Cancelled</Badge>;
      case 'no_show':
        return <Badge className="bg-red-200 text-red-800">No Show</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleConfirmShift = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await confirmScheduledShift(shift.id, userId);
      if (result.success) {
        onUpdate();
        onClose();
      } else {
        setError(result.error || 'Failed to confirm shift');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to confirm shift');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelShift = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await cancelScheduledShift(shift.id, userId, 'Cancelled by admin');
      if (result.success) {
        onUpdate();
        onClose();
      } else {
        setError(result.error || 'Failed to cancel shift');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to cancel shift');
    } finally {
      setLoading(false);
      setConfirmCancelOpen(false);
    }
  };

  const duration = shift.duration || 0;
  const hours = Math.floor(duration / 60);
  const minutes = duration % 60;

  const canModify = ['scheduled', 'confirmed'].includes(shift.status);

  return (
    <>
      <Dialog open={true} onOpenChange={() => onClose()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded ${caregiverColor.bg} ${caregiverColor.border} border`} />
              Shift Details
            </DialogTitle>
            <DialogDescription>
              {format(new Date(shift.date), 'EEEE, MMMM d, yyyy')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Status */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Status</span>
              {getStatusBadge(shift.status)}
            </div>

            {/* Time */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Time
              </span>
              <span className="font-medium">
                {shift.startTime} - {shift.endTime}
              </span>
            </div>

            {/* Duration */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Duration</span>
              <span>
                {hours > 0 ? `${hours}h ` : ''}{minutes > 0 ? `${minutes}m` : hours === 0 ? '0m' : ''}
              </span>
            </div>

            {/* Caregiver */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 flex items-center gap-2">
                <User className="w-4 h-4" />
                Caregiver
              </span>
              <span className={`font-medium ${caregiverColor.text}`}>
                {shift.caregiverName}
              </span>
            </div>

            {/* Elder */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Elder
              </span>
              <span className="font-medium">{shift.elderName}</span>
            </div>

            {/* Notes */}
            {shift.notes && (
              <div className="space-y-1">
                <span className="text-sm text-gray-500">Notes</span>
                <p className="text-sm bg-gray-50 dark:bg-gray-800 p-2 rounded">
                  {shift.notes}
                </p>
              </div>
            )}

            {/* Recurring */}
            {shift.isRecurring && (
              <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                <RefreshCw className="w-4 h-4" />
                Part of recurring schedule
              </div>
            )}

            {/* Created Info */}
            <div className="text-xs text-gray-400 pt-2 border-t dark:border-gray-700">
              Created on {format(new Date(shift.createdAt), 'MMM d, yyyy h:mm a')}
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {canModify && (
              <>
                {shift.status === 'scheduled' && (
                  <Button
                    variant="outline"
                    onClick={handleConfirmShift}
                    disabled={loading}
                    className="flex-1 text-green-600 border-green-300 hover:bg-green-50"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Confirm
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => setConfirmCancelOpen(true)}
                  disabled={loading}
                  className="flex-1 text-red-600 border-red-300 hover:bg-red-50"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Cancel Shift
                </Button>
              </>
            )}
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={confirmCancelOpen} onOpenChange={setConfirmCancelOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Cancel Shift?
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this shift? The caregiver will be notified.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-1 text-sm">
              <div><strong>Date:</strong> {format(new Date(shift.date), 'EEEE, MMM d')}</div>
              <div><strong>Time:</strong> {shift.startTime} - {shift.endTime}</div>
              <div><strong>Caregiver:</strong> {shift.caregiverName}</div>
              <div><strong>Elder:</strong> {shift.elderName}</div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmCancelOpen(false)}
              disabled={loading}
            >
              Keep Shift
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelShift}
              disabled={loading}
            >
              {loading ? 'Cancelling...' : 'Cancel Shift'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
