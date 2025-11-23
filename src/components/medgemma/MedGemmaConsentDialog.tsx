'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Brain, Sparkles, Shield, AlertTriangle, FileText, ExternalLink, Zap, Scale } from 'lucide-react';

interface MedGemmaConsentDialogProps {
  open: boolean;
  onConsent: (preferredModel: 'medgemma-4b' | 'medgemma-27b') => void;
  onDecline: () => void;
}

/**
 * MedGemma Consent Dialog
 *
 * Implements Google Health AI Developer Foundations (HAI-DEF) terms compliance
 * Required before users can access MedGemma-powered features
 *
 * References:
 * - Terms: https://developers.google.com/health-ai-developer-foundations/terms
 * - Model Card: https://developers.google.com/health-ai-developer-foundations/medgemma/model-card
 * - Prohibited Use Policy: https://developers.google.com/health-ai-developer-foundations/prohibited-use-policy
 */
export function MedGemmaConsentDialog({
  open,
  onConsent,
  onDecline
}: MedGemmaConsentDialogProps) {
  const [hasReadTerms, setHasReadTerms] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedMedicalDisclaimer, setAcceptedMedicalDisclaimer] = useState(false);
  const [preferredModel, setPreferredModel] = useState<'medgemma-4b' | 'medgemma-27b'>('medgemma-27b');

  const canProceed = hasReadTerms && acceptedTerms && acceptedMedicalDisclaimer;

  const handleConsent = () => {
    if (!canProceed) return;
    onConsent(preferredModel);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onDecline()}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-2xl">
            <Brain className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            Enable Google MedGemma AI Features
          </DialogTitle>
          <DialogDescription className="text-base">
            Review and accept the terms to access clinical-grade AI powered by Google MedGemma
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Google Attribution Notice - REQUIRED */}
          <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
            <Sparkles className="h-5 w-5 text-blue-600" />
            <AlertTitle className="text-blue-900 dark:text-blue-100">
              Powered by Google Health AI Developer Foundations
            </AlertTitle>
            <AlertDescription className="text-blue-800 dark:text-blue-200 mt-2 text-sm">
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
            </AlertDescription>
          </Alert>

          {/* Model Selection */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Scale className="w-5 h-5" />
              Choose Your MedGemma Model
            </h3>

            <div className="grid grid-cols-2 gap-4">
                {/* MedGemma 27B - Recommended */}
                <button
                  type="button"
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-all text-left ${
                    preferredModel === 'medgemma-27b'
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                  }`}
                  onClick={() => setPreferredModel('medgemma-27b')}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-4 h-4 rounded-full border-2 mt-1 flex items-center justify-center ${
                      preferredModel === 'medgemma-27b'
                        ? 'border-blue-600 bg-blue-600'
                        : 'border-gray-300'
                    }`}>
                      {preferredModel === 'medgemma-27b' && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-base">MedGemma 27B</span>
                        <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                          Recommended
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        Advanced medical reasoning model optimized for clinical accuracy
                      </p>
                      <ul className="mt-3 space-y-1 text-xs text-gray-700 dark:text-gray-300">
                        <li className="flex items-center gap-2">
                          <span className="text-green-600 dark:text-green-400">✓</span>
                          Best for clinical note generation
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-green-600 dark:text-green-400">✓</span>
                          Inference-time medical reasoning
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-green-600 dark:text-green-400">✓</span>
                          Higher accuracy on medical tasks
                        </li>
                      </ul>
                    </div>
                  </div>
                </button>

                {/* MedGemma 4B - Faster */}
                <button
                  type="button"
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-all text-left ${
                    preferredModel === 'medgemma-4b'
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                  }`}
                  onClick={() => setPreferredModel('medgemma-4b')}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-4 h-4 rounded-full border-2 mt-1 flex items-center justify-center ${
                      preferredModel === 'medgemma-4b'
                        ? 'border-blue-600 bg-blue-600'
                        : 'border-gray-300'
                    }`}>
                      {preferredModel === 'medgemma-4b' && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-base">MedGemma 4B</span>
                        <Zap className="w-3 h-3 text-yellow-600" />
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        Faster multimodal model for general healthcare applications
                      </p>
                      <ul className="mt-3 space-y-1 text-xs text-gray-700 dark:text-gray-300">
                        <li className="flex items-center gap-2">
                          <span className="text-blue-600 dark:text-blue-400">✓</span>
                          Faster response times
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-blue-600 dark:text-blue-400">✓</span>
                          Good for general queries
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-blue-600 dark:text-blue-400">✓</span>
                          Multimodal capabilities
                        </li>
                      </ul>
                    </div>
                  </div>
                </button>
              </div>

            <p className="text-xs text-gray-500 dark:text-gray-500">
              You can change your preferred model anytime in Settings
            </p>
          </div>

          {/* Medical Disclaimer - CRITICAL */}
          <Alert variant="destructive" className="border-2">
            <AlertTriangle className="h-5 w-5" />
            <AlertTitle className="text-lg">Medical Disclaimer - Please Read Carefully</AlertTitle>
            <AlertDescription className="mt-3 space-y-3 text-sm">
              <div className="font-semibold text-base">
                MedGemma is NOT a substitute for professional medical care:
              </div>

              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>Not for diagnosis or treatment:</strong> MedGemma outputs are not designed for direct
                  clinical decision-making, diagnosis, or treatment recommendations without independent
                  verification by licensed healthcare providers
                </li>
                <li>
                  <strong>No medical advice:</strong> This application does NOT provide medical advice,
                  prescriptions, or dosage guidance. All medical decisions must be made in consultation
                  with qualified healthcare professionals
                </li>
                <li>
                  <strong>Requires validation:</strong> All AI-generated summaries and insights must be
                  independently verified before use in clinical settings
                </li>
                <li>
                  <strong>Accuracy not guaranteed:</strong> Even for well-trained medical tasks, inaccurate
                  outputs remain possible. Always verify with healthcare providers
                </li>
                <li>
                  <strong>No autonomous decisions:</strong> MedGemma cannot make automated decisions affecting
                  healthcare, and should only be used as a supportive tool for caregivers
                </li>
              </ul>

              <div className="pt-2 border-t border-red-200 dark:border-red-800">
                <strong>Emergency situations:</strong> For medical emergencies, call 911 or your local
                emergency number immediately. Do not rely on AI features for urgent medical needs.
              </div>
            </AlertDescription>
          </Alert>

          {/* Privacy & Data Use */}
          <Alert className="bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800">
            <Shield className="h-5 w-5 text-purple-600" />
            <AlertTitle className="text-purple-900 dark:text-purple-100">
              Privacy & Data Protection
            </AlertTitle>
            <AlertDescription className="text-purple-800 dark:text-purple-200 mt-2 space-y-2 text-sm">
              <p><strong>How your data is used:</strong></p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Health data is securely sent to Google Vertex AI for MedGemma processing</li>
                <li>Data is de-identified before analysis (no personal identifiers shared)</li>
                <li>AI-generated insights are stored in your secure HIPAA-compliant database</li>
                <li>Google does not store your health data beyond processing</li>
                <li>All access is logged for HIPAA compliance and audit trails</li>
                <li>You can revoke consent and disable MedGemma features anytime in Settings</li>
              </ul>

              <p className="pt-2">
                <strong>Third-party disclosure:</strong> By enabling MedGemma, you consent to sharing
                de-identified health information with Google Vertex AI for the sole purpose of generating
                clinical insights, summaries, and analysis.
              </p>
            </AlertDescription>
          </Alert>

          {/* What MedGemma Can Do */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <FileText className="w-5 h-5" />
              MedGemma Features You'll Enable
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  🧠 AI Health Chat
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Ask natural language questions about medications, adherence patterns, and care routines.
                  Get instant, evidence-based answers.
                </p>
              </div>

              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  📋 Clinical Notes Generator
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Generate comprehensive clinical summaries for doctor visits with medication analysis,
                  adherence patterns, and suggested questions.
                </p>
              </div>
            </div>
          </div>

          {/* Consent Checkboxes */}
          <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="read-terms"
                checked={hasReadTerms}
                onCheckedChange={(checked) => setHasReadTerms(checked === true)}
              />
              <Label
                htmlFor="read-terms"
                className="text-sm font-medium leading-relaxed cursor-pointer"
              >
                I have read and understand the{' '}
                <a
                  href="https://developers.google.com/health-ai-developer-foundations/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 underline inline-flex items-center gap-1"
                >
                  Google Health AI Developer Foundations Terms of Use
                  <ExternalLink className="w-3 h-3" />
                </a>
                {' '}and the{' '}
                <a
                  href="https://developers.google.com/health-ai-developer-foundations/medgemma/model-card"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 underline inline-flex items-center gap-1"
                >
                  MedGemma Model Card
                  <ExternalLink className="w-3 h-3" />
                </a>
              </Label>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="accept-terms"
                checked={acceptedTerms}
                onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                disabled={!hasReadTerms}
              />
              <Label
                htmlFor="accept-terms"
                className={`text-sm font-medium leading-relaxed ${
                  hasReadTerms ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'
                }`}
              >
                I accept the Google Health AI Developer Foundations Terms of Use and understand that
                HAI-DEF (including MedGemma) is subject to these terms
              </Label>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="accept-disclaimer"
                checked={acceptedMedicalDisclaimer}
                onCheckedChange={(checked) => setAcceptedMedicalDisclaimer(checked === true)}
                disabled={!hasReadTerms}
              />
              <Label
                htmlFor="accept-disclaimer"
                className={`text-sm font-medium leading-relaxed ${
                  hasReadTerms ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'
                }`}
              >
                I acknowledge the medical disclaimer above. I understand that MedGemma does NOT provide
                medical advice, diagnosis, or treatment recommendations, and that all AI-generated insights
                must be independently verified by licensed healthcare providers before use in clinical
                decision-making
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button variant="outline" onClick={onDecline}>
            Decline - Don't Enable MedGemma
          </Button>
          <Button
            onClick={handleConsent}
            disabled={!canProceed}
            className="gap-2"
          >
            <Brain className="w-4 h-4" />
            Accept & Enable MedGemma
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
