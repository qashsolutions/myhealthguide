'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GroupService } from '@/lib/firebase/groups';
import { Group, GroupMember, PermissionLevel } from '@/types';
import { Shield, Key, RefreshCw, Copy, UserMinus, AlertCircle, CheckCircle, Eye, Edit, Crown, ChevronDown, ChevronUp } from 'lucide-react';
import { formatInviteCodeForDisplay } from '@/lib/utils/inviteCode';

interface PermissionManagerProps {
  groupId: string;
  adminId: string;
}

interface MemberWithDetails extends GroupMember {
  name: string;
  email: string;
  profileImage?: string;
}

export function PermissionManager({ groupId, adminId }: PermissionManagerProps) {
  const [members, setMembers] = useState<MemberWithDetails[]>([]);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingUserId, setProcessingUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const [isInviteExpanded, setIsInviteExpanded] = useState(true);
  const [isMembersExpanded, setIsMembersExpanded] = useState(true);
  const [isPermissionLevelsExpanded, setIsPermissionLevelsExpanded] = useState(false);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load members with details via API (bypasses Firestore rules for reading other users)
      const { auth } = await import('@/lib/firebase/config');
      const token = await auth.currentUser?.getIdToken();

      if (token) {
        const response = await fetch(`/api/groups/${groupId}/members`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setMembers(data.members || []);
        } else {
          console.error('Failed to fetch members via API');
          setMembers([]);
        }
      } else {
        setMembers([]);
      }

      // Load invite code
      const code = await GroupService.getInviteCode(groupId);
      setInviteCode(code);
    } catch (err) {
      console.error('Error loading permission data:', err);
      setError('Failed to load permission data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshInviteCode = async () => {
    try {
      setRefreshing(true);
      setError(null);
      const newCode = await GroupService.refreshInviteCode(groupId, adminId);
      setInviteCode(newCode);
      setSuccess('Invite code refreshed successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error refreshing invite code:', err);
      setError('Failed to refresh invite code');
    } finally {
      setRefreshing(false);
    }
  };

  const handleCopyInviteCode = async () => {
    if (!inviteCode) return;

    try {
      await navigator.clipboard.writeText(inviteCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch (err) {
      console.error('Error copying invite code:', err);
    }
  };

  const handlePermissionChange = async (userId: string, newPermission: PermissionLevel) => {
    try {
      setProcessingUserId(userId);
      setError(null);

      // Use API route to update permission (bypasses Firestore rules for updating other users)
      const { auth } = await import('@/lib/firebase/config');
      const token = await auth.currentUser?.getIdToken();

      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`/api/groups/${groupId}/permissions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId,
          permissionLevel: newPermission
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update permission');
      }

      // Refresh members list
      await loadData();
      setSuccess('Permission updated successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error updating permission:', err);
      setError(err.message || 'Failed to update permission');
    } finally {
      setProcessingUserId(null);
    }
  };

  const handleRemoveMember = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to remove ${userName} from the group?`)) {
      return;
    }

    try {
      setProcessingUserId(userId);
      setError(null);

      await GroupService.removeMember(groupId, userId, adminId);

      // Refresh members list
      await loadData();
      setSuccess('Member removed successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error removing member:', err);
      setError(err.message || 'Failed to remove member');
    } finally {
      setProcessingUserId(null);
    }
  };

  const getPermissionBadge = (permission: PermissionLevel) => {
    switch (permission) {
      case 'admin':
        return <Badge className="bg-purple-600"><Crown className="w-3 h-3 mr-1" />Admin</Badge>;
      case 'write':
        return <Badge className="bg-blue-600"><Edit className="w-3 h-3 mr-1" />Write</Badge>;
      case 'read':
        return <Badge variant="secondary"><Eye className="w-3 h-3 mr-1" />Read</Badge>;
      default:
        return <Badge variant="secondary">{permission}</Badge>;
    }
  };

  const getWritePermissionCount = () => {
    return members.filter(m => m.permissionLevel === 'write').length;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Permission Manager
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mr-2" />
            <span className="text-gray-600 dark:text-gray-400">Loading...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Invite Code Card - Collapsible */}
      <Card className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
        <CardHeader className="cursor-pointer" onClick={() => setIsInviteExpanded(!isInviteExpanded)}>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                Group Invite Code
              </CardTitle>
              <CardDescription>
                Share this code with others to invite them to your group
              </CardDescription>
            </div>
            {isInviteExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </div>
        </CardHeader>
        {isInviteExpanded && (
        <CardContent>
          {inviteCode ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg border-2 border-purple-300 dark:border-purple-700 px-4 py-3">
                <p className="text-2xl font-bold text-center tracking-wider text-purple-700 dark:text-purple-400">
                  {formatInviteCodeForDisplay(inviteCode)}
                </p>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={(e) => { e.stopPropagation(); handleCopyInviteCode(); }}
                className="h-12 w-12"
              >
                {codeCopied ? <CheckCircle className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5" />}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={(e) => { e.stopPropagation(); handleRefreshInviteCode(); }}
                disabled={refreshing}
                className="h-12 w-12"
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          ) : (
            <Button onClick={(e) => { e.stopPropagation(); handleRefreshInviteCode(); }} disabled={refreshing}>
              <Key className="w-4 h-4 mr-2" />
              Generate Invite Code
            </Button>
          )}

          <p className="text-xs text-gray-600 dark:text-gray-400 mt-3">
            New members will need admin approval before they can access the group. Refresh the code to invalidate previous codes.
          </p>
        </CardContent>
        )}
      </Card>

      {/* Members Permission Card - Collapsible */}
      <Card>
        <CardHeader className="cursor-pointer" onClick={() => setIsMembersExpanded(!isMembersExpanded)}>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Member Permissions
              </CardTitle>
              <CardDescription>
                Manage member access levels. Only 1 member can have write permission.
              </CardDescription>
            </div>
            {isMembersExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </div>
        </CardHeader>

        {isMembersExpanded && (
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-4 bg-green-50 text-green-900 border-green-200">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            {members.map((member) => {
              const isAdmin = member.role === 'admin';
              const isCurrentMember = member.userId === adminId;
              const isProcessing = processingUserId === member.userId;

              return (
                <div
                  key={member.userId}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-white font-semibold">
                        {member.name.charAt(0).toUpperCase()}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {member.name}
                          </h3>
                          {getPermissionBadge(member.permissionLevel)}
                          {isCurrentMember && <Badge variant="outline">You</Badge>}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{member.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {!isAdmin && (
                        <>
                          <Select
                            value={member.permissionLevel}
                            onValueChange={(value) => handlePermissionChange(member.userId, value as PermissionLevel)}
                            disabled={isProcessing}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="read">Read</SelectItem>
                              <SelectItem
                                value="write"
                                disabled={getWritePermissionCount() >= 1 && member.permissionLevel !== 'write'}
                              >
                                Write {getWritePermissionCount() >= 1 && member.permissionLevel !== 'write' && '(Max 1)'}
                              </SelectItem>
                            </SelectContent>
                          </Select>

                          {!isCurrentMember && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemoveMember(member.userId, member.name)}
                              disabled={isProcessing}
                              className="border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <UserMinus className="w-4 h-4 mr-1" />
                              Remove
                            </Button>
                          )}
                        </>
                      )}

                      {isAdmin && (
                        <Badge variant="outline" className="border-purple-300 text-purple-700">
                          Group Owner
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Permission Levels - Collapsible Info */}
          <div className="mt-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <button
              onClick={(e) => { e.stopPropagation(); setIsPermissionLevelsExpanded(!isPermissionLevelsExpanded); }}
              className="flex items-center justify-between w-full text-left"
            >
              <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300">
                Permission Levels
              </h4>
              {isPermissionLevelsExpanded ? (
                <ChevronUp className="w-4 h-4 text-blue-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-blue-500" />
              )}
            </button>
            {isPermissionLevelsExpanded && (
              <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1 mt-2">
                <li><strong>Admin:</strong> Full control - create, edit, delete, manage members</li>
                <li><strong>Write:</strong> Can log doses, add entries, view data (max 1 member)</li>
                <li><strong>Read:</strong> Can only view data, no editing allowed</li>
              </ul>
            )}
          </div>
        </CardContent>
        )}
      </Card>
    </div>
  );
}
