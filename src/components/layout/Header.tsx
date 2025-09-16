'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Menu, X, ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';
import { Button } from '../ui/Button';
import { APP_NAME, ROUTES, ARIA_LABELS } from '@/lib/constants';
import { useAuth } from '@/hooks/useAuth';

// Dynamic import for MobileMenu - only loaded when needed
const MobileMenu = dynamic(
  () => import('./MobileMenu').then(mod => ({ default: mod.MobileMenu })),
  {
    loading: () => null,
    ssr: false
  }
);

/**
 * Responsive header with eldercare-optimized navigation
 * Includes hamburger menu for mobile devices
 */
export function Header(): JSX.Element {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLLIElement>(null);
  const dropdownTimeoutRef = useRef<NodeJS.Timeout>();
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  
  // Add a ref to track if component is mounted
  const isMounted = React.useRef(true);
  
  React.useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (dropdownTimeoutRef.current) {
        clearTimeout(dropdownTimeoutRef.current);
      }
    };
  }, []);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Handle sign out
  const handleSignOut = async () => {
    try {
      // Use the logout function from useAuth which handles both server and client
      await logout();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  // Navigation items with nested structure
  const navItems = [
    {
      href: ROUTES.HEALTH_QA,
      label: 'Health Questions',
      children: [
        { href: ROUTES.HEALTH_QA, label: 'Ask Health Questions' },
        { href: ROUTES.MEDICATION_CHECK, label: 'Check Medications' },
        { href: ROUTES.DRUG_PRICES, label: 'Drug Price Check' },
        { href: '/eldercare', label: 'Medicare Resources' },
      ]
    },
    {
      href: '/beehive',
      label: 'Beehive',
      children: [
        { href: '/beehive', label: 'About Beehive' },
        { href: '/beehive/signup', label: 'Sign Up' },
        { href: '/beehive/signin', label: 'Sign In' },
        { href: '/beehive/refer', label: 'Refer a Caregiver' },
      ]
    },
  ];

  // Handle dropdown hover
  const handleDropdownMouseEnter = () => {
    if (dropdownTimeoutRef.current) {
      clearTimeout(dropdownTimeoutRef.current);
    }
    setIsDropdownOpen(true);
  };

  const handleDropdownMouseLeave = () => {
    dropdownTimeoutRef.current = setTimeout(() => {
      setIsDropdownOpen(false);
    }, 200); // Small delay to prevent accidental closing
  };

  const isActiveRoute = (href: string) => pathname === href;

  return (
    <>
      <header 
        className="sticky top-0 z-30 bg-gray-50 border-b border-elder-border shadow-sm"
        role="banner"
      >
        <nav 
          className="container mx-auto px-4"
          aria-label={ARIA_LABELS.NAVIGATION}
        >
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link 
              href={ROUTES.HOME}
              className="flex items-center gap-2 text-elder-lg font-bold text-blue-900 hover:text-blue-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-500 rounded-elder"
            >
              <Image
                src="/logo.png"
                alt="Careguide Logo"
                width={32}
                height={32}
                className="w-8 h-8"
                priority
              />
              <span>{APP_NAME}</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden elder-tablet:flex items-center gap-8">
              {/* Nav Links */}
              <ul className="flex items-center gap-6">
                {navItems.map((item) => (
                  <li 
                    key={item.href}
                    className="relative"
                    onMouseEnter={item.children ? handleDropdownMouseEnter : undefined}
                    onMouseLeave={item.children ? handleDropdownMouseLeave : undefined}
                    ref={item.children ? dropdownRef : undefined}
                  >
                    {item.children ? (
                      <>
                        <button
                          className={clsx(
                            'flex items-center gap-1 text-elder-base font-medium px-4 py-2 rounded-elder transition-colors',
                            'hover:bg-primary-50 hover:text-primary-700',
                            'focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-500',
                            (isActiveRoute(item.href) || item.children.some(child => isActiveRoute(child.href)))
                              ? 'text-primary-700 bg-primary-50'
                              : 'text-elder-text'
                          )}
                          onClick={() => router.push(item.href)}
                        >
                          {item.label}
                          <ChevronDown className="h-4 w-4" />
                        </button>
                        
                        {/* Dropdown Menu */}
                        {isDropdownOpen && (
                          <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-elder shadow-lg border border-elder-border z-50">
                            <ul className="py-2">
                              {item.children.map((child) => (
                                <li key={child.href}>
                                  <Link
                                    href={child.href}
                                    className={clsx(
                                      'block px-4 py-3 text-elder-base hover:bg-primary-50 hover:text-primary-700 transition-colors',
                                      isActiveRoute(child.href)
                                        ? 'bg-primary-50 text-primary-700 font-medium'
                                        : 'text-elder-text'
                                    )}
                                    onClick={() => setIsDropdownOpen(false)}
                                  >
                                    {child.label}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </>
                    ) : (
                      <Link
                        href={item.href}
                        className={clsx(
                          'text-elder-base font-medium px-4 py-2 rounded-elder transition-colors block',
                          'hover:bg-primary-50 hover:text-primary-700',
                          'focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-500',
                          isActiveRoute(item.href)
                            ? 'text-primary-700 bg-primary-50'
                            : 'text-elder-text'
                        )}
                      >
                        {item.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>

              {/* Removed auth buttons for public access */}
            </div>

            {/* Mobile Menu Button */}
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation(); // Add this line
                console.log('BUTTON CLICKED!'); // Add this first
                toggleMobileMenu();
              }}
              className="elder-tablet:hidden touch-target flex items-center justify-center rounded-elder text-elder-text hover:bg-gray-100 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-500"
              aria-label={ARIA_LABELS.MENU_TOGGLE}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-menu"
            >
              {isMobileMenuOpen ? (
                <X className="h-8 w-8" aria-hidden="true" />
              ) : (
                <Menu className="h-8 w-8" aria-hidden="true" />
              )}
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile Menu */}
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        navItems={navItems}
        isAuthenticated={false}
        userName={undefined}
        onSignOut={handleSignOut}
        onSignIn={() => router.push(ROUTES.AUTH)}
      />
    </>
  );
}