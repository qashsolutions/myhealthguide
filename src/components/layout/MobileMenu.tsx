'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import { User, LogOut } from 'lucide-react';
import { Button } from '../ui/Button';
import { ROUTES } from '@/lib/constants';

/**
 * Mobile menu component with eldercare-optimized touch targets
 * Slides down from header on mobile devices
 */
interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  navItems: Array<{ href: string; label: string }>;
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
          {/* User Info */}
          {isAuthenticated && (
            <div className="pb-4 border-b border-elder-border">
              <div className="flex items-center gap-3 text-elder-base">
                <User className="h-6 w-6 text-elder-text-secondary" aria-hidden="true" />
                <span className="font-medium text-elder-text">
                  {userName || 'User'}
                </span>
              </div>
            </div>
          )}

          {/* Navigation Links */}
          <nav>
            <ul className="space-y-2">
              {navItems.map((item) => (
                <li key={item.href}>
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
                </li>
              ))}
            </ul>
          </nav>

          {/* Auth Actions */}
          <div className="pt-4 border-t border-elder-border">
            {isAuthenticated ? (
              <Button
                variant="secondary"
                size="large"
                fullWidth
                icon={<LogOut className="h-6 w-6" />}
                onClick={() => {
                  onSignOut?.();
                  onClose();
                }}
              >
                Sign Out
              </Button>
            ) : (
              <div className="space-y-3">
                <Button 
                  variant="primary" 
                  size="large" 
                  fullWidth
                  onClick={() => {
                    onSignIn?.();
                    onClose();
                  }}
                >
                  Sign In
                </Button>
                <Button 
                  variant="secondary" 
                  size="large" 
                  fullWidth
                  onClick={() => {
                    onSignIn?.();
                    onClose();
                  }}
                >
                  Create Account
                </Button>
              </div>
            )}
          </div>

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
              <Link
                href={ROUTES.MEDICAL_DISCLAIMER}
                onClick={onClose}
                className="block px-4 py-3 text-elder-base text-elder-text-secondary hover:text-elder-text"
              >
                Medical Disclaimer
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}