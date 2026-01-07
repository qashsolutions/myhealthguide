'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Menu, X, Moon, Sun, User, LogOut, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UnifiedSearch } from './UnifiedSearch';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Main navigation items (4 links)
const navigation = [
  { name: 'Features', href: '/features' },
  { name: 'Symptom Checker', href: '/symptom-checker' },
  { name: 'Care Community', href: '/community' },
];

// About dropdown items
const aboutDropdownItems = [
  { name: 'About Us', href: '/about' },
  { name: 'Pricing', href: '/pricing' },
];

export function Header() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, signOut } = useAuth();

  // Don't show public header on dashboard pages
  if (pathname?.startsWith('/dashboard') || pathname?.startsWith('/agency')) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 [-webkit-backdrop-filter:blur(8px)]">
      <nav className="mx-auto flex max-w-7xl items-center justify-between p-6 lg:px-8" aria-label="Global">
        {/* Logo */}
        <div className="flex lg:flex-1">
          <Link href="/" className="flex items-center">
            <h1 className="text-2xl tracking-tight text-slate-900 dark:text-slate-100">
              <span className="font-bold">MyHealth</span>
              <span className="font-light text-blue-600 dark:text-blue-400">Guide</span>
            </h1>
          </Link>
        </div>

        {/* Mobile menu button and search */}
        <div className="flex lg:hidden gap-2 items-center">
          <UnifiedSearch />
          <button
            type="button"
            className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-700 dark:text-gray-300"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <span className="sr-only">Open main menu</span>
            {mobileMenuOpen ? (
              <X className="h-6 w-6" aria-hidden="true" />
            ) : (
              <Menu className="h-6 w-6" aria-hidden="true" />
            )}
          </button>
        </div>

        {/* Desktop navigation - Vercel-style */}
        <div className="hidden lg:flex lg:gap-x-2 lg:items-center">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'relative px-3 py-2 text-sm font-semibold leading-6 rounded-md transition-all duration-150',
                'hover:bg-gray-100 dark:hover:bg-gray-800',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
                pathname === item.href
                  ? 'text-gray-900 dark:text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              )}
            >
              {item.name}
              {/* Underline indicator for current page */}
              {pathname === item.href && (
                <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
              )}
            </Link>
          ))}

          {/* About Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                'relative flex items-center gap-1 px-3 py-2 text-sm font-semibold leading-6 rounded-md transition-all duration-150 outline-none',
                'hover:bg-gray-100 dark:hover:bg-gray-800',
                'focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
                pathname === '/about' || pathname === '/pricing'
                  ? 'text-gray-900 dark:text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              )}
            >
              About
              <ChevronDown className="w-4 h-4" />
              {/* Underline indicator for About section */}
              {(pathname === '/about' || pathname === '/pricing') && (
                <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              {aboutDropdownItems.map((item) => (
                <DropdownMenuItem key={item.name} asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      'w-full',
                      pathname === item.href && 'text-blue-600 dark:text-blue-400 font-semibold'
                    )}
                  >
                    {item.name}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Desktop CTA buttons */}
        <div className="hidden lg:flex lg:flex-1 lg:justify-end lg:gap-x-2 lg:items-center">
          <UnifiedSearch />

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </Button>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                      {user.firstName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  <span className="hidden xl:inline text-sm font-medium">
                    {user.firstName || user.email?.split('@')[0]}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link href="/dashboard" className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => signOut()}
                  className="flex items-center gap-2 text-red-600 dark:text-red-400"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link href="/signup">
                <Button size="sm">
                  Start Free Trial
                </Button>
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden">
          <div className="space-y-1 px-6 pb-6 pt-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'relative block rounded-lg px-3 py-3 text-base font-semibold leading-7 transition-all duration-150',
                  'hover:bg-gray-100 dark:hover:bg-gray-800',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                  pathname === item.href
                    ? 'text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800/50'
                    : 'text-gray-600 dark:text-gray-400'
                )}
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="flex items-center gap-3">
                  {pathname === item.href && (
                    <span className="w-1 h-5 bg-blue-600 dark:bg-blue-400 rounded-full" />
                  )}
                  {item.name}
                </span>
              </Link>
            ))}

            {/* About Section */}
            <div className="pt-3 border-t border-gray-200 dark:border-gray-700 mt-3">
              <p className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                About
              </p>
              {aboutDropdownItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'relative block rounded-lg px-3 py-3 text-base font-semibold leading-7 transition-all duration-150',
                    'hover:bg-gray-100 dark:hover:bg-gray-800',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                    pathname === item.href
                      ? 'text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800/50'
                      : 'text-gray-600 dark:text-gray-400'
                  )}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="flex items-center gap-3">
                    {pathname === item.href && (
                      <span className="w-1 h-5 bg-blue-600 dark:bg-blue-400 rounded-full" />
                    )}
                    {item.name}
                  </span>
                </Link>
              ))}
            </div>

            <div className="mt-4 space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="w-full"
              >
                {theme === 'dark' ? (
                  <>
                    <Sun className="w-4 h-4 mr-2" />
                    Light Mode
                  </>
                ) : (
                  <>
                    <Moon className="w-4 h-4 mr-2" />
                    Dark Mode
                  </>
                )}
              </Button>

              {user ? (
                <>
                  <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                      <span className="text-lg font-medium text-blue-600 dark:text-blue-400">
                        {user.firstName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <Link href="/dashboard" className="block" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" size="sm" className="w-full">
                      <User className="w-4 h-4 mr-2" />
                      Dashboard
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-red-600 dark:text-red-400 border-red-200 dark:border-red-800"
                    onClick={() => {
                      signOut();
                      setMobileMenuOpen(false);
                    }}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/login" className="block">
                    <Button variant="outline" size="sm" className="w-full">
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/signup" className="block">
                    <Button size="sm" className="w-full">
                      Start Free Trial
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
