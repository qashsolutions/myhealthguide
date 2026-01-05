'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  UserPlus,
  Users,
  Copy,
  CheckCircle,
  AlertCircle,
  Clock,
  Mail,
  Trash2,
  RefreshCw
} from 'lucide-react';

interface FamilyInviteManagerProps {
  groupId: string;
  caregiverId: string;
  elderCount: number;
}

interface InvitedMember {
  userId: string;
  name?: string;
  email?: string;
  approvalStatus: string;
  addedAt: any;
}

interface PendingInvite {
  id: string;
  email: string;
  name?: string;
  createdAt: any;
  expiresAt: any;
}

export function FamilyInviteManager({ groupId, caregiverId, elderCount }: FamilyInviteManagerProps) {
  const [invitedMembers, setInvitedMembers] = useState<InvitedMember[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [remainingSlots, setRemainingSlots] = useState(2);
  const [maxAllowed, setMaxAllowed] = useState(2);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    loadInviteData();
  }, [groupId, caregiverId]);

  const loadInviteData = async () => {
    try {
      setLoading(true);
      const { auth } = await import('@/lib/firebase/config');
      const token = await auth.currentUser?.getIdToken();

      if (!token) {
        setError('Not authenticated');
        return;
      }

      const response = await fetch(`/api/caregiver/invite-member?groupId=${groupId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setInvitedMembers(data.invitedMembers || []);
        setPendingInvites(data.pendingInvites || []);
        setRemainingSlots(data.remainingSlots || 0);
        setMaxAllowed(data.maxAllowed || 2);
      } else {
        const errorData = await response.json();
        console.error('Failed to load invite data:', errorData.error);
      }
    } catch (err) {
      console.error('Error loading invite data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvite = async () => {
    if (!inviteEmail.trim()) {
      setError('Please enter an email address');
      return;
    }

    try {
      setSending(true);
      setError(null);
      setSuccess(null);
      setGeneratedLink(null);

      const { auth } = await import('@/lib/firebase/config');
      const token = await auth.currentUser?.getIdToken();

      if (!token) {
        setError('Not authenticated');
        return;
      }

      const response = await fetch('/api/caregiver/invite-member', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: inviteEmail.trim().toLowerCase(),
          name: inviteName.trim(),
          groupId
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create invite');
      }

      setSuccess('Invite link created! Share it with your family member.');
      setGeneratedLink(data.inviteUrl);
      setInviteEmail('');
      setInviteName('');

      // Refresh data
      await loadInviteData();

    } catch (err: any) {
      setError(err.message || 'Failed to send invite');
    } finally {
      setSending(false);
    }
  };

  const handleCopyLink = async () => {
    if (!generatedLink) return;
    try {
      await navigator.clipboard.writeText(generatedLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setError(null);
    setSuccess(null);
    setGeneratedLink(null);
    setInviteEmail('');
    setInviteName('');
  };

  const formatDate = (date: any) => {
    if (!date) return 'Unknown';
    let d: Date;
    if (date._seconds) {
      d = new Date(date._seconds * 1000);
    } else if (date.seconds) {
      d = new Date(date.seconds * 1000);
    } else if (date.toDate) {
      d = date.toDate();
    } else {
      d = new Date(date);
    }
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Family Members
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-4">
            <RefreshCw className="w-5 h-5 animate-spin text-blue-600 mr-2" />
            <span className="text-gray-600 dark:text-gray-400">Loading...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalInvited = invitedMembers.length + pendingInvites.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Family Members
              <Badge variant="secondary" className="ml-2">
                {totalInvited}/{maxAllowed}
              </Badge>
            </CardTitle>
            <CardDescription>
              Invite family members to view care updates for your {elderCount} assigned elder{elderCount > 1 ? 's' : ''}
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={remainingSlots <= 0}>
                <UserPlus className="w-4 h-4 mr-2" />
                Invite Family
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Family Member</DialogTitle>
                <DialogDescription>
                  Create an invite link for a family member to view care updates.
                  They will have read-only access to your {elderCount} assigned elder{elderCount > 1 ? 's' : ''}.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {success && !generatedLink && (
                  <Alert className="bg-green-50 text-green-900 border-green-200">
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>{success}</AlertDescription>
                  </Alert>
                )}

                {generatedLink ? (
                  <div className="space-y-4">
                    <Alert className="bg-green-50 text-green-900 border-green-200">
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>Invite link created! Share it with your family member.</AlertDescription>
                    </Alert>

                    <div className="space-y-2">
                      <Label>Invite Link</Label>
                      <div className="flex gap-2">
                        <Input
                          value={generatedLink}
                          readOnly
                          className="font-mono text-xs"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={handleCopyLink}
                        >
                          {linkCopied ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500">
                        This link expires in 7 days
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="family@example.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="name">Name (optional)</Label>
                      <Input
                        id="name"
                        placeholder="Family member's name"
                        value={inviteName}
                        onChange={(e) => setInviteName(e.target.value)}
                      />
                    </div>

                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      You can invite up to {maxAllowed} family members. {remainingSlots} slot{remainingSlots !== 1 ? 's' : ''} remaining.
                    </p>
                  </>
                )}
              </div>

              <DialogFooter>
                {generatedLink ? (
                  <Button onClick={handleCloseDialog}>Done</Button>
                ) : (
                  <>
                    <Button variant="outline" onClick={handleCloseDialog}>
                      Cancel
                    </Button>
                    <Button onClick={handleSendInvite} disabled={sending || !inviteEmail.trim()}>
                      {sending ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Mail className="w-4 h-4 mr-2" />
                          Create Invite Link
                        </>
                      )}
                    </Button>
                  </>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {remainingSlots <= 0 && (
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You&apos;ve reached the maximum of {maxAllowed} family members.
            </AlertDescription>
          </Alert>
        )}

        {/* Approved Members */}
        {invitedMembers.filter(m => m.approvalStatus === 'approved').length > 0 && (
          <div className="space-y-2 mb-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Active Members</h4>
            {invitedMembers.filter(m => m.approvalStatus === 'approved').map((member) => (
              <div
                key={member.userId}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {member.name || member.email || 'Family Member'}
                    </p>
                    <p className="text-xs text-gray-500">
                      Joined {formatDate(member.addedAt)}
                    </p>
                  </div>
                </div>
                <Badge variant="secondary">Viewer</Badge>
              </div>
            ))}
          </div>
        )}

        {/* Pending Invites */}
        {pendingInvites.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Pending Invites</h4>
            {pendingInvites.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {invite.name || invite.email}
                    </p>
                    <p className="text-xs text-gray-500">
                      Expires {formatDate(invite.expiresAt)}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="border-yellow-300 text-yellow-700">
                  Pending
                </Badge>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {invitedMembers.length === 0 && pendingInvites.length === 0 && (
          <div className="text-center py-6 text-gray-500 dark:text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No family members invited yet</p>
            <p className="text-sm">Invite up to {maxAllowed} family members to view care updates</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
