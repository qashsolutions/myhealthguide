'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useElder } from '@/contexts/ElderContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { EmailVerificationGate } from '@/components/auth/EmailVerificationGate';
import { TrialExpirationGate } from '@/components/auth/TrialExpirationGate';
import { UnifiedAIConsentDialog } from '@/components/consent/UnifiedAIConsentDialog';
import {
  Brain,
  Sparkles,
  MessageSquare,
  FileText,
  Zap,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Settings,
  Clock,
  Target,
  HelpCircle
} from 'lucide-react';
import {
  checkUnifiedConsent,
  getConsentExpiryWarning,
  type UnifiedAIConsent
} from '@/lib/consent/unifiedConsentManagement';

/**
 * Health Assistant AI Hub Page
 *
 * Caregiver-friendly landing page for AI features
 * Powered by Google MedGemma (attribution required)
 */
export default function MedGemmaHubPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { selectedElder } = useElder();

  const [consent, setConsent] = useState<UnifiedAIConsent | null>(null);
  const [consentValid, setConsentValid] = useState(false);
  const [showConsentDialog, setShowConsentDialog] = useState(false);
  const [loading, setLoading] = useState(true);

  const groupId = selectedElder?.groupId || user?.groups?.[0]?.groupId;

  useEffect(() => {
    if (!user?.id || !groupId) {
      setLoading(false);
      return;
    }

    checkUnifiedConsent(user.id, groupId).then(({ valid, consent }) => {
      setConsentValid(valid);
      setConsent(consent);
      setLoading(false);
    });
  }, [user?.id, groupId]);

  const handleConsentComplete = async () => {
    if (!user?.id || !groupId) return;

    const { valid, consent: newConsent } = await checkUnifiedConsent(user.id, groupId);
    setConsentValid(valid);
    setConsent(newConsent);
    setShowConsentDialog(false);
  };

  const expiryWarning = consent ? getConsentExpiryWarning(consent) : null;

  return (
    <TrialExpirationGate featureName="Health Assistant AI">
      <EmailVerificationGate featureName="Health Assistant AI">
        <div className="p-6 max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Brain className="h-10 w-10 text-blue-600 dark:text-blue-400" />
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                  Health Assistant
                </h1>
              </div>
              <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl">
                Get answers to your caregiving questions using AI trained on medical knowledge
              </p>
            </div>

            {consentValid && (
              <Button
                variant="outline"
                onClick={() => router.push('/dashboard/settings?tab=ai')}
                className="gap-2"
              >
                <Settings className="w-4 h-4" />
                Settings
              </Button>
            )}
          </div>

          {/* Google Attribution - REQUIRED */}
          <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
            <Sparkles className="h-5 w-5 text-blue-600" />
            <AlertTitle className="text-blue-900 dark:text-blue-100">
              Powered by Google MedGemma
            </AlertTitle>
            <AlertDescription className="text-blue-800 dark:text-blue-200 mt-2">
              This feature uses Google's medical AI technology.{' '}
              <a
                href="https://developers.google.com/health-ai-developer-foundations/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-medium inline-flex items-center gap-1 hover:text-blue-600"
              >
                Terms of Use
                <ExternalLink className="w-3 h-3" />
              </a>
            </AlertDescription>
          </Alert>

          {/* Consent Status */}
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : consentValid ? (
            <>
              {/* Active Consent */}
              <Alert className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <AlertTitle className="text-green-900 dark:text-green-100">
                  Health Assistant is Ready
                </AlertTitle>
                <AlertDescription className="text-green-800 dark:text-green-200">
                  You can now use all AI-powered health features.
                  {consent && (
                    <span className="block mt-1 text-sm">
                      Mode: <strong className="font-semibold">{consent.preferredModel === 'medgemma-4b' ? 'Fast' : 'Accurate'}</strong>
                      {' '}• Valid until: <strong>{consent.expiresAt?.toLocaleDateString()}</strong>
                    </span>
                  )}
                </AlertDescription>
              </Alert>

              {/* Expiry Warning */}
              {expiryWarning && expiryWarning.warning && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-5 w-5" />
                  <AlertTitle>Agreement Expiring Soon</AlertTitle>
                  <AlertDescription>
                    {expiryWarning.message}
                    <Button
                      size="sm"
                      className="mt-2"
                      onClick={() => setShowConsentDialog(true)}
                    >
                      Renew Now
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
            </>
          ) : (
            <Alert className="bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <AlertTitle className="text-yellow-900 dark:text-yellow-100">
                Review Required
              </AlertTitle>
              <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                Please review and accept the terms to use the Health Assistant.
                <Button
                  size="sm"
                  className="mt-2"
                  onClick={() => setShowConsentDialog(true)}
                >
                  Review Terms & Get Started
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* What Can It Do */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              What Can the Health Assistant Do?
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Health Chat */}
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-6 h-6 text-blue-600" />
                    Ask Health Questions
                  </CardTitle>
                  <CardDescription>
                    Get quick answers about medications, schedules, and care
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Try asking:</h4>
                    <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      <li className="flex items-start gap-2">
                        <HelpCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                        "What medications did mom miss this week?"
                      </li>
                      <li className="flex items-start gap-2">
                        <HelpCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                        "When should I give the evening medications?"
                      </li>
                      <li className="flex items-start gap-2">
                        <HelpCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                        "How has blood pressure medication been taken lately?"
                      </li>
                    </ul>
                  </div>

                  <Button
                    className="w-full gap-2"
                    onClick={() => router.push('/dashboard/health-chat')}
                    disabled={!consentValid}
                  >
                    Start Chatting
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>

              {/* Doctor Visit Prep */}
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-6 h-6 text-purple-600" />
                    Prepare for Doctor Visits
                  </CardTitle>
                  <CardDescription>
                    Get a summary ready for the next appointment
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-sm mb-2">The summary includes:</h4>
                    <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        All current medications
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        How well medications are being taken
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        Questions to ask the doctor
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        Print-ready format
                      </li>
                    </ul>
                  </div>

                  <Button
                    className="w-full gap-2"
                    onClick={() => router.push('/dashboard/clinical-notes')}
                    disabled={!consentValid}
                  >
                    Create Visit Summary
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Choose Your Mode */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Choose How the AI Works
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              You can change this anytime in Settings.
            </p>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Accurate Mode */}
              <Card className={`border-2 ${consent?.preferredModel === 'medgemma-27b' || !consent?.preferredModel ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10' : 'border-gray-200 dark:border-gray-700'}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Target className="w-6 h-6 text-blue-600" />
                      Accurate Mode
                    </CardTitle>
                    <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full">
                      Recommended
                    </span>
                  </div>
                  <CardDescription>
                    Takes a bit longer but gives more detailed answers
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      Best for doctor visit summaries
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      More thorough explanations
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      Better for complex questions
                    </li>
                  </ul>
                </CardContent>
              </Card>

              {/* Fast Mode */}
              <Card className={`border-2 ${consent?.preferredModel === 'medgemma-4b' ? 'border-yellow-500 bg-yellow-50/50 dark:bg-yellow-900/10' : 'border-gray-200 dark:border-gray-700'}`}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-6 h-6 text-yellow-600" />
                    Fast Mode
                  </CardTitle>
                  <CardDescription>
                    Quick answers for simple questions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <li className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-yellow-600" />
                      Faster responses
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      Good for quick lookups
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      Simple medication questions
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Important Notice */}
          <Alert variant="destructive" className="border-2">
            <AlertTriangle className="h-5 w-5" />
            <AlertTitle className="text-lg">Important: This is Not Medical Advice</AlertTitle>
            <AlertDescription className="space-y-2 text-sm">
              <p>
                The Health Assistant helps you organize information and ask questions, but it <strong>cannot replace a doctor or nurse</strong>.
                Always talk to a healthcare provider before making any medical decisions.
              </p>
              <p>
                <strong>In an emergency, call 911 immediately.</strong>
              </p>
            </AlertDescription>
          </Alert>

          {/* Footer with required Google links */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Powered by Google MedGemma. Learn more:
            </p>
            <div className="flex flex-wrap gap-4">
              <a
                href="https://developers.google.com/health-ai-developer-foundations/medgemma"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline text-xs"
              >
                <ExternalLink className="w-3 h-3" />
                About Google MedGemma
              </a>
              <a
                href="https://developers.google.com/health-ai-developer-foundations/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline text-xs"
              >
                <ExternalLink className="w-3 h-3" />
                Terms of Use
              </a>
            </div>
          </div>
        </div>

        {/* Unified Consent Dialog */}
        {user && groupId && (
          <UnifiedAIConsentDialog
            open={showConsentDialog}
            userId={user.id}
            groupId={groupId}
            onConsent={handleConsentComplete}
            onDecline={() => setShowConsentDialog(false)}
          />
        )}
      </EmailVerificationGate>
    </TrialExpirationGate>
  );
}
