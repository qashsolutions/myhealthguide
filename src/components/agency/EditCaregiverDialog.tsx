'use client';

import { useState, useEffect } from 'react';
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
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  AlertTriangle,
  User,
  Mail,
  Phone,
  Users,
  Clock,
  Save
} from 'lucide-react';

interface EditCaregiverDialogProps {
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

export function EditCaregiverDialog({
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
}: EditCaregiverDialogProps) {
  const [name, setName] = useState(caregiverName || '');
  const [email, setEmail] = useState(caregiverEmail || '');
  const [phone, setPhone] = useState(caregiverPhone || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when dialog opens with new data
  useEffect(() => {
    if (open) {
      setName(caregiverName || '');
      setEmail(caregiverEmail || '');
      setPhone(caregiverPhone || '');
      setError(null);
    }
  }, [open, caregiverName, caregiverEmail, caregiverPhone]);

  const validateForm = (): boolean => {
    if (!name.trim()) {
      setError('Name is required');
      return false;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return false;
    }
    if (phone && !/^\d{10}$/.test(phone.replace(/\D/g, ''))) {
      setError('Please enter a valid 10-digit phone number');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/caregiver/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caregiverId,
          agencyId,
          adminUserId: userId,
          name: name.trim(),
          email: email.trim() || null,
          phone: phone.replace(/\D/g, '') || null
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update caregiver');
      }

      onSuccess();
      handleClose();
    } catch (err: any) {
      console.error('Error updating caregiver:', err);
      setError(err.message || 'Failed to update caregiver');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setError(null);
    onOpenChange(false);
  };

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

  const hasChanges =
    name.trim() !== (caregiverName || '') ||
    email.trim() !== (caregiverEmail || '') ||
    phone.replace(/\D/g, '') !== (caregiverPhone?.replace(/\D/g, '') || '');

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            Edit Caregiver Profile
          </DialogTitle>
          <DialogDescription>
            Update profile information for this caregiver
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Status Info */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <span className="text-sm font-medium text-blue-700 dark:text-blue-400">
                {(name || caregiverName || 'C').charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                {getStatusBadge(currentStatus)}
                {elderCount !== undefined && elderCount > 0 && (
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {elderCount} loved one{elderCount !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              {joinedAt && (
                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Joined {joinedAt.toLocaleDateString()}
                </p>
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

          {/* Name Field */}
          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Full Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Enter caregiver's full name"
            />
          </div>

          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Enter email address (optional)"
            />
          </div>

          {/* Phone Field */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Phone Number
            </Label>
            <div className="flex gap-2">
              <div className="flex items-center px-3 bg-gray-100 dark:bg-gray-800 rounded-l-md border border-r-0 border-gray-300 dark:border-gray-600">
                <span className="text-gray-600 dark:text-gray-400">+1</span>
              </div>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setPhone(value);
                  if (error) setError(null);
                }}
                placeholder="(555) 123-4567"
                className="rounded-l-none"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving || !hasChanges}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
