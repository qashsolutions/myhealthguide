'use client';

import Link from 'next/link';
import Image from 'next/image';

export function Footer() {
  return (
    <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
      <div className="mx-auto max-w-7xl px-4 py-3 lg:px-8">
        <div className="flex flex-col md:flex-row items-start justify-between gap-2">
          {/* Left side - Brand and Copyright */}
          <div className="flex flex-col items-start gap-1">
            <Link href="/" className="flex items-center">
              <Image
                src="/logo.png"
                alt="myguide.health"
                width={150}
                height={40}
                className="h-8 w-auto"
                priority
              />
            </Link>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              © 2025 Qash Solutions Inc. | D-U-N-S® 119536275
            </p>
          </div>

          {/* Right side - Links and Tagline */}
          <div className="flex flex-col items-center md:items-end gap-1">
            <Link
              href="/privacy"
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
            >
              Privacy Policy
            </Link>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Made with care for seniors and caregivers
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
