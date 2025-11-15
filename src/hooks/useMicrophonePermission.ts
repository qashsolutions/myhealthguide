'use client';

import { useState, useEffect } from 'react';
import { checkMicrophonePermission, requestMicrophonePermission } from '@/lib/voice/browserSupport';

type PermissionStatus = 'prompt' | 'granted' | 'denied' | 'checking';
type ConsentStatus = 'not-asked' | 'consented' | 'denied';

interface UseMicrophonePermissionResult {
  permissionStatus: PermissionStatus;
  consentStatus: ConsentStatus;
  showConsentDialog: boolean;
  requestPermission: () => void;
  handleConsent: () => Promise<void>;
  handleDeny: () => void;
}

const CONSENT_STORAGE_KEY = 'healthguide_microphone_consent';

export function useMicrophonePermission(): UseMicrophonePermissionResult {
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>('checking');
  const [consentStatus, setConsentStatus] = useState<ConsentStatus>('not-asked');
  const [showConsentDialog, setShowConsentDialog] = useState(false);

  // Load saved consent status from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedConsent = localStorage.getItem(CONSENT_STORAGE_KEY);
      if (savedConsent === 'consented') {
        setConsentStatus('consented');
      } else if (savedConsent === 'denied') {
        setConsentStatus('denied');
      }
    }
  }, []);

  // Check initial permission status
  useEffect(() => {
    async function checkPermission() {
      const status = await checkMicrophonePermission();
      setPermissionStatus(status);
    }
    checkPermission();
  }, []);

  // Request permission flow
  const requestPermission = () => {
    // If user has already consented, request browser permission directly
    if (consentStatus === 'consented') {
      handleBrowserPermission();
    } else {
      // Show consent dialog first (GDPR compliance)
      setShowConsentDialog(true);
    }
  };

  // Handle user consent
  const handleConsent = async () => {
    // Save consent to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(CONSENT_STORAGE_KEY, 'consented');
    }
    setConsentStatus('consented');
    setShowConsentDialog(false);

    // Now request browser permission
    await handleBrowserPermission();
  };

  // Handle user denial
  const handleDeny = () => {
    // Save denial to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(CONSENT_STORAGE_KEY, 'denied');
    }
    setConsentStatus('denied');
    setShowConsentDialog(false);
    setPermissionStatus('denied');
  };

  // Request browser microphone permission
  const handleBrowserPermission = async () => {
    setPermissionStatus('checking');
    const granted = await requestMicrophonePermission();
    setPermissionStatus(granted ? 'granted' : 'denied');
  };

  return {
    permissionStatus,
    consentStatus,
    showConsentDialog,
    requestPermission,
    handleConsent,
    handleDeny
  };
}
