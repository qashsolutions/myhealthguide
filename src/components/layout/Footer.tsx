import React from 'react';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import { APP_NAME, ROUTES } from '@/lib/constants';

/**
 * Footer component with privacy links and medical disclaimer
 * Eldercare-optimized with large touch targets
 */
export function Footer(): JSX.Element {
  const currentYear = new Date().getFullYear();

  return (
    <footer 
      className="bg-gray-50 border-t border-elder-border mt-auto"
      role="contentinfo"
    >
      {/* Main Footer Content */}
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col elder-tablet:flex-row justify-between items-end gap-4">
          {/* Left side - Logo and Copyright */}
          <div className="text-center elder-tablet:text-left">
            {/* Logo and Brand */}
            <div className="text-elder-lg font-bold text-blue-900 mb-2">
              {APP_NAME}
            </div>
            {/* Copyright */}
            <p className="text-sm text-gray-500">
              © {currentYear} Qash Solutions Inc. | D‑U‑N‑S® 119536275
            </p>
          </div>

          {/* Right side - Privacy and Care message */}
          <div className="text-center elder-tablet:text-right">
            <Link
              href={ROUTES.PRIVACY}
              className="text-sm text-gray-500 hover:text-primary-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded inline-block px-2 py-1 mb-1"
            >
              Privacy Policy
            </Link>
            <p className="text-sm text-gray-500">
              Made with care for seniors and caregivers
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}