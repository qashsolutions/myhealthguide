'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AIFeaturesConsentDialog } from '@/components/ai/AIFeaturesConsentDialog';
import { Sparkles, TrendingUp, Clock, FileText, Shield, AlertCircle, CheckCircle } from 'lucide-react';
import { AIFeatureSettings } from '@/types';

interface AIFeaturesSettingsProps {
  groupId: string;
  currentSettings?: AIFeatureSettings;
  onSave: (settings: AIFeatureSettings) => Promise<void>;
  isAdmin: boolean;
}

export function AIFeaturesSettings({
  groupId,
  currentSettings,
  onSave,
  isAdmin
}: AIFeaturesSettingsProps) {
  const [showConsentDialog, setShowConsentDialog] = useState(false);
  const [settings, setSettings] = useState<AIFeatureSettings>(
    currentSettings || {
      enabled: false,
      consent: {
        granted: false
      },
      features: {
        healthChangeDetection: {
          enabled: true,
          sensitivity: 'medium'
        },
        medicationTimeOptimization: {
          enabled: true,
          autoSuggest: true
        },
        weeklySummary: {
          enabled: false,
          recipients: [],
          schedule: 'sunday'
        },
        doctorVisitPrep: {
          enabled: true
        }
      }
    }
  );
  const [saving, setSaving] = useState(false);

  const handleEnableAI = () => {
    if (!settings.consent.granted) {
      setShowConsentDialog(true);
    } else {
      // Already consented, just toggle master switch
      handleSave({ ...settings, enabled: !settings.enabled });
    }
  };

  const handleConsent = async () => {
    const updatedSettings: AIFeatureSettings = {
      ...settings,
      enabled: true,
      consent: {
        granted: true,
        grantedAt: new Date(),
        grantedBy: groupId // This should be user ID in real implementation
      }
    };
    setSettings(updatedSettings);
    setShowConsentDialog(false);
    await handleSave(updatedSettings);
  };

  const handleDecline = () => {
    setShowConsentDialog(false);
  };

  const handleSave = async (updatedSettings: AIFeatureSettings) => {
    setSaving(true);
    try {
      await onSave(updatedSettings);
      setSettings(updatedSettings);
    } catch (error) {
      console.error('Error saving AI settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const updateFeature = (featurePath: string, value: any) => {
    const newSettings = { ...settings };
    const keys = featurePath.split('.');
    let current: any = newSettings.features;

    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;

    handleSave(newSettings);
  };

  if (!isAdmin) {
    return (
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertTitle>Admin Access Required</AlertTitle>
        <AlertDescription>
          Only group administrators can manage AI feature settings.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            AI-Powered Caregiver Intelligence
          </CardTitle>
          <CardDescription>
            Enable advanced AI features that provide proactive health insights and save time
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Master Toggle */}
          <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Label htmlFor="ai-master" className="text-base font-semibold cursor-pointer">
                  Enable AI Features
                </Label>
                {settings.consent.granted && (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                )}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {settings.consent.granted
                  ? `Consent granted ${settings.consent.grantedAt ? new Date(settings.consent.grantedAt).toLocaleDateString() : ''}`
                  : 'Requires consent to enable AI-powered insights'}
              </p>
            </div>
            <Switch
              id="ai-master"
              checked={settings.enabled}
              onCheckedChange={handleEnableAI}
              disabled={saving}
            />
          </div>

          {/* Show features only if consent granted */}
          {settings.consent.granted ? (
            <div className="space-y-6">
              {/* Health Change Detection */}
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <TrendingUp className="w-5 h-5 text-blue-600 mt-1" />
                    <div>
                      <Label htmlFor="health-change" className="text-base font-medium cursor-pointer">
                        Health Change Detection
                      </Label>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Get alerts when significant changes in health patterns are detected
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="health-change"
                    checked={settings.features.healthChangeDetection.enabled}
                    onCheckedChange={(checked) => updateFeature('healthChangeDetection.enabled', checked)}
                    disabled={!settings.enabled || saving}
                  />
                </div>

                {settings.features.healthChangeDetection.enabled && (
                  <div className="ml-8 space-y-2">
                    <Label htmlFor="sensitivity" className="text-sm">
                      Alert Sensitivity
                    </Label>
                    <Select
                      value={settings.features.healthChangeDetection.sensitivity}
                      onValueChange={(value) => updateFeature('healthChangeDetection.sensitivity', value)}
                      disabled={!settings.enabled}
                    >
                      <SelectTrigger className="w-64">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low (35%+ change)</SelectItem>
                        <SelectItem value="medium">Medium (25%+ change)</SelectItem>
                        <SelectItem value="high">High (15%+ change)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">
                      Higher sensitivity = more frequent alerts for smaller changes
                    </p>
                  </div>
                )}
              </div>

              {/* Medication Time Optimization */}
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <Clock className="w-5 h-5 text-purple-600 mt-1" />
                    <div>
                      <Label htmlFor="med-optimization" className="text-base font-medium cursor-pointer">
                        Medication Time Optimization
                      </Label>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Analyze missed doses and suggest better medication times
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="med-optimization"
                    checked={settings.features.medicationTimeOptimization.enabled}
                    onCheckedChange={(checked) => updateFeature('medicationTimeOptimization.enabled', checked)}
                    disabled={!settings.enabled || saving}
                  />
                </div>

                {settings.features.medicationTimeOptimization.enabled && (
                  <div className="ml-8 flex items-center space-x-2">
                    <Switch
                      id="auto-suggest"
                      checked={settings.features.medicationTimeOptimization.autoSuggest}
                      onCheckedChange={(checked) => updateFeature('medicationTimeOptimization.autoSuggest', checked)}
                      disabled={!settings.enabled}
                    />
                    <Label htmlFor="auto-suggest" className="text-sm cursor-pointer">
                      Show suggestions automatically on insights page
                    </Label>
                  </div>
                )}
              </div>

              {/* Weekly Summary */}
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <FileText className="w-5 h-5 text-green-600 mt-1" />
                    <div>
                      <Label htmlFor="weekly-summary" className="text-base font-medium cursor-pointer">
                        Weekly Summary Reports
                      </Label>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Generate comprehensive weekly health summaries
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="weekly-summary"
                    checked={settings.features.weeklySummary.enabled}
                    onCheckedChange={(checked) => updateFeature('weeklySummary.enabled', checked)}
                    disabled={!settings.enabled || saving}
                  />
                </div>

                {settings.features.weeklySummary.enabled && (
                  <div className="ml-8 space-y-2">
                    <Label htmlFor="schedule" className="text-sm">
                      Send Summary On
                    </Label>
                    <Select
                      value={settings.features.weeklySummary.schedule}
                      onValueChange={(value) => updateFeature('weeklySummary.schedule', value)}
                      disabled={!settings.enabled}
                    >
                      <SelectTrigger className="w-64">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sunday">Sunday Evening</SelectItem>
                        <SelectItem value="monday">Monday Morning</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Doctor Visit Prep */}
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <FileText className="w-5 h-5 text-orange-600 mt-1" />
                  <div>
                    <Label htmlFor="doctor-prep" className="text-base font-medium cursor-pointer">
                      Doctor Visit Preparation
                    </Label>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Generate printable reports for doctor appointments
                    </p>
                  </div>
                </div>
                <Switch
                  id="doctor-prep"
                  checked={settings.features.doctorVisitPrep.enabled}
                  onCheckedChange={(checked) => updateFeature('doctorVisitPrep.enabled', checked)}
                  disabled={!settings.enabled || saving}
                />
              </div>

              {/* Info Alert */}
              <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800 dark:text-blue-200 text-sm">
                  Changes are saved automatically. AI features will respect your selections when
                  generating insights. You can modify these settings anytime.
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertTitle>Consent Required</AlertTitle>
              <AlertDescription>
                Enable the master AI features toggle above to review and consent to AI-powered insights.
                You'll see detailed information about each feature and how your data is used.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Consent Dialog */}
      <AIFeaturesConsentDialog
        open={showConsentDialog}
        onConsent={handleConsent}
        onDecline={handleDecline}
      />
    </>
  );
}
