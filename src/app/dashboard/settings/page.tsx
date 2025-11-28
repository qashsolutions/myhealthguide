'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Bell, User, Shield, CreditCard, Users as UsersIcon, History, UserPlus, Database, Sparkles, Activity, BellRing, AlertCircle, Loader2, Mail } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { NotificationSettings as NotificationSettingsComponent } from '@/components/notifications/NotificationSettings';
import { NotificationHistory } from '@/components/notifications/NotificationHistory';
import { GroupService } from '@/lib/firebase/groups';
import { MemberCard } from '@/components/group/MemberCard';
import { InviteCodeDialog } from '@/components/group/InviteCodeDialog';
import { ApprovalQueue } from '@/components/group/ApprovalQueue';
import { PermissionManager } from '@/components/group/PermissionManager';
import { DataExportPanel } from '@/components/admin/DataExportPanel';
import { DataDeletionPanel } from '@/components/admin/DataDeletionPanel';
import { AIFeaturesSettings } from '@/components/settings/AIFeaturesSettings';
import { ActivityHistory } from '@/components/settings/ActivityHistory';
import { AlertPreferencesSettings } from '@/components/settings/AlertPreferencesSettings';
import { useAuth } from '@/contexts/AuthContext';
import { uploadFileWithQuota } from '@/lib/firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { SubscriptionSettings as RealSubscriptionSettings } from '@/components/subscription/SubscriptionSettings';
import { useRouter } from 'next/navigation';

/**
 * Obfuscates an email address for privacy
 * e.g., "john.doe@example.com" -> "j***e@e***.com"
 */
function obfuscateEmail(email: string): string {
  if (!email || !email.includes('@')) return '***@***.***';

  const [localPart, domain] = email.split('@');
  const [domainName, ...domainExt] = domain.split('.');

  // Obfuscate local part: show first and last char
  let obfuscatedLocal = localPart;
  if (localPart.length <= 2) {
    obfuscatedLocal = localPart[0] + '***';
  } else {
    obfuscatedLocal = localPart[0] + '***' + localPart[localPart.length - 1];
  }

  // Obfuscate domain name: show first char only
  let obfuscatedDomain = domainName;
  if (domainName.length <= 2) {
    obfuscatedDomain = domainName[0] + '***';
  } else {
    obfuscatedDomain = domainName[0] + '***';
  }

  // Keep the extension (com, org, etc.)
  const extension = domainExt.join('.');

  return `${obfuscatedLocal}@${obfuscatedDomain}.${extension}`;
}

/**
 * Obfuscates a phone number for privacy
 * e.g., "+16505551234" -> "+1******1234"
 * Shows country code and last 4 digits only
 */
function obfuscatePhone(phone: string): string {
  if (!phone) return '***-***-****';

  // Remove all non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, '');

  // Handle different formats
  if (cleaned.startsWith('+1') && cleaned.length >= 12) {
    // +1XXXXXXXXXX format - show +1 and last 4 digits
    return '+1******' + cleaned.slice(-4);
  } else if (cleaned.startsWith('+') && cleaned.length >= 11) {
    // Other international format
    const countryCode = cleaned.slice(0, cleaned.length - 10);
    return countryCode + '******' + cleaned.slice(-4);
  } else if (cleaned.length >= 10) {
    // 10 digit format
    return '******' + cleaned.slice(-4);
  }

  // Fallback for shorter numbers
  return '***-***-****';
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;

  // Handle tab from URL query parameter
  useEffect(() => {
    const tabParam = searchParams?.get('tab');
    if (tabParam && ['profile', 'security', 'subscription', 'notifications', 'group', 'ai', 'alerts', 'data'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, []);

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
        <div className="space-y-4">
          {/* Account Section */}
          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-3 mb-2">
              Account
            </p>
            <Button
              variant={activeTab === 'profile' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveTab('profile')}
            >
              <User className="w-4 h-4 mr-2" />
              Profile
            </Button>
            <Button
              variant={activeTab === 'security' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveTab('security')}
            >
              <Shield className="w-4 h-4 mr-2" />
              Security & Activity
            </Button>
            <Button
              variant={activeTab === 'subscription' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveTab('subscription')}
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Subscription
            </Button>
          </div>

          {/* Collaboration Section */}
          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-3 mb-2">
              Collaboration
            </p>
            <Button
              variant={activeTab === 'notifications' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveTab('notifications')}
            >
              <Bell className="w-4 h-4 mr-2" />
              Notifications
            </Button>
            <Button
              variant={activeTab === 'group' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveTab('group')}
            >
              <UsersIcon className="w-4 h-4 mr-2" />
              Group Management
            </Button>
          </div>

          {/* Advanced Section */}
          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-3 mb-2">
              Advanced
            </p>
            <Button
              variant={activeTab === 'ai' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveTab('ai')}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              AI Features
            </Button>
            <Button
              variant={activeTab === 'alerts' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveTab('alerts')}
            >
              <BellRing className="w-4 h-4 mr-2" />
              Alert Preferences
            </Button>
            <Button
              variant={activeTab === 'data' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveTab('data')}
            >
              <Database className="w-4 h-4 mr-2" />
              Privacy & Data
            </Button>
          </div>
        </div>

        {/* Content Area */}
        <div className="md:col-span-3 space-y-6">
          {activeTab === 'profile' && <ProfileSettings />}
          {activeTab === 'security' && <SecurityActivitySettings />}
          {activeTab === 'subscription' && <RealSubscriptionSettings />}
          {activeTab === 'notifications' && <NotificationSettings />}
          {activeTab === 'group' && <GroupSettings />}
          {activeTab === 'ai' && <AISettings />}
          {activeTab === 'alerts' && <AlertPreferencesSettings />}
          {activeTab === 'data' && <DataPrivacySettings />}
        </div>
      </div>
    </div>
  );
}

function ProfileSettings() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const [profileImage, setProfileImage] = useState<string | undefined>(user?.profileImage);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasEmail = user?.email && user.email.trim() !== '';

  // Get user initials for avatar fallback
  const userInitials = user
    ? `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`
    : '';

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      alert('Please select a JPG, PNG or GIF image.');
      return;
    }

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      alert('Image size must be less than 2MB.');
      return;
    }

    try {
      setUploading(true);

      // Upload to Firebase Storage
      const timestamp = Date.now();
      const fileName = `profile_${user.id}_${timestamp}.${file.name.split('.').pop()}`;
      const filePath = `users/${user.id}/profile/${fileName}`;

      const uploadResult = await uploadFileWithQuota(
        user.id,
        file,
        filePath,
        'profile'
      );

      if (uploadResult.success && uploadResult.url) {
        // Update user profile in Firestore
        const userRef = doc(db, 'users', user.id);
        await updateDoc(userRef, {
          profileImage: uploadResult.url
        });

        // Update local state
        setProfileImage(uploadResult.url);

        // Refresh user data in auth context
        await refreshUser();

        alert('Profile photo updated successfully!');
      } else {
        alert(uploadResult.error || 'Failed to upload photo. Please try again.');
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Failed to upload photo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Settings</CardTitle>
        <CardDescription>
          View your personal information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={profileImage} alt={`${user?.firstName || 'User'}'s profile photo`} />
            <AvatarFallback className="text-2xl">{userInitials}</AvatarFallback>
          </Avatar>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif"
              onChange={handlePhotoChange}
              className="hidden"
              id="profile-photo-upload"
              name="profile-photo"
              aria-label="Upload profile photo"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? 'Uploading...' : 'Change Photo'}
            </Button>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              JPG, PNG or GIF. Max size 2MB.
            </p>
          </div>
        </div>

        <Separator />

        {/* Form - All fields read-only */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              value={user?.firstName || ''}
              disabled
              className="bg-gray-50 dark:bg-gray-900"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              value={user?.lastName || ''}
              disabled
              className="bg-gray-50 dark:bg-gray-900"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          {hasEmail ? (
            // Has email - show obfuscated with verification status
            <>
              <div className="flex items-center gap-2">
                <Input
                  id="email"
                  type="email"
                  value={obfuscateEmail(user?.email || '')}
                  disabled
                  className="bg-gray-50 dark:bg-gray-900 flex-1"
                />
                {!user?.emailVerified && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push('/verify')}
                    className="whitespace-nowrap"
                  >
                    <Mail className="w-3 h-3 mr-1" />
                    Verify
                  </Button>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {user?.emailVerified ? (
                  <span className="text-green-600 dark:text-green-400">✓ Verified</span>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400">⚠ Not verified</span>
                )}
              </p>
            </>
          ) : (
            // No email - prompt to add via /verify
            <>
              <div className="flex items-center gap-2">
                <Input
                  id="email"
                  type="email"
                  value="No email added"
                  disabled
                  className="bg-gray-50 dark:bg-gray-900 text-gray-400 flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/verify')}
                  className="whitespace-nowrap"
                >
                  <Mail className="w-4 h-4 mr-1" />
                  Add Email
                </Button>
              </div>
              <p className="text-xs text-amber-600 dark:text-amber-400">
                ⚠ Add an email for account recovery and important notifications
              </p>
            </>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            type="tel"
            value={user?.phoneNumber ? obfuscatePhone(user.phoneNumber) : ''}
            disabled
            className="bg-gray-50 dark:bg-gray-900"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {user?.phoneVerified ? (
              <span className="text-green-600 dark:text-green-400">✓ Verified</span>
            ) : (
              <span className="text-amber-600 dark:text-amber-400">⚠ Not verified</span>
            )}
          </p>
        </div>

        <Separator />

        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Note:</strong> Name, email, and phone cannot be changed as they are used for authentication and verification.
            Contact support at support@myguide.health if you need assistance.
          </p>
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

function SecurityActivitySettings() {
  const [securityTab, setSecurityTab] = useState<'security' | 'activity'>('security');
  const { user } = useAuth();
  const router = useRouter();
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [requireEmailVerification, setRequireEmailVerification] = useState(false);

  // Check if user has MFA enabled (both email and phone verified)
  const hasMFA = user?.emailVerified && user?.phoneVerified;
  const hasEmail = user?.email && user.email.trim() !== '';

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!/[a-zA-Z]/.test(password)) {
      return 'Password must contain at least one letter';
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number';
    }
    if (!/^[a-zA-Z0-9]+$/.test(password)) {
      return 'Password must contain only letters and numbers';
    }
    return null;
  };

  const handlePasswordChange = async () => {
    setPasswordError('');
    setPasswordSuccess('');

    // Validate new password
    const passwordValidation = validatePassword(passwordForm.newPassword);
    if (passwordValidation) {
      setPasswordError(passwordValidation);
      return;
    }

    // Check if passwords match
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    // Check email verification first
    if (!user?.emailVerified) {
      setPasswordError('Please verify your email before changing password');
      setRequireEmailVerification(true);
      return;
    }

    try {
      setChangingPassword(true);

      // In production, call Firebase reauthenticate and updatePassword
      // For now, show success message
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call

      setPasswordSuccess('Password updated successfully!');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      setPasswordError('Failed to update password. Please try again.');
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setSecurityTab('security')}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            securityTab === 'security'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Security
          </div>
        </button>
        <button
          onClick={() => setSecurityTab('activity')}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            securityTab === 'activity'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Activity History
          </div>
        </button>
      </div>

      {/* Tab Content */}
      {securityTab === 'security' ? (
        <div className="space-y-4">
          {/* MFA Status Card */}
          <Card className={hasMFA ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className={`w-5 h-5 ${hasMFA ? 'text-green-600' : 'text-amber-600'}`} />
                Multi-Factor Authentication (MFA)
              </CardTitle>
              <CardDescription>
                {hasMFA
                  ? 'Your account is protected with MFA'
                  : 'Enable both email and phone verification for enhanced security'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${user?.emailVerified ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <div>
                      <p className="font-medium">Email Verification</p>
                      <p className="text-sm text-gray-500">
                        {hasEmail ? obfuscateEmail(user?.email || '') : 'No email added'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!user?.emailVerified && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push('/verify')}
                        className="h-7 px-2 text-xs"
                      >
                        <Mail className="w-3 h-3 mr-1" />
                        {hasEmail ? 'Verify' : 'Add Email'}
                      </Button>
                    )}
                    <Badge
                      variant={user?.emailVerified ? 'default' : 'secondary'}
                      className={user?.emailVerified ? 'bg-green-100 text-green-800 border-green-200 hover:bg-green-100' : ''}
                    >
                      {user?.emailVerified ? 'Verified' : 'Not Verified'}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${user?.phoneVerified ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <div>
                      <p className="font-medium">Phone Verification</p>
                      <p className="text-sm text-gray-500">{user?.phoneNumber ? obfuscatePhone(user.phoneNumber) : 'No phone added'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!user?.phoneVerified && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push('/verify')}
                        className="h-7 px-2 text-xs"
                      >
                        {user?.phoneNumber ? 'Verify' : 'Add Phone'}
                      </Button>
                    )}
                    <Badge
                      variant={user?.phoneVerified ? 'default' : 'secondary'}
                      className={user?.phoneVerified ? 'bg-green-100 text-green-800 border-green-200 hover:bg-green-100' : ''}
                    >
                      {user?.phoneVerified ? 'Verified' : 'Not Verified'}
                    </Badge>
                  </div>
                </div>

                {hasMFA && (
                  <div className="mt-3 p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <p className="text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      MFA is active. All sensitive operations require verification.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Password Change Card */}
          <Card className="bg-white dark:bg-gray-900">
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>
                Update your password to keep your account secure
                {!user?.emailVerified && (
                  <span className="block mt-1 text-amber-600">
                    ⚠ Email verification required for password changes
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  name="currentPassword"
                  type="password"
                  placeholder="Enter current password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                  autoComplete="current-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  placeholder="8+ characters (a-z, A-Z, 0-9)"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                  autoComplete="new-password"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Use letters (a-z, A-Z) and numbers (0-9) only
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="Re-enter new password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                  autoComplete="new-password"
                />
              </div>

              {passwordError && (
                <Alert className="bg-red-50 border-red-200">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    {passwordError}
                  </AlertDescription>
                </Alert>
              )}

              {passwordSuccess && (
                <Alert className="bg-green-50 border-green-200">
                  <Shield className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    {passwordSuccess}
                  </AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handlePasswordChange}
                disabled={changingPassword || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
              >
                {changingPassword ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Password'
                )}
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-900 border-red-200 dark:border-red-800">
            <CardHeader>
              <CardTitle className="text-red-600">Danger Zone</CardTitle>
              <CardDescription>Permanently delete your account and all data</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm" className="text-red-600 border-red-600 hover:bg-red-50">
                Delete Account
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        <ActivityHistory userId={user?.id || ''} />
      )}
    </div>
  );
}

function AISettings() {
  const groupId = 'mock-group-id'; // Replace with actual groupId
  const isAdmin = true; // Replace with actual admin check

  const handleSave = async (settings: any) => {
    console.log('Saving AI settings:', settings);
    // Implement actual save logic here
  };

  return (
    <AIFeaturesSettings
      groupId={groupId}
      isAdmin={isAdmin}
      onSave={handleSave}
    />
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

      {/* Pending Approvals Queue (Admin Only) */}
      {isGroupAdmin && (
        <ApprovalQueue groupId={groupId} adminId={currentUser.id} />
      )}

      {/* Permission Manager (Admin Only) */}
      {isGroupAdmin && (
        <PermissionManager groupId={groupId} adminId={currentUser.id} />
      )}

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
