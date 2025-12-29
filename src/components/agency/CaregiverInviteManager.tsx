'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  Phone,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  Trash2,
  RefreshCw,
  Users,
  AlertCircle,
  Share2,
  Copy,
  Mail,
  User,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface CaregiverInvite {
  id: string;
  phoneNumber: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  createdAt: string;
  expiresAt: string;
  acceptedAt?: string;
  smsStatus?: string;
  testInviteUrl?: string;
  // User details for accepted invites
  acceptedByName?: string;
  acceptedByEmail?: string;
}

interface CaregiverInviteManagerProps {
  agencyId: string;
  userId: string;
  currentCaregiverCount: number;
  maxCaregivers?: number;
}

export function CaregiverInviteManager({
  agencyId,
  userId,
  currentCaregiverCount,
  maxCaregivers = 10,
}: CaregiverInviteManagerProps) {
  const [invites, setInvites] = useState<CaregiverInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedInvite, setSelectedInvite] = useState<CaregiverInvite | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const pendingInviteCount = invites.filter(i => i.status === 'pending').length;
  const remainingSlots = maxCaregivers - currentCaregiverCount - pendingInviteCount;

  const fetchInvites = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/sms/send-invite?agencyId=${agencyId}&superAdminId=${userId}`
      );
      const data = await response.json();
      if (data.invites) {
        setInvites(data.invites);
      }
    } catch (error) {
      console.error('Failed to fetch invites:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agencyId, userId]);

  const validatePhone = (phone: string): boolean => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length !== 10) {
      setPhoneError('Please enter a 10-digit phone number');
      return false;
    }
    setPhoneError('');
    return true;
  };

  const formatPhoneDisplay = (phone: string): string => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    if (digits.length === 11 && digits.startsWith('1')) {
      return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    }
    return phone;
  };

  const handleSendInvite = async () => {
    if (!validatePhone(phoneNumber)) return;

    try {
      setSending(true);
      const response = await fetch('/api/sms/send-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agencyId,
          superAdminId: userId,
          phoneNumber,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setPhoneError(data.error || 'Failed to send invite');
        return;
      }

      // Success - refresh invites and close dialog
      await fetchInvites();
      setPhoneNumber('');
      setDialogOpen(false);
      // Test invite URL is shown in the invite list with "Open Test Invite" link
    } catch (error) {
      setPhoneError('Failed to send invite. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleCancelInvite = async () => {
    if (!selectedInvite) return;

    try {
      const response = await fetch('/api/sms/send-invite', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inviteId: selectedInvite.id,
          agencyId,
          superAdminId: userId,
        }),
      });

      if (response.ok) {
        await fetchInvites();
      }
    } catch (error) {
      console.error('Failed to cancel invite:', error);
    } finally {
      setCancelDialogOpen(false);
      setSelectedInvite(null);
    }
  };

  const getStatusBadge = (status: string, expiresAt: string) => {
    const isExpired = new Date(expiresAt) < new Date();

    if (status === 'accepted') {
      return (
        <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Accepted
        </Badge>
      );
    }

    if (status === 'cancelled') {
      return (
        <Badge variant="secondary">
          <XCircle className="w-3 h-3 mr-1" />
          Cancelled
        </Badge>
      );
    }

    if (status === 'expired' || isExpired) {
      return (
        <Badge variant="destructive">
          <Clock className="w-3 h-3 mr-1" />
          Expired
        </Badge>
      );
    }

    return (
      <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">
        <Clock className="w-3 h-3 mr-1" />
        Pending
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Invite Caregivers
            </CardTitle>
            <CardDescription className="mt-1">
              Send SMS invitations to add caregivers to your agency
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm">
              <Users className="w-4 h-4 mr-1" />
              {currentCaregiverCount}/{maxCaregivers} Caregivers
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchInvites}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Invite Button */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              disabled={remainingSlots <= 0}
              className="w-full sm:w-auto"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Invite New Caregiver
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite a Caregiver</DialogTitle>
              <DialogDescription>
                Enter the caregiver&apos;s phone number. They will receive an SMS with a link to sign up and join your agency.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="flex gap-2">
                  <div className="flex items-center px-3 bg-gray-100 dark:bg-gray-800 rounded-l-md border border-r-0 border-gray-300 dark:border-gray-600">
                    <span className="text-gray-600 dark:text-gray-400">+1</span>
                  </div>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={phoneNumber}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setPhoneNumber(value);
                      if (phoneError) setPhoneError('');
                    }}
                    className="rounded-l-none"
                  />
                </div>
                {phoneError && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {phoneError}
                  </p>
                )}
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>Note:</strong> The caregiver must sign up using this phone number to be automatically linked to your agency.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setDialogOpen(false);
                  setPhoneNumber('');
                  setPhoneError('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendInvite}
                disabled={!phoneNumber || phoneNumber.length !== 10 || sending}
              >
                {sending ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Invite
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {remainingSlots <= 0 && (
          <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md text-yellow-700 dark:text-yellow-300">
            <AlertCircle className="w-5 h-5" />
            <span>
              {currentCaregiverCount >= maxCaregivers
                ? 'Maximum caregiver limit reached.'
                : 'All available slots have pending invites.'}
            </span>
          </div>
        )}

        {/* Invites List */}
        {loading ? (
          <div className="text-center py-8">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400" />
            <p className="text-gray-500 mt-2">Loading invites...</p>
          </div>
        ) : invites.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Phone className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No invites sent yet</p>
            <p className="text-sm">Invite caregivers to join your agency</p>
          </div>
        ) : (
          <div className="space-y-3">
            {invites.map((invite) => {
              const isExpired = new Date(invite.expiresAt) < new Date();
              const canCancel = invite.status === 'pending' && !isExpired;
              const isAccepted = invite.status === 'accepted';

              return (
                <div
                  key={invite.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <div className="flex items-start gap-4">
                    {/* Icon - User for accepted, Phone for others */}
                    <div className={`p-2 rounded-full ${
                      isAccepted
                        ? 'bg-green-100 dark:bg-green-900/30'
                        : 'bg-gray-100 dark:bg-gray-800'
                    }`}>
                      {isAccepted ? (
                        <User className="w-4 h-4 text-green-600 dark:text-green-400" />
                      ) : (
                        <Phone className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      )}
                    </div>

                    <div className="space-y-1">
                      {/* For accepted invites: Show name, phone, email */}
                      {isAccepted && invite.acceptedByName ? (
                        <>
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {invite.acceptedByName}
                          </p>
                          <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                            <Phone className="w-3 h-3" />
                            <span>{formatPhoneDisplay(invite.phoneNumber)}</span>
                          </div>
                          {invite.acceptedByEmail && (
                            <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                              <Mail className="w-3 h-3" />
                              <span>{invite.acceptedByEmail}</span>
                            </div>
                          )}
                        </>
                      ) : (
                        /* For pending/expired: Show phone only */
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {formatPhoneDisplay(invite.phoneNumber)}
                        </p>
                      )}

                      {/* Status row */}
                      <div className="flex items-center gap-2 pt-1">
                        {getStatusBadge(invite.status, invite.expiresAt)}
                        {invite.smsStatus === 'test_mode' && (
                          <span className="text-xs text-gray-500">(SMS not sent)</span>
                        )}
                        <span className="text-xs text-gray-500">
                          {invite.createdAt
                            ? formatDistanceToNow(new Date(invite.createdAt), { addSuffix: true })
                            : ''}
                        </span>
                      </div>

                      {/* Show Copy Link button when SMS was skipped */}
                      {invite.testInviteUrl && invite.status === 'pending' && (
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(invite.testInviteUrl!);
                              setCopiedId(invite.id);
                              setTimeout(() => setCopiedId(null), 2000);
                            }}
                            className={`text-xs flex items-center gap-1 px-2 py-1 rounded border ${
                              copiedId === invite.id
                                ? 'text-green-600 border-green-200 bg-green-50'
                                : 'text-gray-600 border-gray-200 bg-gray-50 hover:bg-gray-100'
                            }`}
                          >
                            {copiedId === invite.id ? (
                              <>
                                <CheckCircle2 className="w-3 h-3" />
                                Copied!
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                Copy Link
                              </>
                            )}
                          </button>

                          <button
                            onClick={async () => {
                              const shareData = {
                                title: 'Caregiver Invite',
                                text: 'You\'ve been invited to join as a caregiver. Click the link to sign up:',
                                url: invite.testInviteUrl!
                              };

                              if (navigator.share && navigator.canShare?.(shareData)) {
                                try {
                                  await navigator.share(shareData);
                                } catch (err) {
                                  // User cancelled
                                }
                              } else {
                                navigator.clipboard.writeText(invite.testInviteUrl!);
                                setCopiedId(invite.id);
                                setTimeout(() => setCopiedId(null), 2000);
                              }
                            }}
                            className="text-xs flex items-center gap-1 px-2 py-1 rounded border text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100"
                          >
                            <Share2 className="w-3 h-3" />
                            Share
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {canCancel && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedInvite(invite);
                        setCancelDialogOpen(true);
                      }}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Cancel Confirmation Dialog */}
        <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cancel Invite?</DialogTitle>
              <DialogDescription>
                This will cancel the invite sent to{' '}
                {selectedInvite && formatPhoneDisplay(selectedInvite.phoneNumber)}.
                They will no longer be able to use this invite link to join your agency.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
                Keep Invite
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancelInvite}
              >
                Cancel Invite
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
