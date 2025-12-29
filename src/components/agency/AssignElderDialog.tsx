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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, UserPlus, AlertCircle, User } from 'lucide-react';

interface CaregiverOption {
  id: string;
  name: string;
  elderCount: number;
  maxElders: number;
}

interface ElderOption {
  id: string;
  name: string;
}

interface AssignElderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  elderId: string;
  elderName: string;
  agencyId: string;
  groupId: string;
  userId: string;
  caregivers: CaregiverOption[];
  onSuccess: () => void;
  // Optional: for selecting elder from unassigned list (when elderId is empty)
  availableElders?: ElderOption[];
}

export function AssignElderDialog({
  open,
  onOpenChange,
  elderId,
  elderName,
  agencyId,
  groupId,
  userId,
  caregivers,
  onSuccess,
  availableElders = []
}: AssignElderDialogProps) {
  const [selectedCaregiver, setSelectedCaregiver] = useState<string>('');
  const [selectedElder, setSelectedElder] = useState<string>(elderId || '');
  const [assignAsPrimary, setAssignAsPrimary] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Determine the effective elder ID and name
  const effectiveElderId = elderId || selectedElder;
  const effectiveElderName = elderId
    ? elderName
    : availableElders.find(e => e.id === selectedElder)?.name || '';

  const handleAssign = async () => {
    // Validate elder selection when not pre-selected
    if (!elderId && !selectedElder) {
      setError('Please select an elder to assign');
      return;
    }

    if (!selectedCaregiver) {
      setError('Please select a caregiver');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Use API endpoint with Admin SDK to bypass Firestore client rules
      const response = await fetch('/api/caregiver/assign-elder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agencyId,
          caregiverId: selectedCaregiver,
          elderIds: [effectiveElderId],
          groupId,
          assignedBy: userId,
          role: assignAsPrimary ? 'caregiver_admin' : 'caregiver',
          assignAsPrimary,
          forceTransfer: true // Allow override of existing primary
        })
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.conflicts && result.conflicts.length > 0) {
          setError('This elder already has a primary caregiver assigned');
          return;
        }
        throw new Error(result.error || 'Failed to assign elder');
      }

      onSuccess();
      handleClose();
    } catch (err: any) {
      console.error('Error assigning elder:', err);
      setError(err.message || 'Failed to assign elder');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setSelectedCaregiver('');
    setSelectedElder('');
    setAssignAsPrimary(true);
    setError(null);
    onOpenChange(false);
  };

  // Check if we need elder selection (no pre-selected elder and have available elders)
  const needsElderSelection = !elderId && availableElders.length > 0;
  const noEldersAvailable = !elderId && availableElders.length === 0;

  const availableCaregivers = caregivers.filter(c => c.elderCount < c.maxElders);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-blue-600" />
            Assign Caregiver
          </DialogTitle>
          <DialogDescription>
            {effectiveElderName ? (
              <>Assign <span className="font-medium">{effectiveElderName}</span> to a caregiver</>
            ) : (
              <>Select an elder and assign them to a caregiver</>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {noEldersAvailable ? (
            <div className="text-center py-6 text-gray-500 dark:text-gray-400">
              <User className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No unassigned elders</p>
              <p className="text-sm mt-1">All elders have been assigned to caregivers</p>
            </div>
          ) : availableCaregivers.length === 0 ? (
            <div className="text-center py-6 text-gray-500 dark:text-gray-400">
              <User className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No caregivers available</p>
              <p className="text-sm mt-1">All caregivers have reached their elder limit (3 max)</p>
            </div>
          ) : (
            <>
              {/* Elder Selection - only shown when no elder pre-selected */}
              {needsElderSelection && (
                <div className="space-y-2">
                  <Label htmlFor="elder">Select Elder</Label>
                  <Select value={selectedElder} onValueChange={setSelectedElder}>
                    <SelectTrigger id="elder">
                      <SelectValue placeholder="Choose an elder to assign..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableElders.map((elder) => (
                        <SelectItem key={elder.id} value={elder.id}>
                          {elder.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="caregiver">Select Caregiver</Label>
                <Select value={selectedCaregiver} onValueChange={setSelectedCaregiver}>
                  <SelectTrigger id="caregiver">
                    <SelectValue placeholder="Choose a caregiver..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCaregivers.map((caregiver) => (
                      <SelectItem key={caregiver.id} value={caregiver.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{caregiver.name}</span>
                          <span className="text-xs text-gray-500 ml-2">
                            ({caregiver.elderCount}/{caregiver.maxElders} elders)
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-start space-x-3 pt-2">
                <Checkbox
                  id="primary"
                  checked={assignAsPrimary}
                  onCheckedChange={(checked) => setAssignAsPrimary(checked as boolean)}
                />
                <div className="space-y-1">
                  <Label htmlFor="primary" className="cursor-pointer">
                    Assign as Primary Caregiver
                  </Label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Primary caregiver has full management rights for this elder
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          {availableCaregivers.length > 0 && !noEldersAvailable && (
            <Button
              onClick={handleAssign}
              disabled={saving || !selectedCaregiver || (needsElderSelection && !selectedElder)}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Assign
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
