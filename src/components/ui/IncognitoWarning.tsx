'use client';

import React, { useEffect, useState } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { isIncognitoBrowser, getBrowserInfo } from '@/lib/utils/browser-detection';

interface IncognitoWarningProps {
  className?: string;
  dismissible?: boolean;
}

/**
 * Warning banner for users in private/incognito mode
 * Provides eldercare-friendly messaging about potential issues
 */
export function IncognitoWarning({ className = '', dismissible = true }: IncognitoWarningProps) {
  const [isIncognito, setIsIncognito] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkIncognito = async () => {
      try {
        const result = await isIncognitoBrowser();
        setIsIncognito(result);
        
        // Log browser info for debugging (server will see this in API calls)
        if (result) {
          const browserInfo = getBrowserInfo();
          console.log('[IncognitoWarning] Private mode detected:', browserInfo);
        }
      } catch (error) {
        console.error('[IncognitoWarning] Detection failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkIncognito();
  }, []);

  // Don't show if loading, not incognito, or dismissed
  if (isLoading || !isIncognito || isDismissed) {
    return null;
  }

  return (
    <div
      className={`bg-health-warning-bg border-2 border-health-warning rounded-elder p-4 mb-6 ${className}`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="h-6 w-6 text-health-warning flex-shrink-0 mt-1" aria-hidden="true" />
        
        <div className="flex-1">
          <h3 className="text-elder-base font-semibold text-elder-text mb-2">
            Private Browsing Mode Detected
          </h3>
          
          <p className="text-elder-base text-elder-text-secondary mb-3">
            You're using private browsing mode. Some features may not work correctly.
          </p>
          
          <p className="text-elder-base text-elder-text-secondary">
            For the best experience, please open MyHealth Guide in a regular browser window.
          </p>
          
          <div className="mt-4">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-elder-base text-primary-600 hover:text-primary-700 font-medium underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
            >
              Open in regular browser
            </a>
          </div>
        </div>

        {dismissible && (
          <button
            onClick={() => setIsDismissed(true)}
            className="flex-shrink-0 p-1 hover:bg-black/5 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            aria-label="Dismiss warning"
          >
            <X className="h-5 w-5 text-elder-text-secondary" />
          </button>
        )}
      </div>
    </div>
  );
}