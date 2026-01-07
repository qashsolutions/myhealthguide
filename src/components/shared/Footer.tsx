'use client';

import Link from 'next/link';

export function Footer() {
  const footerLinks = {
    product: [
      { name: 'Family Plans', href: '/family' },
      { name: 'Agency Plans', href: '/agency' },
      { name: 'Pricing', href: '/pricing' },
      { name: 'Features', href: '/features' },
    ],
    resources: [
      { name: 'Care Community', href: '/community' },
      { name: 'Symptom Checker', href: '/symptom-checker' },
      { name: 'Help Center', href: '/help' },
    ],
    company: [
      { name: 'About Us', href: '/about' },
      { name: 'Privacy Policy', href: '/privacy' },
      { name: 'Terms of Service', href: '/terms' },
      { name: 'HIPAA Notice', href: '/hipaa-notice' },
    ],
  };

  return (
    <footer className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        {/* Main Footer Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand Column */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center">
              <h2 className="text-xl tracking-tight text-slate-900 dark:text-slate-100">
                <span className="font-bold">MyHealth</span>
                <span className="font-light text-blue-600 dark:text-blue-400">Guide</span>
              </h2>
            </Link>
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
              Care for Your Loved Ones, Simplified
            </p>
            <p className="mt-4 text-xs text-gray-500 dark:text-gray-500">
              A unit of Qash Solutions Inc.
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              D-U-N-S® 119536275
            </p>
          </div>

          {/* Product Column */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Product
            </h3>
            <ul className="mt-4 space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources Column */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Resources
            </h3>
            <ul className="mt-4 space-y-3">
              {footerLinks.resources.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Column */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Company
            </h3>
            <ul className="mt-4 space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800">
          <p className="text-xs text-gray-500 dark:text-gray-500 text-center">
            © {new Date().getFullYear()} MyHealthGuide. All rights reserved. Made with care for seniors and caregivers.
          </p>
        </div>
      </div>
    </footer>
  );
}
