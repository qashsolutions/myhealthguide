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
import { Bell, User, Shield, CreditCard, Users as UsersIcon, History, UserPlus, Database, Sparkles, Activity, BellRing, AlertCircle, Loader2, Mail, Info, ChevronDown, ChevronUp, ArrowUpRight, Eye, Edit3, Settings, Download, Building2, LogOut, Plus, X, Send } from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { NotificationSettings as NotificationSettingsComponent } from '@/components/notifications/NotificationSettings';
import { NotificationHistory } from '@/components/notifications/NotificationHistory';
import { GroupService } from '@/lib/firebase/groups';
import { AuthService } from '@/lib/firebase/auth';
import { AgencyService } from '@/lib/firebase/agencies';
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
import { useFeatureTracking } from '@/hooks/useFeatureTracking';
import { isSuperAdmin } from '@/lib/utils/getUserRole';
import { useSubscription as useSubscriptionHook } from '@/lib/subscription';
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
  // Feature tracking
  useFeatureTracking('settings');

  const { user, signOut } = useAuth();
  const { isMultiAgency } = useSubscriptionHook();
  const userIsSuperAdmin = isSuperAdmin(user);
  const [loggingOut, setLoggingOut] = useState(false);

  const [activeTab, setActiveTab] = useState('profile');
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;

  // Handle tab from URL query parameter
  useEffect(() => {
    const tabParam = searchParams?.get('tab');
    if (tabParam && ['profile', 'security', 'subscription', 'notifications', 'group', 'ai', 'alerts', 'data'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

          {/* Collaboration Section
              DISABLED FOR AGENCY OWNERS: Notifications & Group Management (Jan 26, 2026)

              Reason: These features are not relevant for multi-agency owners (super admins):
              1. Notifications: Agency owners don't need per-elder notification settings since
                 they don't directly care for elders. Caregivers handle this.
              2. Group Management: Agency owners manage their team via Agency Management,
                 not through group membership. Groups are for family plans.

              Who still has access:
              - Agency caregivers: Need notification settings for their assigned elders
              - Family Plan A/B admins: Need to manage their family group

              NOTE: Members (all plans) do NOT have login access. They only receive
              automated daily health reports via email at 7 PM PST.

              To re-enable for agency owners:
              1. Remove the conditions wrapping these Buttons
              2. Update CLAUDE.md documentation
          */}
          {!(isMultiAgency && userIsSuperAdmin) && (
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
          )}

          {/* Advanced Section */}
          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-3 mb-2">
              Advanced
            </p>
            {/* DISABLED FOR AGENCY OWNERS: Smart Features (Jan 26, 2026)

                Reason: Smart Features (AI settings) configure per-elder AI analysis which
                is not relevant for agency owners who:
                1. Do NOT directly care for elders
                2. Focus on business operations (scheduling, staffing, compliance)
                3. Have already had AI Insights, Analytics, Care features hidden

                Who still has access:
                - Agency caregivers: Configure AI for their assigned elders
                - Family Plan A/B admins: Configure AI for their loved ones

                To re-enable for agency owners:
                1. Remove the condition wrapping this Button
                2. Update CLAUDE.md documentation
            */}
            {!(isMultiAgency && userIsSuperAdmin) && (
              <Button
                variant={activeTab === 'ai' ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => setActiveTab('ai')}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Smart Features
              </Button>
            )}
            {/* DISABLED FOR AGENCY OWNERS: Alert Preferences (Jan 26, 2026)

                Reason: Alert Preferences configure per-elder safety alerts which are
                not relevant for agency owners who:
                1. Do NOT directly care for elders
                2. Focus on business operations (scheduling, staffing, compliance)
                3. Have already had Safety Alerts page hidden for the same reason

                Who still has access:
                - Agency caregivers: Configure alerts for their assigned elders
                - Family Plan A/B admins: Configure alerts for their loved ones

                To re-enable for agency owners:
                1. Remove the condition wrapping this Button
                2. Update CLAUDE.md documentation
            */}
            {!(isMultiAgency && userIsSuperAdmin) && (
            <Button
              variant={activeTab === 'alerts' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveTab('alerts')}
            >
              <BellRing className="w-4 h-4 mr-2" />
              Alert Preferences
            </Button>
            )}
            <Button
              variant={activeTab === 'data' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveTab('data')}
            >
              <Database className="w-4 h-4 mr-2" />
              Privacy & Data
            </Button>
          </div>

          {/* Logout Section */}
          <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="ghost"
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
              onClick={async () => {
                setLoggingOut(true);
                try {
                  await signOut();
                } catch (error) {
                  console.error('Error signing out:', error);
                  setLoggingOut(false);
                }
              }}
              disabled={loggingOut}
            >
              {loggingOut ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing out...
                </>
              ) : (
                <>
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </>
              )}
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
            value={user?.phoneNumber
              ? obfuscatePhone(user.phoneNumber)
              : user?.phoneVerified
                ? 'Phone verified via sign-in'
                : ''}
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
  const { user } = useAuth();

  // Get user's first group ID (users have at least one group after signup)
  const groupId = user?.groups?.[0]?.groupId || '';

  // Show message if no group found
  if (!groupId) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No group found. Please create or join a group first.</p>
      </div>
    );
  }

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
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter (A-Z)';
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter (a-z)';
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number (0-9)';
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      return 'Password must contain at least one special character';
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

      await AuthService.changePasswordWithReauth(
        passwordForm.currentPassword,
        passwordForm.newPassword
      );

      setPasswordSuccess('Password updated successfully!');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error: unknown) {
      const firebaseError = error as { code?: string; message?: string };
      switch (firebaseError.code) {
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          setPasswordError('Current password is incorrect');
          break;
        case 'auth/too-many-requests':
          setPasswordError('Too many attempts. Please try again later.');
          break;
        case 'auth/weak-password':
          setPasswordError('New password is too weak. Please choose a stronger password.');
          break;
        case 'auth/requires-recent-login':
          setPasswordError('Session expired. Please sign out and sign back in, then try again.');
          break;
        default:
          setPasswordError(firebaseError.message || 'Failed to update password. Please try again.');
      }
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
                      <p className="text-sm text-gray-500">
                        {user?.phoneNumber
                          ? obfuscatePhone(user.phoneNumber)
                          : user?.phoneVerified
                            ? 'Phone verified via sign-in'
                            : 'No phone added'}
                      </p>
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
                  placeholder="8+ chars, A-Z, a-z, 0-9, special"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                  autoComplete="new-password"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Requires uppercase, lowercase, number, and special character
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
  const { user } = useAuth();

  // Get user's first group ID
  const groupId = user?.groups?.[0]?.groupId || '';
  const isAdmin = user?.groups?.[0]?.role === 'admin';

  const handleSave = async (settings: any) => {
    console.log('Saving AI settings:', settings);
    // Implement actual save logic here
  };

  if (!groupId) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No group found. Please create or join a group first.</p>
      </div>
    );
  }

  return (
    <AIFeaturesSettings
      groupId={groupId}
      isAdmin={isAdmin}
      onSave={handleSave}
    />
  );
}

// Plan member limits - now using centralized subscription service
import { useSubscription, getMaxMembers as getMaxMembersFromService, getMaxRecipients as getMaxRecipientsFromService, getPlanDisplayInfo } from '@/lib/subscription';

// Helper to get member plan info using centralized service
function getMemberPlanInfo(tier: string | null | undefined) {
  const displayInfo = getPlanDisplayInfo(tier as 'family' | 'single_agency' | 'multi_agency' | null);
  return {
    label: displayInfo.name,
    description: displayInfo.description,
  };
}

function GroupSettings() {
  const { user } = useAuth();
  const { tier, isTrial, isMultiAgency, isSingleAgency } = useSubscription();
  const [groupName, setGroupName] = useState('My Family');
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showUpgradeOptions, setShowUpgradeOptions] = useState(false);
  const [showRolePermissions, setShowRolePermissions] = useState(false);
  const [showMembers, setShowMembers] = useState(true);
  const [agencyName, setAgencyName] = useState<string | null>(null);

  // Report Recipients state (now per-elder)
  const [elders, setElders] = useState<any[]>([]); // All elders in the group
  const [elderRecipients, setElderRecipients] = useState<Record<string, any[]>>({}); // elderId -> recipients[]
  const [showReportRecipients, setShowReportRecipients] = useState(true);
  const [expandedElders, setExpandedElders] = useState<Set<string>>(new Set()); // Track expanded elder sections
  const [newRecipientEmail, setNewRecipientEmail] = useState('');
  const [newRecipientName, setNewRecipientName] = useState('');
  const [addingRecipientForElder, setAddingRecipientForElder] = useState<string | null>(null); // Which elder we're adding to
  const [addingRecipient, setAddingRecipient] = useState(false);
  const [recipientError, setRecipientError] = useState('');

  // Multi Agency toggle: 'caregiver' or 'member'
  const [addingType, setAddingType] = useState<'caregiver' | 'member'>('caregiver');

  // Get actual user and group data from auth context
  const currentUser = {
    id: user?.id || '',
    name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'User',
    email: user?.email || ''
  };

  // Check if user is an agency caregiver (has agency membership but is not super_admin)
  const userAgencyMembership = user?.agencies?.[0];
  const isAgencyCaregiverUser = userAgencyMembership?.role === 'caregiver' || userAgencyMembership?.role === 'caregiver_admin' || userAgencyMembership?.role === 'family_member';

  // For agency caregivers, use their assigned group; for others, use regular group membership
  const groupId = isAgencyCaregiverUser
    ? (userAgencyMembership?.assignedGroupIds?.[0] || '')
    : (user?.groups?.[0]?.groupId || '');
  const isGroupAdmin = isAgencyCaregiverUser ? false : (user?.groups?.[0]?.role === 'admin');

  // Get plan-based limits using centralized service
  const maxMembers = getMaxMembersFromService(tier);
  const planInfo = getMemberPlanInfo(tier);
  const isAtLimit = members.length >= maxMembers;

  // Fetch agency name for agency caregivers
  useEffect(() => {
    const fetchAgencyName = async () => {
      if (isAgencyCaregiverUser && userAgencyMembership?.agencyId) {
        try {
          const agency = await AgencyService.getAgency(userAgencyMembership.agencyId);
          if (agency) {
            setAgencyName(agency.name);
          }
        } catch (error) {
          console.error('Error fetching agency name:', error);
        }
      }
    };
    fetchAgencyName();
  }, [isAgencyCaregiverUser, userAgencyMembership?.agencyId]);

  useEffect(() => {
    if (groupId) {
      loadMembers();
      loadEldersAndRecipients();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  const loadMembers = async () => {
    if (!groupId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);

      // Use API route to fetch members (bypasses Firestore rules for reading other users)
      const { auth } = await import('@/lib/firebase/config');
      const token = await auth.currentUser?.getIdToken();

      if (!token) {
        console.error('No auth token available');
        setLoading(false);
        return;
      }

      const response = await fetch(`/api/groups/${groupId}/members`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch members');
      }

      const data = await response.json();
      setMembers(data.members || []);
    } catch (error) {
      console.error('Error loading members:', error);
      // Don't throw - just show empty members list
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  const loadEldersAndRecipients = async () => {
    if (!groupId) return;
    try {
      // Query elders from the elders collection (not embedded in group)
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const eldersQuery = query(
        collection(db, 'elders'),
        where('groupId', '==', groupId)
      );
      const eldersSnapshot = await getDocs(eldersQuery);

      const loadedElders: any[] = [];
      const recipientsByElder: Record<string, any[]> = {};

      eldersSnapshot.forEach((elderDoc) => {
        const elderData = elderDoc.data();
        loadedElders.push({ id: elderDoc.id, ...elderData });
        // Recipients are stored directly on the elder document
        recipientsByElder[elderDoc.id] = elderData.reportRecipients || [];
      });

      setElders(loadedElders);
      setElderRecipients(recipientsByElder);

      // For Family plans with 1 elder, auto-expand that elder
      if (loadedElders.length === 1 && !isMultiAgency) {
        setExpandedElders(new Set([loadedElders[0].id]));
      }
    } catch (error) {
      console.error('Error loading elders and recipients:', error);
    }
  };

  // Get max report recipients per elder based on plan using centralized subscription service
  // Plan A = 1 recipient total, Plan B = 3 recipients total, Multi Agency = 2 per elder
  const maxRecipientsPerElder = getMaxRecipientsFromService(tier);

  // Helper to check if an elder is at recipient limit
  const isElderAtRecipientLimit = (elderId: string) => {
    const elderRecipientsList = elderRecipients[elderId] || [];
    return elderRecipientsList.length >= maxRecipientsPerElder;
  };

  // Get total recipients across all elders (for display)
  const getTotalRecipients = () => {
    return Object.values(elderRecipients).reduce((total, list) => total + list.length, 0);
  };

  const handleAddRecipient = async (elderId: string) => {
    if (!newRecipientEmail.trim()) {
      setRecipientError('Please enter an email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newRecipientEmail.trim())) {
      setRecipientError('Please enter a valid email address');
      return;
    }

    if (isElderAtRecipientLimit(elderId)) {
      setRecipientError(`Maximum ${maxRecipientsPerElder} recipients allowed per loved one`);
      return;
    }

    try {
      setAddingRecipient(true);
      setRecipientError('');

      await GroupService.addReportRecipient(
        groupId,
        elderId,
        newRecipientEmail.trim(),
        currentUser.id,
        newRecipientName.trim() || undefined
      );

      // Refresh the list
      await loadEldersAndRecipients();

      // Clear form
      setNewRecipientEmail('');
      setNewRecipientName('');
      setAddingRecipientForElder(null);
    } catch (error: any) {
      console.error('Error adding recipient:', error);
      setRecipientError(error.message || 'Failed to add recipient');
    } finally {
      setAddingRecipient(false);
    }
  };

  const handleRemoveRecipient = async (elderId: string, recipientId: string) => {
    if (!confirm('Remove this recipient? They will no longer receive daily health reports.')) {
      return;
    }

    try {
      await GroupService.removeReportRecipient(groupId, elderId, recipientId);
      await loadEldersAndRecipients();
    } catch (error) {
      console.error('Error removing recipient:', error);
      alert('Failed to remove recipient');
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

  // For agency caregivers: show their agency membership info
  // They should NOT see "Create or Join a Group" - they're already part of an agency
  if (isAgencyCaregiverUser && userAgencyMembership) {
    const roleDisplayName = userAgencyMembership.role === 'caregiver'
      ? 'Caregiver'
      : userAgencyMembership.role === 'caregiver_admin'
        ? 'Caregiver Admin'
        : 'Family Member';

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              Agency Membership
            </CardTitle>
            <CardDescription>
              You are part of an agency managed group
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
                  {agencyName?.[0]?.toUpperCase() || 'A'}
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {agencyName || 'Loading agency...'}
                  </p>
                  <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200">
                    {roleDisplayName}
                  </Badge>
                </div>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <p>
                  <span className="font-medium">Your Role:</span> {roleDisplayName}
                </p>
                {userAgencyMembership.assignedElderIds && userAgencyMembership.assignedElderIds.length > 0 && (
                  <p>
                    <span className="font-medium">Assigned Elders:</span> {userAgencyMembership.assignedElderIds.length}
                  </p>
                )}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <Info className="w-4 h-4 inline mr-1" />
                Group management is handled by your agency administrator. Contact them for any membership changes.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show message if no group found (for non-agency users only)
  if (!groupId) {
    return (
      <div className="text-center py-12">
        <UsersIcon className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No Group Found
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
          You haven&apos;t created or joined a group yet. Create a group to start managing family members or caregivers.
        </p>
        <Button onClick={() => window.location.href = '/dashboard/join'}>
          <UserPlus className="w-4 h-4 mr-2" />
          Create or Join a Group
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Group Name */}
      <Card>
        <CardHeader>
          <CardTitle>Group Information</CardTitle>
          <CardDescription>
            Update your group&apos;s basic information
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

      {/* Plan Limits Banner */}
      <Card className={isTrial ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'}>
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Info className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isTrial ? 'text-amber-600' : 'text-blue-600'}`} />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-gray-900 dark:text-white">
                  {planInfo.label}
                </span>
                {/* Member count is only shown for Multi Agency plans where it refers to caregivers */}
                {/* For Family plans, the "Daily Report Recipients" section shows recipient limits */}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {planInfo.description}
              </p>

              {/* Collapsible upgrade options - hide for Multi Agency users (highest tier) */}
              {isTrial && !isMultiAgency && (
                <div className="mt-3">
                  <button
                    onClick={() => setShowUpgradeOptions(!showUpgradeOptions)}
                    className="flex items-center gap-1 text-sm font-medium text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300"
                  >
                    {showUpgradeOptions ? (
                      <>Hide plan options <ChevronUp className="w-4 h-4" /></>
                    ) : (
                      <>Upgrade for more members <ChevronDown className="w-4 h-4" /></>
                    )}
                  </button>

                  {showUpgradeOptions && (
                    <div className="mt-2 p-3 bg-white dark:bg-gray-900 rounded-lg border border-amber-200 dark:border-amber-700">
                      <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex justify-between">
                          <span>Family Plan</span>
                          <span>{getMaxMembersFromService('family')} members</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Single Agency</span>
                          <span>{getMaxMembersFromService('single_agency')} members</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Multi-Agency</span>
                          <span>{getMaxMembersFromService('multi_agency')} members</span>
                        </div>
                      </div>
                      <Link href="/pricing" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700">
                        View Plans <ArrowUpRight className="w-3 h-3" />
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* Show upgrade prompt when at limit (non-trial) */}
              {!isTrial && isAtLimit && !isMultiAgency && (
                <div className="mt-2">
                  <Link href="/dashboard/settings?tab=subscription" className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700">
                    Upgrade for more members <ArrowUpRight className="w-3 h-3" />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Multi Agency Toggle: Caregiver or Member */}
      {isMultiAgency && isGroupAdmin && (
        <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">What would you like to add?</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {addingType === 'caregiver'
                    ? 'Caregivers need accounts and can log data for assigned loved ones'
                    : 'Members receive daily email reports (no account needed)'}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={addingType === 'caregiver' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAddingType('caregiver')}
                  className={addingType === 'caregiver' ? 'bg-purple-600 hover:bg-purple-700' : ''}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Caregiver
                </Button>
                <Button
                  variant={addingType === 'member' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAddingType('member')}
                  className={addingType === 'member' ? 'bg-purple-600 hover:bg-purple-700' : ''}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Member
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Report Recipients Card - Family members who receive daily health reports */}
      {/* Show for Family plans always, or for Multi Agency when adding 'member' */}
      {(!isMultiAgency || addingType === 'member') && (
      <Card>
        <CardHeader className="cursor-pointer" onClick={() => setShowReportRecipients(!showReportRecipients)}>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Daily Report Recipients
                <Badge variant="secondary" className="text-xs">
                  {getTotalRecipients()}/{isMultiAgency ? `${maxRecipientsPerElder}/elder` : maxRecipientsPerElder}
                </Badge>
              </CardTitle>
              <CardDescription>
                Family members who receive daily health reports via email
              </CardDescription>
            </div>
            {showReportRecipients ? (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </div>
        </CardHeader>
        {showReportRecipients && (
          <CardContent className="space-y-4">
            {/* Info Box */}
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <Info className="w-4 h-4 inline mr-1" />
                Recipients will receive a daily email summary with your loved one&apos;s health updates including medications, meals, and activities. No account needed.
              </p>
            </div>

            {/* No Elders Message */}
            {elders.length === 0 ? (
              <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                <UsersIcon className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>No loved ones added yet</p>
                <p className="text-sm mt-1">Add a loved one first to configure report recipients</p>
              </div>
            ) : (
              <div className="space-y-4">
                {elders.map((elder) => {
                  const elderRecipientsList = elderRecipients[elder.id] || [];
                  const isExpanded = expandedElders.has(elder.id) || elders.length === 1;
                  const isAddingForThisElder = addingRecipientForElder === elder.id;
                  const atLimit = isElderAtRecipientLimit(elder.id);

                  return (
                    <div key={elder.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                      {/* Elder Header - Clickable to expand (only for Multi-Agency with multiple elders) */}
                      <div
                        className={`p-3 bg-gray-50 dark:bg-gray-800 flex items-center justify-between ${elders.length > 1 ? 'cursor-pointer' : ''}`}
                        onClick={() => {
                          if (elders.length > 1) {
                            setExpandedElders(prev => {
                              const next = new Set(prev);
                              if (next.has(elder.id)) {
                                next.delete(elder.id);
                              } else {
                                next.add(elder.id);
                              }
                              return next;
                            });
                          }
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                            <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                              {elder.name?.[0]?.toUpperCase() || 'L'}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{elder.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {elderRecipientsList.length}/{maxRecipientsPerElder} recipients
                            </p>
                          </div>
                        </div>
                        {elders.length > 1 && (
                          isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-gray-500" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-gray-500" />
                          )
                        )}
                      </div>

                      {/* Elder Content - Recipients */}
                      {isExpanded && (
                        <div className="p-3 space-y-3">
                          {/* Recipients List */}
                          {elderRecipientsList.length === 0 ? (
                            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
                              No recipients yet
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {elderRecipientsList.map((recipient) => (
                                <div
                                  key={recipient.id}
                                  className="flex items-center justify-between p-2 bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800"
                                >
                                  <div className="flex items-center gap-2">
                                    <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                    <div>
                                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                                        {recipient.name || recipient.email}
                                      </p>
                                      {recipient.name && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                          {recipient.email}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  {isGroupAdmin && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleRemoveRecipient(elder.id, recipient.id)}
                                      className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Add Recipient Form */}
                          {isGroupAdmin && !atLimit && (
                            isAddingForThisElder ? (
                              <div className="space-y-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <div>
                                    <Label className="text-xs">Email *</Label>
                                    <Input
                                      type="email"
                                      placeholder="family@example.com"
                                      value={newRecipientEmail}
                                      onChange={(e) => {
                                        setNewRecipientEmail(e.target.value);
                                        setRecipientError('');
                                      }}
                                      className="mt-1 h-8"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs">Name (optional)</Label>
                                    <Input
                                      type="text"
                                      placeholder="Mom, Dad, etc."
                                      value={newRecipientName}
                                      onChange={(e) => setNewRecipientName(e.target.value)}
                                      className="mt-1 h-8"
                                    />
                                  </div>
                                </div>
                                {recipientError && (
                                  <p className="text-xs text-red-600 dark:text-red-400">{recipientError}</p>
                                )}
                                <div className="flex gap-2">
                                  <Button
                                    onClick={() => handleAddRecipient(elder.id)}
                                    disabled={addingRecipient || !newRecipientEmail.trim()}
                                    size="sm"
                                    className="h-7"
                                  >
                                    {addingRecipient ? (
                                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                    ) : (
                                      <Plus className="w-3 h-3 mr-1" />
                                    )}
                                    Add
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7"
                                    onClick={() => {
                                      setAddingRecipientForElder(null);
                                      setNewRecipientEmail('');
                                      setNewRecipientName('');
                                      setRecipientError('');
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full h-8"
                                onClick={() => setAddingRecipientForElder(elder.id)}
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                Add Recipient
                              </Button>
                            )
                          )}

                          {/* At Limit Message */}
                          {atLimit && (
                            <p className="text-xs text-amber-600 dark:text-amber-400 text-center">
                              Maximum {maxRecipientsPerElder} recipients for this loved one.
                              {!isMultiAgency && (
                                <Link href="/dashboard/settings?tab=subscription" className="ml-1 font-medium text-blue-600">
                                  Upgrade
                                </Link>
                              )}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        )}
      </Card>
      )}

      {/* Role Permissions Card - Collapsible */}
      <Card>
        <CardHeader className="cursor-pointer" onClick={() => setShowRolePermissions(!showRolePermissions)}>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Role Permissions
              </CardTitle>
              <CardDescription>
                Understanding what each role can do
              </CardDescription>
            </div>
            {showRolePermissions ? (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </div>
        </CardHeader>
        {showRolePermissions && (
          <CardContent>
            <div className="space-y-3">
              {/* Owner Permissions */}
              <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">Owner</Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    <Eye className="w-3 h-3" /> Read
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    <Edit3 className="w-3 h-3" /> Edit
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    <Settings className="w-3 h-3" /> Manage
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Full access: view data, edit records, manage members & settings
                </p>
              </div>

              {/* Viewer Permissions */}
              <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline">Viewer</Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    <Eye className="w-3 h-3" /> Read
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                    <Edit3 className="w-3 h-3" /> Edit
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                    <Settings className="w-3 h-3" /> Manage
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  View-only access: can see elder info, medications, and schedules
                </p>
              </div>

              {/* Caregiver Permissions (shown for agency plans) */}
              {(isSingleAgency || isMultiAgency) && (
                <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">Caregiver</Badge>
                    <span className="text-xs text-gray-500">(up to 3 loved ones)</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      <Eye className="w-3 h-3" /> Read
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      <Edit3 className="w-3 h-3" /> Edit
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                      <Settings className="w-3 h-3" /> Manage
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Can view and edit records for assigned loved ones only
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Pending Approvals Queue - Only for Multi Agency when adding caregivers */}
      {isGroupAdmin && isMultiAgency && addingType === 'caregiver' && (
        <ApprovalQueue groupId={groupId} adminId={currentUser.id} />
      )}

      {/* Permission Manager (Admin Only) */}
      {/* Hide invite code for Family plans or when Multi Agency is adding members */}
      {isGroupAdmin && (
        <PermissionManager
          groupId={groupId}
          adminId={currentUser.id}
          hideInviteCode={!isMultiAgency || addingType === 'member'}
        />
      )}

      {/* Caregivers - Only show for Multi Agency when adding caregivers */}
      {isMultiAgency && addingType === 'caregiver' && (
        <Card>
          <CardHeader className="cursor-pointer" onClick={() => setShowMembers(!showMembers)}>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  Caregivers
                  <Badge variant="secondary" className="text-xs">
                    {members.length}/{maxMembers}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Manage caregivers who can log data for assigned loved ones
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {!isAtLimit && showMembers && (
                  <Button onClick={(e) => { e.stopPropagation(); setShowInviteDialog(true); }}>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Invite Caregiver
                  </Button>
                )}
                {showMembers ? (
                  <ChevronUp className="w-5 h-5 text-gray-500" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-500" />
                )}
              </div>
            </div>
          </CardHeader>
          {showMembers && (
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                Loading caregivers...
              </div>
            ) : members.length === 0 ? (
              <div className="text-center py-8">
                <UsersIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  No caregivers yet
                </p>
                <Button onClick={() => setShowInviteDialog(true)}>
                  Invite Your First Caregiver
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
                {!isAtLimit && (
                  <div className="pt-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowInviteDialog(true)}
                      className="w-full"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Invite Another Caregiver
                    </Button>
                  </div>
                )}
                {isAtLimit && (
                  <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      Maximum {maxMembers} caregivers reached for Multi Agency plan.
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
          )}
        </Card>
      )}

      {/* Invite Dialog */}
      <InviteCodeDialog
        open={showInviteDialog}
        onClose={() => setShowInviteDialog(false)}
        groupId={groupId}
        groupName={groupName}
        userId={currentUser.id}
        userName={currentUser.name}
        maxMembers={maxMembers}
      />
    </div>
  );
}

function DataPrivacySettings() {
  const { user } = useAuth();
  const [showExport, setShowExport] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showGdprRights, setShowGdprRights] = useState(false);

  // Get actual user data from auth context
  const currentUser = {
    id: user?.id || '',
    email: user?.email || '',
    isAdmin: user?.groups?.[0]?.role === 'admin'
  };

  return (
    <div className="space-y-4">
      {/* Export Panel - Collapsible */}
      <Card>
        <CardHeader
          className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors rounded-t-lg"
          onClick={() => setShowExport(!showExport)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Download className="w-5 h-5 text-blue-600" />
              <div>
                <CardTitle className="text-base">Export Your Data</CardTitle>
                <CardDescription>
                  Download all your data in JSON or CSV format (GDPR compliant)
                </CardDescription>
              </div>
            </div>
            {showExport ? (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </div>
        </CardHeader>
        {showExport && (
          <CardContent>
            <DataExportPanel userId={currentUser.id} isAdmin={currentUser.isAdmin} isEmbedded />
          </CardContent>
        )}
      </Card>

      {/* Deletion Panel - Collapsible */}
      <Card className="border-red-200 dark:border-red-800">
        <CardHeader
          className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors rounded-t-lg"
          onClick={() => setShowDelete(!showDelete)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <div>
                <CardTitle className="text-base text-red-600">Delete All Data</CardTitle>
                <CardDescription>
                  Permanently delete all your data (GDPR Right to be Forgotten)
                </CardDescription>
              </div>
            </div>
            {showDelete ? (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </div>
        </CardHeader>
        {showDelete && (
          <CardContent>
            <DataDeletionPanel
              userId={currentUser.id}
              isAdmin={currentUser.isAdmin}
              userEmail={currentUser.email}
              isEmbedded
            />
          </CardContent>
        )}
      </Card>

      {/* Privacy Info - Collapsible */}
      <Card className="bg-gray-50 dark:bg-gray-800">
        <CardHeader
          className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors rounded-t-lg"
          onClick={() => setShowGdprRights(!showGdprRights)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <div>
                <CardTitle className="text-base">Your Privacy Rights (GDPR)</CardTitle>
                <CardDescription>
                  Learn about your data protection rights
                </CardDescription>
              </div>
            </div>
            {showGdprRights ? (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </div>
        </CardHeader>
        {showGdprRights && (
          <CardContent>
            <div className="space-y-3">
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
        )}
      </Card>
    </div>
  );
}
