import React from 'react';
import Link from 'next/link';
import { Heart, Shield, Mail } from 'lucide-react';
import { APP_NAME, ROUTES, DISCLAIMERS } from '@/lib/constants';

/**
 * Footer component with privacy links and medical disclaimer
 * Eldercare-optimized with large touch targets
 */
export function Footer(): JSX.Element {
  const currentYear = new Date().getFullYear();

  return (
    <footer 
      className="bg-elder-background-alt border-t border-elder-border mt-auto"
      role="contentinfo"
    >
      {/* Medical Disclaimer Banner */}
      <div className="bg-primary-50 border-b border-primary-200">
        <div className="container mx-auto px-4 py-4">
          <p className="text-elder-sm text-primary-800 text-center leading-elder">
            <Shield className="inline-block h-5 w-5 mr-2 mb-1" aria-hidden="true" />
            <strong>Important:</strong> {DISCLAIMERS.GENERAL}
          </p>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 elder-tablet:grid-cols-3 gap-8">
          {/* About Section */}
          <div className="space-y-4">
            <h3 className="text-elder-lg font-semibold text-elder-text flex items-center gap-2">
              <Heart className="h-6 w-6 text-health-danger" aria-hidden="true" />
              {APP_NAME}
            </h3>
            <p className="text-elder-base text-elder-text-secondary leading-elder">
              AI-powered medication safety for seniors. Check drug interactions and get health guidance in simple, clear language.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-elder-lg font-semibold text-elder-text">
              Quick Links
            </h3>
            <nav aria-label="Footer navigation">
              <ul className="space-y-3">
                <li>
                  <Link
                    href={ROUTES.MEDICATION_CHECK}
                    className="text-elder-base text-elder-text-secondary hover:text-primary-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
                  >
                    Check Medications
                  </Link>
                </li>
                <li>
                  <Link
                    href={ROUTES.HEALTH_QA}
                    className="text-elder-base text-elder-text-secondary hover:text-primary-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
                  >
                    Health Questions
                  </Link>
                </li>
                <li>
                  <Link
                    href={ROUTES.MEDICAL_DISCLAIMER}
                    className="text-elder-base text-elder-text-secondary hover:text-primary-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
                  >
                    Medical Disclaimer
                  </Link>
                </li>
              </ul>
            </nav>
          </div>

          {/* Legal & Privacy */}
          <div className="space-y-4">
            <h3 className="text-elder-lg font-semibold text-elder-text">
              Privacy & Legal
            </h3>
            <nav aria-label="Legal navigation">
              <ul className="space-y-3">
                <li>
                  <Link
                    href={ROUTES.PRIVACY}
                    className="text-elder-base text-elder-text-secondary hover:text-primary-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    href={ROUTES.UNSUBSCRIBE}
                    className="text-elder-base text-elder-text-secondary hover:text-primary-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded flex items-center gap-2"
                  >
                    <Mail className="h-5 w-5" aria-hidden="true" />
                    Unsubscribe
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-8 border-t border-elder-border">
          <div className="flex flex-col elder-tablet:flex-row justify-between items-center gap-4">
            <p className="text-elder-sm text-elder-text-secondary text-center elder-tablet:text-left">
              © {currentYear} {APP_NAME}. All rights reserved.
            </p>
            <p className="text-elder-sm text-elder-text-secondary text-center elder-tablet:text-right">
              Made with care for seniors managing their health
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}