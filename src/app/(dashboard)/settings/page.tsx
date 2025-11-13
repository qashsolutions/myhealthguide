'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Bell, User, Shield, CreditCard, Users as UsersIcon, History, UserPlus, Database } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { NotificationSettings as NotificationSettingsComponent } from '@/components/notifications/NotificationSettings';
import { NotificationHistory } from '@/components/notifications/NotificationHistory';
import { GroupService } from '@/lib/firebase/groups';
import { MemberCard } from '@/components/group/MemberCard';
import { InviteCodeDialog } from '@/components/group/InviteCodeDialog';
import { DataExportPanel } from '@/components/admin/DataExportPanel';
import { DataDeletionPanel } from '@/components/admin/DataDeletionPanel';
import { useEffect } from 'react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Manage your account and preferences
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <div className="space-y-1">
          <Button
            variant={activeTab === 'profile' ? 'default' : 'ghost'}
            className="w-full justify-start"
            onClick={() => setActiveTab('profile')}
          >
            <User className="w-4 h-4 mr-2" />
            Profile
          </Button>
          <Button
            variant={activeTab === 'notifications' ? 'default' : 'ghost'}
            className="w-full justify-start"
            onClick={() => setActiveTab('notifications')}
          >
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </Button>
          <Button
            variant={activeTab === 'security' ? 'default' : 'ghost'}
            className="w-full justify-start"
            onClick={() => setActiveTab('security')}
          >
            <Shield className="w-4 h-4 mr-2" />
            Security
          </Button>
          <Button
            variant={activeTab === 'subscription' ? 'default' : 'ghost'}
            className="w-full justify-start"
            onClick={() => setActiveTab('subscription')}
          >
            <CreditCard className="w-4 h-4 mr-2" />
            Subscription
          </Button>
          <Button
            variant={activeTab === 'group' ? 'default' : 'ghost'}
            className="w-full justify-start"
            onClick={() => setActiveTab('group')}
          >
            <UsersIcon className="w-4 h-4 mr-2" />
            Group
          </Button>
          <Button
            variant={activeTab === 'data' ? 'default' : 'ghost'}
            className="w-full justify-start"
            onClick={() => setActiveTab('data')}
          >
            <Database className="w-4 h-4 mr-2" />
            Data & Privacy
          </Button>
        </div>

        {/* Content Area */}
        <div className="md:col-span-3 space-y-6">
          {activeTab === 'profile' && <ProfileSettings />}
          {activeTab === 'notifications' && <NotificationSettings />}
          {activeTab === 'security' && <SecuritySettings />}
          {activeTab === 'subscription' && <SubscriptionSettings />}
          {activeTab === 'group' && <GroupSettings />}
          {activeTab === 'data' && <DataPrivacySettings />}
        </div>
      </div>
    </div>
  );
}

function ProfileSettings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Settings</CardTitle>
        <CardDescription>
          Update your personal information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src="/placeholder-avatar.png" />
            <AvatarFallback className="text-2xl">JD</AvatarFallback>
          </Avatar>
          <div>
            <Button variant="outline" size="sm">
              Change Photo
            </Button>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              JPG, PNG or GIF. Max size 2MB.
            </p>
          </div>
        </div>

        <Separator />

        {/* Form */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name</Label>
            <Input id="firstName" placeholder="John" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input id="lastName" placeholder="Doe" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="john@example.com" disabled />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Email cannot be changed. Contact support if needed.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input id="phone" type="tel" placeholder="(555) 123-4567" />
        </div>

        <Separator />

        <div className="flex justify-end">
          <Button>Save Changes</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function NotificationSettings() {
  const [notificationTab, setNotificationTab] = useState<'settings' | 'history'>('settings');

  // Mock groupId - replace with actual groupId from auth context
  const groupId = 'mock-group-id';

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setNotificationTab('settings')}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            notificationTab === 'settings'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Settings
          </div>
        </button>
        <button
          onClick={() => setNotificationTab('history')}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            notificationTab === 'history'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <History className="w-4 h-4" />
            History
          </div>
        </button>
      </div>

      {/* Tab Content */}
      {notificationTab === 'settings' && (
        <NotificationSettingsComponent groupId={groupId} />
      )}
      {notificationTab === 'history' && (
        <NotificationHistory groupId={groupId} />
      )}
    </div>
  );
}

function SecuritySettings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Security Settings</CardTitle>
        <CardDescription>
          Manage your account security
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="font-medium mb-3">Change Password</h3>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input id="currentPassword" type="password" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input id="newPassword" type="password" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input id="confirmPassword" type="password" />
            </div>
            <Button size="sm">Update Password</Button>
          </div>
        </div>

        <Separator />

        <div>
          <h3 className="font-medium mb-3">Two-Factor Authentication</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Add an extra layer of security to your account
          </p>
          <Button variant="outline" size="sm">
            Enable 2FA
          </Button>
        </div>

        <Separator />

        <div>
          <h3 className="font-medium mb-3 text-red-600">Danger Zone</h3>
          <Button variant="outline" size="sm" className="text-red-600 border-red-600 hover:bg-red-50">
            Delete Account
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SubscriptionSettings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscription</CardTitle>
        <CardDescription>
          Manage your subscription and billing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-lg">Single Plan</h3>
            <Badge>Trial</Badge>
          </div>
          <p className="text-2xl font-bold mb-1">$8.99<span className="text-sm font-normal">/month</span></p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Trial ends in 7 days
          </p>
          <Button size="sm">Upgrade Plan</Button>
        </div>

        <Separator />

        <div>
          <h3 className="font-medium mb-3">Billing Information</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            No payment method on file
          </p>
          <Button variant="outline" size="sm">
            Add Payment Method
          </Button>
        </div>

        <Separator />

        <div>
          <h3 className="font-medium mb-3">Billing History</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            No invoices yet
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function GroupSettings() {
  const [groupName, setGroupName] = useState('My Family');
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  // Mock data - replace with actual auth and group context
  const currentUser = {
    id: 'mock-user-id',
    name: 'John Doe',
    email: 'john@example.com'
  };
  const groupId = 'mock-group-id';
  const isGroupAdmin = true;

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    try {
      setLoading(true);
      const membersData = await GroupService.getGroupMembersWithDetails(groupId);
      setMembers(membersData);
    } catch (error) {
      console.error('Error loading members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: 'admin' | 'member') => {
    try {
      await GroupService.updateMemberRole(groupId, userId, newRole);
      await loadMembers();
    } catch (error) {
      console.error('Error updating role:', error);
      alert('Failed to update role');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      await GroupService.removeMember(groupId, userId, currentUser.id);
      await loadMembers();
    } catch (error) {
      console.error('Error removing member:', error);
      alert('Failed to remove member');
    }
  };

  const handleTransferOwnership = async (userId: string) => {
    try {
      await GroupService.transferOwnership(groupId, userId, currentUser.id);
      await loadMembers();
      alert('Ownership transferred successfully');
    } catch (error) {
      console.error('Error transferring ownership:', error);
      alert('Failed to transfer ownership');
    }
  };

  const handleSaveGroupName = async () => {
    setSaving(true);
    try {
      await GroupService.updateGroupName(groupId, groupName);
      alert('Group name updated successfully');
    } catch (error) {
      console.error('Error updating group name:', error);
      alert('Failed to update group name');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Group Name */}
      <Card>
        <CardHeader>
          <CardTitle>Group Information</CardTitle>
          <CardDescription>
            Update your group's basic information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="groupName">Group Name</Label>
            <Input
              id="groupName"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="mt-2"
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSaveGroupName} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Members */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Group Members</CardTitle>
              <CardDescription>
                Manage members and their roles (max 4 members)
              </CardDescription>
            </div>
            {members.length < 4 && (
              <Button onClick={() => setShowInviteDialog(true)}>
                <UserPlus className="w-4 h-4 mr-2" />
                Invite Member
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              Loading members...
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-8">
              <UsersIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                No members yet
              </p>
              <Button onClick={() => setShowInviteDialog(true)}>
                Invite Your First Member
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {members.map((member) => (
                <MemberCard
                  key={member.userId}
                  member={member}
                  isCurrentUser={member.userId === currentUser.id}
                  isGroupAdmin={isGroupAdmin}
                  canManageMembers={isGroupAdmin}
                  onUpdateRole={handleUpdateRole}
                  onRemove={handleRemoveMember}
                  onTransferOwnership={handleTransferOwnership}
                />
              ))}
              {members.length < 4 && (
                <div className="pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowInviteDialog(true)}
                    className="w-full"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Invite Another Member
                  </Button>
                </div>
              )}
              {members.length >= 4 && (
                <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    Your group has reached the maximum capacity of 4 members.
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      <InviteCodeDialog
        open={showInviteDialog}
        onClose={() => setShowInviteDialog(false)}
        groupId={groupId}
        groupName={groupName}
        userId={currentUser.id}
        userName={currentUser.name}
      />
    </div>
  );
}

function DataPrivacySettings() {
  // Mock data - replace with actual user data from auth context
  const currentUser = {
    id: 'mock-user-id',
    email: 'john@example.com',
    isAdmin: true // Check if user is admin of any group
  };

  return (
    <div className="space-y-6">
      {/* Export Panel */}
      <DataExportPanel userId={currentUser.id} isAdmin={currentUser.isAdmin} />

      {/* Deletion Panel */}
      <DataDeletionPanel
        userId={currentUser.id}
        isAdmin={currentUser.isAdmin}
        userEmail={currentUser.email}
      />

      {/* Privacy Info */}
      <Card className="bg-gray-50 dark:bg-gray-800">
        <CardContent className="pt-6">
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Your Privacy Rights (GDPR)
            </h3>
            <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <p>
                <strong>Right to Access:</strong> You can view all your data in the app at any time.
              </p>
              <p>
                <strong>Right to Data Portability:</strong> You can export your data in machine-readable format (JSON/CSV).
              </p>
              <p>
                <strong>Right to be Forgotten:</strong> You can request permanent deletion of all your data.
              </p>
              <p>
                <strong>Right to Rectification:</strong> You can update or correct your data at any time through the app.
              </p>
            </div>
            <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                For questions about your privacy rights, contact us at privacy@myguide.health
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
