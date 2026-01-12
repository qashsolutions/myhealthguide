'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Bell, BellOff, Clock, Mail, MessageSquare, Smartphone, Save, RefreshCw } from 'lucide-react';
import {
  getUserAlertPreferences,
  updateMedicationRefillPreferences,
  updateEmergencyAlertPreferences,
  updateShiftHandoffPreferences,
  updateAppointmentReminderPreferences,
  updateNotificationChannels,
  updateDigestMode,
  resetAlertPreferencesToDefaults
} from '@/lib/ai/userAlertPreferences';
import type { UserAlertPreferences } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

export function AlertPreferencesSettings() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserAlertPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const userId = user?.id || '';

  // Check if user is an agency caregiver (has agency membership but is not super_admin)
  const userAgencyMembership = user?.agencies?.[0];
  const isAgencyCaregiverUser = userAgencyMembership?.role === 'caregiver' || userAgencyMembership?.role === 'caregiver_admin' || userAgencyMembership?.role === 'family_member';

  // For agency caregivers, use their assigned group; for others, use regular group membership
  const groupId = isAgencyCaregiverUser
    ? (userAgencyMembership?.assignedGroupIds?.[0] || '')
    : (user?.groups?.[0]?.groupId || '');

  useEffect(() => {
    if (userId && groupId) {
      loadPreferences();
    } else if (userId && !groupId) {
      // No group - stop loading and show content with defaults or empty state
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, groupId]);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const prefs = await getUserAlertPreferences(userId, groupId);
      setPreferences(prefs);
    } catch (error) {
      console.error('Error loading preferences:', error);
      setSaveMessage({ type: 'error', text: 'Failed to load alert preferences' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!preferences || !userId || !groupId) return;

    try {
      setSaving(true);
      setSaveMessage(null);

      // Save all preference sections
      await Promise.all([
        updateMedicationRefillPreferences(userId, groupId, preferences.preferences.medicationRefillAlerts),
        updateEmergencyAlertPreferences(userId, groupId, preferences.preferences.emergencyAlerts),
        updateShiftHandoffPreferences(userId, groupId, preferences.preferences.shiftHandoffAlerts),
        updateAppointmentReminderPreferences(userId, groupId, preferences.preferences.appointmentReminders),
        updateNotificationChannels(userId, groupId, preferences.preferences.notificationChannels),
        updateDigestMode(userId, groupId, preferences.preferences.digestMode)
      ]);

      setSaveMessage({ type: 'success', text: 'Alert preferences saved successfully!' });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error('Error saving preferences:', error);
      setSaveMessage({ type: 'error', text: 'Failed to save preferences' });
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefaults = async () => {
    if (!userId || !groupId) return;

    const confirmed = confirm('Reset all alert preferences to defaults?');
    if (!confirmed) return;

    try {
      setSaving(true);
      await resetAlertPreferencesToDefaults(userId, groupId);
      await loadPreferences();
      setSaveMessage({ type: 'success', text: 'Reset to defaults successfully!' });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error('Error resetting preferences:', error);
      setSaveMessage({ type: 'error', text: 'Failed to reset preferences' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Loading alert preferences...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!preferences) {
    return (
      <Card>
        <CardContent className="py-8">
          <Alert className="bg-red-50 dark:bg-red-900/20">
            <AlertDescription>Failed to load alert preferences</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Save Message */}
      {saveMessage && (
        <Alert className={saveMessage.type === 'success' ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}>
          <AlertDescription className={saveMessage.type === 'success' ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}>
            {saveMessage.text}
          </AlertDescription>
        </Alert>
      )}

      {/* Notification Channels */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notification Channels
          </CardTitle>
          <CardDescription>
            Choose how you want to receive alerts (severity will determine which channels are used)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Smartphone className="w-5 h-5 text-blue-600" />
              <div>
                <Label className="font-medium">Dashboard Notifications</Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Always enabled - shows alerts on insights page
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.preferences.notificationChannels.dashboard}
              onCheckedChange={(checked) => {
                setPreferences({
                  ...preferences,
                  preferences: {
                    ...preferences.preferences,
                    notificationChannels: {
                      ...preferences.preferences.notificationChannels,
                      dashboard: checked
                    }
                  }
                });
              }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-purple-600" />
              <div>
                <Label className="font-medium">Push Notifications</Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Browser/mobile push for warning and critical alerts
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.preferences.notificationChannels.push}
              onCheckedChange={(checked) => {
                setPreferences({
                  ...preferences,
                  preferences: {
                    ...preferences.preferences,
                    notificationChannels: {
                      ...preferences.preferences.notificationChannels,
                      push: checked
                    }
                  }
                });
              }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-green-600" />
              <div>
                <Label className="font-medium">SMS Notifications</Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Via Twilio - warning and critical alerts sent to your phone
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.preferences.notificationChannels.sms}
              onCheckedChange={(checked) => {
                setPreferences({
                  ...preferences,
                  preferences: {
                    ...preferences.preferences,
                    notificationChannels: {
                      ...preferences.preferences.notificationChannels,
                      sms: checked
                    }
                  }
                });
              }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-orange-600" />
              <div>
                <Label className="font-medium">Email Notifications</Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Requires Firebase Extension (not currently configured)
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.preferences.notificationChannels.email}
              disabled
              onCheckedChange={(checked) => {
                setPreferences({
                  ...preferences,
                  preferences: {
                    ...preferences.preferences,
                    notificationChannels: {
                      ...preferences.preferences.notificationChannels,
                      email: checked
                    }
                  }
                });
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Medication Refill Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>💊 Medication Refill Alerts</CardTitle>
          <CardDescription>
            AI-powered predictions based on actual usage patterns
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Enable Refill Alerts</Label>
            <Switch
              checked={preferences.preferences.medicationRefillAlerts.enabled}
              onCheckedChange={(checked) => {
                setPreferences({
                  ...preferences,
                  preferences: {
                    ...preferences.preferences,
                    medicationRefillAlerts: {
                      ...preferences.preferences.medicationRefillAlerts,
                      enabled: checked
                    }
                  }
                });
              }}
            />
          </div>

          {preferences.preferences.medicationRefillAlerts.enabled && (
            <>
              <div className="space-y-2">
                <Label>Alert When Supply Drops Below (days)</Label>
                <Input
                  type="number"
                  min={1}
                  max={30}
                  value={preferences.preferences.medicationRefillAlerts.thresholdDays}
                  onChange={(e) => {
                    setPreferences({
                      ...preferences,
                      preferences: {
                        ...preferences.preferences,
                        medicationRefillAlerts: {
                          ...preferences.preferences.medicationRefillAlerts,
                          thresholdDays: parseInt(e.target.value) || 7
                        }
                      }
                    });
                  }}
                  className="w-32"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Default: 7 days. You&apos;ll be alerted when medication supply drops below this threshold.
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Emergency Pattern Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>⚠️  Emergency Pattern Detection</CardTitle>
          <CardDescription>
            Multi-factor health risk scoring (0-15 points)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Enable Emergency Detection</Label>
            <Switch
              checked={preferences.preferences.emergencyAlerts.enabled}
              onCheckedChange={(checked) => {
                setPreferences({
                  ...preferences,
                  preferences: {
                    ...preferences.preferences,
                    emergencyAlerts: {
                      ...preferences.preferences.emergencyAlerts,
                      enabled: checked
                    }
                  }
                });
              }}
            />
          </div>

          {preferences.preferences.emergencyAlerts.enabled && (
            <>
              <div className="space-y-2">
                <Label>Sensitivity Level</Label>
                <select
                  value={preferences.preferences.emergencyAlerts.sensitivity}
                  onChange={(e) => {
                    setPreferences({
                      ...preferences,
                      preferences: {
                        ...preferences.preferences,
                        emergencyAlerts: {
                          ...preferences.preferences.emergencyAlerts,
                          sensitivity: e.target.value as 'low' | 'medium' | 'high'
                        }
                      }
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md"
                >
                  <option value="high">High (more alerts, earlier detection)</option>
                  <option value="medium">Medium (balanced)</option>
                  <option value="low">Low (fewer alerts, only severe patterns)</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Minimum Risk Score to Alert</Label>
                <Input
                  type="number"
                  min={1}
                  max={15}
                  value={preferences.preferences.emergencyAlerts.minimumRiskScore}
                  onChange={(e) => {
                    setPreferences({
                      ...preferences,
                      preferences: {
                        ...preferences.preferences,
                        emergencyAlerts: {
                          ...preferences.preferences.emergencyAlerts,
                          minimumRiskScore: parseInt(e.target.value) || 8
                        }
                      }
                    });
                  }}
                  className="w-32"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Default: 8/15. Lower = more alerts, Higher = only severe emergencies.
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Require Multiple Factors</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Only alert if 2+ concerning patterns detected (reduces false positives)
                  </p>
                </div>
                <Switch
                  checked={preferences.preferences.emergencyAlerts.requireMultipleFactors}
                  onCheckedChange={(checked) => {
                    setPreferences({
                      ...preferences,
                      preferences: {
                        ...preferences.preferences,
                        emergencyAlerts: {
                          ...preferences.preferences.emergencyAlerts,
                          requireMultipleFactors: checked
                        }
                      }
                    });
                  }}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Quiet Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Quiet Hours
          </CardTitle>
          <CardDescription>
            Suppress non-critical alerts during these hours (critical alerts will always be delivered)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {preferences.preferences.medicationRefillAlerts.quietHours ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Input
                    type="time"
                    value={preferences.preferences.medicationRefillAlerts.quietHours.start}
                    onChange={(e) => {
                      setPreferences({
                        ...preferences,
                        preferences: {
                          ...preferences.preferences,
                          medicationRefillAlerts: {
                            ...preferences.preferences.medicationRefillAlerts,
                            quietHours: {
                              ...preferences.preferences.medicationRefillAlerts.quietHours!,
                              start: e.target.value
                            }
                          }
                        }
                      });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <Input
                    type="time"
                    value={preferences.preferences.medicationRefillAlerts.quietHours.end}
                    onChange={(e) => {
                      setPreferences({
                        ...preferences,
                        preferences: {
                          ...preferences.preferences,
                          medicationRefillAlerts: {
                            ...preferences.preferences.medicationRefillAlerts,
                            quietHours: {
                              ...preferences.preferences.medicationRefillAlerts.quietHours!,
                              end: e.target.value
                            }
                          }
                        }
                      });
                    }}
                  />
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPreferences({
                    ...preferences,
                    preferences: {
                      ...preferences.preferences,
                      medicationRefillAlerts: {
                        ...preferences.preferences.medicationRefillAlerts,
                        quietHours: undefined
                      }
                    }
                  });
                }}
              >
                <BellOff className="w-4 h-4 mr-2" />
                Disable Quiet Hours
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={() => {
                setPreferences({
                  ...preferences,
                  preferences: {
                    ...preferences.preferences,
                    medicationRefillAlerts: {
                      ...preferences.preferences.medicationRefillAlerts,
                      quietHours: {
                        start: '22:00',
                        end: '07:00'
                      }
                    }
                  }
                });
              }}
            >
              <Clock className="w-4 h-4 mr-2" />
              Enable Quiet Hours (10 PM - 7 AM)
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Digest Mode */}
      <Card>
        <CardHeader>
          <CardTitle>📬 Digest Mode</CardTitle>
          <CardDescription>
            Batch non-urgent alerts and deliver once per day
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Digest Mode</Label>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Critical and high priority alerts will still be delivered immediately
              </p>
            </div>
            <Switch
              checked={preferences.preferences.digestMode.enabled}
              onCheckedChange={(checked) => {
                setPreferences({
                  ...preferences,
                  preferences: {
                    ...preferences.preferences,
                    digestMode: {
                      ...preferences.preferences.digestMode,
                      enabled: checked
                    }
                  }
                });
              }}
            />
          </div>

          {preferences.preferences.digestMode.enabled && (
            <div className="space-y-2">
              <Label>Delivery Time</Label>
              <Input
                type="time"
                value={preferences.preferences.digestMode.deliveryTime}
                onChange={(e) => {
                  setPreferences({
                    ...preferences,
                    preferences: {
                      ...preferences.preferences,
                      digestMode: {
                        ...preferences.preferences.digestMode,
                        deliveryTime: e.target.value
                      }
                    }
                  });
                }}
                className="w-48"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Daily summary will be sent at this time
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Actions */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handleResetToDefaults}
          disabled={saving}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Reset to Defaults
        </Button>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="gap-2"
        >
          {saving ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Preferences
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
