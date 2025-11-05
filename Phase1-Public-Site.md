# Phase 1 Addition: Public Site Structure - myguide.health

## Overview
This document adds the public-facing website structure with header navigation, footer, and landing page to Phase 1.

**Domain:** myguide.health  
**Goal:** Professional public site that converts visitors into trial users

---

## Site Structure

```
myguide.health/
├── / (landing page)
├── /features
├── /pricing
├── /about
├── /contact
├── /help
├── /privacy
├── /terms
├── /login
├── /signup
└── /dashboard (authenticated)
```

---

## Task: Public Layout with Header & Footer

### File: `src/app/(public)/layout.tsx`
```typescript
import { ReactNode } from 'react';
import { Header } from '@/components/shared/Header';
import { Footer } from '@/components/shared/Footer';

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
```

---

## Component: Header Navigation

### File: `src/components/shared/Header.tsx`
```typescript
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Menu, X, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Features', href: '/features' },
  { name: 'Pricing', href: '/pricing' },
  { name: 'About', href: '/about' },
  { name: 'Help', href: '/help' }
];

export function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Don't show public header on dashboard pages
  if (pathname?.startsWith('/dashboard') || pathname?.startsWith('/agency')) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <nav className="mx-auto flex max-w-7xl items-center justify-between p-6 lg:px-8" aria-label="Global">
        {/* Logo */}
        <div className="flex lg:flex-1">
          <Link href="/" className="-m-1.5 p-1.5">
            <span className="flex items-center gap-2">
              <Heart className="h-8 w-8 text-blue-600" />
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                myguide.health
              </span>
            </span>
          </Link>
        </div>

        {/* Mobile menu button */}
        <div className="flex lg:hidden">
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

        {/* Desktop navigation */}
        <div className="hidden lg:flex lg:gap-x-8">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'text-sm font-semibold leading-6 transition-colors',
                pathname === item.href
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-900 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400'
              )}
            >
              {item.name}
            </Link>
          ))}
        </div>

        {/* Desktop CTA buttons */}
        <div className="hidden lg:flex lg:flex-1 lg:justify-end lg:gap-x-4">
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
                  'block rounded-lg px-3 py-2 text-base font-semibold leading-7 transition-colors',
                  pathname === item.href
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                    : 'text-gray-900 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                )}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
            <div className="mt-4 space-y-2">
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
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
```

---

## Component: Footer

### File: `src/components/shared/Footer.tsx`
```typescript
'use client';

import Link from 'next/link';
import { Heart, Mail, MapPin } from 'lucide-react';

const footerNavigation = {
  product: [
    { name: 'Features', href: '/features' },
    { name: 'Pricing', href: '/pricing' },
    { name: 'Help Center', href: '/help' },
    { name: 'Sign Up', href: '/signup' }
  ],
  company: [
    { name: 'About Us', href: '/about' },
    { name: 'Contact', href: '/contact' },
    { name: 'Careers', href: '/careers' },
    { name: 'Blog', href: '/blog' }
  ],
  legal: [
    { name: 'Privacy Policy', href: '/privacy' },
    { name: 'Terms of Service', href: '/terms' },
    { name: 'Cookie Policy', href: '/cookies' },
    { name: 'HIPAA Compliance', href: '/hipaa' }
  ],
  support: [
    { name: 'Documentation', href: '/docs' },
    { name: 'API Reference', href: '/api-docs' },
    { name: 'Status', href: 'https://status.myguide.health' },
    { name: 'Support', href: '/support' }
  ]
};

export function Footer() {
  return (
    <footer className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        {/* Main footer content */}
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-5">
          {/* Brand column */}
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2">
              <Heart className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                myguide.health
              </span>
            </Link>
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-400 max-w-xs">
              Empowering caregivers with intelligent tools to provide better care for their loved ones.
            </p>
            <div className="mt-6 space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Mail className="h-4 w-4" />
                <a href="mailto:support@myguide.health" className="hover:text-blue-600">
                  support@myguide.health
                </a>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <MapPin className="h-4 w-4" />
                <span>Irving, Texas, USA</span>
              </div>
            </div>
          </div>

          {/* Product links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Product
            </h3>
            <ul className="mt-4 space-y-3">
              {footerNavigation.product.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Company
            </h3>
            <ul className="mt-4 space-y-3">
              {footerNavigation.company.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Legal
            </h3>
            <ul className="mt-4 space-y-3">
              {footerNavigation.legal.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom section */}
        <div className="mt-12 border-t border-gray-200 dark:border-gray-800 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              © {new Date().getFullYear()} myguide.health. All rights reserved.
            </p>
            <div className="flex gap-6">
              <Link
                href="https://twitter.com/myguidehealth"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
              >
                <span className="sr-only">Twitter</span>
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                </svg>
              </Link>
              <Link
                href="https://linkedin.com/company/myguidehealth"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
              >
                <span className="sr-only">LinkedIn</span>
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
```

---

## Landing Page

### File: `src/app/(public)/page.tsx`
```typescript
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Heart, 
  Mic, 
  Brain, 
  Bell, 
  Users, 
  Shield, 
  CheckCircle,
  ArrowRight
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 py-20 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-6xl">
              Intelligent Caregiving Made Simple
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
              Voice-powered medication tracking, AI-driven insights, and real-time collaboration 
              for families and caregiving agencies.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link href="/signup">
                <Button size="lg" className="text-lg px-8">
                  Start 7-Day Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/features">
                <Button variant="outline" size="lg" className="text-lg px-8">
                  Learn More
                </Button>
              </Link>
            </div>
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              No credit card required • Cancel anytime • US-based support
            </p>
          </div>

          {/* Hero Image/Screenshot Placeholder */}
          <div className="mt-16 flow-root sm:mt-24">
            <div className="relative rounded-xl bg-gray-900/5 p-2 ring-1 ring-inset ring-gray-900/10 dark:bg-white/5 dark:ring-white/10">
              <div className="aspect-video rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/50 dark:to-blue-800/50 flex items-center justify-center">
                <p className="text-gray-500 dark:text-gray-400 text-lg">
                  App Screenshot / Demo Video
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 sm:py-32 bg-white dark:bg-gray-800">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-base font-semibold leading-7 text-blue-600 dark:text-blue-400">
              Powerful Features
            </h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              Everything you need to provide better care
            </p>
          </div>

          <div className="mx-auto mt-16 max-w-7xl sm:mt-20 lg:mt-24">
            <dl className="grid max-w-xl grid-cols-1 gap-8 lg:max-w-none lg:grid-cols-3">
              {/* Feature 1: Voice Input */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="rounded-lg bg-blue-600 p-3">
                      <Mic className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Voice-Powered Logging
                    </h3>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300">
                    Simply say "John took Lisinopril at 9am" and we'll log it instantly. 
                    No typing required.
                  </p>
                </CardContent>
              </Card>

              {/* Feature 2: AI Insights */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="rounded-lg bg-blue-600 p-3">
                      <Brain className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      AI-Driven Insights
                    </h3>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300">
                    Get daily summaries and pattern detection to spot missed doses and 
                    improve medication compliance.
                  </p>
                </CardContent>
              </Card>

              {/* Feature 3: SMS Alerts */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="rounded-lg bg-blue-600 p-3">
                      <Bell className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Smart Notifications
                    </h3>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300">
                    Receive SMS alerts for missed doses. Customizable frequency and content 
                    to fit your needs.
                  </p>
                </CardContent>
              </Card>

              {/* Feature 4: Multi-User */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="rounded-lg bg-blue-600 p-3">
                      <Users className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Real-Time Collaboration
                    </h3>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300">
                    Multiple family members or caregivers can work together seamlessly 
                    with instant updates.
                  </p>
                </CardContent>
              </Card>

              {/* Feature 5: Agency Dashboard */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="rounded-lg bg-blue-600 p-3">
                      <Heart className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Agency Management
                    </h3>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300">
                    Manage up to 10 client groups with analytics, compliance tracking, 
                    and priority alerts.
                  </p>
                </CardContent>
              </Card>

              {/* Feature 6: Security */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="rounded-lg bg-blue-600 p-3">
                      <Shield className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      HIPAA-Aware Security
                    </h3>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300">
                    Enterprise-grade security with encrypted data, secure authentication, 
                    and audit logs.
                  </p>
                </CardContent>
              </Card>
            </dl>
          </div>
        </div>
      </section>

      {/* Social Proof / Stats Section */}
      <section className="bg-blue-600 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:max-w-none">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 text-center">
              <div>
                <p className="text-4xl font-bold text-white">95%</p>
                <p className="mt-2 text-lg text-blue-100">Medication Compliance</p>
              </div>
              <div>
                <p className="text-4xl font-bold text-white">2 hrs</p>
                <p className="mt-2 text-lg text-blue-100">Saved Daily Per Caregiver</p>
              </div>
              <div>
                <p className="text-4xl font-bold text-white">50%</p>
                <p className="mt-2 text-lg text-blue-100">Reduction in Missed Doses</p>
              </div>
              <div>
                <p className="text-4xl font-bold text-white">7 Days</p>
                <p className="mt-2 text-lg text-blue-100">Free Trial Period</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="py-24 sm:py-32 bg-gray-50 dark:bg-gray-900">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              Simple, transparent pricing
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
              Choose the plan that's right for you. All plans include a 7-day free trial.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
            {/* Plan 1: Single + 1 */}
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Single + 1
                </h3>
                <p className="mt-2 text-4xl font-bold text-gray-900 dark:text-white">
                  $8.99
                  <span className="text-lg font-normal text-gray-600 dark:text-gray-400">/month</span>
                </p>
                <ul className="mt-6 space-y-3">
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0" />
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      1 admin + 1 member
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0" />
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      Up to 2 elders
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0" />
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      All core features
                    </span>
                  </li>
                </ul>
                <Link href="/signup" className="block mt-6">
                  <Button className="w-full">Start Free Trial</Button>
                </Link>
              </CardContent>
            </Card>

            {/* Plan 2: Family */}
            <Card className="border-2 border-blue-600">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Family
                  </h3>
                  <span className="inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-900 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:text-blue-200">
                    Popular
                  </span>
                </div>
                <p className="mt-2 text-4xl font-bold text-gray-900 dark:text-white">
                  $14.99
                  <span className="text-lg font-normal text-gray-600 dark:text-gray-400">/month</span>
                </p>
                <ul className="mt-6 space-y-3">
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0" />
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      1 admin + up to 3 members
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0" />
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      Up to 4 elders
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0" />
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      All core features
                    </span>
                  </li>
                </ul>
                <Link href="/signup" className="block mt-6">
                  <Button className="w-full">Start Free Trial</Button>
                </Link>
              </CardContent>
            </Card>

            {/* Plan 3: Agency */}
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Agency
                </h3>
                <p className="mt-2 text-4xl font-bold text-gray-900 dark:text-white">
                  $199
                  <span className="text-lg font-normal text-gray-600 dark:text-gray-400">/month</span>
                </p>
                <ul className="mt-6 space-y-3">
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0" />
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      Up to 10 groups
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0" />
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      4 members per group
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0" />
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      Agency dashboard & analytics
                    </span>
                  </li>
                </ul>
                <Link href="/contact" className="block mt-6">
                  <Button variant="outline" className="w-full">Contact Sales</Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          <p className="mt-8 text-center text-sm text-gray-600 dark:text-gray-400">
            All plans include: Voice logging, AI insights, SMS notifications, real-time collaboration
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-600">
        <div className="px-6 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready to transform your caregiving?
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-blue-100">
              Start your 7-day free trial today. No credit card required.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link href="/signup">
                <Button size="lg" variant="secondary" className="text-lg px-8">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/contact">
                <Button size="lg" variant="ghost" className="text-lg px-8 text-white hover:text-white hover:bg-blue-700">
                  Talk to Sales
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
```

---

## Updated Environment Variables

### File: `.env.local`
```bash
# App Configuration
NEXT_PUBLIC_APP_URL=https://myguide.health
NEXT_PUBLIC_APP_NAME=myguide.health

# ... rest of the environment variables remain the same
```

---

## Updated File Structure

```
src/
├── app/
│   ├── (public)/               # Public pages layout
│   │   ├── layout.tsx          # Public layout with header & footer
│   │   ├── page.tsx            # Landing page
│   │   ├── features/
│   │   │   └── page.tsx
│   │   ├── pricing/
│   │   │   └── page.tsx
│   │   ├── about/
│   │   │   └── page.tsx
│   │   ├── contact/
│   │   │   └── page.tsx
│   │   ├── help/
│   │   │   └── page.tsx
│   │   ├── privacy/
│   │   │   └── page.tsx
│   │   └── terms/
│   │       └── page.tsx
│   ├── (auth)/                 # Auth pages (login, signup, verify)
│   │   ├── layout.tsx
│   │   ├── login/
│   │   ├── signup/
│   │   └── verify/
│   ├── (dashboard)/            # Protected dashboard pages
│   │   ├── layout.tsx          # Dashboard layout (sidebar)
│   │   └── ...
│   └── layout.tsx              # Root layout
├── components/
│   └── shared/
│       ├── Header.tsx          # Public header navigation
│       ├── Footer.tsx          # Site footer
│       ├── Sidebar.tsx         # Dashboard sidebar
│       └── ...
```

---

## SEO Metadata

### File: `src/app/(public)/layout.tsx` (updated)
```typescript
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    default: 'myguide.health - Intelligent Caregiving Made Simple',
    template: '%s | myguide.health'
  },
  description: 'Voice-powered medication tracking, AI-driven insights, and real-time collaboration for families and caregiving agencies.',
  keywords: ['caregiving', 'medication tracking', 'elderly care', 'caregiver app', 'AI healthcare'],
  authors: [{ name: 'myguide.health' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://myguide.health',
    title: 'myguide.health - Intelligent Caregiving Made Simple',
    description: 'Voice-powered medication tracking, AI-driven insights, and real-time collaboration.',
    siteName: 'myguide.health'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'myguide.health - Intelligent Caregiving Made Simple',
    description: 'Voice-powered medication tracking, AI-driven insights, and real-time collaboration.',
    creator: '@myguidehealth'
  }
};

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  // ... layout code
}
```

---

## Additional Public Pages (Stubs)

### File: `src/app/(public)/features/page.tsx`
```typescript
export default function FeaturesPage() {
  return (
    <div className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <h1 className="text-4xl font-bold">Features</h1>
        <p className="mt-4 text-lg text-gray-600">
          Detailed feature descriptions coming soon...
        </p>
      </div>
    </div>
  );
}
```

### File: `src/app/(public)/pricing/page.tsx`
```typescript
export default function PricingPage() {
  return (
    <div className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <h1 className="text-4xl font-bold">Pricing</h1>
        <p className="mt-4 text-lg text-gray-600">
          Detailed pricing page coming soon...
        </p>
      </div>
    </div>
  );
}
```

### Similar stubs for: `/about`, `/contact`, `/help`, `/privacy`, `/terms`

---

## Phase 1 Updated Checklist

- [ ] Project initialized with Next.js 14
- [ ] Public layout with header navigation created
- [ ] Footer component with links created
- [ ] Landing page with hero, features, pricing preview
- [ ] Public pages (features, pricing, about, etc.) stubbed
- [ ] Authentication flow (login/signup/verify)
- [ ] Dashboard layout with sidebar
- [ ] Theme system (light/dark)
- [ ] SEO metadata configured
- [ ] Domain set to myguide.health
- [ ] Responsive on all devices
- [ ] No console errors

---

## Testing Checklist

### Public Site
- [ ] Header navigation works on desktop
- [ ] Mobile menu opens/closes correctly
- [ ] Footer links are accessible
- [ ] Landing page renders properly
- [ ] CTA buttons navigate to signup
- [ ] Theme toggle works
- [ ] Responsive on mobile/tablet/desktop

### Navigation Flow
- [ ] Home → Features → Pricing → Signup
- [ ] Login redirects to dashboard
- [ ] Dashboard has different header (no public nav)
- [ ] Footer appears on all public pages
- [ ] Footer does not appear on dashboard

---

## Next Steps

With the public site structure complete, proceed with:
1. Complete authentication implementation
2. Build out feature pages with details
3. Create comprehensive help/documentation section
4. Add blog for content marketing
5. Implement contact form with email integration

---

**Estimated Additional Time:** +2 days for public site structure  
**Total Phase 1 Duration:** 7-9 days
