'use client';

import { useState, useEffect, useRef } from 'react';
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
import { Progress } from '@/components/ui/progress';
import {
  Brain,
  Sparkles,
  Shield,
  AlertTriangle,
  Clock,
  Eye,
  ExternalLink,
  CheckCircle,
  TrendingUp,
  FileText,
  Zap,
  Scale
} from 'lucide-react';
import {
  MINIMUM_READ_TIME_MS,
  CONSENT_VALIDITY_DAYS,
  GOOGLE_HAI_DEF_TERMS_URL,
  createUnifiedConsent
} from '@/lib/consent/unifiedConsentManagement';

interface UnifiedAIConsentDialogProps {
  open: boolean;
  userId: string;
  groupId: string;
  onConsent: () => void;
  onDecline: () => void;
}

export function UnifiedAIConsentDialog({
  open,
  userId,
  groupId,
  onConsent,
  onDecline
}: UnifiedAIConsentDialogProps) {
  // Reading verification state
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [timeSpentReading, setTimeSpentReading] = useState(0);
  const startTimeRef = useRef<number>(Date.now());
  const termsRef = useRef<HTMLDivElement>(null);

  // Checkbox states
  const [acceptAIFeatures, setAcceptAIFeatures] = useState(false);
  const [acceptGoogleAITerms, setAcceptGoogleAITerms] = useState(false);
  const [acceptMedicalDisclaimer, setAcceptMedicalDisclaimer] = useState(false);
  const [acceptDataProcessing, setAcceptDataProcessing] = useState(false);

  // Model preference (accurate = high thinking, fast = low thinking)
  const [preferredModel, setPreferredModel] = useState<'accurate' | 'fast'>('accurate');

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate if user can consent
  const timeRemaining = Math.max(0, MINIMUM_READ_TIME_MS - timeSpentReading);
  const secondsRemaining = Math.ceil(timeRemaining / 1000);
  const hasMetReadingTime = timeSpentReading >= MINIMUM_READ_TIME_MS;
  const progressPercent = Math.min(100, (timeSpentReading / MINIMUM_READ_TIME_MS) * 100);

  const canConsent =
    hasScrolledToBottom &&
    hasMetReadingTime &&
    acceptAIFeatures &&
    acceptGoogleAITerms &&
    acceptMedicalDisclaimer &&
    acceptDataProcessing;

  // Track reading time
  useEffect(() => {
    if (!open) return;

    startTimeRef.current = Date.now();
    setTimeSpentReading(0);

    const interval = setInterval(() => {
      setTimeSpentReading(Date.now() - startTimeRef.current);
    }, 1000);

    return () => clearInterval(interval);
  }, [open]);

  // Handle scroll detection
  const handleScroll = () => {
    if (!termsRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = termsRef.current;
    const hasReachedBottom = scrollTop + clientHeight >= scrollHeight - 20;

    if (hasReachedBottom && !hasScrolledToBottom) {
      setHasScrolledToBottom(true);
    }
  };

  // Handle consent submission
  const handleConsent = async () => {
    if (!canConsent || isSubmitting) return;

    setIsSubmitting(true);

    try {
      await createUnifiedConsent(
        userId,
        groupId,
        {
          aiFeatures: acceptAIFeatures,
          googleAITerms: acceptGoogleAITerms,
          medicalDisclaimer: acceptMedicalDisclaimer,
          dataProcessing: acceptDataProcessing
        },
        timeSpentReading,
        hasScrolledToBottom,
        preferredModel
      );

      onConsent();
    } catch (error) {
      console.error('Error saving consent:', error);
      alert('Failed to save consent. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setHasScrolledToBottom(false);
      setTimeSpentReading(0);
      setAcceptAIFeatures(false);
      setAcceptGoogleAITerms(false);
      setAcceptMedicalDisclaimer(false);
      setAcceptDataProcessing(false);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onDecline()}>
      <DialogContent className="max-w-4xl max-h-[95vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-3 text-2xl">
            <Brain className="w-7 h-7 text-blue-600" />
            Smart Features - Terms of Use
          </DialogTitle>
          <DialogDescription className="text-base">
            Please read and accept the following terms to enable smart features
          </DialogDescription>
        </DialogHeader>

        {/* Reading Progress Indicator */}
        <div className="px-6 py-3 bg-gray-50 dark:bg-gray-900 border-y border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-gray-500" />
              {hasMetReadingTime ? (
                <span className="text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  Reading time requirement met
                </span>
              ) : (
                <span className="text-gray-600 dark:text-gray-400">
                  Please read for at least {secondsRemaining} more seconds
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Eye className="w-4 h-4 text-gray-500" />
              {hasScrolledToBottom ? (
                <span className="text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  Scrolled to bottom
                </span>
              ) : (
                <span className="text-gray-600 dark:text-gray-400">
                  Scroll to read all terms
                </span>
              )}
            </div>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        {/* Scrollable Terms Content */}
        <div
          ref={termsRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-6 py-4 space-y-6"
        >
          {/* Section 1: Overview */}
          <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
            <Sparkles className="h-5 w-5 text-blue-600" />
            <AlertTitle className="text-blue-900 dark:text-blue-100 text-lg">
              1. Smart Features Overview
            </AlertTitle>
            <AlertDescription className="text-blue-800 dark:text-blue-200 mt-2 space-y-3">
              <p>
                By enabling smart features, you gain access to advanced caregiving tools that
                analyze health data to provide insights, detect patterns, and save you time.
              </p>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="flex items-start gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Health Change Detection</p>
                    <p className="text-xs">Alerts for significant health pattern changes</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-purple-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Medication Time Optimization</p>
                    <p className="text-xs">Suggest better medication schedules</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Brain className="w-4 h-4 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Health Assistant</p>
                    <p className="text-xs">Ask questions about health data</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <FileText className="w-4 h-4 text-orange-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Doctor Visit Preparation</p>
                    <p className="text-xs">Generate printable health reports</p>
                  </div>
                </div>
              </div>
            </AlertDescription>
          </Alert>

          {/* Section 2: Google AI Terms */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Brain className="w-5 h-5 text-blue-600" />
              2. Google AI Terms
            </h3>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              AI features are powered by Google Gemini via Vertex AI. By enabling these features, you agree to:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700 dark:text-gray-300">
              <li>
                The{' '}
                <a
                  href={GOOGLE_HAI_DEF_TERMS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 underline inline-flex items-center gap-1"
                >
                  Google Cloud Terms of Service
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                The{' '}
                <a
                  href="https://cloud.google.com/vertex-ai/generative-ai/docs/learn/responsible-ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 underline inline-flex items-center gap-1"
                >
                  Google Responsible AI Practices
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                The{' '}
                <a
                  href="https://policies.google.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 underline inline-flex items-center gap-1"
                >
                  Google Privacy Policy
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
            </ul>

            {/* Model Selection */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm font-medium mb-3 flex items-center gap-2">
                <Scale className="w-4 h-4" />
                Choose Your Preferred AI Mode:
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  className={`border-2 rounded-lg p-3 text-left transition-all ${
                    preferredModel === 'accurate'
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                  }`}
                  onClick={() => setPreferredModel('accurate')}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full border-2 ${
                      preferredModel === 'accurate'
                        ? 'border-blue-600 bg-blue-600'
                        : 'border-gray-300'
                    }`} />
                    <span className="font-medium text-sm">Accurate Mode</span>
                    <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">
                      Recommended
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 ml-5">
                    Higher accuracy for clinical reasoning
                  </p>
                </button>
                <button
                  type="button"
                  className={`border-2 rounded-lg p-3 text-left transition-all ${
                    preferredModel === 'fast'
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                  }`}
                  onClick={() => setPreferredModel('fast')}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full border-2 ${
                      preferredModel === 'fast'
                        ? 'border-blue-600 bg-blue-600'
                        : 'border-gray-300'
                    }`} />
                    <span className="font-medium text-sm">Fast Mode</span>
                    <Zap className="w-3 h-3 text-yellow-600" />
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 ml-5">
                    Faster responses, good for general queries
                  </p>
                </button>
              </div>
            </div>
          </div>

          {/* Section 3: Medical Disclaimer */}
          <Alert variant="destructive" className="border-2">
            <AlertTriangle className="h-5 w-5" />
            <AlertTitle className="text-lg">
              3. Medical Disclaimer - IMPORTANT
            </AlertTitle>
            <AlertDescription className="mt-3 space-y-3 text-sm">
              <p className="font-bold text-base">
                AI features are NOT a substitute for professional medical care:
              </p>

              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>NOT MEDICAL ADVICE:</strong> All AI-generated content is for
                  informational purposes only. It does NOT constitute medical advice,
                  diagnosis, or treatment recommendations.
                </li>
                <li>
                  <strong>NO DOCTOR-PATIENT RELATIONSHIP:</strong> Using these features
                  does not create a doctor-patient relationship between you and
                  MyGuide.Health or any AI provider.
                </li>
                <li>
                  <strong>ALWAYS CONSULT PROFESSIONALS:</strong> Always seek the advice
                  of your physician, pharmacist, or other qualified health provider
                  with any questions about medical conditions or medications.
                </li>
                <li>
                  <strong>AI LIMITATIONS:</strong> AI models are probabilistic and may
                  produce inaccurate, incomplete, or misleading outputs. All AI-generated
                  insights must be independently verified by licensed healthcare providers.
                </li>
                <li>
                  <strong>NO AUTONOMOUS DECISIONS:</strong> AI cannot make automated
                  decisions affecting healthcare. It is a supportive tool only.
                </li>
                <li>
                  <strong>EMERGENCY:</strong> For medical emergencies, call 911 immediately.
                  Do NOT rely on AI features for urgent medical needs.
                </li>
              </ul>

              <div className="pt-3 border-t border-red-200 dark:border-red-800">
                <p>
                  <strong>Drug Interaction Data:</strong> Drug interaction detection uses
                  FDA OpenFDA data which may be incomplete or outdated. The absence of a
                  warning does NOT mean an interaction does not exist. Always consult a
                  pharmacist before combining medications.
                </p>
              </div>
            </AlertDescription>
          </Alert>

          {/* Section 4: Data Processing */}
          <Alert className="bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800">
            <Shield className="h-5 w-5 text-purple-600" />
            <AlertTitle className="text-purple-900 dark:text-purple-100 text-lg">
              4. Data Processing & Privacy
            </AlertTitle>
            <AlertDescription className="text-purple-800 dark:text-purple-200 mt-2 space-y-2 text-sm">
              <p><strong>How your data is processed:</strong></p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Health data is securely sent to Google Vertex AI (Gemini) for processing</li>
                <li>Data is de-identified before analysis - no personal identifiers are shared with AI</li>
                <li>AI-generated insights are stored in your secure, HIPAA-aligned database</li>
                <li>Google does not retain your health data beyond processing</li>
                <li>All AI feature access is logged for audit trails and compliance</li>
                <li>You can revoke consent and disable AI features anytime in Settings</li>
                <li>Revoking consent does not delete your existing health data</li>
              </ul>

              <p className="pt-2">
                <strong>Third-Party Disclosure:</strong> By enabling AI features, you consent
                to sharing de-identified health information with Google for the purpose of
                generating AI-powered insights and analysis.
              </p>

              <p className="pt-2">
                For complete details, please review our{' '}
                <a href="/privacy" className="text-purple-600 dark:text-purple-400 underline">
                  Privacy Policy
                </a>{' '}
                and{' '}
                <a href="/terms" className="text-purple-600 dark:text-purple-400 underline">
                  Terms of Service
                </a>.
              </p>
            </AlertDescription>
          </Alert>

          {/* Section 5: User Responsibilities */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-lg">5. Your Responsibilities</h3>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              By enabling AI features, you agree to:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700 dark:text-gray-300">
              <li>Discuss all AI-generated findings with your healthcare providers</li>
              <li>Follow your doctor&apos;s advice over any information shown by AI</li>
              <li>Verify AI outputs before using them for any health-related decisions</li>
              <li>Report any concerning AI behavior or outputs to admin@myguide.health</li>
              <li>Keep your medication and health records accurate and up-to-date</li>
              <li>Understand that you are responsible for actions taken based on AI insights</li>
            </ul>
          </div>

          {/* Section 6: Consent Details */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3 bg-gray-50 dark:bg-gray-900">
            <h3 className="font-semibold text-lg">6. Consent Information</h3>
            <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
              <li>• This consent expires in <strong>{CONSENT_VALIDITY_DAYS} days</strong> and must be renewed</li>
              <li>• You can revoke consent anytime in Settings &gt; AI Features</li>
              <li>• Revoking consent will disable all AI-powered features</li>
              <li>• Your existing health data will NOT be deleted when you revoke consent</li>
              <li>• Consent records are maintained for compliance and audit purposes</li>
            </ul>
          </div>

          {/* Bottom marker for scroll detection */}
          <div className="h-4" />
        </div>

        {/* Checkboxes and Actions */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 space-y-4">
          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={acceptAIFeatures}
                onCheckedChange={(checked) => setAcceptAIFeatures(checked === true)}
                disabled={!hasScrolledToBottom || !hasMetReadingTime}
              />
              <span className={`text-sm ${hasScrolledToBottom && hasMetReadingTime ? '' : 'opacity-50'}`}>
                I have read and understand the <strong>AI Features Overview</strong> and accept
                that AI provides data analysis only, not medical advice
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={acceptGoogleAITerms}
                onCheckedChange={(checked) => setAcceptGoogleAITerms(checked === true)}
                disabled={!hasScrolledToBottom || !hasMetReadingTime}
              />
              <span className={`text-sm ${hasScrolledToBottom && hasMetReadingTime ? '' : 'opacity-50'}`}>
                I accept the <strong>Google AI Terms</strong> and understand
                the AI&apos;s capabilities and limitations
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={acceptMedicalDisclaimer}
                onCheckedChange={(checked) => setAcceptMedicalDisclaimer(checked === true)}
                disabled={!hasScrolledToBottom || !hasMetReadingTime}
              />
              <span className={`text-sm ${hasScrolledToBottom && hasMetReadingTime ? '' : 'opacity-50'}`}>
                I acknowledge the <strong>Medical Disclaimer</strong> and will always consult
                qualified healthcare professionals before making medical decisions
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={acceptDataProcessing}
                onCheckedChange={(checked) => setAcceptDataProcessing(checked === true)}
                disabled={!hasScrolledToBottom || !hasMetReadingTime}
              />
              <span className={`text-sm ${hasScrolledToBottom && hasMetReadingTime ? '' : 'opacity-50'}`}>
                I consent to <strong>data processing</strong> by Google AI services as described
                in the Privacy section above
              </span>
            </label>
          </div>

          <DialogFooter className="flex gap-2 sm:gap-0 pt-4">
            <Button variant="outline" onClick={onDecline} disabled={isSubmitting}>
              Decline - Don&apos;t Enable Smart Features
            </Button>
            <Button
              onClick={handleConsent}
              disabled={!canConsent || isSubmitting}
              className="gap-2"
            >
              {isSubmitting ? (
                'Saving...'
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Accept & Enable Smart Features
                </>
              )}
            </Button>
          </DialogFooter>

          {!canConsent && (hasScrolledToBottom || hasMetReadingTime) && (
            <p className="text-xs text-center text-gray-500 dark:text-gray-400">
              Please check all boxes above to continue
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
