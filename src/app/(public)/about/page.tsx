import Link from 'next/link';
import { Metadata } from 'next';
import SmartFeaturesGrid from '@/components/about/SmartFeaturesGrid';

export const metadata: Metadata = {
  title: 'About Us | CareGuide',
  description: 'Learn about CareGuide - built by caregivers, for caregivers. Smart, data-driven tools to simplify caregiving.',
};

// SVG Icon Components
const HeartHandsIcon = () => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-16 h-16">
    <circle cx="32" cy="32" r="30" fill="#EBF5FF" />
    <path d="M32 44c-8-6-14-11-14-17 0-4.5 3.5-8 8-8 2.5 0 4.8 1.2 6 3 1.2-1.8 3.5-3 6-3 4.5 0 8 3.5 8 8 0 6-6 11-14 17z" fill="#3B82F6" />
    <path d="M20 48c0-2 1-3 3-3h18c2 0 3 1 3 3v2c0 1-1 2-2 2H22c-1 0-2-1-2-2v-2z" fill="#93C5FD" />
    <path d="M24 45v3M28 45v3M32 45v3M36 45v3M40 45v3" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const MobileAppIcon = () => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-16 h-16">
    <circle cx="32" cy="32" r="30" fill="#ECFDF5" />
    <rect x="22" y="12" width="20" height="40" rx="3" fill="#10B981" />
    <rect x="24" y="16" width="16" height="28" rx="1" fill="white" />
    <circle cx="32" cy="48" r="2" fill="white" />
    <rect x="26" y="20" width="12" height="2" rx="1" fill="#10B981" fillOpacity="0.5" />
    <rect x="26" y="24" width="8" height="2" rx="1" fill="#10B981" fillOpacity="0.5" />
    <circle cx="30" cy="32" r="3" fill="#10B981" fillOpacity="0.3" />
    <path d="M29 32l1 1 2-2" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const UsersResearchIcon = () => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-16 h-16">
    <circle cx="32" cy="32" r="30" fill="#FEF3C7" />
    <circle cx="24" cy="24" r="6" fill="#F59E0B" />
    <circle cx="40" cy="24" r="6" fill="#F59E0B" />
    <path d="M16 44c0-6 4-10 8-10h4c4 0 8 4 8 10" fill="#FCD34D" />
    <path d="M36 44c0-6 4-10 8-10h4c4 0 8 4 8 10" fill="#FCD34D" />
    <circle cx="32" cy="38" r="4" fill="#F59E0B" />
    <path d="M28 50c0-4 2-6 4-6s4 2 4 6" fill="#FCD34D" />
  </svg>
);

const MedicationIcon = () => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-12 h-12">
    <circle cx="32" cy="32" r="28" fill="#DBEAFE" />
    <rect x="26" y="18" width="12" height="28" rx="6" fill="#3B82F6" />
    <rect x="26" y="18" width="12" height="14" rx="0" fill="#60A5FA" />
    <path d="M29 24h6M32 21v6" stroke="white" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const DietIcon = () => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-12 h-12">
    <circle cx="32" cy="32" r="28" fill="#D1FAE5" />
    <ellipse cx="32" cy="36" rx="14" ry="10" fill="#10B981" />
    <ellipse cx="32" cy="34" rx="12" ry="8" fill="#34D399" />
    <circle cx="28" cy="32" r="3" fill="#FCD34D" />
    <circle cx="36" cy="34" r="2" fill="#F87171" />
    <circle cx="32" cy="36" r="2" fill="#A78BFA" />
    <path d="M32 20v-6M32 14l-2 2M32 14l2 2" stroke="#10B981" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const DocumentIcon = () => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-12 h-12">
    <circle cx="32" cy="32" r="28" fill="#E0E7FF" />
    <rect x="20" y="14" width="24" height="36" rx="2" fill="#6366F1" />
    <rect x="24" y="20" width="16" height="2" rx="1" fill="white" />
    <rect x="24" y="26" width="12" height="2" rx="1" fill="white" fillOpacity="0.7" />
    <rect x="24" y="32" width="14" height="2" rx="1" fill="white" fillOpacity="0.7" />
    <rect x="24" y="38" width="10" height="2" rx="1" fill="white" fillOpacity="0.7" />
  </svg>
);

const VoiceIcon = () => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-12 h-12">
    <circle cx="32" cy="32" r="28" fill="#FCE7F3" />
    <rect x="28" y="18" width="8" height="20" rx="4" fill="#EC4899" />
    <path d="M22 32c0 6 4 10 10 10s10-4 10-10" stroke="#EC4899" strokeWidth="3" strokeLinecap="round" />
    <path d="M32 42v8M28 50h8" stroke="#EC4899" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

const AnalyticsIcon = () => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-12 h-12">
    <circle cx="32" cy="32" r="28" fill="#FEE2E2" />
    <rect x="18" y="36" width="8" height="14" rx="1" fill="#EF4444" />
    <rect x="28" y="28" width="8" height="22" rx="1" fill="#F87171" />
    <rect x="38" y="20" width="8" height="30" rx="1" fill="#FCA5A5" />
    <path d="M18 24l10-6 10 8 8-10" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="46" cy="16" r="3" fill="#EF4444" />
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-green-500 flex-shrink-0">
    <circle cx="12" cy="12" r="10" fill="currentColor" fillOpacity="0.2" />
    <path d="M8 12l2.5 2.5L16 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const StarIcon = () => (
  <svg viewBox="0 0 24 24" fill="#F59E0B" className="w-5 h-5">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);

export default function AboutPage() {
  return (
    <div className="bg-white dark:bg-gray-950">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 sm:py-28">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-950 dark:to-purple-950" />
        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl lg:text-6xl">
              Built by Caregivers,{' '}
              <span className="text-blue-600 dark:text-blue-400">for Caregivers</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
              We know caregiving is hard. We&apos;ve been there. That&apos;s why we built CareGuide &mdash;
              to give you the tools you need to care for your loved ones without the stress of
              juggling medications, appointments, and paperwork.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link
                href="/signup"
                className="rounded-full bg-blue-600 px-8 py-3 text-base font-semibold text-white shadow-lg hover:bg-blue-500 transition-all"
              >
                Start Your 45-Day Free Trial
              </Link>
              <Link
                href="/pricing"
                className="text-base font-semibold leading-6 text-gray-900 dark:text-white hover:text-blue-600"
              >
                View Plans <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Our Story Section */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <HeartHandsIcon />
              <h2 className="mt-6 text-3xl font-bold text-gray-900 dark:text-white">
                Our Story
              </h2>
              <div className="mt-6 space-y-4 text-gray-600 dark:text-gray-300">
                <p>
                  We built CareGuide because we experienced firsthand how overwhelming caregiving can be.
                  Keeping track of medications, coordinating with family members, managing appointments &mdash;
                  it felt like a full-time job on top of everything else.
                </p>
                <p>
                  We searched for tools that could help, but everything we found was either too complicated,
                  too expensive, or didn&apos;t really understand what caregivers actually need.
                </p>
                <p>
                  So we built our own. And we talked to hundreds of caregivers to make sure we got it right.
                </p>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-xl">
              <UsersResearchIcon />
              <h3 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
                Built on Real Feedback
              </h3>
              <p className="mt-3 text-gray-600 dark:text-gray-300">
                Our features come directly from one-on-one interviews and group sessions with real caregivers.
                Every button, every screen, every notification &mdash; designed around what actually helps.
              </p>
              <div className="mt-6 flex items-center gap-2">
                <StarIcon /><StarIcon /><StarIcon /><StarIcon /><StarIcon />
                <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                  Based on 100+ caregiver interviews
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Smart Care Intelligence Section - Interactive Cards */}
      <section className="py-20 bg-gradient-to-b from-white to-blue-50 dark:from-gray-950 dark:to-blue-950/20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/50 px-4 py-2 rounded-full mb-6">
              <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Where the Industry is Headed</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
              Smart Care Intelligence
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
              Data-driven features that help you stay ahead of problems &mdash; not just react to them.
            </p>
          </div>

          {/* Interactive Smart Features Grid */}
          <SmartFeaturesGrid />

          {/* How it works - Simple explanation */}
          <div className="mt-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <h3 className="text-2xl font-bold">How Smart Features Work</h3>
                <p className="mt-4 text-blue-100">
                  Our system learns from the data you log &mdash; medications, meals, activities.
                  It spots patterns humans might miss and alerts you to things that matter.
                </p>
                <p className="mt-4 text-blue-100">
                  Think of it like a smart assistant that watches for warning signs while you focus on caring.
                </p>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-lg font-bold">1</span>
                  </div>
                  <span>You log medications, meals, notes</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-lg font-bold">2</span>
                  </div>
                  <span>System analyzes patterns over time</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-lg font-bold">3</span>
                  </div>
                  <span>You get alerts when something needs attention</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features - Condensed */}
      <section className="py-16 bg-gray-50 dark:bg-gray-900">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Plus All the Essentials
            </h2>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              The foundation for daily caregiving tasks.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center hover:shadow-md transition-shadow">
              <div className="flex justify-center">
                <MedicationIcon />
              </div>
              <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                Medications
              </h3>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Track & remind
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center hover:shadow-md transition-shadow">
              <div className="flex justify-center">
                <DietIcon />
              </div>
              <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                Diet
              </h3>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Log meals
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center hover:shadow-md transition-shadow">
              <div className="flex justify-center">
                <DocumentIcon />
              </div>
              <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                Documents
              </h3>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Store safely
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center hover:shadow-md transition-shadow">
              <div className="flex justify-center">
                <VoiceIcon />
              </div>
              <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                Voice
              </h3>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Hands-free
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center hover:shadow-md transition-shadow">
              <div className="flex justify-center">
                <AnalyticsIcon />
              </div>
              <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                Reports
              </h3>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Export & share
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center hover:shadow-md transition-shadow">
              <div className="flex justify-center">
                <MobileAppIcon />
              </div>
              <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                iOS App
              </h3>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                On the go
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Plans Section */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              Simple, Honest Pricing
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
              Start with a 45-day free trial. No credit card required to try.
            </p>
          </div>

          <div className="mt-16 grid md:grid-cols-3 gap-8">
            {/* Family Plan */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-xl flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-blue-600 dark:text-blue-300">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor" />
                </svg>
              </div>
              <h3 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">Family Plan</h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Perfect for small families</p>
              <div className="mt-4">
                <span className="text-4xl font-bold text-gray-900 dark:text-white">$8.99</span>
                <span className="text-gray-600 dark:text-gray-400">/month</span>
              </div>
              <ul className="mt-6 space-y-3">
                <li className="flex items-center gap-3">
                  <CheckIcon />
                  <span className="text-sm text-gray-600 dark:text-gray-300">1 elder</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckIcon />
                  <span className="text-sm text-gray-600 dark:text-gray-300">2 family members</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckIcon />
                  <span className="text-sm text-gray-600 dark:text-gray-300">All core features</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckIcon />
                  <span className="text-sm text-gray-600 dark:text-gray-300">Smart health insights</span>
                </li>
              </ul>
            </div>

            {/* Single Agency Plan */}
            <div className="bg-blue-600 rounded-2xl p-8 relative">
              <div className="absolute top-0 right-6 -translate-y-1/2">
                <span className="bg-yellow-400 text-yellow-900 px-4 py-1 rounded-full text-sm font-semibold">
                  Most Popular
                </span>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-white">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" />
                  <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
                  <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="2" />
                </svg>
              </div>
              <h3 className="mt-4 text-xl font-bold text-white">Single Agency Plan</h3>
              <p className="mt-2 text-sm text-blue-100">For families with caregivers</p>
              <div className="mt-4">
                <span className="text-4xl font-bold text-white">$14.99</span>
                <span className="text-blue-100">/month</span>
              </div>
              <ul className="mt-6 space-y-3">
                <li className="flex items-center gap-3">
                  <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-green-300 flex-shrink-0">
                    <circle cx="12" cy="12" r="10" fill="currentColor" fillOpacity="0.2" />
                    <path d="M8 12l2.5 2.5L16 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="text-sm text-white">1 elder</span>
                </li>
                <li className="flex items-center gap-3">
                  <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-green-300 flex-shrink-0">
                    <circle cx="12" cy="12" r="10" fill="currentColor" fillOpacity="0.2" />
                    <path d="M8 12l2.5 2.5L16 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="text-sm text-white">4 team members</span>
                </li>
                <li className="flex items-center gap-3">
                  <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-green-300 flex-shrink-0">
                    <circle cx="12" cy="12" r="10" fill="currentColor" fillOpacity="0.2" />
                    <path d="M8 12l2.5 2.5L16 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="text-sm text-white">Real-time collaboration</span>
                </li>
                <li className="flex items-center gap-3">
                  <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-green-300 flex-shrink-0">
                    <circle cx="12" cy="12" r="10" fill="currentColor" fillOpacity="0.2" />
                    <path d="M8 12l2.5 2.5L16 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="text-sm text-white">Agency dashboard</span>
                </li>
              </ul>
            </div>

            {/* Multi Agency Plan */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-xl flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-purple-600 dark:text-purple-300">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" />
                </svg>
              </div>
              <h3 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">Multi Agency Plan</h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">For professional caregivers</p>
              <div className="mt-4">
                <span className="text-4xl font-bold text-gray-900 dark:text-white">$30</span>
                <span className="text-gray-600 dark:text-gray-400">/elder/month</span>
              </div>
              <ul className="mt-6 space-y-3">
                <li className="flex items-center gap-3">
                  <CheckIcon />
                  <span className="text-sm text-gray-600 dark:text-gray-300">Up to 30 elders</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckIcon />
                  <span className="text-sm text-gray-600 dark:text-gray-300">Up to 10 caregivers</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckIcon />
                  <span className="text-sm text-gray-600 dark:text-gray-300">Shift scheduling</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckIcon />
                  <span className="text-sm text-gray-600 dark:text-gray-300">All smart features</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/pricing"
              className="inline-flex items-center text-blue-600 dark:text-blue-400 font-semibold hover:underline"
            >
              See full plan comparison
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 ml-1">
                <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* iOS App Section */}
      <section className="py-20 bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <MobileAppIcon />
              <h2 className="mt-6 text-3xl font-bold text-gray-900 dark:text-white">
                CareGuide on the Go
              </h2>
              <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
                Download our iOS app and take CareGuide with you wherever you go.
                Log medications, track meals, and access all your documents &mdash; right from your pocket.
              </p>
              <ul className="mt-6 space-y-3">
                <li className="flex items-center gap-3">
                  <CheckIcon />
                  <span className="text-gray-600 dark:text-gray-300">Quick medication logging</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckIcon />
                  <span className="text-gray-600 dark:text-gray-300">Voice-powered entries</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckIcon />
                  <span className="text-gray-600 dark:text-gray-300">Push notification reminders</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckIcon />
                  <span className="text-gray-600 dark:text-gray-300">Offline access to documents</span>
                </li>
              </ul>
              <div className="mt-8">
                <a
                  href="https://apps.apple.com/us/app/careguide/id6749387786"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 bg-black text-white px-6 py-3 rounded-xl hover:bg-gray-800 transition-colors"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                  </svg>
                  <div className="text-left">
                    <div className="text-xs">Download on the</div>
                    <div className="text-lg font-semibold">App Store</div>
                  </div>
                </a>
              </div>
            </div>
            <div className="flex justify-center">
              <div className="relative">
                {/* Phone frame */}
                <div className="w-72 h-[580px] bg-gray-900 rounded-[3rem] p-2 shadow-2xl">
                  {/* Screen with actual app screenshot */}
                  <div className="w-full h-full rounded-[2.5rem] overflow-hidden">
                    <img
                      src="/images/ios-app-screenshot.png"
                      alt="CareGuide iOS App - Settings screen showing account, subscription, and group information"
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-12 text-center">
            <h2 className="text-3xl font-bold text-white">
              Ready to simplify caregiving?
            </h2>
            <p className="mt-4 text-lg text-blue-100">
              Join thousands of caregivers who are already using CareGuide.
              Start your 45-day free trial today.
            </p>
            <div className="mt-8">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-full bg-white px-8 py-3 text-base font-semibold text-blue-600 shadow-lg hover:bg-gray-100 transition-all"
              >
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
