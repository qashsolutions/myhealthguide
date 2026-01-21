'use client';

import { useState, useEffect } from 'react';
import { X, Share, Plus, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * iOS Install Prompt Component
 *
 * Shows a prompt for iOS users explaining how to install the PWA:
 * - If using Chrome/Firefox/etc on iOS: tells them to use Safari
 * - If using Safari on iOS: shows instructions for "Add to Home Screen"
 * - Does not show on Android or desktop (they have native install prompts)
 */
export function IOSInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOSSafari, setIsIOSSafari] = useState(false);
  const [isIOSNonSafari, setIsIOSNonSafari] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already dismissed in this session
    const wasDismissed = sessionStorage.getItem('ios-install-prompt-dismissed');
    if (wasDismissed) {
      setDismissed(true);
      return;
    }

    // Check if already installed as PWA (standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as any).standalone === true;

    if (isStandalone) {
      return; // Already installed, don't show prompt
    }

    // Detect iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

    if (!isIOS) {
      return; // Not iOS, don't show this prompt
    }

    // Detect Safari on iOS
    // Safari on iOS doesn't have "CriOS" (Chrome), "FxiOS" (Firefox), "EdgiOS" (Edge), etc.
    const ua = navigator.userAgent;
    const isSafari = !ua.includes('CriOS')
      && !ua.includes('FxiOS')
      && !ua.includes('EdgiOS')
      && !ua.includes('OPiOS')
      && ua.includes('Safari');

    if (isSafari) {
      setIsIOSSafari(true);
    } else {
      setIsIOSNonSafari(true);
    }

    // Show prompt after a short delay
    const timer = setTimeout(() => {
      setShowPrompt(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    sessionStorage.setItem('ios-install-prompt-dismissed', 'true');
  };

  if (dismissed || !showPrompt) {
    return null;
  }

  // iOS user using Chrome/Firefox/etc - tell them to use Safari
  if (isIOSNonSafari) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shadow-lg animate-in slide-in-from-bottom duration-300">
        <div className="max-w-lg mx-auto">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                Install MyHealthGuide App
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                To install this app on your iPhone, please open this page in <strong>Safari</strong> and tap the share button.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    // Copy URL to clipboard
                    navigator.clipboard.writeText(window.location.href);
                    alert('Link copied! Open Safari and paste the link to install.');
                  }}
                >
                  Copy Link for Safari
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDismiss}
                >
                  Not Now
                </Button>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
              aria-label="Dismiss"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // iOS Safari user - show "Add to Home Screen" instructions
  if (isIOSSafari) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shadow-lg animate-in slide-in-from-bottom duration-300">
        <div className="max-w-lg mx-auto">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                Install MyHealthGuide App
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Install this app on your iPhone for quick access and offline use:
              </p>
              <ol className="mt-2 text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li className="flex items-center gap-2">
                  <span className="flex-shrink-0 w-5 h-5 bg-gray-100 dark:bg-gray-800 rounded text-xs flex items-center justify-center font-medium">1</span>
                  <span>Tap the <Share className="w-4 h-4 inline text-blue-600" /> Share button below</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="flex-shrink-0 w-5 h-5 bg-gray-100 dark:bg-gray-800 rounded text-xs flex items-center justify-center font-medium">2</span>
                  <span>Scroll and tap <Plus className="w-4 h-4 inline" /> <strong>Add to Home Screen</strong></span>
                </li>
              </ol>
              <div className="mt-3">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDismiss}
                >
                  Got it
                </Button>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
              aria-label="Dismiss"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
