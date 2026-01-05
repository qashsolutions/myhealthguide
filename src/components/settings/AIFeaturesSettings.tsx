'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { UnifiedAIConsentDialog } from '@/components/consent/UnifiedAIConsentDialog';
import { Sparkles, TrendingUp, Clock, FileText, Shield, AlertCircle, CheckCircle, RefreshCw, ThumbsUp, MessageSquareText, Brain, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { AIFeatureSettings } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import {
  checkUnifiedConsent,
  revokeUnifiedConsent,
  getConsentExpiryWarning,
  UnifiedAIConsent
} from '@/lib/consent/unifiedConsentManagement';
import { getUserPreferences, updateManualPreferences, learnUserPreferences } from '@/lib/engagement/preferenceLearner';
import { getPersonalizationSummary, formatPersonalizationForDisplay } from '@/lib/ai/personalizedPrompting';
import type { UserSmartPreferences, VerbosityLevel, TerminologyLevel } from '@/types/engagement';

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
  const { user } = useAuth();
  const [showConsentDialog, setShowConsentDialog] = useState(false);
  const [consent, setConsent] = useState<UnifiedAIConsent | null>(null);
  const [consentValid, setConsentValid] = useState(false);
  const [checkingConsent, setCheckingConsent] = useState(true);
  const [expiryWarning, setExpiryWarning] = useState<{ warning: boolean; daysRemaining: number; message: string } | null>(null);

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
        },
        medicationRefillAlerts: {
          enabled: true,
          defaultThresholdDays: 7
        },
        shiftHandoffNotes: {
          enabled: true,
          autoGenerate: true
        },
        emergencyPatternDetection: {
          enabled: true,
          sensitivity: 'medium'
        }
      }
    }
  );
  const [saving, setSaving] = useState(false);

  // Personalization state
  const [preferences, setPreferences] = useState<UserSmartPreferences | null>(null);
  const [personalizationSummary, setPersonalizationSummary] = useState<Awaited<ReturnType<typeof getPersonalizationSummary>> | null>(null);
  const [loadingPreferences, setLoadingPreferences] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [relearning, setRelearning] = useState(false);

  // Check for existing unified consent on mount
  useEffect(() => {
    if (!user?.id || !groupId) return;

    checkExistingConsent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, groupId]);

  // Load personalization preferences when consent is valid
  useEffect(() => {
    if (!user?.id || !consentValid) return;

    loadPreferences();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, consentValid]);

  const loadPreferences = async () => {
    if (!user?.id) return;

    setLoadingPreferences(true);
    try {
      const prefs = await getUserPreferences(user.id);
      setPreferences(prefs);

      const summary = await getPersonalizationSummary(user.id);
      setPersonalizationSummary(summary);
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoadingPreferences(false);
    }
  };

  const handleToggleAutoLearn = async (enabled: boolean) => {
    if (!user?.id) return;

    setSavingPreferences(true);
    try {
      await updateManualPreferences(user.id, {
        manualOverride: !enabled, // When auto-learn is ON, manual override is OFF
      });
      await loadPreferences();
    } catch (error) {
      console.error('Error updating auto-learn:', error);
    } finally {
      setSavingPreferences(false);
    }
  };

  const handleVerbosityChange = async (value: VerbosityLevel) => {
    if (!user?.id) return;

    setSavingPreferences(true);
    try {
      await updateManualPreferences(user.id, {
        manualOverride: true,
        manualVerbosity: value,
      });
      await loadPreferences();
    } catch (error) {
      console.error('Error updating verbosity:', error);
    } finally {
      setSavingPreferences(false);
    }
  };

  const handleTerminologyChange = async (value: TerminologyLevel) => {
    if (!user?.id) return;

    setSavingPreferences(true);
    try {
      await updateManualPreferences(user.id, {
        manualOverride: true,
        manualTerminology: value,
      });
      await loadPreferences();
    } catch (error) {
      console.error('Error updating terminology:', error);
    } finally {
      setSavingPreferences(false);
    }
  };

  const handleRelearn = async () => {
    if (!user?.id) return;

    setRelearning(true);
    try {
      await learnUserPreferences(user.id);
      await loadPreferences();
    } catch (error) {
      console.error('Error relearning preferences:', error);
    } finally {
      setRelearning(false);
    }
  };

  const checkExistingConsent = async () => {
    if (!user?.id) return;

    setCheckingConsent(true);
    try {
      const { valid, consent: existingConsent } = await checkUnifiedConsent(user.id, groupId);

      setConsentValid(valid);
      setConsent(existingConsent);

      if (valid && existingConsent) {
        // Consent exists - update settings to reflect this
        const updatedSettings: AIFeatureSettings = {
          ...settings,
          enabled: true,
          consent: {
            granted: true,
            grantedAt: existingConsent.consentedAt,
            grantedBy: user.id
          }
        };
        setSettings(updatedSettings);

        // Check for expiry warning
        const warning = getConsentExpiryWarning(existingConsent);
        setExpiryWarning(warning);
      }
    } catch (error) {
      console.error('Error checking consent:', error);
    } finally {
      setCheckingConsent(false);
    }
  };

  const handleEnableAI = () => {
    if (!consentValid) {
      setShowConsentDialog(true);
    } else {
      // Already consented, just toggle master switch
      handleSave({ ...settings, enabled: !settings.enabled });
    }
  };

  const handleConsentComplete = async () => {
    setShowConsentDialog(false);

    // Re-check consent after it's been granted
    await checkExistingConsent();

    // Enable AI features
    const updatedSettings: AIFeatureSettings = {
      ...settings,
      enabled: true,
      consent: {
        granted: true,
        grantedAt: new Date(),
        grantedBy: user?.id || groupId
      }
    };
    setSettings(updatedSettings);
    await handleSave(updatedSettings);
  };

  const handleDecline = () => {
    setShowConsentDialog(false);
  };

  const handleRevokeConsent = async () => {
    if (!consent?.id) return;

    if (!confirm('Are you sure you want to revoke consent? This will disable all smart features.')) {
      return;
    }

    try {
      await revokeUnifiedConsent(consent.id, 'User revoked from settings');

      // Update local state
      setConsentValid(false);
      setConsent(null);

      const updatedSettings: AIFeatureSettings = {
        ...settings,
        enabled: false,
        consent: {
          granted: false
        }
      };
      setSettings(updatedSettings);
      await handleSave(updatedSettings);
    } catch (error) {
      console.error('Error revoking consent:', error);
    }
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
        <AlertTitle>Owner Access Required</AlertTitle>
        <AlertDescription>
          Only the group owner can manage smart feature settings.
        </AlertDescription>
      </Alert>
    );
  }

  if (checkingConsent) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            Smart Caregiver Features
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mr-2" />
            <span className="text-gray-600 dark:text-gray-400">Checking consent status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            Smart Caregiver Features
          </CardTitle>
          <CardDescription>
            Enable smart features that provide proactive health insights and save time
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Expiry Warning */}
          {expiryWarning && (
            <Alert className="bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                {expiryWarning.message}
                {expiryWarning.daysRemaining === 0 && (
                  <Button
                    size="sm"
                    className="ml-2"
                    onClick={() => setShowConsentDialog(true)}
                  >
                    Re-consent Now
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Master Toggle */}
          <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Label htmlFor="ai-master" className="text-base font-semibold cursor-pointer">
                  Enable Smart Features
                </Label>
                {consentValid && (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                )}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {consentValid && consent
                  ? `Consent granted ${consent.consentedAt ? new Date(consent.consentedAt).toLocaleDateString() : ''}`
                  : 'Requires consent to enable smart insights'}
              </p>
            </div>
            <Switch
              id="ai-master"
              checked={settings.enabled && consentValid}
              onCheckedChange={handleEnableAI}
              disabled={saving}
            />
          </div>

          {/* Show features only if consent valid */}
          {consentValid ? (
            <div className="space-y-4">
              {/* Health Change Detection */}
              <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <TrendingUp className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    <div className="min-w-0">
                      <Label htmlFor="health-change" className="text-base font-medium cursor-pointer">
                        Health Change Detection
                      </Label>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Get alerts when significant changes in health patterns are detected
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="health-change"
                    checked={settings.features.healthChangeDetection.enabled}
                    onCheckedChange={(checked) => updateFeature('healthChangeDetection.enabled', checked)}
                    disabled={!settings.enabled || saving}
                    className="flex-shrink-0 ml-4"
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
              <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Clock className="w-5 h-5 text-purple-600 flex-shrink-0" />
                    <div className="min-w-0">
                      <Label htmlFor="med-optimization" className="text-base font-medium cursor-pointer">
                        Medication Time Optimization
                      </Label>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Analyze missed doses and suggest better medication times
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="med-optimization"
                    checked={settings.features.medicationTimeOptimization.enabled}
                    onCheckedChange={(checked) => updateFeature('medicationTimeOptimization.enabled', checked)}
                    disabled={!settings.enabled || saving}
                    className="flex-shrink-0 ml-4"
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
              <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <FileText className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <div className="min-w-0">
                      <Label htmlFor="weekly-summary" className="text-base font-medium cursor-pointer">
                        Weekly Summary Reports
                      </Label>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Generate comprehensive weekly health summaries
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="weekly-summary"
                    checked={settings.features.weeklySummary.enabled}
                    onCheckedChange={(checked) => updateFeature('weeklySummary.enabled', checked)}
                    disabled={!settings.enabled || saving}
                    className="flex-shrink-0 ml-4"
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
              <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <FileText className="w-5 h-5 text-orange-600 flex-shrink-0" />
                    <div className="min-w-0">
                      <Label htmlFor="doctor-prep" className="text-base font-medium cursor-pointer">
                        Doctor Visit Preparation
                      </Label>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Generate printable reports for doctor appointments
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="doctor-prep"
                    checked={settings.features.doctorVisitPrep.enabled}
                    onCheckedChange={(checked) => updateFeature('doctorVisitPrep.enabled', checked)}
                    disabled={!settings.enabled || saving}
                    className="flex-shrink-0 ml-4"
                  />
                </div>
              </div>

              {/* Smart Feedback System */}
              <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gradient-to-r from-indigo-50/50 to-purple-50/50 dark:from-indigo-900/10 dark:to-purple-900/10">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex-shrink-0">
                    <MessageSquareText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base font-medium text-gray-900 dark:text-white">
                        Continuous Improvement Feedback
                      </span>
                      <span className="px-2 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 rounded-full">
                        Active
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      Your feedback helps improve smart feature accuracy. Rate responses, mark suggestions as helpful or not, and report corrections across all smart features.
                    </p>
                    <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-1.5">
                        <ThumbsUp className="w-3.5 h-3.5" />
                        <span>Rate AI responses</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Validate suggestions</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Report inaccuracies</span>
                      </div>
                    </div>
                    <div className="mt-3">
                      <Link
                        href="/dashboard/analytics?tab=feedback"
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                      >
                        View your feedback history
                        <span aria-hidden="true">&rarr;</span>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              {/* Personalized Responses */}
              <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gradient-to-r from-emerald-50/50 to-teal-50/50 dark:from-emerald-900/10 dark:to-teal-900/10">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex-shrink-0">
                    <Brain className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base font-medium text-gray-900 dark:text-white">
                        Personalized Responses
                      </span>
                      {personalizationSummary?.isLearning ? (
                        <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 rounded-full">
                          Learning
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 rounded-full">
                          Personalized
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      The system learns from your feedback and usage patterns to personalize responses.
                      {personalizationSummary && (
                        <span className="block mt-1 text-xs">
                          {personalizationSummary.dataPoints} data points analyzed
                        </span>
                      )}
                    </p>

                    {loadingPreferences ? (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading preferences...
                      </div>
                    ) : preferences && personalizationSummary ? (
                      <div className="space-y-4">
                        {/* Auto-learn toggle */}
                        <div className="flex items-center justify-between">
                          <div>
                            <Label htmlFor="auto-learn" className="text-sm font-medium cursor-pointer">
                              Learn automatically
                            </Label>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              System adapts based on your feedback and usage
                            </p>
                          </div>
                          <Switch
                            id="auto-learn"
                            checked={!preferences.manualOverride}
                            onCheckedChange={handleToggleAutoLearn}
                            disabled={savingPreferences}
                          />
                        </div>

                        {/* Manual settings (shown when auto-learn is off) */}
                        {preferences.manualOverride && (
                          <div className="space-y-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                            {/* Verbosity */}
                            <div className="space-y-1.5">
                              <Label htmlFor="verbosity" className="text-sm">
                                Response Style
                              </Label>
                              <Select
                                value={preferences.manualVerbosity || personalizationSummary.verbosity.value}
                                onValueChange={(value) => handleVerbosityChange(value as VerbosityLevel)}
                                disabled={savingPreferences}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="concise">Concise (1-3 sentences)</SelectItem>
                                  <SelectItem value="balanced">Balanced (default)</SelectItem>
                                  <SelectItem value="detailed">Detailed (comprehensive)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Terminology */}
                            <div className="space-y-1.5">
                              <Label htmlFor="terminology" className="text-sm">
                                Language Level
                              </Label>
                              <Select
                                value={preferences.manualTerminology || personalizationSummary.terminology.value}
                                onValueChange={(value) => handleTerminologyChange(value as TerminologyLevel)}
                                disabled={savingPreferences}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="simple">Simple (everyday language)</SelectItem>
                                  <SelectItem value="moderate">Moderate (default)</SelectItem>
                                  <SelectItem value="clinical">Clinical (medical terms)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        )}

                        {/* Current preferences display (when auto-learn is on) */}
                        {!preferences.manualOverride && (
                          <div className="space-y-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                              Current Learned Preferences
                            </p>
                            <div className="grid grid-cols-1 gap-2 text-sm">
                              <div className="flex items-center justify-between py-1.5 px-2 rounded bg-gray-50 dark:bg-gray-800/50">
                                <span className="text-gray-600 dark:text-gray-400">Response Style</span>
                                <span className="font-medium">
                                  {formatPersonalizationForDisplay(personalizationSummary).verbosityLabel}
                                </span>
                              </div>
                              <div className="flex items-center justify-between py-1.5 px-2 rounded bg-gray-50 dark:bg-gray-800/50">
                                <span className="text-gray-600 dark:text-gray-400">Language Level</span>
                                <span className="font-medium">
                                  {formatPersonalizationForDisplay(personalizationSummary).terminologyLabel}
                                </span>
                              </div>
                              {personalizationSummary.focusAreas.value.length > 0 && (
                                <div className="flex items-center justify-between py-1.5 px-2 rounded bg-gray-50 dark:bg-gray-800/50">
                                  <span className="text-gray-600 dark:text-gray-400">Focus Areas</span>
                                  <span className="font-medium capitalize">
                                    {personalizationSummary.focusAreas.value.slice(0, 2).join(', ')}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Re-learn button */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleRelearn}
                              disabled={relearning}
                              className="mt-2"
                            >
                              {relearning ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                  Analyzing...
                                </>
                              ) : (
                                <>
                                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                                  Re-analyze preferences
                                </>
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Consent Management */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Manage Consent
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {consent?.expiresAt && (
                        <>Expires: {new Date(consent.expiresAt).toLocaleDateString()}</>
                      )}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRevokeConsent}
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    Revoke Consent
                  </Button>
                </div>
              </div>

              {/* Info Alert */}
              <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800 dark:text-blue-200 text-sm">
                  Changes are saved automatically. Smart features will respect your selections when
                  generating insights. You can modify these settings anytime.
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertTitle>Consent Required</AlertTitle>
              <AlertDescription>
                Enable the smart features toggle above to review and consent to intelligent insights.
                You&apos;ll see detailed information about each feature and how your data is used.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Unified Consent Dialog */}
      {user && (
        <UnifiedAIConsentDialog
          open={showConsentDialog}
          userId={user.id}
          groupId={groupId}
          onConsent={handleConsentComplete}
          onDecline={handleDecline}
        />
      )}
    </>
  );
}
