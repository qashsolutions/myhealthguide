'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, X, Pill, User } from 'lucide-react';
import { clsx } from 'clsx';
import { MobileMenu } from './MobileMenu';
import { Button } from '../ui/Button';
import { APP_NAME, ROUTES, ARIA_LABELS } from '@/lib/constants';
import { useAuth } from '@/hooks/useAuth';

/**
 * Responsive header with eldercare-optimized navigation
 * Includes hamburger menu for mobile devices
 */
export function Header(): JSX.Element {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [testCounter, setTestCounter] = useState(0); // Test state
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
  
  // Log when component re-renders
  React.useEffect(() => {
    console.log('Header re-rendered, isMobileMenuOpen:', isMobileMenuOpen, 'testCounter:', testCounter);
  });

  const toggleMobileMenu = () => {
    try {
      console.log('toggleMobileMenu called, current state:', isMobileMenuOpen);
      const newState = !isMobileMenuOpen;
      setIsMobileMenuOpen(newState);
      setTestCounter(prev => prev + 1); // Test if ANY state update works
      console.log('State should now be:', newState);
      // Force a re-render check
      setTimeout(() => {
        console.log('After timeout, state is:', newState);
      }, 100);
    } catch (error) {
      console.error('Error in toggleMobileMenu:', error);
    }
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

  // Navigation items
  const navItems = [
    { href: ROUTES.MEDICATION_CHECK, label: 'Check Medications' },
    { href: ROUTES.HEALTH_QA, label: 'Health Questions' },
    ...(user ? [{ href: ROUTES.ACCOUNT, label: 'My Account' }] : []),
  ];

  const isActiveRoute = (href: string) => pathname === href;

  return (
    <>
      <header 
        className="sticky top-0 z-30 bg-white border-b border-elder-border shadow-sm"
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
              className="flex items-center gap-3 text-elder-lg font-bold text-primary-700 hover:text-primary-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-500 rounded-elder"
            >
              <Pill className="h-8 w-8" aria-hidden="true" />
              <span>{APP_NAME}</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden elder-tablet:flex items-center gap-8">
              {/* Nav Links */}
              <ul className="flex items-center gap-6">
                {navItems.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={clsx(
                        'text-elder-base font-medium px-4 py-2 rounded-elder transition-colors',
                        'hover:bg-primary-50 hover:text-primary-700',
                        'focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-500',
                        isActiveRoute(item.href)
                          ? 'text-primary-700 bg-primary-50'
                          : 'text-elder-text'
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>

              {/* Auth Button / User Info */}
              {loading ? (
                <div className="w-24 h-10 bg-elder-background rounded-elder animate-pulse" />
              ) : user ? (
                <div className="flex items-center gap-4">
                  <span className="text-elder-base text-elder-text-secondary">
                    Welcome, {user.name || 'User'}
                  </span>
                  <Button
                    variant="secondary"
                    size="small"
                    icon={<User className="h-5 w-5" />}
                    onClick={handleSignOut}
                  >
                    Sign Out
                  </Button>
                </div>
              ) : (
                <Button
                  variant="primary"
                  size="medium"
                  onClick={() => router.push(ROUTES.AUTH)}
                >
                  Sign In
                </Button>
              )}
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
        isAuthenticated={!!user}
        userName={user?.name}
        onSignOut={handleSignOut}
        onSignIn={() => router.push(ROUTES.AUTH)}
      />
    </>
  );
}