/**
 * @deprecated DEPRECATED - DO NOT USE
 *
 * This component has been replaced by UnifiedAIConsentDialog.
 * Location: @/components/consent/UnifiedAIConsentDialog
 *
 * The unified consent dialog consolidates all AI and medical consent into a single flow
 * with 60-second reading time requirement, including Google MedGemma HAI-DEF terms.
 *
 * This file is kept for reference only and will be removed in a future version.
 * All imports of this component should be updated to use UnifiedAIConsentDialog.
 *
 * Migration date: November 28, 2025
 */

// ENTIRE COMPONENT COMMENTED OUT - USE UnifiedAIConsentDialog INSTEAD
/*
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
      ... component JSX ...
    </Dialog>
  );
}
*/

// Export nothing - this component should not be used
export {};
