'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Eye,
  Trash2,
  ChevronDown,
  ChevronUp,
  Mail,
  UserPlus,
  Copy
} from 'lucide-react';
import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, deleteDoc, doc, getDoc } from 'firebase/firestore';

interface SuperAdminFamilyOverviewProps {
  agencyId: string;
  groupId: string;
}

interface CaregiverInfo {
  id: string;
  name: string;
  email?: string;
  elderCount: number;
  invitedCount: number;
}

interface PendingInvite {
  id: string;
  email: string;
  name?: string;
  caregiverId: string;
  caregiverName: string;
  elderIds: string[];
  createdAt: any;
  expiresAt: any;
  status: string;
}

interface FamilyMember {
  userId: string;
  name?: string;
  email?: string;
  invitedByCaregiverId: string;
  invitedByCaregiverName?: string;
  elderAccessIds: string[];
  addedAt: any;
}

const MAX_MEMBERS_PER_CAREGIVER = 2;

export function SuperAdminFamilyOverview({ agencyId, groupId }: SuperAdminFamilyOverviewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [caregivers, setCaregivers] = useState<Map<string, CaregiverInfo>>(new Map());
  const [deleting, setDeleting] = useState<string | null>(null);

  // Invite dialog state
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [selectedCaregiverId, setSelectedCaregiverId] = useState<string>('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [sending, setSending] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    if (isExpanded) {
      loadData();
    }
  }, [agencyId, groupId, isExpanded]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch active caregiver assignments for this agency
      const assignmentsQuery = query(
        collection(db, 'caregiver_assignments'),
        where('agencyId', '==', agencyId),
        where('active', '==', true)
      );
      const assignmentsSnap = await getDocs(assignmentsQuery);

      // Fetch pending invites for this agency
      const invitesQuery = query(
        collection(db, 'caregiver_member_invites'),
        where('agencyId', '==', agencyId),
        where('status', '==', 'pending')
      );
      const invitesSnap = await getDocs(invitesQuery);
      const invitesData = invitesSnap.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as PendingInvite[];
      setPendingInvites(invitesData);

      // Fetch group data to get family members
      const groupSnap = await getDoc(doc(db, 'groups', groupId));

      let familyMembersList: FamilyMember[] = [];
      if (groupSnap.exists()) {
        const groupData = groupSnap.data();
        const members = groupData.members || [];

        // Filter to only family members invited by caregivers
        familyMembersList = members.filter(
          (m: any) => m.invitedByCaregiverId && m.approvalStatus === 'approved'
        );
        setFamilyMembers(familyMembersList);
      }

      // Build caregiver map with elder counts and invite counts
      const caregiverMap = new Map<string, CaregiverInfo>();

      for (const assignmentDoc of assignmentsSnap.docs) {
        const assignment = assignmentDoc.data();
        const caregiverId = assignment.caregiverId;

        // Get caregiver user info
        const userSnap = await getDoc(doc(db, 'users', caregiverId));
        let name = 'Unknown Caregiver';
        let email = '';
        if (userSnap.exists()) {
          const userData = userSnap.data();
          name = `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'Unknown Caregiver';
          email = userData.email || '';
        }

        // Count invites for this caregiver
        const invitedCount = familyMembersList.filter(m => m.invitedByCaregiverId === caregiverId).length +
                            invitesData.filter(inv => inv.caregiverId === caregiverId).length;

        caregiverMap.set(caregiverId, {
          id: caregiverId,
          name,
          email,
          elderCount: assignment.elderIds?.length || 0,
          invitedCount
        });
      }

      setCaregivers(caregiverMap);

    } catch (err: any) {
      console.error('Error loading family overview:', err);
      setError(err.message || 'Failed to load family members');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInvite = async (inviteId: string) => {
    if (!confirm('Are you sure you want to delete this invite?')) return;

    try {
      setDeleting(inviteId);
      await deleteDoc(doc(db, 'caregiver_member_invites', inviteId));
      setPendingInvites(prev => prev.filter(inv => inv.id !== inviteId));
    } catch (err: any) {
      console.error('Error deleting invite:', err);
      setError(err.message || 'Failed to delete invite');
    } finally {
      setDeleting(null);
    }
  };

  const handleSendInvite = async () => {
    if (!inviteEmail.trim()) {
      setInviteError('Email is required to invite a family member');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail.trim())) {
      setInviteError('Please enter a valid email address');
      return;
    }

    if (!selectedCaregiverId) {
      setInviteError('Please select a caregiver');
      return;
    }

    try {
      setSending(true);
      setInviteError(null);
      setInviteSuccess(null);
      setGeneratedLink(null);

      const { auth } = await import('@/lib/firebase/config');
      const token = await auth.currentUser?.getIdToken();

      if (!token) {
        setInviteError('Not authenticated');
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
          groupId,
          agencyId,
          onBehalfOfCaregiverId: selectedCaregiverId
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create invite');
      }

      setInviteSuccess('Invite link created! Share it with the family member.');
      setGeneratedLink(data.inviteUrl);

      // Refresh data
      await loadData();

    } catch (err: any) {
      setInviteError(err.message || 'Failed to send invite');
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
    setShowInviteDialog(false);
    setInviteError(null);
    setInviteSuccess(null);
    setGeneratedLink(null);
    setInviteEmail('');
    setInviteName('');
    setSelectedCaregiverId('');
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

  const getCaregiverName = (caregiverId: string) => {
    return caregivers.get(caregiverId)?.name || 'Unknown Caregiver';
  };

  // Get caregivers who can still invite (haven't reached limit)
  const availableCaregivers = Array.from(caregivers.values()).filter(
    c => c.invitedCount < MAX_MEMBERS_PER_CAREGIVER && c.elderCount > 0
  );

  const totalCount = pendingInvites.length + familyMembers.length;

  return (
    <Card>
      <CardHeader
        className="cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Family Members Overview
              <Badge variant="secondary" className="ml-2">
                {totalCount}
              </Badge>
            </CardTitle>
            <CardDescription>
              Family members invited by caregivers across your agency
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center p-4">
              <RefreshCw className="w-5 h-5 animate-spin text-blue-600 mr-2" />
              <span className="text-gray-600 dark:text-gray-400">Loading...</span>
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-6">
              {/* Summary Stats + Invite Button */}
              <div className="flex items-center justify-between">
                <div className="flex gap-4">
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Active</span>
                    </div>
                    <p className="text-2xl font-bold text-green-700 dark:text-green-300 mt-1">
                      {familyMembers.length}
                    </p>
                  </div>
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-yellow-600" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Pending</span>
                    </div>
                    <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300 mt-1">
                      {pendingInvites.length}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={(e) => { e.stopPropagation(); setShowInviteDialog(true); }}
                  disabled={availableCaregivers.length === 0}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Invite Family Member
                </Button>
              </div>

              {availableCaregivers.length === 0 && caregivers.size > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    All caregivers have reached their family member limit ({MAX_MEMBERS_PER_CAREGIVER} each) or have no loved ones assigned.
                  </AlertDescription>
                </Alert>
              )}

              {/* Active Family Members */}
              {familyMembers.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Active Family Members</h4>
                  {familyMembers.map((member, idx) => (
                    <div
                      key={member.userId || idx}
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
                            Invited by: {getCaregiverName(member.invitedByCaregiverId)}
                          </p>
                          <p className="text-xs text-gray-500">
                            Can view {member.elderAccessIds?.length || 0} elder(s)
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          Viewer
                        </Badge>
                      </div>
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
                          <Mail className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {invite.name || invite.email}
                          </p>
                          <p className="text-xs text-gray-500">{invite.email}</p>
                          <p className="text-xs text-gray-500">
                            Invited by: {invite.caregiverName || getCaregiverName(invite.caregiverId)}
                          </p>
                          <p className="text-xs text-gray-500">
                            Expires: {formatDate(invite.expiresAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="border-yellow-300 text-yellow-700">
                          Pending
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeleteInvite(invite.id)}
                          disabled={deleting === invite.id}
                        >
                          {deleting === invite.id ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Empty State */}
              {familyMembers.length === 0 && pendingInvites.length === 0 && (
                <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No family members invited yet</p>
                  <p className="text-sm">
                    Use the button above to invite family members on behalf of caregivers
                  </p>
                </div>
              )}

              {/* Refresh Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={loadData}
                className="w-full"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          )}
        </CardContent>
      )}

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Family Member</DialogTitle>
            <DialogDescription>
              Invite a family member on behalf of a caregiver. They will have read-only access to that caregiver&apos;s assigned elders.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {inviteError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{inviteError}</AlertDescription>
              </Alert>
            )}

            {generatedLink ? (
              <div className="space-y-4">
                <Alert className="bg-green-50 text-green-900 border-green-200">
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>{inviteSuccess}</AlertDescription>
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
                  <Label>Select Caregiver *</Label>
                  <Select value={selectedCaregiverId} onValueChange={setSelectedCaregiverId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a caregiver..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCaregivers.map((caregiver) => (
                        <SelectItem key={caregiver.id} value={caregiver.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{caregiver.name}</span>
                            <span className="text-xs text-gray-500 ml-2">
                              ({caregiver.elderCount} loved one{caregiver.elderCount !== 1 ? 's' : ''}, {MAX_MEMBERS_PER_CAREGIVER - caregiver.invitedCount} slot{MAX_MEMBERS_PER_CAREGIVER - caregiver.invitedCount !== 1 ? 's' : ''} left)
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    The family member will only see this caregiver&apos;s assigned loved ones
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="inviteEmail">Email Address *</Label>
                  <Input
                    id="inviteEmail"
                    type="email"
                    placeholder="family@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                    aria-required="true"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Required for daily care updates
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="inviteName">Name (optional)</Label>
                  <Input
                    id="inviteName"
                    placeholder="Family member's name"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                  />
                </div>
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
                <Button
                  onClick={handleSendInvite}
                  disabled={sending || !inviteEmail.trim() || !selectedCaregiverId}
                >
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
    </Card>
  );
}
