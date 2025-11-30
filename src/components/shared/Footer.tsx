'use client';

import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
      <div className="mx-auto max-w-7xl px-4 py-3 lg:px-8">
        <div className="flex flex-col md:flex-row items-start justify-between gap-3">
          {/* Left side - Branding and Company */}
          <div className="flex flex-col items-start gap-0.5">
            <Link href="/dashboard" className="flex items-center">
              <h2 className="text-xl tracking-tight text-slate-900 dark:text-slate-100">
                <span className="font-bold">Care</span>
                <span className="font-light text-blue-600 dark:text-blue-400">guide</span>
              </h2>
            </Link>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              A unit of Qash Solutions Inc. | D-U-N-S® 119536275
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              © 2025 All rights reserved
            </p>
          </div>

          {/* Right side - Links and Tagline */}
          <div className="flex flex-col items-start md:items-end gap-1">
            <div className="flex items-center gap-3 text-sm flex-wrap">
              <Link
                href="/privacy"
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline"
              >
                Privacy Policy
              </Link>
              <span className="text-gray-400 dark:text-gray-600">•</span>
              <Link
                href="/hipaa-notice"
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline"
              >
                HIPAA Notice
              </Link>
              <span className="text-gray-400 dark:text-gray-600">•</span>
              <Link
                href="/terms"
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline"
              >
                Terms of Service
              </Link>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Made with care for seniors and caregivers
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
