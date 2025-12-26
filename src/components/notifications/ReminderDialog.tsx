'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { NotificationService } from '@/lib/firebase/notifications';
import { Bell, Pill, Leaf, Loader2, Check, AlertCircle, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import type { Medication, Supplement } from '@/types';

interface ReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  medications: Medication[];
  supplements: Supplement[];
  groupId: string;
  elderId: string;
  userId: string;
  userRole: 'admin' | 'caregiver' | 'member';
  isFullyVerified: boolean;
}

type ItemType = 'medication' | 'supplement';

interface SelectedItem {
  id: string;
  name: string;
  type: ItemType;
}

export function ReminderDialog({
  open,
  onOpenChange,
  medications,
  supplements,
  groupId,
  elderId,
  userId,
  userRole,
  isFullyVerified,
}: ReminderDialogProps) {
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);
  const [reminderTime, setReminderTime] = useState('08:00');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Check if user can create reminders (must be admin and fully verified)
  const canCreateReminders = userRole === 'admin' && isFullyVerified;

  const handleSelectItem = (item: Medication | Supplement, type: ItemType) => {
    setSelectedItem({
      id: item.id,
      name: item.name,
      type,
    });
    setError('');
  };

  const handleSave = async () => {
    if (!selectedItem) {
      setError('Please select an item to set a reminder for');
      return;
    }

    if (!canCreateReminders) {
      setError('You do not have permission to create reminders');
      return;
    }

    setSaving(true);
    setError('');

    try {
      // Parse time to create scheduled Date
      const [hours, minutes] = reminderTime.split(':').map(Number);
      const now = new Date();
      const scheduledTime = new Date(now);
      scheduledTime.setHours(hours, minutes, 0, 0);

      // If time is in the past today, schedule for tomorrow
      if (scheduledTime < now) {
        scheduledTime.setDate(scheduledTime.getDate() + 1);
      }

      // Build schedule data - only include medicationId OR supplementId (not undefined)
      const scheduleData: Parameters<typeof NotificationService.createReminderSchedule>[0] = {
        groupId,
        elderId,
        type: selectedItem.type,
        scheduledTime,
        recipients: [userId],
        enabled: true,
      };

      // Only add the relevant ID field (Firestore doesn't accept undefined)
      if (selectedItem.type === 'medication') {
        scheduleData.medicationId = selectedItem.id;
      } else {
        scheduleData.supplementId = selectedItem.id;
      }

      await NotificationService.createReminderSchedule(scheduleData);

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setSelectedItem(null);
        setReminderTime('08:00');
        onOpenChange(false);
      }, 1500);
    } catch (err: any) {
      console.error('Error creating reminder:', err);
      // Handle Firestore permission errors
      if (err?.code === 'permission-denied' || err?.message?.includes('Missing or insufficient permissions')) {
        setError('Permission denied. Please verify your account or contact an admin.');
      } else {
        setError(err.message || 'Failed to create reminder');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setSelectedItem(null);
    setReminderTime('08:00');
    setError('');
    setSuccess(false);
    onOpenChange(false);
  };

  const allItems = [
    ...medications.map(m => ({ ...m, itemType: 'medication' as ItemType })),
    ...supplements.map(s => ({ ...s, itemType: 'supplement' as ItemType })),
  ];

  // Show verification/permission required message
  const renderPermissionWarning = () => {
    if (!isFullyVerified) {
      return (
        <div className="py-6 text-center">
          <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
            <ShieldAlert className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
          <h3 className="font-medium text-gray-900 dark:text-white mb-2">
            Verification Required
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Please verify your email and phone number to set reminders.
          </p>
          <Link href="/dashboard/settings?tab=profile">
            <Button variant="outline" size="sm">
              Go to Settings
            </Button>
          </Link>
        </div>
      );
    }

    if (userRole !== 'admin') {
      return (
        <div className="py-6 text-center">
          <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
            <ShieldAlert className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
          <h3 className="font-medium text-gray-900 dark:text-white mb-2">
            Admin Access Required
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Only group admins can create reminder schedules.
          </p>
        </div>
      );
    }

    return null;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600" />
            Set Reminder
          </DialogTitle>
          <DialogDescription>
            Choose a medication or supplement and set a reminder time.
          </DialogDescription>
        </DialogHeader>

        {!canCreateReminders ? (
          renderPermissionWarning()
        ) : success ? (
          <div className="py-8 text-center">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
              <Check className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-green-600 dark:text-green-400 font-medium">
              Reminder set successfully!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {allItems.length === 0 ? (
              <div className="py-6 text-center text-gray-500 dark:text-gray-400">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No medications or supplements to set reminders for.</p>
                <p className="text-sm mt-1">Add some first to enable reminders.</p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Select Item</Label>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {medications.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase">
                          Medications
                        </p>
                        {medications.map((med) => (
                          <button
                            key={med.id}
                            onClick={() => handleSelectItem(med, 'medication')}
                            className={cn(
                              'w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left',
                              selectedItem?.id === med.id
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                            )}
                          >
                            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                              <Pill className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 dark:text-white truncate">
                                {med.name}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {med.dosage}
                              </p>
                            </div>
                            {selectedItem?.id === med.id && (
                              <Check className="w-4 h-4 text-blue-600" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}

                    {supplements.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase mt-3">
                          Supplements
                        </p>
                        {supplements.map((supp) => (
                          <button
                            key={supp.id}
                            onClick={() => handleSelectItem(supp, 'supplement')}
                            className={cn(
                              'w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left',
                              selectedItem?.id === supp.id
                                ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                            )}
                          >
                            <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                              <Leaf className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 dark:text-white truncate">
                                {supp.name}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {supp.dosage}
                              </p>
                            </div>
                            {selectedItem?.id === supp.id && (
                              <Check className="w-4 h-4 text-amber-600" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reminderTime">Reminder Time</Label>
                  <Input
                    id="reminderTime"
                    type="time"
                    value={reminderTime}
                    onChange={(e) => setReminderTime(e.target.value)}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    You&apos;ll receive a notification at this time daily.
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {canCreateReminders && !success && allItems.length > 0 && (
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !selectedItem}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Bell className="w-4 h-4 mr-2" />
                  Set Reminder
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
