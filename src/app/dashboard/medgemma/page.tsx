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
  Info
} from 'lucide-react';
import {
  checkUnifiedConsent,
  getConsentExpiryWarning,
  type UnifiedAIConsent
} from '@/lib/consent/unifiedConsentManagement';

/**
 * MedGemma Hub Page
 *
 * Central landing page for Google MedGemma AI features
 * - Model information (4B vs 27B)
 * - Feature showcase
 * - Consent management (uses unified consent system)
 * - Google attribution & compliance
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

  // Check consent status using unified consent system
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
    // Re-check consent after it's been granted
    if (!user?.id || !groupId) return;

    const { valid, consent: newConsent } = await checkUnifiedConsent(user.id, groupId);
    setConsentValid(valid);
    setConsent(newConsent);
    setShowConsentDialog(false);
  };

  const expiryWarning = consent ? getConsentExpiryWarning(consent) : null;

  return (
    <TrialExpirationGate featureName="MedGemma AI features">
      <EmailVerificationGate featureName="MedGemma AI features">
        <div className="p-6 max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Brain className="h-10 w-10 text-blue-600 dark:text-blue-400" />
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                  MedGemma AI
                </h1>
              </div>
              <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl">
                Clinical-grade artificial intelligence powered by Google's MedGemma foundation models
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
              Powered by Google Health AI Developer Foundations
            </AlertTitle>
            <AlertDescription className="text-blue-800 dark:text-blue-200 mt-2">
              HAI-DEF is provided under and subject to the{' '}
              <a
                href="https://developers.google.com/health-ai-developer-foundations/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-medium inline-flex items-center gap-1 hover:text-blue-600"
              >
                Health AI Developer Foundations Terms of Use
                <ExternalLink className="w-3 h-3" />
              </a>
              {' '}•{' '}
              <a
                href="https://developers.google.com/health-ai-developer-foundations/medgemma/model-card"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-medium inline-flex items-center gap-1 hover:text-blue-600"
              >
                Model Card
                <ExternalLink className="w-3 h-3" />
              </a>
            </AlertDescription>
          </Alert>

          {/* Consent Status */}
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading consent status...</div>
          ) : consentValid ? (
            <>
              {/* Active Consent */}
              <Alert className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <AlertTitle className="text-green-900 dark:text-green-100">
                  MedGemma AI Enabled
                </AlertTitle>
                <AlertDescription className="text-green-800 dark:text-green-200">
                  You have accepted the terms and can use all MedGemma-powered features.
                  {consent && (
                    <span className="block mt-1 text-sm">
                      Preferred Model: <strong className="font-semibold">{consent.preferredModel === 'medgemma-4b' ? 'MedGemma 4B (Fast)' : 'MedGemma 27B (Accurate)'}</strong>
                      {' '}• Expires: <strong>{consent.expiresAt?.toLocaleDateString()}</strong>
                    </span>
                  )}
                </AlertDescription>
              </Alert>

              {/* Expiry Warning */}
              {expiryWarning && expiryWarning.warning && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-5 w-5" />
                  <AlertTitle>Consent Expiring Soon</AlertTitle>
                  <AlertDescription>
                    {expiryWarning.message}
                    <Button
                      size="sm"
                      className="mt-2"
                      onClick={() => setShowConsentDialog(true)}
                    >
                      Re-consent Now
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
            </>
          ) : (
            <Alert className="bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <AlertTitle className="text-yellow-900 dark:text-yellow-100">
                Consent Required
              </AlertTitle>
              <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                To use MedGemma AI features, please review and accept the terms of use.
                <Button
                  size="sm"
                  className="mt-2"
                  onClick={() => setShowConsentDialog(true)}
                >
                  Review Terms & Enable MedGemma
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Model Comparison */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              MedGemma Models
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              {/* MedGemma 27B */}
              <Card className="border-2 border-blue-200 dark:border-blue-800">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="w-6 h-6 text-blue-600" />
                      MedGemma 27B
                    </CardTitle>
                    <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full">
                      Recommended
                    </span>
                  </div>
                  <CardDescription>
                    Advanced medical reasoning model optimized for clinical accuracy
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Best For:</h4>
                    <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        Clinical note generation
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        Complex medical reasoning
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        Doctor visit preparation
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold text-sm mb-2">Training:</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Fine-tuned on medical literature, clinical notes, USMLE questions, and PubMed articles
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* MedGemma 4B */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-6 h-6 text-yellow-600" />
                    MedGemma 4B
                  </CardTitle>
                  <CardDescription>
                    Faster multimodal model for general healthcare applications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Best For:</h4>
                    <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        Quick health queries
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        Faster response times
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        General medical questions
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold text-sm mb-2">Training:</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Multimodal training on medical text and de-identified medical images
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              MedGemma-Powered Features
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Health Chat */}
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-6 h-6 text-blue-600" />
                    AI Health Chat
                  </CardTitle>
                  <CardDescription>
                    Ask questions about medications, adherence, and care routines in natural language
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-sm mb-2 text-green-700 dark:text-green-300">
                      Value Proposition:
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Get instant, evidence-based answers without searching through logs manually
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-sm mb-2">Example Queries:</h4>
                    <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                      <li>• "What medications did grandma miss this week?"</li>
                      <li>• "Show me adherence patterns for lisinopril"</li>
                      <li>• "When should I give evening medications?"</li>
                    </ul>
                  </div>

                  <Button
                    className="w-full gap-2"
                    onClick={() => router.push('/dashboard/health-chat')}
                    disabled={!consentValid}
                  >
                    Open Health Chat
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>

              {/* Clinical Notes */}
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-6 h-6 text-purple-600" />
                    Clinical Notes Generator
                  </CardTitle>
                  <CardDescription>
                    Generate comprehensive clinical summaries for doctor visits
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-sm mb-2 text-green-700 dark:text-green-300">
                      Value Proposition:
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Save 15+ minutes per doctor visit with AI-generated summaries
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-sm mb-2">Includes:</h4>
                    <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                      <li>• Medication list with adherence analysis</li>
                      <li>• Clinical recommendations</li>
                      <li>• Suggested questions for provider</li>
                      <li>• Printable PDF format</li>
                    </ul>
                  </div>

                  <Button
                    className="w-full gap-2"
                    onClick={() => router.push('/dashboard/clinical-notes')}
                    disabled={!consentValid}
                  >
                    Generate Clinical Note
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Medical Disclaimer */}
          <Alert variant="destructive" className="border-2">
            <AlertTriangle className="h-5 w-5" />
            <AlertTitle className="text-lg">Important Medical Disclaimer</AlertTitle>
            <AlertDescription className="space-y-2 text-sm">
              <p>
                <strong>MedGemma is NOT a substitute for professional medical care.</strong> All
                AI-generated outputs are informational only and must be independently verified by
                licensed healthcare providers before use in clinical decision-making.
              </p>
              <p>
                MedGemma does not provide medical advice, diagnosis, treatment recommendations, or
                medication dosage guidance. Always consult qualified healthcare professionals for
                medical decisions.
              </p>
              <p>
                <strong>Emergency situations:</strong> For medical emergencies, call 911 or your
                local emergency number immediately.
              </p>
            </AlertDescription>
          </Alert>

          {/* Documentation Links */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <Info className="w-5 h-5" />
              Learn More
            </h3>

            <div className="grid sm:grid-cols-3 gap-4">
              <a
                href="https://developers.google.com/health-ai-developer-foundations/medgemma"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline text-sm"
              >
                <ExternalLink className="w-4 h-4" />
                MedGemma Documentation
              </a>

              <a
                href="https://developers.google.com/health-ai-developer-foundations/medgemma/model-card"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline text-sm"
              >
                <ExternalLink className="w-4 h-4" />
                Model Card
              </a>

              <a
                href="https://developers.google.com/health-ai-developer-foundations/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline text-sm"
              >
                <ExternalLink className="w-4 h-4" />
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
