'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  Building2,
  Stethoscope,
  MessageCircle,
  ArrowRight,
  CheckCircle,
} from 'lucide-react';
import { PricingCards } from '@/components/pricing/PricingCards';
import { CaregiverStories } from '@/components/marketing/CaregiverStories';
import { useAuth } from '@/contexts/AuthContext';

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Redirect subscribed users to dashboard
  useEffect(() => {
    if (!loading && user) {
      const status = user.subscriptionStatus;
      if (status === 'active' || status === 'trial') {
        router.replace('/dashboard');
      }
    }
  }, [user, loading, router]);

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 py-20 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-6xl">
              Care for Your Loved Ones, Simplified
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
              Track medications by voice. Get daily summaries. Never wonder if a dose was missed.
              Built for families and caregiving agencies.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/family">
                <Button size="lg" className="text-lg px-8">
                  <Heart className="w-5 h-5 mr-2" />
                  For Families
                </Button>
              </Link>
              <Link href="/agency">
                <Button size="lg" variant="outline" className="text-lg px-8 border-purple-500 text-purple-600 hover:bg-purple-50 dark:border-purple-400 dark:text-purple-400 dark:hover:bg-purple-950">
                  <Building2 className="w-5 h-5 mr-2" />
                  For Agencies
                </Button>
              </Link>
            </div>
            <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
              Free 45-day trial &bull; No credit card required &bull; HIPAA Compliant
            </p>
          </div>
        </div>
      </section>

      {/* Audience Paths Section */}
      <section className="py-16 sm:py-20 bg-white dark:bg-gray-800">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              Built for Your Caregiving Journey
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
              Whether you&apos;re caring for a parent or managing a care agency, we have you covered.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* For Families Card */}
            <Link href="/family" className="group">
              <Card className="h-full border-2 border-transparent hover:border-blue-500 transition-all duration-200 hover:shadow-lg">
                <CardContent className="pt-8 pb-6 px-6">
                  <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mb-6">
                    <Heart className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                    For Families
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Simple tools for family caregivers. Track medications, coordinate care, and keep everyone informed.
                  </p>
                  <div className="flex items-center text-blue-600 dark:text-blue-400 font-semibold group-hover:gap-2 transition-all">
                    Learn about family plans
                    <ArrowRight className="w-5 h-5 ml-1" />
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* For Care Agencies Card */}
            <Link href="/agency" className="group">
              <Card className="h-full border-2 border-transparent hover:border-purple-500 transition-all duration-200 hover:shadow-lg">
                <CardContent className="pt-8 pb-6 px-6">
                  <div className="w-14 h-14 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center mb-6">
                    <Building2 className="w-7 h-7 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                    For Care Agencies
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Professional tools for agencies. Manage multiple clients, coordinate caregivers, and ensure compliance.
                  </p>
                  <div className="flex items-center text-purple-600 dark:text-purple-400 font-semibold group-hover:gap-2 transition-all">
                    Learn about agency plans
                    <ArrowRight className="w-5 h-5 ml-1" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </section>

      {/* Free Tools Section */}
      <section className="py-16 sm:py-20 bg-gray-50 dark:bg-gray-900">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-12">
            <span className="inline-block px-4 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm font-semibold rounded-full mb-4">
              No Login Required
            </span>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              Free Tools for Caregivers
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
              Start using these helpful resources right away - no account needed.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Symptom Checker */}
            <Link href="/symptom-checker" className="group">
              <Card className="h-full hover:shadow-lg transition-shadow">
                <CardContent className="pt-6 pb-4 px-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Stethoscope className="w-6 h-6 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        Symptom Checker
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">
                        AI-powered assessment to help understand symptoms and get guidance on next steps.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* Care Community */}
            <Link href="/community" className="group">
              <Card className="h-full hover:shadow-lg transition-shadow">
                <CardContent className="pt-6 pb-4 px-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                      <MessageCircle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        Care Community
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">
                        Tips, insights, and shared wisdom from experienced caregivers in our community.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </section>

      {/* Caregiver Stories */}
      <CaregiverStories />

      {/*
        ========================================
        PRICING SECTION - Using Shared Component
        ========================================

        REFACTORED: 2024-11-22

        This section now uses the shared PricingCards component from
        src/components/pricing/PricingCards.tsx

        WHY THIS CHANGE WAS MADE:
        1. Code Duplication: The same pricing cards were duplicated in multiple files:
           - Homepage (this file)
           - Dedicated pricing page (src/app/(public)/pricing/page.tsx)

        2. Maintenance Issues: Had to update pricing in multiple places (prone to errors)
           - Example: The $144 vs $30 bug occurred because of manual updates

        3. No Single Source of Truth: Pricing constants existed but weren't being used

        BENEFITS OF SHARED COMPONENT:
        - Uses PRICING constants from src/lib/constants/pricing.ts
        - Update once, reflects everywhere
        - Prevents inconsistencies
        - Easier to maintain

        The old duplicated code has been commented out below for reference.
      */}

      {/* Pricing Section - Show all plans immediately */}
      <PricingCards
        showHeader={true}
        showTrialInfo={true}
        defaultSelectedPlan="single_agency"
      />

      {/*
        ========================================
        OLD DUPLICATED CODE (COMMENTED OUT)
        ========================================

        The code below was replaced with the shared PricingCards component.
        Keeping it here temporarily for reference, but this should be removed
        once the new component is verified to work correctly.

        DO NOT USE THIS CODE - Use the PricingCards component instead.

      <section className="py-24 sm:py-32 bg-gray-50 dark:bg-gray-900">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-base font-semibold leading-7 text-blue-600 dark:text-blue-400">
              Simple Pricing
            </h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              Choose the plan that fits your needs
            </p>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
              All plans include 45-day free trial. No credit card required.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            [... 200+ lines of duplicated pricing cards code ...]
          </div>
        </div>
      </section>
      */}

      {/* Features Section */}
      <section className="py-24 sm:py-32 bg-white dark:bg-gray-800">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-base font-semibold leading-7 text-blue-600 dark:text-blue-400">
              Powerful Features
            </h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              Tools for better care
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
                    Simply say &quot;John took Lisinopril at 9am&quot; and we&apos;ll log it instantly.
                    No typing required.
                  </p>
                </CardContent>
              </Card>

              {/* Feature 2: Daily Summaries */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="rounded-lg bg-blue-600 p-3">
                      <Brain className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Daily Health Summaries
                    </h3>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300">
                    See how your loved one is doing at a glance. We&apos;ll alert you when
                    something looks off so you never miss a beat.
                  </p>
                </CardContent>
              </Card>

              {/* Feature 3: Timely Reminders */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="rounded-lg bg-blue-600 p-3">
                      <Bell className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Timely Reminders
                    </h3>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300">
                    Get SMS alerts when doses are missed. Set up reminders that work
                    for your schedule.
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

      {/* Trust Section */}
      <section className="py-16 sm:py-20 bg-gray-50 dark:bg-gray-900">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">
              Trusted by Families & Agencies
            </h2>
            <div className="flex flex-wrap items-center justify-center gap-8">
              <div className="flex items-center gap-3 px-6 py-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                <Shield className="w-8 h-8 text-green-600" />
                <div className="text-left">
                  <p className="font-semibold text-gray-900 dark:text-white">HIPAA Compliant</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Enterprise-grade security</p>
                </div>
              </div>
              <div className="flex items-center gap-3 px-6 py-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                <CheckCircle className="w-8 h-8 text-blue-600" />
                <div className="text-left">
                  <p className="font-semibold text-gray-900 dark:text-white">256-bit Encryption</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Your data is protected</p>
                </div>
              </div>
              <div className="flex items-center gap-3 px-6 py-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                <Users className="w-8 h-8 text-purple-600" />
                <div className="text-left">
                  <p className="font-semibold text-gray-900 dark:text-white">Family Trusted</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Built by caregivers</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-16 sm:py-24 bg-blue-600 dark:bg-blue-700">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready to Simplify Caregiving?
            </h2>
            <p className="mt-4 text-xl text-blue-100">
              Join families and agencies who trust MyHealthGuide for their care needs.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/family">
                <Button size="lg" variant="secondary" className="text-lg px-8">
                  <Heart className="w-5 h-5 mr-2" />
                  For Families
                </Button>
              </Link>
              <Link href="/agency">
                <Button size="lg" variant="outline" className="text-lg px-8 border-white text-white hover:bg-white/10">
                  <Building2 className="w-5 h-5 mr-2" />
                  For Agencies
                </Button>
              </Link>
            </div>
            <p className="mt-4 text-sm text-blue-200">
              Free trial &bull; No credit card required
            </p>
          </div>
        </div>
      </section>

    </div>
  );
}
