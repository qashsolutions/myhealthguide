'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Heart, Users, Shield, CheckCircle } from 'lucide-react';
import { PRICING } from '@/lib/constants/pricing';

/**
 * Shared PricingCards Component
 *
 * This component was created to eliminate code duplication between:
 * - Homepage (src/app/(public)/page.tsx)
 * - Pricing Page (src/app/(public)/pricing/page.tsx)
 *
 * Benefits:
 * - Single source of truth for pricing data (uses PRICING constants)
 * - Consistency across all pages
 * - Easier maintenance (update once, reflects everywhere)
 * - Prevents bugs like the $144 vs $30 discrepancy
 */

export interface PricingCardsProps {
  showHeader?: boolean;
  showTrialInfo?: boolean;
  defaultSelectedPlan?: 'family' | 'single' | 'multi';
}

export function PricingCards({
  showHeader = true,
  showTrialInfo = true,
  defaultSelectedPlan = 'single',
}: PricingCardsProps) {
  const [selectedPlan, setSelectedPlan] = useState<'family' | 'single' | 'multi'>(defaultSelectedPlan);

  // Plan data - using PRICING constants as single source of truth
  const plans = [
    {
      id: 'family' as const,
      name: 'Family',
      subtitle: 'Perfect for small families',
      price: PRICING.FAMILY.MONTHLY_RATE,
      priceNote: 'month',
      icon: Heart,
      iconColor: 'text-blue-600',
      iconBgColor: 'bg-blue-100 dark:bg-blue-900',
      popular: false,
      features: [
        `1 admin + 1 member`,
        `Up to ${PRICING.FAMILY.MAX_ELDERS} elders`,
        '25 MB storage',
        'Voice-powered logging',
        'Medication & diet tracking',
        'AI health insights',
      ],
    },
    {
      id: 'single' as const,
      name: 'Single Agency',
      subtitle: 'For families & caregivers',
      price: PRICING.SINGLE_AGENCY.MONTHLY_RATE,
      priceNote: 'month',
      icon: Users,
      iconColor: 'text-white',
      iconBgColor: 'bg-blue-600',
      popular: true,
      features: [
        `1 admin + up to ${PRICING.SINGLE_AGENCY.MAX_MEMBERS - 1} members`,
        `Up to ${PRICING.SINGLE_AGENCY.MAX_ELDERS} elders`,
        '50 MB storage',
        'All Basic features',
        'Real-time collaboration',
        'Weekly health reports',
      ],
    },
    {
      id: 'multi' as const,
      name: 'Multi Agency',
      subtitle: 'For professional caregivers',
      price: PRICING.MULTI_AGENCY.ELDER_MONTHLY_RATE,
      priceNote: 'per elder',
      icon: Shield,
      iconColor: 'text-purple-600 dark:text-purple-400',
      iconBgColor: 'bg-purple-100 dark:bg-purple-900',
      popular: false,
      features: [
        `Up to ${PRICING.MULTI_AGENCY.MAX_CAREGIVERS} caregivers`,
        `Up to ${PRICING.MULTI_AGENCY.MAX_ELDERS} elders total`,
        `${PRICING.MULTI_AGENCY.BILLING_CYCLE_DAYS}-day billing cycles`,
        '200 MB storage',
        'Agency dashboard & analytics',
        'Compliance & burnout tracking',
      ],
    },
  ];

  return (
    <div className="py-24 sm:py-32 bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        {showHeader && (
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-base font-semibold leading-7 text-blue-600 dark:text-blue-400">
              Simple Pricing
            </h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              Choose the plan that fits your needs
            </p>
            {showTrialInfo && (
              <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
                All plans include 14-day free trial. No credit card required.
              </p>
            )}
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const isSelected = selectedPlan === plan.id;

            return (
              <Card
                key={plan.id}
                className={`relative cursor-pointer transition-all ${
                  isSelected
                    ? 'border-2 border-blue-600 shadow-xl'
                    : 'border hover:border-blue-300'
                }`}
                onClick={() => setSelectedPlan(plan.id)}
              >
                {plan.popular && (
                  <div className="absolute top-0 right-6 transform -translate-y-1/2">
                    <span className="bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                      Most Popular
                    </span>
                  </div>
                )}

                <CardContent className="pt-8">
                  {/* Icon & Title */}
                  <div className="text-center mb-6">
                    <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${plan.iconBgColor} mb-4`}>
                      <Icon className={`w-8 h-8 ${plan.iconColor}`} />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {plan.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      {plan.subtitle}
                    </p>

                    {/* Price */}
                    <div className="mt-4">
                      <span className="text-4xl font-bold text-gray-900 dark:text-white">
                        ${plan.price}
                      </span>
                      <span className="text-gray-600 dark:text-gray-400">
                        /{plan.priceNote}
                      </span>
                    </div>
                  </div>

                  {/* Features */}
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {index === 0 && plan.id !== 'family' ? (
                            <strong>{feature}</strong>
                          ) : (
                            feature
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  <Link href="/signup" className="block">
                    <Button
                      variant={isSelected ? 'default' : 'outline'}
                      className={`w-full ${
                        isSelected
                          ? '!bg-blue-600 hover:!bg-blue-700 !text-white !border-blue-600'
                          : ''
                      }`}
                    >
                      Get Started
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Trial Info Footer */}
        {showTrialInfo && (
          <div className="mt-16 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              All plans include a 14-day free trial. No credit card required.
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Need help choosing?{' '}
              <a href="/contact" className="text-blue-600 hover:underline">
                Contact us
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
