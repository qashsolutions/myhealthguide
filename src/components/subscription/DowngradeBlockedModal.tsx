'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Users, HardDrive, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { DowngradeBlocker } from '@/lib/firebase/planLimits';

interface DowngradeBlockedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetPlanName: string;
  blockers: DowngradeBlocker[];
}

export function DowngradeBlockedModal({
  open,
  onOpenChange,
  targetPlanName,
  blockers,
}: DowngradeBlockedModalProps) {
  const router = useRouter();

  const memberBlockers = blockers.filter(b => b.type === 'members');
  const storageBlockers = blockers.filter(b => b.type === 'storage');

  const handleGoToGroupManagement = () => {
    onOpenChange(false);
    router.push('/dashboard/settings?tab=group-management');
  };

  const handleGoToStorageManagement = () => {
    onOpenChange(false);
    router.push('/dashboard/settings?tab=storage');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            Cannot Downgrade Yet
          </DialogTitle>
          <DialogDescription>
            {targetPlanName} has lower limits than your current plan. Please address the following before downgrading:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Member Blockers - These MUST be resolved before downgrade */}
          {memberBlockers.map((blocker, index) => (
            <Alert key={`member-${index}`} className="bg-red-50 border-red-200">
              <Users className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <div className="font-medium mb-1">
                  Remove {blocker.excess} member{blocker.excess !== 1 ? 's' : ''} required
                </div>
                <p className="text-sm">{blocker.message}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 text-red-600 border-red-300 hover:bg-red-100"
                  onClick={handleGoToGroupManagement}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Go to Group Management
                </Button>
              </AlertDescription>
            </Alert>
          ))}

          {/* Storage Blockers - Warning only, doesn't block downgrade */}
          {storageBlockers.map((blocker, index) => (
            <Alert key={`storage-${index}`} className="bg-yellow-50 border-yellow-200">
              <HardDrive className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                <div className="font-medium mb-1">
                  Storage Warning
                </div>
                <p className="text-sm">{blocker.message}</p>
                <p className="text-xs mt-2 text-yellow-700">
                  Note: After downgrading, you will not be able to upload or download files until you reduce your storage usage.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 text-yellow-700 border-yellow-300 hover:bg-yellow-100"
                  onClick={handleGoToStorageManagement}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Manage Storage
                </Button>
              </AlertDescription>
            </Alert>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
