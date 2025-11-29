'use client';

/**
 * @deprecated This component is deprecated and will be removed in a future version.
 * Use UnifiedAIConsentDialog from '@/components/consent/UnifiedAIConsentDialog' instead.
 * The unified consent dialog consolidates all AI and medical consent into a single flow
 * with 60-second reading time requirement.
 */

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
import { Sparkles, TrendingUp, Clock, FileText, Info, Shield, Brain } from 'lucide-react';

interface AIFeaturesConsentDialogProps {
  open: boolean;
  onConsent: () => void;
  onDecline: () => void;
}

export function AIFeaturesConsentDialog({
  open,
  onConsent,
  onDecline
}: AIFeaturesConsentDialogProps) {
  const [hasReadAll, setHasReadAll] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const aiFeatures = [
    {
      icon: TrendingUp,
      name: 'Health Change Detection',
      description: 'Compares weekly health data to detect significant changes in medication compliance, diet intake, or behavior patterns.',
      dataUsed: ['Medication logs', 'Diet entries', 'Voice transcripts'],
      benefit: 'Early detection of health declines before they become emergencies',
      color: 'text-blue-600'
    },
    {
      icon: Clock,
      name: 'Medication Time Optimization',
      description: 'Analyzes missed dose patterns to suggest better medication times based on elder\'s daily routines.',
      dataUsed: ['Medication logs with timestamps', 'Compliance history'],
      benefit: 'Improves medication compliance by 20-40%',
      color: 'text-purple-600'
    },
    {
      icon: FileText,
      name: 'Weekly Summary Reports',
      description: 'Generates comprehensive weekly health summaries for family communication and record-keeping.',
      dataUsed: ['All logged health data', 'Compliance metrics', 'AI insights'],
      benefit: 'Saves 30-60 minutes per week on family updates',
      color: 'text-green-600'
    },
    {
      icon: FileText,
      name: 'Doctor Visit Preparation',
      description: 'Creates printable reports summarizing health data, trends, and questions for doctor appointments.',
      dataUsed: ['30-day health history', 'Identified concerns', 'Compliance data'],
      benefit: 'Better healthcare outcomes through informed doctor conversations',
      color: 'text-orange-600'
    }
  ];

  const handleConsent = () => {
    if (!agreedToTerms) return;
    onConsent();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onDecline()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Brain className="w-6 h-6 text-blue-600" />
            Enable AI-Powered Caregiver Intelligence
          </DialogTitle>
          <DialogDescription className="text-base">
            Review and consent to advanced AI features that provide proactive health insights
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Overview Alert */}
          <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
            <Sparkles className="h-5 w-5 text-blue-600" />
            <AlertTitle className="text-blue-900 dark:text-blue-100">
              How AI Features Help Caregivers
            </AlertTitle>
            <AlertDescription className="text-blue-800 dark:text-blue-200 mt-2">
              These optional AI-powered features analyze health data to detect changes early,
              optimize care routines, and save you time on reporting. All analysis is performed
              securely using Google's Gemini AI with your data privacy protected.
            </AlertDescription>
          </Alert>

          {/* Feature Details */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Info className="w-5 h-5" />
              AI Features You'll Enable
            </h3>

            {aiFeatures.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div
                  key={idx}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-start gap-3">
                    <Icon className={`w-6 h-6 mt-1 ${feature.color}`} />
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {feature.name}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {feature.description}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pl-9">
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Data Used
                      </p>
                      <ul className="text-sm text-gray-700 dark:text-gray-300 mt-1 space-y-1">
                        {feature.dataUsed.map((data, i) => (
                          <li key={i}>• {data}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Benefit
                      </p>
                      <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                        ✓ {feature.benefit}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Privacy Information */}
          <Alert className="bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800">
            <Shield className="h-5 w-5 text-purple-600" />
            <AlertTitle className="text-purple-900 dark:text-purple-100">
              Your Privacy & Data Protection
            </AlertTitle>
            <AlertDescription className="text-purple-800 dark:text-purple-200 mt-2 space-y-2">
              <p><strong>How AI processes your data:</strong></p>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>Health data is sent securely to Google Gemini AI for analysis</li>
                <li>Only aggregated, de-identified data is analyzed (no personal identifiers)</li>
                <li>AI-generated insights are stored in your secure database</li>
                <li>Raw health data is never shared with third parties</li>
                <li>You can disable AI features anytime in Settings</li>
                <li>Disabling AI does not delete your health data</li>
              </ul>
              <p className="text-sm pt-2">
                <strong>Important:</strong> AI provides data analysis and pattern detection only. It does NOT provide
                medical advice, medication recommendations, dosage guidance, or dietary prescriptions. All medical
                decisions must be made in consultation with qualified healthcare professionals.
              </p>
            </AlertDescription>
          </Alert>

          {/* Consent Checkboxes */}
          <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="read-all"
                checked={hasReadAll}
                onCheckedChange={(checked) => setHasReadAll(checked === true)}
              />
              <Label
                htmlFor="read-all"
                className="text-sm font-medium leading-relaxed cursor-pointer"
              >
                I have read and understand what each AI feature does and what data it uses
              </Label>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="agree-terms"
                checked={agreedToTerms}
                onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
                disabled={!hasReadAll}
              />
              <Label
                htmlFor="agree-terms"
                className={`text-sm font-medium leading-relaxed ${
                  hasReadAll ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'
                }`}
              >
                I consent to enable AI-powered features and understand that my health data will
                be processed by Google Gemini AI for generating insights. I acknowledge that AI
                insights do not replace professional medical advice.
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button variant="outline" onClick={onDecline}>
            No Thanks - Disable AI Features
          </Button>
          <Button
            onClick={handleConsent}
            disabled={!agreedToTerms || !hasReadAll}
            className="gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Enable AI Features
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
