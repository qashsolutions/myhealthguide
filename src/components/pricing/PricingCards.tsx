'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Heart, Users, Shield, CheckCircle, Loader2 } from 'lucide-react';
import {
  PLAN_CONFIG,
  CORE_FEATURES,
  getStripePriceId,
  MULTI_AGENCY_TRIAL_DAYS,
  TRIAL_DURATION_DAYS,
  type PlanTier,
} from '@/lib/subscription';


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
  defaultSelectedPlan?: PlanTier;
  recommendedPlan?: PlanTier | null;
}

export function PricingCards({
  showHeader = true,
  showTrialInfo = true,
  defaultSelectedPlan = 'single_agency',
  recommendedPlan = null,
}: PricingCardsProps) {
  const [selectedPlan, setSelectedPlan] = useState<PlanTier>(defaultSelectedPlan);
  const [loading, setLoading] = useState<string | null>(null);
  const { user } = useAuth();

  const handleSubscribe = async (planId: PlanTier, planName: string) => {
    // If not logged in, redirect to signup
    if (!user) {
      window.location.href = '/signup';
      return;
    }

    setLoading(planId);

    try {
      const priceId = getStripePriceId(planId);

      if (!priceId) {
        throw new Error('Price ID not configured');
      }

      // Create checkout session
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId,
          userId: user.id,
          userEmail: user.email,
          planName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout URL
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Subscription error:', error);
      alert(error instanceof Error ? error.message : 'Failed to start subscription');
    } finally {
      setLoading(null);
    }
  };

  // Plan data - using centralized PLAN_CONFIG as single source of truth
  const plans = [
    {
      id: 'family' as const,
      name: PLAN_CONFIG.family.name,
      subtitle: PLAN_CONFIG.family.subtitle,
      price: PLAN_CONFIG.family.price,
      priceNote: 'elder/month',
      icon: Heart,
      iconColor: 'text-blue-600',
      iconBgColor: 'bg-blue-100 dark:bg-blue-900',
      popular: false,
      trialDays: TRIAL_DURATION_DAYS,
      limits: [
        `${PLAN_CONFIG.family.limits.maxElders} elder`,
        `1 admin + 1 member`,
        `${PLAN_CONFIG.family.limits.storageMB} MB storage`,
      ],
      extras: PLAN_CONFIG.family.extras,
    },
    {
      id: 'single_agency' as const,
      name: PLAN_CONFIG.single_agency.name,
      subtitle: PLAN_CONFIG.single_agency.subtitle,
      price: PLAN_CONFIG.single_agency.price,
      priceNote: 'month',
      icon: Users,
      iconColor: 'text-white',
      iconBgColor: 'bg-blue-600',
      popular: true,
      trialDays: TRIAL_DURATION_DAYS,
      limits: [
        `${PLAN_CONFIG.single_agency.limits.maxElders} elder`,
        `1 admin + ${PLAN_CONFIG.single_agency.limits.maxMembers - 1} members`,
        `${PLAN_CONFIG.single_agency.limits.storageMB} MB storage`,
      ],
      extras: PLAN_CONFIG.single_agency.extras,
    },
    {
      id: 'multi_agency' as const,
      name: PLAN_CONFIG.multi_agency.name,
      subtitle: PLAN_CONFIG.multi_agency.subtitle,
      price: PLAN_CONFIG.multi_agency.price,
      priceNote: 'elder/month',
      icon: Shield,
      iconColor: 'text-purple-600 dark:text-purple-400',
      iconBgColor: 'bg-purple-100 dark:bg-purple-900',
      popular: false,
      trialDays: MULTI_AGENCY_TRIAL_DAYS,
      limits: [
        `Up to ${PLAN_CONFIG.multi_agency.limits.maxElders} elders`,
        `Up to ${PLAN_CONFIG.multi_agency.limits.maxCaregivers} caregivers`,
        `${PLAN_CONFIG.multi_agency.limits.storageMB} MB storage`,
      ],
      extras: PLAN_CONFIG.multi_agency.extras,
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
                All plans include a free trial. Cancel anytime for a full refund.
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
                {/* Recommended badge - takes priority */}
                {recommendedPlan === plan.id && (
                  <div className="absolute top-0 right-6 transform -translate-y-1/2">
                    <span className="bg-green-600 text-white px-4 py-1 rounded-full text-sm font-semibold flex items-center gap-1.5">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Recommended for you
                    </span>
                  </div>
                )}
                {/* Most Popular badge - only show if no recommendation */}
                {plan.popular && recommendedPlan !== plan.id && !recommendedPlan && (
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
                  <ul className="space-y-2.5 mb-8">
                    {/* Plan limits */}
                    {plan.limits.map((limit, index) => (
                      <li key={`limit-${index}`} className="flex items-start gap-2.5">
                        <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                          {limit}
                        </span>
                      </li>
                    ))}

                    {/* Divider */}
                    <li className="py-1">
                      <div className="border-t border-gray-200 dark:border-gray-700" />
                    </li>

                    {/* Family Plan A: Show all core features */}
                    {plan.id === 'family' && (
                      <>
                        <li className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                          Core Features
                        </li>
                        {CORE_FEATURES.map((feature, index) => (
                          <li key={`core-${index}`} className="flex items-start gap-2.5">
                            <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {feature}
                            </span>
                          </li>
                        ))}
                      </>
                    )}

                    {/* Family Plan B: Inherits from A + Team Features */}
                    {plan.id === 'single_agency' && (
                      <>
                        <li className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide">
                          All Features from Family Plan A, plus:
                        </li>
                        <li className="pt-2">
                          <div className="border-t border-gray-200 dark:border-gray-700" />
                        </li>
                        <li className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wide pt-1">
                          Team Features
                        </li>
                        {plan.extras.map((extra, index) => (
                          <li key={`extra-${index}`} className="flex items-start gap-2.5">
                            <CheckCircle className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {extra}
                            </span>
                          </li>
                        ))}
                      </>
                    )}

                    {/* Multi Agency: Inherits from B + Agency Features */}
                    {plan.id === 'multi_agency' && (
                      <>
                        <li className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide">
                          All Features from Family Plan B, plus:
                        </li>
                        <li className="pt-2">
                          <div className="border-t border-gray-200 dark:border-gray-700" />
                        </li>
                        <li className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wide pt-1">
                          Agency Features
                        </li>
                        {plan.extras.map((extra, index) => (
                          <li key={`extra-${index}`} className="flex items-start gap-2.5">
                            <CheckCircle className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {extra}
                            </span>
                          </li>
                        ))}
                      </>
                    )}
                  </ul>

                  {/* CTA Button */}
                  <Button
                    variant={isSelected ? 'default' : 'outline'}
                    className={`w-full ${
                      isSelected
                        ? '!bg-blue-600 hover:!bg-blue-700 !text-white !border-blue-600'
                        : ''
                    }`}
                    onClick={() => handleSubscribe(plan.id, plan.name)}
                    disabled={loading === plan.id}
                  >
                    {loading === plan.id ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      `Start ${plan.trialDays}-Day Free Trial`
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Trial Info Footer */}
        {showTrialInfo && (
          <div className="mt-16 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Family Plans (A & B) include a {TRIAL_DURATION_DAYS}-day free trial.
              Multi Agency plan includes a {MULTI_AGENCY_TRIAL_DAYS}-day free trial.
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Need help choosing?{' '}
              <a href="mailto:admin@myguide.health" className="text-blue-600 hover:underline">
                Contact us
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
