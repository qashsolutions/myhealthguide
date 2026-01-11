import Link from 'next/link';
import Image from 'next/image';
import { Metadata } from 'next';
import SmartFeaturesGrid from '@/components/about/SmartFeaturesGrid';
import HeroCTAButtons from '@/components/about/HeroCTAButtons';
import { Button } from '@/components/ui/button';
import {
  Heart,
  Smartphone,
  Users,
  Pill,
  UtensilsCrossed,
  FileText,
  Mic,
  BarChart3,
  CheckCircle,
  Star,
  Shield,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'About Us | MyHealthGuide',
  description: 'Learn about MyHealthGuide - built by caregivers, for caregivers. Smart, data-driven tools to simplify caregiving.',
};

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
              We know caregiving is hard. We&apos;ve been there. That&apos;s why we built MyHealthGuide &mdash;
              to give you the tools you need to care for your loved ones without the stress of
              juggling medications, appointments, and paperwork.
            </p>
            <HeroCTAButtons />
          </div>
        </div>
      </section>

      {/* Our Story Section */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center">
                <Heart className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="mt-6 text-3xl font-bold text-gray-900 dark:text-white">
                Our Story
              </h2>
              <div className="mt-6 space-y-4 text-gray-600 dark:text-gray-300">
                <p>
                  We built MyHealthGuide because we experienced firsthand how overwhelming caregiving can be.
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
              <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center">
                <Users className="w-8 h-8 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
                Built on Real Feedback
              </h3>
              <p className="mt-3 text-gray-600 dark:text-gray-300">
                Our features come directly from one-on-one interviews and group sessions with real caregivers.
                Every button, every screen, every notification &mdash; designed around what actually helps.
              </p>
              <div className="mt-6 flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
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
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                  <Pill className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
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
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                  <UtensilsCrossed className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
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
                <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>
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
                <div className="w-12 h-12 bg-pink-100 dark:bg-pink-900/30 rounded-xl flex items-center justify-center">
                  <Mic className="w-6 h-6 text-pink-600 dark:text-pink-400" />
                </div>
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
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
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
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
                  <Smartphone className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
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
              Start with a free trial. No credit card required to try.
            </p>
          </div>

          <div className="mt-16 grid md:grid-cols-3 gap-8">
            {/* Family Plan */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-xl flex items-center justify-center">
                <Heart className="w-6 h-6 text-blue-600 dark:text-blue-300" />
              </div>
              <h3 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">Family Plan</h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Perfect for small families</p>
              <div className="mt-4">
                <span className="text-4xl font-bold text-gray-900 dark:text-white">$8.99</span>
                <span className="text-gray-600 dark:text-gray-400">/month</span>
              </div>
              <ul className="mt-6 space-y-3">
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">1 loved one</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">2 family members</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">All core features</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">Smart health insights</span>
                </li>
              </ul>
            </div>

            {/* Single Agency Plan */}
            <div className="bg-blue-600 rounded-2xl p-8">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h3 className="mt-4 text-xl font-bold text-white">Single Agency Plan</h3>
              <p className="mt-2 text-sm text-blue-100">For families with caregivers</p>
              <div className="mt-4">
                <span className="text-4xl font-bold text-white">$18.99</span>
                <span className="text-blue-100">/month</span>
              </div>
              <ul className="mt-6 space-y-3">
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-300 flex-shrink-0" />
                  <span className="text-sm text-white">1 loved one</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-300 flex-shrink-0" />
                  <span className="text-sm text-white">4 team members</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-300 flex-shrink-0" />
                  <span className="text-sm text-white">Real-time collaboration</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-300 flex-shrink-0" />
                  <span className="text-sm text-white">Agency dashboard</span>
                </li>
              </ul>
            </div>

            {/* Multi Agency Plan */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-purple-600 dark:text-purple-300" />
              </div>
              <h3 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">Multi Agency Plan</h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">For professional caregivers</p>
              <div className="mt-4">
                <span className="text-4xl font-bold text-gray-900 dark:text-white">$55</span>
                <span className="text-gray-600 dark:text-gray-400">/loved one/month</span>
              </div>
              <ul className="mt-6 space-y-3">
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">Up to 30 loved ones</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">Up to 10 caregivers</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">Shift scheduling</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">All smart features</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 text-center">
            <Link href="/pricing">
              <Button variant="outline" size="lg">
                See full plan comparison
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* iOS App Section */}
      <section className="py-20 bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center p-2">
                <Image
                  src="/favicon-32x32.png"
                  alt="CareGuide app icon"
                  width={48}
                  height={48}
                  className="w-12 h-12"
                />
              </div>
              <h2 className="mt-6 text-3xl font-bold text-gray-900 dark:text-white">
                CareGuide
              </h2>
              <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
                Download our iOS app and take care management with you wherever you go.
                Log medications, track meals, and access all your documents &mdash; right from your pocket.
              </p>
              <ul className="mt-6 space-y-3">
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-600 dark:text-gray-300">Quick medication logging</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-600 dark:text-gray-300">Voice-powered entries</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-600 dark:text-gray-300">Push notification reminders</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
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
                    <Image
                      src="/images/ios-app-screenshot.png"
                      alt="CareGuide iOS App - Settings screen showing account, subscription, and group information"
                      width={288}
                      height={564}
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
              Join thousands of caregivers who are already using MyHealthGuide.
              Start your free trial today.
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
