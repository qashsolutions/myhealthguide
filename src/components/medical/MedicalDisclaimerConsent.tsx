'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, Clock, Eye } from 'lucide-react';
import { MedicalFeatureType } from '@/types';
import { db } from '@/lib/firebase/config';
import { collection, addDoc, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';

interface MedicalDisclaimerConsentProps {
  featureType: MedicalFeatureType;
  groupId: string;
  onConsentGiven: () => void;
  onConsentDenied: () => void;
}

const DISCLAIMER_VERSION = 'v1.0';
const MINIMUM_READ_TIME = 15000; // 15 seconds minimum
const CONSENT_EXPIRY_DAYS = 90;

const DISCLAIMER_TEXT = {
  medication_interactions: `IMPORTANT MEDICAL DISCLAIMER - PLEASE READ CAREFULLY

This medication interaction information is provided for INFORMATIONAL PURPOSES ONLY and is NOT a substitute for professional medical advice, diagnosis, or treatment.

CRITICAL WARNINGS:

1. NOT MEDICAL ADVICE
   This system uses publicly available FDA data to identify potential drug interactions. It CANNOT and DOES NOT:
   - Diagnose medical conditions
   - Recommend medication changes
   - Suggest medication alternatives
   - Provide dosage advice
   - Replace consultation with healthcare providers

2. ALWAYS CONSULT YOUR DOCTOR
   BEFORE making ANY changes to medications, you MUST:
   - Consult your doctor or pharmacist
   - Discuss your specific medical history
   - Consider your individual health conditions
   - Review your complete medication list with a healthcare professional

3. CALL IMMEDIATELY IF:
   - You experience severe symptoms or side effects
   - You have questions about medication interactions
   - Your condition changes or worsens
   - You are unsure about taking any medication

4. LIMITATIONS OF THIS SYSTEM
   - Data may not reflect your specific situation
   - Information may be incomplete or outdated
   - Not all interactions are detected
   - Does not account for individual medical history
   - Cannot predict individual responses to medications

5. NO LIABILITY
   MyGuide.Health provides this information "AS IS" without warranty. We are NOT responsible for:
   - Decisions made based on this information
   - Medication-related adverse events
   - Errors or omissions in data
   - Outcomes of medication use

6. YOUR RESPONSIBILITY
   YOU are responsible for:
   - Discussing all findings with your doctor
   - Following your doctor's advice over any information shown here
   - Keeping accurate medication records
   - Reporting all symptoms to healthcare providers

7. EMERGENCY
   If experiencing a medical emergency, call 911 immediately. DO NOT rely on this system for emergency medical guidance.

By clicking "I Understand and Agree" below, you acknowledge that:
- You have READ and UNDERSTOOD this entire disclaimer
- You will NOT use this information to make medical decisions without consulting a doctor
- You understand this is INFORMATIONAL ONLY and NOT medical advice
- You will discuss all findings with qualified healthcare professionals
- You accept full responsibility for any actions you take based on this information

This consent expires in 90 days and must be renewed.`,

  all_medical_features: `COMPREHENSIVE MEDICAL DISCLAIMER

All medical features in this application (medication interactions, side effects detection, schedule analysis, behavioral screening) are provided for INFORMATIONAL PURPOSES ONLY.

[Same disclaimer text as above, but applies to all medical features]

By consenting, you agree to these terms for ALL medical features in the application.`
};

export function MedicalDisclaimerConsent({
  featureType,
  groupId,
  onConsentGiven,
  onConsentDenied
}: MedicalDisclaimerConsentProps) {
  const { user } = useAuth();
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [timeSpentReading, setTimeSpentReading] = useState(0);
  const [canConsent, setCanConsent] = useState(false);
  const [hasReadCheckbox, setHasReadCheckbox] = useState(false);
  const [understandCheckbox, setUnderstandCheckbox] = useState(false);
  const [willConsultCheckbox, setWillConsultCheckbox] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const disclaimerRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<number>(Date.now());

  // Track time spent reading
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeSpentReading(Date.now() - startTimeRef.current);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Check if user has scrolled to bottom
  const handleScroll = () => {
    if (!disclaimerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = disclaimerRef.current;
    const hasReachedBottom = scrollTop + clientHeight >= scrollHeight - 10;

    if (hasReachedBottom && !hasScrolledToBottom) {
      setHasScrolledToBottom(true);
    }
  };

  // Enable consent button only when all conditions met
  useEffect(() => {
    const meetsRequirements =
      hasScrolledToBottom &&
      timeSpentReading >= MINIMUM_READ_TIME &&
      hasReadCheckbox &&
      understandCheckbox &&
      willConsultCheckbox;

    setCanConsent(meetsRequirements);
  }, [hasScrolledToBottom, timeSpentReading, hasReadCheckbox, understandCheckbox, willConsultCheckbox]);

  const handleConsent = async () => {
    if (!user || !canConsent) return;

    setIsSubmitting(true);

    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + CONSENT_EXPIRY_DAYS);

      const consentRecord = {
        userId: user.id,
        groupId,
        featureType,
        disclaimerVersion: DISCLAIMER_VERSION,
        consentGiven: true,
        consentText: DISCLAIMER_TEXT[featureType] || DISCLAIMER_TEXT.all_medical_features,
        timeSpentReading,
        scrolledToBottom: hasScrolledToBottom,
        consentedAt: new Date(),
        userAgent: navigator.userAgent,
        expiresAt,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await addDoc(collection(db, 'medicalDisclaimerConsents'), consentRecord);

      onConsentGiven();
    } catch (error) {
      console.error('Error saving consent:', error);
      alert('Failed to save consent. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const timeRemaining = Math.max(0, MINIMUM_READ_TIME - timeSpentReading);
  const secondsRemaining = Math.ceil(timeRemaining / 1000);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-3xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Medical Disclaimer - Required Reading
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                You must read and agree to continue
              </p>
            </div>
          </div>
        </div>

        {/* Disclaimer Text */}
        <div
          ref={disclaimerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-6 space-y-4 text-sm leading-relaxed"
        >
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-600 p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="h-5 w-5 text-yellow-600" />
              <p className="font-semibold text-yellow-900 dark:text-yellow-200">
                Reading Requirements
              </p>
            </div>
            <ul className="text-yellow-800 dark:text-yellow-300 space-y-1 text-xs">
              <li>✓ Scroll to the bottom of this disclaimer</li>
              <li>✓ Spend at least 15 seconds reading</li>
              <li>✓ Check all acknowledgment boxes</li>
            </ul>
          </div>

          <pre className="whitespace-pre-wrap font-sans text-gray-700 dark:text-gray-300">
            {DISCLAIMER_TEXT[featureType] || DISCLAIMER_TEXT.all_medical_features}
          </pre>

          {hasScrolledToBottom && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-center">
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                ✓ You have scrolled to the bottom
              </p>
            </div>
          )}
        </div>

        {/* Checkboxes */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-800 space-y-4">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
            <Clock className="h-4 w-4" />
            {timeRemaining > 0 ? (
              <span>Please continue reading ({secondsRemaining}s remaining)</span>
            ) : (
              <span className="text-green-600 dark:text-green-400">
                ✓ Minimum reading time met
              </span>
            )}
          </div>

          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={hasReadCheckbox}
                onCheckedChange={(checked) => setHasReadCheckbox(checked === true)}
                disabled={!hasScrolledToBottom || timeRemaining > 0}
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                I have READ this entire disclaimer carefully and understand its contents
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={understandCheckbox}
                onCheckedChange={(checked) => setUnderstandCheckbox(checked === true)}
                disabled={!hasScrolledToBottom || timeRemaining > 0}
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                I UNDERSTAND this is informational only and NOT medical advice
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={willConsultCheckbox}
                onCheckedChange={(checked) => setWillConsultCheckbox(checked === true)}
                disabled={!hasScrolledToBottom || timeRemaining > 0}
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                I WILL consult my doctor/pharmacist before making any medication decisions
              </span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <Button
              variant="outline"
              onClick={onConsentDenied}
              className="flex-1"
              disabled={isSubmitting}
            >
              I Do Not Agree
            </Button>
            <Button
              onClick={handleConsent}
              disabled={!canConsent || isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Saving...' : 'I Understand and Agree'}
            </Button>
          </div>

          <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-4">
            This consent expires in {CONSENT_EXPIRY_DAYS} days and must be renewed
          </p>
        </div>
      </Card>
    </div>
  );
}
