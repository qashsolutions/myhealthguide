'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { InviteService, InviteCode } from '@/lib/firebase/invites';
import { Permission } from '@/types';
import { Copy, Check, Share2, Calendar, Users } from 'lucide-react';

interface InviteCodeDialogProps {
  open: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
  userId: string;
  userName: string;
  maxMembers?: number; // Plan limit for max members
  inviteType?: 'caregiver' | 'member'; // Type of invite (caregiver for Multi Agency)
}

export function InviteCodeDialog({
  open,
  onClose,
  groupId,
  groupName,
  userId,
  userName,
  maxMembers = 2,
  inviteType = 'caregiver' // Default to caregiver for new simplified flow
}: InviteCodeDialogProps) {
  // For caregiver invites, role is always 'member' (caregiver role is assigned by agency)
  const [role, setRole] = useState<'admin' | 'member'>('member');
  const [maxUses, setMaxUses] = useState(5);
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [generating, setGenerating] = useState(false);
  const [generatedInvite, setGeneratedInvite] = useState<InviteCode | null>(null);
  const [copied, setCopied] = useState(false);

  const defaultPermissions: Permission[] = [
    'edit_medications',
    'edit_supplements',
    'edit_diet',
    'log_doses',
    'view_insights'
  ];

  const handleGenerate = async () => {
    setGenerating(true);

    try {
      const invite = await InviteService.createInvite({
        groupId,
        groupName,
        createdBy: userId,
        createdByName: userName,
        role,
        permissions: defaultPermissions,
        maxUses,
        expiresInDays
      });

      setGeneratedInvite(invite);
    } catch (error) {
      console.error('Error generating invite:', error);
      alert('Failed to generate invite code');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!generatedInvite) return;

    const inviteUrl = `${window.location.origin}/invite/${generatedInvite.code}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    if (!generatedInvite) return;

    const inviteUrl = `${window.location.origin}/invite/${generatedInvite.code}`;
    const text = `You're invited to join ${groupName} on myguide.health! Use this link to join: ${inviteUrl}`;

    if (navigator.share) {
      navigator.share({
        title: `Join ${groupName}`,
        text,
        url: inviteUrl
      });
    } else {
      handleCopy();
    }
  };

  const handleClose = () => {
    setGeneratedInvite(null);
    setCopied(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {inviteType === 'caregiver' ? 'Invite Caregiver' : `Invite to ${groupName}`}
          </DialogTitle>
          <DialogDescription>
            {inviteType === 'caregiver'
              ? `Create an invite link to add a caregiver to your agency (max ${maxMembers} caregivers)`
              : `Create an invite link to add members to your group (max ${maxMembers} members total)`
            }
          </DialogDescription>
        </DialogHeader>

        {!generatedInvite ? (
          <div className="space-y-4">
            {/* Info Box for Caregiver Invites */}
            {inviteType === 'caregiver' && (
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Caregivers can view and log health data for their assigned loved ones. They will need to create an account to accept the invitation.
                </p>
              </div>
            )}

            {/* Role Selection - Only show for non-caregiver invites */}
            {inviteType !== 'caregiver' && (
            <div className="space-y-2">
              <Label>Access Level</Label>
              <div className="flex gap-2">
                <button
                  onClick={() => setRole('member')}
                  className={`flex-1 p-3 rounded-lg border-2 transition-colors ${
                    role === 'member'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium">Viewer</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    View only (read-only)
                  </div>
                </button>
                <button
                  onClick={() => setRole('admin')}
                  className={`flex-1 p-3 rounded-lg border-2 transition-colors ${
                    role === 'admin'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium">Owner</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Full access
                  </div>
                </button>
              </div>
            </div>
            )}

            {/* Max Uses */}
            <div className="space-y-2">
              <Label htmlFor="maxUses">Maximum Uses</Label>
              <Input
                id="maxUses"
                type="number"
                min={1}
                max={10}
                value={maxUses}
                onChange={(e) => setMaxUses(parseInt(e.target.value) || 1)}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                How many people can use this invite link
              </p>
            </div>

            {/* Expiration */}
            <div className="space-y-2">
              <Label htmlFor="expiresInDays">Expires In (days)</Label>
              <Input
                id="expiresInDays"
                type="number"
                min={1}
                max={30}
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(parseInt(e.target.value) || 1)}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Link will expire after this many days
              </p>
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full"
            >
              {generating ? 'Generating...' : 'Generate Invite Link'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Generated Code Display */}
            <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <div className="text-center mb-3">
                <div className="text-3xl font-bold tracking-wider text-blue-600 mb-2">
                  {generatedInvite.code}
                </div>
                <Badge variant="outline">
                  {role === 'admin' ? 'Admin' : 'Member'} Access
                </Badge>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Users className="w-4 h-4" />
                  <span>Can be used {maxUses} times</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Calendar className="w-4 h-4" />
                  <span>Expires in {expiresInDays} days</span>
                </div>
              </div>
            </div>

            {/* Invite URL */}
            <div className="space-y-2">
              <Label>Invite Link</Label>
              <div className="flex gap-2">
                <Input
                  value={`${window.location.origin}/invite/${generatedInvite.code}`}
                  readOnly
                  className="flex-1"
                />
                <Button
                  onClick={handleCopy}
                  variant="outline"
                  size="icon"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
              {copied && (
                <p className="text-xs text-green-600">
                  Copied to clipboard!
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button onClick={handleShare} className="flex-1">
                <Share2 className="w-4 h-4 mr-2" />
                Share Link
              </Button>
              <Button onClick={handleClose} variant="outline">
                Done
              </Button>
            </div>

            {/* Info */}
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <p className="text-xs text-gray-700 dark:text-gray-300">
                {inviteType === 'caregiver'
                  ? 'Share this link with a caregiver to invite them to your agency. They\'ll need to create an account and verify their phone number to accept.'
                  : 'Share this link with someone to invite them to your group. They\'ll need to create an account or sign in to accept the invitation.'
                }
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
