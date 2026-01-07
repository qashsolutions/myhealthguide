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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { AlertTriangle, ArrowRight, UserCog, Users } from 'lucide-react';
import type { AssignmentConflict } from '@/lib/firebase/elderAssignment';

interface PrimaryCaregiverTransferDialogProps {
  open: boolean;
  conflicts: AssignmentConflict[];
  onConfirmTransfer: (transferElderIds: string[]) => void;
  onKeepCurrent: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function PrimaryCaregiverTransferDialog({
  open,
  conflicts,
  onConfirmTransfer,
  onKeepCurrent,
  onCancel,
  isLoading = false
}: PrimaryCaregiverTransferDialogProps) {
  const [selectedElderIds, setSelectedElderIds] = useState<Set<string>>(
    new Set(conflicts.map(c => c.elderId))
  );

  const handleToggleElder = (elderId: string) => {
    const newSelected = new Set(selectedElderIds);
    if (newSelected.has(elderId)) {
      newSelected.delete(elderId);
    } else {
      newSelected.add(elderId);
    }
    setSelectedElderIds(newSelected);
  };

  const handleSelectAll = () => {
    setSelectedElderIds(new Set(conflicts.map(c => c.elderId)));
  };

  const handleDeselectAll = () => {
    setSelectedElderIds(new Set());
  };

  const handleConfirm = () => {
    onConfirmTransfer(Array.from(selectedElderIds));
  };

  if (conflicts.length === 0) return null;

  const newCaregiverName = conflicts[0].newCaregiverName;

  return (
    <Dialog open={open} onOpenChange={() => onCancel()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="w-5 h-5" />
            Primary Caregiver Transfer Required
          </DialogTitle>
          <DialogDescription>
            The following loved one(s) already have a primary caregiver assigned.
            Would you like to transfer the primary caregiver role to{' '}
            <strong>{newCaregiverName}</strong>?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
            <UserCog className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800 dark:text-blue-200 text-sm">
              <strong>Primary Caregiver</strong> has admin rights for the loved one:
              can edit medications, manage schedules, and invite family members.
            </AlertDescription>
          </Alert>

          {/* Conflict List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                Select loved ones to transfer:
              </span>
              <div className="space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAll}
                  disabled={selectedElderIds.size === conflicts.length}
                >
                  Select All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDeselectAll}
                  disabled={selectedElderIds.size === 0}
                >
                  Clear
                </Button>
              </div>
            </div>

            <div className="border rounded-lg divide-y dark:border-gray-700 dark:divide-gray-700">
              {conflicts.map((conflict) => (
                <div
                  key={conflict.elderId}
                  className="p-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  <Checkbox
                    id={`elder-${conflict.elderId}`}
                    checked={selectedElderIds.has(conflict.elderId)}
                    onCheckedChange={() => handleToggleElder(conflict.elderId)}
                  />
                  <div className="flex-1 min-w-0">
                    <Label
                      htmlFor={`elder-${conflict.elderId}`}
                      className="font-medium cursor-pointer"
                    >
                      {conflict.elderName}
                    </Label>
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      <span className="truncate">
                        {conflict.currentPrimaryCaregiverName}
                      </span>
                      <ArrowRight className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate text-blue-600 dark:text-blue-400">
                        {conflict.newCaregiverName}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          {selectedElderIds.size > 0 && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <strong>{selectedElderIds.size}</strong> of {conflicts.length} loved one(s)
              will have their primary caregiver changed to{' '}
              <strong>{newCaregiverName}</strong>.
            </p>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="secondary"
            onClick={onKeepCurrent}
            disabled={isLoading}
          >
            <Users className="w-4 h-4 mr-2" />
            Keep Current (Assign as Regular)
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading || selectedElderIds.size === 0}
            className="bg-amber-600 hover:bg-amber-700"
          >
            <UserCog className="w-4 h-4 mr-2" />
            {isLoading ? 'Transferring...' : `Transfer Primary (${selectedElderIds.size})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
