'use client';

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
} from 'lucide-react';
import { PricingCards } from '@/components/pricing/PricingCards';

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
            <div className="mt-10 flex items-center justify-center">
              <Link href="/features">
                <Button variant="outline" size="lg" className="text-lg px-8">
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

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
      <PricingCards showHeader={true} showTrialInfo={true} defaultSelectedPlan="single" />

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
              All plans include 14-day free trial. No credit card required.
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

    </div>
  );
}
