'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { NotificationPreferences, NotificationType } from '@/types';
import { NotificationService } from '@/lib/firebase/notifications';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/lib/subscription';
import { Bell, Check, CheckCircle2, XCircle, AlertCircle, Smartphone, Monitor, RefreshCw, Send } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  getFCMToken
} from '@/lib/firebase/fcm';

interface NotificationSettingsProps {
  groupId: string;
}

type PushNotificationStatus = 'checking' | 'supported' | 'unsupported';
type PermissionStatus = 'granted' | 'denied' | 'default' | 'unknown';
type OSType = 'macos' | 'windows' | 'ios' | 'android' | 'unknown';

/**
 * Detect operating system
 */
function detectOS(): OSType {
  if (typeof window === 'undefined') return 'unknown';

  const userAgent = navigator.userAgent.toLowerCase();
  const platform = navigator.platform?.toLowerCase() || '';

  if (platform.includes('mac') || userAgent.includes('mac')) return 'macos';
  if (platform.includes('win') || userAgent.includes('win')) return 'windows';
  if (/iphone|ipad|ipod/.test(userAgent)) return 'ios';
  if (/android/.test(userAgent)) return 'android';

  return 'unknown';
}

/**
 * Get browser name for instructions
 */
function getBrowserName(): string {
  if (typeof window === 'undefined') return 'your browser';

  const userAgent = navigator.userAgent;

  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) return 'Chrome';
  if (userAgent.includes('Edg')) return 'Edge';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';

  return 'your browser';
}

export function NotificationSettings({ groupId }: NotificationSettingsProps) {
  const { user } = useAuth();
  const { isTrial } = useSubscription();

  // Notification preferences state
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    enabled: false,
    frequency: 'realtime',
    types: []
  });

  // Push notification status
  const [browserSupport, setBrowserSupport] = useState<PushNotificationStatus>('checking');
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>('unknown');
  const [hasFCMToken, setHasFCMToken] = useState(false);

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabling, setEnabling] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Detect OS and browser
  const [os, setOS] = useState<OSType>('unknown');
  const [browser, setBrowser] = useState('your browser');

  // Check push notification support on mount
  useEffect(() => {
    setOS(detectOS());
    setBrowser(getBrowserName());

    // Check browser support
    if (isNotificationSupported()) {
      setBrowserSupport('supported');
      const permission = getNotificationPermission();
      setPermissionStatus(permission || 'unknown');
    } else {
      setBrowserSupport('unsupported');
    }
  }, []);

  // Load notification preferences
  useEffect(() => {
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  // Check if user has FCM token (fcmTokens is stored in Firestore but may not be in User type)
  useEffect(() => {
    const userAny = user as any;
    if (userAny?.fcmTokens && userAny.fcmTokens.length > 0) {
      setHasFCMToken(true);
    }
  }, [(user as any)?.fcmTokens]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError('');

      const prefs = await NotificationService.getGroupNotificationPreferences(groupId).catch(() => null);

      if (prefs) {
        setPreferences(prefs);
      }
    } catch (err: any) {
      if (err?.code !== 'permission-denied' && !err?.message?.includes('Missing or insufficient permissions')) {
        console.error('Error loading notification settings:', err);
        setError('Failed to load notification settings');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEnableNotifications = async () => {
    if (!user?.id) return;

    try {
      setEnabling(true);
      setError('');

      // Request permission
      const permission = await requestNotificationPermission();
      setPermissionStatus(permission);

      if (permission === 'granted') {
        // Get and save FCM token
        const token = await getFCMToken(user.id);
        if (token) {
          setHasFCMToken(true);
          setSuccess('Push notifications enabled successfully!');
          setTimeout(() => setSuccess(''), 3000);
        } else {
          setError('Failed to register device. Please try again.');
        }
      } else if (permission === 'denied') {
        setError('Notification permission was denied. Please enable in browser settings.');
      }
    } catch (err) {
      console.error('Error enabling notifications:', err);
      setError('Failed to enable notifications. Please try again.');
    } finally {
      setEnabling(false);
    }
  };

  const handleSendTestNotification = async () => {
    if (!user?.id) return;

    try {
      setSendingTest(true);
      setError('');

      // Use the API to send a test notification
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });

      if (response.ok) {
        setSuccess('Test notification sent! Check your device.');
        setTimeout(() => setSuccess(''), 5000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to send test notification');
      }
    } catch (err) {
      console.error('Error sending test notification:', err);
      setError('Failed to send test notification');
    } finally {
      setSendingTest(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');

      await NotificationService.updateGroupNotificationPreferences(groupId, preferences);

      setSuccess('Notification settings saved successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error saving settings:', err);
      setError('Failed to save notification settings');
    } finally {
      setSaving(false);
    }
  };

  const refreshStatus = useCallback(() => {
    if (isNotificationSupported()) {
      setBrowserSupport('supported');
      const permission = getNotificationPermission();
      setPermissionStatus(permission || 'unknown');
    }
  }, []);

  const toggleNotificationType = (type: NotificationType) => {
    setPreferences(prev => ({
      ...prev,
      types: prev.types.includes(type)
        ? prev.types.filter(t => t !== type)
        : [...prev.types, type]
    }));
  };

  // Get OS-specific instructions
  const getOSInstructions = () => {
    switch (os) {
      case 'macos':
        return {
          icon: <Monitor className="w-4 h-4" />,
          title: 'macOS',
          steps: [
            `Open System Settings (or System Preferences)`,
            `Go to Notifications`,
            `Find "${browser}" in the list`,
            `Enable "Allow Notifications"`,
            `Set alert style to "Alerts" or "Banners"`
          ]
        };
      case 'windows':
        return {
          icon: <Monitor className="w-4 h-4" />,
          title: 'Windows',
          steps: [
            `Open Settings > System > Notifications`,
            `Make sure "Notifications" is turned On`,
            `Scroll down and find "${browser}"`,
            `Enable notifications for ${browser}`
          ]
        };
      case 'android':
        return {
          icon: <Smartphone className="w-4 h-4" />,
          title: 'Android',
          steps: [
            `Open Settings > Apps > ${browser}`,
            `Tap "Notifications"`,
            `Enable "Allow notifications"`,
            `Enable "Show notifications"`
          ]
        };
      case 'ios':
        return {
          icon: <Smartphone className="w-4 h-4" />,
          title: 'iOS',
          steps: [
            `Open Settings > Notifications`,
            `Find "${browser}" in the list`,
            `Enable "Allow Notifications"`,
            `Choose your preferred alert style`
          ]
        };
      default:
        return {
          icon: <Monitor className="w-4 h-4" />,
          title: 'Your Device',
          steps: [
            `Open your device's notification settings`,
            `Find your browser in the app list`,
            `Enable notifications for your browser`
          ]
        };
    }
  };

  const osInstructions = getOSInstructions();

  // Determine overall status
  const isFullySetup = browserSupport === 'supported' &&
    permissionStatus === 'granted' &&
    hasFCMToken;

  if (loading) {
    return <div className="text-center py-8">Loading notification settings...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {success && (
        <Alert className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800">
          <Check className="h-4 w-4 text-green-600" />
          <AlertDescription className="ml-2 text-green-800 dark:text-green-200">
            {success}
          </AlertDescription>
        </Alert>
      )}

      {/* Error Message */}
      {error && (
        <Alert className="bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800">
          <AlertDescription className="ml-2 text-red-800 dark:text-red-200">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Push Notification Setup Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Push Notifications
              </CardTitle>
              <CardDescription>
                Get instant alerts on your device for medication reminders and care events
              </CardDescription>
            </div>
            {isFullySetup && (
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Enabled
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Setup Status Steps */}
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm font-medium text-gray-700 dark:text-gray-300">
              <span>Setup Status</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={refreshStatus}
                className="h-8 px-2"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Refresh
              </Button>
            </div>

            {/* Step 1: Browser Support */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex-shrink-0">
                {browserSupport === 'checking' ? (
                  <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                ) : browserSupport === 'supported' ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
              </div>
              <div className="flex-1">
                <div className="font-medium text-gray-900 dark:text-white">
                  Step 1: Browser Support
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {browserSupport === 'checking' && 'Checking...'}
                  {browserSupport === 'supported' && `${browser} supports push notifications`}
                  {browserSupport === 'unsupported' && 'Your browser does not support push notifications'}
                </div>
              </div>
            </div>

            {/* Step 2: Browser Permission */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex-shrink-0">
                {permissionStatus === 'granted' ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : permissionStatus === 'denied' ? (
                  <XCircle className="w-5 h-5 text-red-500" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                )}
              </div>
              <div className="flex-1">
                <div className="font-medium text-gray-900 dark:text-white">
                  Step 2: Browser Permission
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {permissionStatus === 'granted' && 'Permission granted'}
                  {permissionStatus === 'denied' && 'Permission blocked - enable in browser settings'}
                  {permissionStatus === 'default' && 'Permission not yet requested'}
                  {permissionStatus === 'unknown' && 'Unable to determine permission status'}
                </div>
              </div>
              {browserSupport === 'supported' && permissionStatus !== 'granted' && permissionStatus !== 'denied' && (
                <Button
                  onClick={handleEnableNotifications}
                  disabled={enabling}
                  size="sm"
                >
                  {enabling ? 'Enabling...' : 'Enable Now'}
                </Button>
              )}
            </div>

            {/* Step 3: Device Notifications */}
            <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex-shrink-0 mt-0.5">
                {osInstructions.icon}
              </div>
              <div className="flex-1">
                <div className="font-medium text-gray-900 dark:text-white">
                  Step 3: {osInstructions.title} Device Settings
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Ensure notifications are enabled at the system level
                </div>
              </div>
            </div>
          </div>

          {/* OS-Specific Instructions (shown when permission is denied or for guidance) */}
          {(permissionStatus === 'denied' || !isFullySetup) && browserSupport === 'supported' && (
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-800 dark:text-amber-200 mb-2">
                    {permissionStatus === 'denied'
                      ? `Enable notifications in ${browser} settings:`
                      : `To ensure you receive notifications on ${osInstructions.title}:`}
                  </p>

                  {/* Browser instructions for denied permission */}
                  {permissionStatus === 'denied' && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-amber-700 dark:text-amber-300 mb-1">
                        In {browser}:
                      </p>
                      <ol className="text-sm text-amber-700 dark:text-amber-300 space-y-1 list-decimal list-inside">
                        <li>Click the lock/info icon in the address bar</li>
                        <li>Find &quot;Notifications&quot; setting</li>
                        <li>Change from &quot;Block&quot; to &quot;Allow&quot;</li>
                        <li>Refresh this page</li>
                      </ol>
                    </div>
                  )}

                  {/* OS-specific instructions */}
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-300 mb-1">
                    On {osInstructions.title}:
                  </p>
                  <ol className="text-sm text-amber-700 dark:text-amber-300 space-y-1 list-decimal list-inside">
                    {osInstructions.steps.map((step, idx) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* Test Notification Button */}
          {isFullySetup && (
            <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div>
                <p className="font-medium text-green-800 dark:text-green-200">
                  Notifications are set up!
                </p>
                <p className="text-sm text-green-600 dark:text-green-400">
                  Send a test notification to verify everything is working
                </p>
              </div>
              <Button
                onClick={handleSendTestNotification}
                disabled={sendingTest}
                variant="outline"
                className="border-green-300 text-green-700 hover:bg-green-100 dark:border-green-700 dark:text-green-300 dark:hover:bg-green-900/40"
              >
                <Send className="w-4 h-4 mr-2" />
                {sendingTest ? 'Sending...' : 'Send Test'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Frequency */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Frequency</CardTitle>
          <CardDescription>
            Choose how often you want to receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { value: 'realtime', label: 'Real-time', description: 'Instant alerts as events occur' },
              { value: 'daily', label: 'Daily Summary', description: 'One summary at end of day' },
              { value: 'weekly', label: 'Weekly Summary', description: 'One summary at end of week' }
            ].map(option => (
              <label
                key={option.value}
                className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                  preferences.frequency === option.value
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <input
                  type="radio"
                  name="frequency"
                  value={option.value}
                  checked={preferences.frequency === option.value}
                  onChange={(e) => setPreferences(prev => ({ ...prev, frequency: e.target.value as any }))}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium">{option.label}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {option.description}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Notification Types */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Types</CardTitle>
          <CardDescription>
            Select which types of events should trigger notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { type: 'missed_doses' as NotificationType, label: 'Missed Medication Doses', description: 'Alert when a scheduled dose is missed' },
              { type: 'supplement_alerts' as NotificationType, label: 'Supplement Reminders', description: 'Reminders for supplement intake' },
              { type: 'diet_alerts' as NotificationType, label: 'Diet Alerts', description: 'Alerts for dietary concerns' }
            ].map(option => (
              <label
                key={option.type}
                className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={preferences.types.includes(option.type)}
                  onChange={() => toggleNotificationType(option.type)}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium">{option.label}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {option.description}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Notification Settings'}
        </Button>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Bell className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="font-medium text-gray-900 dark:text-white">
                Push Notification Information
              </p>
              <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                <li>• Works on desktop and mobile browsers</li>
                <li>• Install as PWA for best notification experience</li>
                <li>• Notifications appear even when the browser is closed</li>
                <li>• Click notifications to open the app directly</li>
                <li>• No SMS charges - completely free push notifications</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
