'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { AccessibilitySettingsButton } from '@/components/accessibility/AccessibilitySettingsButton';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center">
              <h1 className="text-2xl tracking-tight text-slate-900 dark:text-slate-100">
                <span className="font-bold">MyHealth</span>
                <span className="font-light text-blue-600 dark:text-blue-400">Guide</span>
              </h1>
            </Link>
            {/* Accessibility Settings */}
            <AccessibilitySettingsButton />
          </div>
        </div>
      </header>

      {/* Auth Content - scrollable area */}
      <main className="flex-1 overflow-y-auto px-4 py-8 sm:py-12">
        <div className="max-w-2xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
