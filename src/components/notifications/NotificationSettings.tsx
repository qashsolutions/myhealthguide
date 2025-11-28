'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { NotificationPreferences, NotificationType } from '@/types';
import { NotificationService } from '@/lib/firebase/notifications';
import { useAuth } from '@/contexts/AuthContext';
import { Bell, Plus, X, Check, MessageSquare, User } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface NotificationSettingsProps {
  groupId: string;
}

/**
 * Format phone number to E.164 format (+1XXXXXXXXXX)
 * Accepts: 10 digits, or +1 followed by 10 digits
 */
function formatPhoneE164(phone: string): string | null {
  // Remove all non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, '');

  // Extract just the digits
  const digitsOnly = cleaned.replace(/\D/g, '');

  // Handle different formats
  if (digitsOnly.length === 10) {
    // 10 digits - add +1
    return `+1${digitsOnly}`;
  } else if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
    // 11 digits starting with 1 - add +
    return `+${digitsOnly}`;
  } else if (cleaned.startsWith('+1') && digitsOnly.length === 11) {
    // Already in +1XXXXXXXXXX format
    return `+${digitsOnly}`;
  }

  return null; // Invalid format
}

/**
 * Check if string is a valid E.164 phone number
 */
function isValidE164(phone: string): boolean {
  // E.164 format: +1 followed by 10 digits
  const cleaned = phone.replace(/[^\d+]/g, '');
  return /^\+1\d{10}$/.test(cleaned);
}

/**
 * Display phone number in user-friendly obfuscated format
 * +14692039202 -> (***) ***-9202
 * Shows only last 4 digits for privacy
 */
function formatPhoneDisplay(phone: string, obfuscate: boolean = true): string {
  // Check if this looks like a hash (not a valid phone number)
  if (!isValidE164(phone)) {
    return '***-***-****'; // Invalid/hash value
  }

  const cleaned = phone.replace(/\D/g, '');
  // Remove leading 1 if present
  const digits = cleaned.startsWith('1') && cleaned.length === 11
    ? cleaned.slice(1)
    : cleaned;

  if (digits.length === 10) {
    if (obfuscate) {
      // Show only last 4 digits: (***) ***-1234
      return `(***) ***-${digits.slice(6)}`;
    }
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return '***-***-****';
}

/**
 * Get max recipients based on subscription tier
 */
function getMaxRecipients(subscriptionTier: string | null | undefined): number {
  switch (subscriptionTier) {
    case 'multi_agency':
      return 10; // SuperAdmin + caregivers + additional
    case 'single_agency':
      return 4; // Admin + 3 more
    case 'family':
    default:
      return 2; // Admin + 1 more
  }
}

export function NotificationSettings({ groupId }: NotificationSettingsProps) {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    enabled: false,
    frequency: 'realtime',
    types: []
  });
  const [recipients, setRecipients] = useState<string[]>([]);
  const [newRecipient, setNewRecipient] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [adminPhoneAdded, setAdminPhoneAdded] = useState(false);

  // Get subscription tier for recipient limits
  const subscriptionTier = user?.subscriptionTier || 'family';
  const maxRecipients = getMaxRecipients(subscriptionTier);

  // Get admin's phone number (E.164 format)
  const adminPhone = user?.phoneNumber ? formatPhoneE164(user.phoneNumber) : null;

  useEffect(() => {
    loadSettings();
  }, [groupId]);

  // Auto-add admin's phone if no recipients and admin has verified phone
  useEffect(() => {
    if (!loading && !adminPhoneAdded && recipients.length === 0 && adminPhone && user?.phoneVerified) {
      // Auto-populate admin's phone as default recipient
      setRecipients([adminPhone]);
      setAdminPhoneAdded(true);
    }
  }, [loading, recipients, adminPhone, adminPhoneAdded, user?.phoneVerified]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(''); // Clear any previous errors

      const [prefs, recips] = await Promise.all([
        NotificationService.getGroupNotificationPreferences(groupId).catch(() => null),
        NotificationService.getNotificationRecipients(groupId).catch(() => [])
      ]);

      if (prefs) {
        setPreferences(prefs);
      }
      // Filter out invalid phone numbers (e.g., old hash values)
      const validRecipients = (recips || []).filter(isValidE164);
      setRecipients(validRecipients);
      // No error shown - empty state is expected for new users
    } catch (err: any) {
      // Only show error for unexpected issues, not for permission denied (new users)
      if (err?.code !== 'permission-denied' && !err?.message?.includes('Missing or insufficient permissions')) {
        console.error('Error loading notification settings:', err);
        setError('Failed to load notification settings');
      }
      // For permission errors, just use defaults (this is expected for new users)
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');

      await Promise.all([
        NotificationService.updateGroupNotificationPreferences(groupId, preferences),
        NotificationService.updateNotificationRecipients(groupId, recipients)
      ]);

      setSuccess('Notification settings saved successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error saving settings:', err);
      setError('Failed to save notification settings');
    } finally {
      setSaving(false);
    }
  };

  const addRecipient = () => {
    const trimmed = newRecipient.trim();

    if (!trimmed) {
      setError('Please enter a phone number');
      return;
    }

    // Validate and format to E.164
    const formattedPhone = formatPhoneE164(trimmed);
    if (!formattedPhone) {
      setError('Please enter a valid 10-digit US phone number');
      return;
    }

    if (recipients.includes(formattedPhone)) {
      setError('This phone number is already added');
      return;
    }

    if (recipients.length >= maxRecipients) {
      setError(`Maximum ${maxRecipients} recipients allowed for your plan`);
      return;
    }

    setRecipients([...recipients, formattedPhone]);
    setNewRecipient('');
    setError('');
  };

  const removeRecipient = (phone: string) => {
    setRecipients(recipients.filter(r => r !== phone));
  };

  const toggleNotificationType = (type: NotificationType) => {
    setPreferences(prev => ({
      ...prev,
      types: prev.types.includes(type)
        ? prev.types.filter(t => t !== type)
        : [...prev.types, type]
    }));
  };

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

      {/* Notification Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            SMS Notifications
          </CardTitle>
          <CardDescription>
            Receive text message alerts for important care events
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Enable SMS Notifications</Label>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Receive text alerts for missed doses and important events
              </p>
            </div>
            <button
              onClick={() => setPreferences(prev => ({ ...prev, enabled: !prev.enabled }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.enabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Notification Recipients */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            SMS Recipients
          </CardTitle>
          <CardDescription>
            Add US phone numbers to receive SMS notifications (max {maxRecipients} for your plan)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add Recipient */}
          <div className="flex gap-2">
            <div className="flex flex-1">
              <div className="flex items-center px-3 bg-gray-100 dark:bg-gray-800 border border-r-0 rounded-l-md border-gray-300 dark:border-gray-600">
                <span className="text-gray-600 dark:text-gray-400 text-sm font-medium">+1</span>
              </div>
              <Input
                value={newRecipient}
                onChange={(e) => {
                  // Only allow digits, limit to 10 characters
                  const cleaned = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setNewRecipient(cleaned);
                }}
                placeholder="(555) 123-4567"
                onKeyPress={(e) => e.key === 'Enter' && addRecipient()}
                disabled={recipients.length >= maxRecipients}
                className="rounded-l-none"
                maxLength={10}
              />
            </div>
            <Button
              onClick={addRecipient}
              disabled={recipients.length >= maxRecipients}
              size="icon"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Enter 10-digit US phone number
          </p>

          {/* Recipients List */}
          {recipients.length > 0 && (
            <div className="space-y-2">
              {recipients.map((phone, idx) => {
                const isAdminPhone = phone === adminPhone;
                return (
                  <div
                    key={phone}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {isAdminPhone ? (
                        <User className="w-4 h-4 text-blue-500" />
                      ) : (
                        <MessageSquare className="w-4 h-4 text-gray-500" />
                      )}
                      <span className="font-medium">+1 {formatPhoneDisplay(phone)}</span>
                      {idx === 0 && (
                        <Badge variant="outline">Primary</Badge>
                      )}
                      {isAdminPhone && (
                        <Badge variant="secondary" className="text-xs">You</Badge>
                      )}
                    </div>
                    <button
                      onClick={() => removeRecipient(phone)}
                      className="text-gray-500 hover:text-red-600"
                      title={isAdminPhone ? "Remove your number" : "Remove recipient"}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {recipients.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              No recipients added yet. Add a phone number to start receiving SMS alerts.
            </p>
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
        <Button onClick={handleSave} disabled={saving || recipients.length === 0}>
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
                SMS Notification Information
              </p>
              <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                <li>• Standard SMS rates may apply</li>
                <li>• Maximum {maxRecipients} recipients for your {subscriptionTier === 'multi_agency' ? 'Multi-Agency' : subscriptionTier === 'single_agency' ? 'Single Agency' : 'Family'} plan</li>
                <li>• US phone numbers only (+1 country code)</li>
                <li>• Reply TAKEN/MISSED/SKIP to confirm medication status</li>
                <li>• Reply HELP for list of SMS commands</li>
                <li>• Messages are brief and crisp, containing only essential information</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
