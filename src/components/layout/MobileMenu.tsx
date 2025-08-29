'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import { User, LogOut, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '../ui/Button';
import { ROUTES } from '@/lib/constants';

/**
 * Mobile menu component with eldercare-optimized touch targets
 * Slides down from header on mobile devices
 */
interface NavItem {
  href: string;
  label: string;
  children?: Array<{ href: string; label: string }>;
}

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  navItems: Array<NavItem>;
  isAuthenticated?: boolean;
  userName?: string;
  onSignOut?: () => void;
  onSignIn?: () => void;
}

export function MobileMenu({
  isOpen,
  onClose,
  navItems,
  isAuthenticated = false,
  userName,
  onSignOut,
  onSignIn,
}: MobileMenuProps): JSX.Element | null {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  // Debug logging
  console.log('MobileMenu render - isOpen:', isOpen);
  console.log('MobileMenu render - navItems:', navItems);

  // Close menu on route change
  useEffect(() => {
    // Only close if menu is actually open
    if (isOpen) {
      onClose();
    }
  }, [pathname]); // Remove onClose from dependencies to prevent infinite loop

  // Prevent body scroll when menu is open
  useEffect(() => {
    console.log('MobileMenu useEffect - isOpen changed to:', isOpen);
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) {
    console.log('MobileMenu returning null because isOpen is false');
    return null;
  }

  const isActiveRoute = (href: string) => pathname === href;
  
  const toggleExpanded = (href: string) => {
    setExpandedItems(prev => 
      prev.includes(href) 
        ? prev.filter(item => item !== href)
        : [...prev, href]
    );
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-20 elder-tablet:hidden"
        onClick={(event) => {
          event.stopPropagation(); // Add this
          onClose();
        }}
        aria-hidden="true"
      />

      {/* Menu */}
      <div
        id="mobile-menu"
        className="fixed top-20 left-0 right-0 bg-white border-b border-elder-border shadow-lg z-20 elder-tablet:hidden animate-slide-down"
        role="navigation"
        aria-label="Mobile navigation"
      >
        <div className="px-4 py-6 space-y-4">

          {/* Navigation Links */}
          <nav>
            <ul className="space-y-2">
              {navItems.map((item) => (
                <li key={item.href}>
                  {item.children ? (
                    <div>
                      <button
                        onClick={() => toggleExpanded(item.href)}
                        className={clsx(
                          'flex items-center justify-between w-full px-4 py-4 text-elder-lg font-medium rounded-elder transition-colors',
                          'hover:bg-primary-50 hover:text-primary-700',
                          'focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-500',
                          (isActiveRoute(item.href) || item.children.some(child => isActiveRoute(child.href)))
                            ? 'bg-primary-50 text-primary-700'
                            : 'text-elder-text'
                        )}
                      >
                        {item.label}
                        {expandedItems.includes(item.href) ? (
                          <ChevronDown className="h-5 w-5" />
                        ) : (
                          <ChevronRight className="h-5 w-5" />
                        )}
                      </button>
                      {expandedItems.includes(item.href) && (
                        <ul className="mt-2 ml-4 space-y-1">
                          {item.children.map((child) => (
                            <li key={child.href}>
                              <Link
                                href={child.href}
                                onClick={onClose}
                                className={clsx(
                                  'block px-4 py-3 text-elder-base font-medium rounded-elder transition-colors',
                                  'hover:bg-primary-50 hover:text-primary-700',
                                  'focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-500',
                                  isActiveRoute(child.href)
                                    ? 'bg-primary-50 text-primary-700'
                                    : 'text-elder-text-secondary'
                                )}
                              >
                                {child.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : item.href === '#' ? (
                    // Placeholder link - doesn't navigate
                    <button
                      className={clsx(
                        'block w-full px-4 py-4 text-elder-lg font-medium rounded-elder transition-colors text-left cursor-not-allowed opacity-50',
                        'text-elder-text'
                      )}
                      disabled
                      title="Coming Soon"
                    >
                      {item.label}
                    </button>
                  ) : (
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className={clsx(
                        'block w-full px-4 py-4 text-elder-lg font-medium rounded-elder transition-colors',
                        'hover:bg-primary-50 hover:text-primary-700',
                        'focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-500',
                        isActiveRoute(item.href)
                          ? 'bg-primary-50 text-primary-700'
                          : 'text-elder-text'
                      )}
                    >
                      {item.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>


          {/* Quick Links */}
          <div className="pt-4 border-t border-elder-border">
            <div className="space-y-2">
              <Link
                href={ROUTES.PRIVACY}
                onClick={onClose}
                className="block px-4 py-3 text-elder-base text-elder-text-secondary hover:text-elder-text"
              >
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}