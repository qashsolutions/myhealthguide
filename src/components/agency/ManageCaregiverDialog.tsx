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
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  AlertTriangle,
  Ban,
  UserCheck,
  Calendar,
  Shield,
  Mail,
  Phone,
  Users,
  Clock
} from 'lucide-react';

type ManageAction = 'suspend' | 'revoke' | 'reactivate';

interface ManageCaregiverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caregiverId: string;
  caregiverName: string;
  caregiverEmail?: string;
  caregiverPhone?: string;
  elderCount?: number;
  joinedAt?: Date;
  currentStatus: 'active' | 'suspended' | 'revoked' | 'pending_approval';
  agencyId: string;
  userId: string;
  onSuccess: () => void;
}

export function ManageCaregiverDialog({
  open,
  onOpenChange,
  caregiverId,
  caregiverName,
  caregiverEmail,
  caregiverPhone,
  elderCount,
  joinedAt,
  currentStatus,
  agencyId,
  userId,
  onSuccess
}: ManageCaregiverDialogProps) {
  const [action, setAction] = useState<ManageAction | null>(null);
  const [reason, setReason] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!action) {
      setError('Please select an action');
      return;
    }

    if ((action === 'suspend' || action === 'revoke') && !reason.trim()) {
      setError('Please provide a reason');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/caregiver/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caregiverId,
          agencyId,
          action,
          adminUserId: userId,
          reason: reason.trim() || undefined,
          expiresAt: action === 'suspend' && expiresAt ? new Date(expiresAt).toISOString() : undefined
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to manage caregiver');
      }

      onSuccess();
      handleClose();
    } catch (err: any) {
      console.error('Error managing caregiver:', err);
      setError(err.message || 'Failed to manage caregiver');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setAction(null);
    setReason('');
    setExpiresAt('');
    setError(null);
    onOpenChange(false);
  };

  // Determine available actions based on current status
  const availableActions: { action: ManageAction; label: string; icon: React.ReactNode; description: string; variant: 'destructive' | 'warning' | 'success' }[] = [];

  if (currentStatus === 'active') {
    availableActions.push(
      {
        action: 'suspend',
        label: 'Suspend Access',
        icon: <AlertTriangle className="w-4 h-4" />,
        description: 'Temporarily disable access. Can be reactivated later.',
        variant: 'warning'
      },
      {
        action: 'revoke',
        label: 'Revoke Access',
        icon: <Ban className="w-4 h-4" />,
        description: 'Permanently remove access. Must re-invite to restore.',
        variant: 'destructive'
      }
    );
  } else if (currentStatus === 'suspended' || currentStatus === 'revoked') {
    availableActions.push({
      action: 'reactivate',
      label: 'Reactivate Access',
      icon: <UserCheck className="w-4 h-4" />,
      description: 'Restore full access to the caregiver dashboard.',
      variant: 'success'
    });
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Active</Badge>;
      case 'suspended':
        return <Badge className="bg-amber-500">Suspended</Badge>;
      case 'revoked':
        return <Badge className="bg-red-500">Revoked</Badge>;
      case 'pending_approval':
        return <Badge className="bg-blue-500">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Get minimum date for expiry (tomorrow)
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().split('T')[0];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            Manage Caregiver Access
          </DialogTitle>
          <DialogDescription>
            Manage access for <span className="font-medium">{caregiverName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Caregiver Details Section */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <span className="text-lg font-medium text-blue-700 dark:text-blue-400">
                  {caregiverName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white">{caregiverName}</h3>
                <div className="flex items-center gap-2 mt-1">
                  {getStatusBadge(currentStatus)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              {caregiverEmail && (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Mail className="w-4 h-4" />
                  <span className="truncate">{caregiverEmail}</span>
                </div>
              )}
              {caregiverPhone && (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Phone className="w-4 h-4" />
                  <span>{caregiverPhone}</span>
                </div>
              )}
              {elderCount !== undefined && elderCount > 0 && (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Users className="w-4 h-4" />
                  <span>{elderCount} loved one{elderCount !== 1 ? 's' : ''} assigned</span>
                </div>
              )}
              {joinedAt && (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Clock className="w-4 h-4" />
                  <span>Joined {joinedAt.toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Action Selection */}
          {availableActions.length > 0 ? (
            <div className="space-y-3">
              <Label>Select Action</Label>
              <div className="space-y-2">
                {availableActions.map((opt) => (
                  <button
                    key={opt.action}
                    type="button"
                    onClick={() => setAction(opt.action)}
                    className={`w-full flex items-start gap-3 p-3 rounded-lg border-2 transition-all text-left ${
                      action === opt.action
                        ? opt.variant === 'destructive'
                          ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                          : opt.variant === 'warning'
                            ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                            : 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className={`mt-0.5 ${
                      opt.variant === 'destructive' ? 'text-red-600' :
                      opt.variant === 'warning' ? 'text-amber-600' : 'text-green-600'
                    }`}>
                      {opt.icon}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{opt.label}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{opt.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              <p>No actions available for this status.</p>
            </div>
          )}

          {/* Reason Input (for suspend/revoke) */}
          {(action === 'suspend' || action === 'revoke') && (
            <div className="space-y-2">
              <Label htmlFor="reason">
                Reason <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={`Why are you ${action === 'suspend' ? 'suspending' : 'revoking'} this caregiver's access?`}
                rows={3}
                className="resize-none"
              />
              <p className="text-xs text-gray-500">
                This reason will be recorded in the audit log and shown to the caregiver.
              </p>
            </div>
          )}

          {/* Expiry Date (for suspend only) */}
          {action === 'suspend' && (
            <div className="space-y-2">
              <Label htmlFor="expiresAt" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Auto-Reactivate Date (Optional)
              </Label>
              <Input
                id="expiresAt"
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                min={minDateStr}
              />
              <p className="text-xs text-gray-500">
                If set, the caregiver&apos;s access will be automatically restored on this date.
              </p>
            </div>
          )}

          {/* Reactivate Confirmation */}
          {action === 'reactivate' && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-sm text-green-700 dark:text-green-300">
                This will restore full access for <strong>{caregiverName}</strong>. They will be able to access the caregiver dashboard and manage assigned loved ones.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          {action && (
            <Button
              onClick={handleSubmit}
              disabled={saving}
              variant={action === 'revoke' ? 'destructive' : action === 'suspend' ? 'default' : 'default'}
              className={action === 'reactivate' ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {action === 'suspend' && <AlertTriangle className="w-4 h-4 mr-2" />}
                  {action === 'revoke' && <Ban className="w-4 h-4 mr-2" />}
                  {action === 'reactivate' && <UserCheck className="w-4 h-4 mr-2" />}
                  {action === 'suspend' ? 'Suspend Access' : action === 'revoke' ? 'Revoke Access' : 'Reactivate'}
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
