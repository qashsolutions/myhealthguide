'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { NotificationPreferences, NotificationType } from '@/types';
import { NotificationService } from '@/lib/firebase/notifications';
import { validatePhoneForSMS } from '@/lib/sms/twilioService';
import { Bell, Plus, X, Check, MessageSquare } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface NotificationSettingsProps {
  groupId: string;
}

export function NotificationSettings({ groupId }: NotificationSettingsProps) {
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

  useEffect(() => {
    loadSettings();
  }, [groupId]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const [prefs, recips] = await Promise.all([
        NotificationService.getGroupNotificationPreferences(groupId),
        NotificationService.getNotificationRecipients(groupId)
      ]);

      if (prefs) {
        setPreferences(prefs);
      }
      setRecipients(recips);
    } catch (err) {
      console.error('Error loading notification settings:', err);
      setError('Failed to load notification settings');
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

    if (!validatePhoneForSMS(trimmed)) {
      setError('Please enter a valid US phone number');
      return;
    }

    if (recipients.includes(trimmed)) {
      setError('This phone number is already added');
      return;
    }

    if (recipients.length >= 2) {
      setError('Maximum 2 recipients allowed (Admin + 1 optional)');
      return;
    }

    setRecipients([...recipients, trimmed]);
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
            Add phone numbers to receive SMS notifications (max 2)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add Recipient */}
          <div className="flex gap-2">
            <Input
              value={newRecipient}
              onChange={(e) => setNewRecipient(e.target.value)}
              placeholder="(555) 123-4567"
              onKeyPress={(e) => e.key === 'Enter' && addRecipient()}
              disabled={recipients.length >= 2}
            />
            <Button
              onClick={addRecipient}
              disabled={recipients.length >= 2}
              size="icon"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* Recipients List */}
          {recipients.length > 0 && (
            <div className="space-y-2">
              {recipients.map((phone, idx) => (
                <div
                  key={phone}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-4 h-4 text-gray-500" />
                    <span className="font-medium">{phone}</span>
                    {idx === 0 && (
                      <Badge variant="outline">Primary</Badge>
                    )}
                  </div>
                  <button
                    onClick={() => removeRecipient(phone)}
                    className="text-gray-500 hover:text-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
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
                <li>• Maximum 2 recipients per group (Admin + 1 optional)</li>
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
