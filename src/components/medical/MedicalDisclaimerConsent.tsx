/**
 * @deprecated DEPRECATED - DO NOT USE
 *
 * This component has been replaced by UnifiedAIConsentDialog.
 * Location: @/components/consent/UnifiedAIConsentDialog
 *
 * The unified consent dialog consolidates all AI and medical consent into a single flow
 * with 60-second reading time requirement.
 *
 * This file is kept for reference only and will be removed in a future version.
 * All imports of this component should be updated to use UnifiedAIConsentDialog.
 *
 * Migration date: November 28, 2025
 */

// ENTIRE COMPONENT COMMENTED OUT - USE UnifiedAIConsentDialog INSTEAD
/*
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

const DISCLAIMER_TEXT: Record<MedicalFeatureType, string> = {
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

  side_effects: `IMPORTANT MEDICAL DISCLAIMER - SIDE EFFECTS INFORMATION

This side effects information is provided for INFORMATIONAL PURPOSES ONLY and is NOT a substitute for professional medical advice. Always consult your healthcare provider about side effects and medication concerns.`,

  schedule_conflicts: `IMPORTANT MEDICAL DISCLAIMER - MEDICATION SCHEDULING

This medication scheduling information is provided for INFORMATIONAL PURPOSES ONLY. Always consult your healthcare provider or pharmacist about proper medication timing and administration.`,

  dementia_screening: `IMPORTANT MEDICAL DISCLAIMER - BEHAVIORAL SCREENING

This behavioral screening tool is provided for INFORMATIONAL PURPOSES ONLY and is NOT a medical diagnosis. Only qualified healthcare professionals can diagnose medical conditions. Always consult a doctor for proper medical evaluation.`,

  all_medical_features: `COMPREHENSIVE MEDICAL DISCLAIMER

All medical features in this application (medication interactions, side effects detection, schedule analysis, behavioral screening) are provided for INFORMATIONAL PURPOSES ONLY.

This system CANNOT and DOES NOT provide medical advice, diagnoses, or treatment recommendations. All information must be discussed with qualified healthcare professionals before making any medical decisions.

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

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeSpentReading(Date.now() - startTimeRef.current);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleScroll = () => {
    if (!disclaimerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = disclaimerRef.current;
    const hasReachedBottom = scrollTop + clientHeight >= scrollHeight - 10;

    if (hasReachedBottom && !hasScrolledToBottom) {
      setHasScrolledToBottom(true);
    }
  };

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
      ... component JSX ...
    </div>
  );
}
*/

// Export nothing - this component should not be used
export {};
