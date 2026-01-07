'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Cookie, Check, Info } from 'lucide-react';
import { db } from '@/lib/firebase/config';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

interface CookiePreferences {
  essential: boolean; // Always true - required for app to work
  analytics: boolean;
  marketing: boolean;
}

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [dntEnabled, setDntEnabled] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true,
    analytics: false,
    marketing: false
  });

  useEffect(() => {
    // Check for Do Not Track (DNT) browser signal
    const isDntEnabled =
      navigator.doNotTrack === '1' ||
      (window as any).doNotTrack === '1' ||
      navigator.doNotTrack === 'yes';

    setDntEnabled(isDntEnabled);

    // If DNT is enabled, automatically set analytics to false
    if (isDntEnabled) {
      setPreferences({
        essential: true,
        analytics: false,
        marketing: false
      });
    }

    // Check if user has already consented
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      // Show banner after 1 second delay for better UX
      setTimeout(() => setShowBanner(true), 1000);
    } else {
      // If DNT is enabled but user previously accepted analytics, override with DNT preference
      if (isDntEnabled) {
        const consentData = JSON.parse(consent);
        if (consentData.preferences.analytics) {
          // DNT takes precedence - disable analytics
          const updatedConsent = {
            essential: true,
            analytics: false,
            marketing: false
          };
          saveConsent(updatedConsent);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const acceptAll = async () => {
    const consentData: CookiePreferences = {
      essential: true,
      analytics: !dntEnabled, // Respect DNT - don't enable analytics if DNT is on
      marketing: true
    };

    await saveConsent(consentData);
    setShowBanner(false);
  };

  const acceptEssential = async () => {
    const consentData: CookiePreferences = {
      essential: true,
      analytics: false,
      marketing: false
    };

    await saveConsent(consentData);
    setShowBanner(false);
  };

  const acceptCustom = async () => {
    await saveConsent(preferences);
    setShowBanner(false);
  };

  const saveConsent = async (consentData: CookiePreferences) => {
    // Save to localStorage
    localStorage.setItem('cookie-consent', JSON.stringify({
      preferences: consentData,
      timestamp: new Date().toISOString(),
      version: '1.0'
    }));

    // Save to Firebase for audit trail
    try {
      await addDoc(collection(db, 'cookieConsents'), {
        preferences: consentData,
        timestamp: Timestamp.now(),
        userAgent: navigator.userAgent,
        version: '1.0'
      });
    } catch (error) {
      console.error('Error saving cookie consent:', error);
    }

    // Initialize analytics if accepted
    if (consentData.analytics) {
      initializeAnalytics();
    }
  };

  const initializeAnalytics = () => {
    // Initialize analytics services here (e.g., Google Analytics)
    console.log('Analytics initialized');
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center p-4">
      <Card className="w-full max-w-4xl pointer-events-auto shadow-2xl border-2 border-blue-500 bg-white dark:bg-gray-900">
        {/* Header */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Cookie className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Cookie Preferences
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                We use cookies to enhance your experience
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
            We use cookies and similar technologies to help personalize content, tailor and measure
            ads, provide a better experience, and ensure the app functions properly. By clicking
            &quot;Accept All&quot;, you agree to the storing of cookies on your device.
          </p>

          {/* DNT Notice */}
          {dntEnabled && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200 flex items-center gap-2">
                <Info className="h-4 w-4 flex-shrink-0" />
                <span>
                  Your browser&apos;s &quot;Do Not Track&quot; setting is enabled. We respect this preference and analytics cookies will remain disabled.
                </span>
              </p>
            </div>
          )}

          {/* Details Toggle */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-4 flex items-center gap-2"
          >
            <Info className="h-4 w-4" />
            {showDetails ? 'Hide Details' : 'Show Details'}
          </button>

          {/* Cookie Categories */}
          {showDetails && (
            <div className="space-y-4 mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              {/* Essential Cookies */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Check className="h-4 w-4 text-green-600" />
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                      Essential Cookies (Required)
                    </h4>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Necessary for the website to function. These cookies enable core functionality
                    such as security, authentication, and session management. Cannot be disabled.
                  </p>
                </div>
                <div className="ml-4">
                  <div className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium rounded">
                    Always On
                  </div>
                </div>
              </div>

              {/* Analytics Cookies */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-1">
                    Analytics Cookies (Optional)
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Help us understand how visitors interact with the website by collecting and
                    reporting information anonymously. Used to improve user experience.
                    {dntEnabled && (
                      <span className="block mt-1 text-blue-600 dark:text-blue-400 font-medium">
                        Disabled due to Do Not Track setting
                      </span>
                    )}
                  </p>
                </div>
                <div className="ml-4">
                  <input
                    type="checkbox"
                    checked={preferences.analytics}
                    onChange={(e) =>
                      !dntEnabled && setPreferences({ ...preferences, analytics: e.target.checked })
                    }
                    disabled={dntEnabled}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Marketing Cookies */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-1">
                    Marketing Cookies (Optional)
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Used to track visitors across websites to display relevant advertisements. May
                    be used by third-party advertisers to build a profile of your interests.
                  </p>
                </div>
                <div className="ml-4">
                  <input
                    type="checkbox"
                    checked={preferences.marketing}
                    onChange={(e) =>
                      setPreferences({ ...preferences, marketing: e.target.checked })
                    }
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={acceptAll}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              Accept All Cookies
            </Button>
            <Button
              onClick={showDetails ? acceptCustom : acceptEssential}
              variant="outline"
              className="flex-1"
            >
              {showDetails ? 'Save Preferences' : 'Essential Only'}
            </Button>
          </div>

          {/* Privacy Policy Link */}
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4">
            By using our site, you agree to our{' '}
            <a href="/privacy" className="text-blue-600 dark:text-blue-400 hover:underline">
              Privacy Policy
            </a>
            {' '}and{' '}
            <a href="/terms" className="text-blue-600 dark:text-blue-400 hover:underline">
              Terms of Service
            </a>
          </p>
        </div>
      </Card>
    </div>
  );
}
