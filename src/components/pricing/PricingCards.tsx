'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Heart, Users, Shield, CheckCircle, Loader2 } from 'lucide-react';
import {
  PLAN_CONFIG,
  CORE_FEATURES,
  DETAILED_FEATURES,
  getStripePriceId,
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
}

export function PricingCards({
  showHeader = true,
  showTrialInfo = true,
  defaultSelectedPlan = 'single_agency',
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
      priceNote: 'elder/month',
      icon: Users,
      iconColor: 'text-white',
      iconBgColor: 'bg-blue-600',
      popular: true,
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
                All plans include 45-day free trial. Cancel anytime for a full refund.
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

                    {/* Core features label */}
                    <li className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Core Features
                    </li>

                    {/* Core features (show 5 for cards) */}
                    {CORE_FEATURES.slice(0, 5).map((feature, index) => (
                      <li key={`core-${index}`} className="flex items-start gap-2.5">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {feature}
                        </span>
                      </li>
                    ))}

                    {/* Show "+X more" for remaining core features */}
                    {CORE_FEATURES.length > 5 && (
                      <li className="text-xs text-gray-500 dark:text-gray-400 pl-6">
                        + {CORE_FEATURES.length - 5} more core features
                      </li>
                    )}

                    {/* Plan extras (tier-specific) */}
                    {plan.extras.length > 0 && (
                      <>
                        <li className="pt-1">
                          <div className="border-t border-gray-200 dark:border-gray-700" />
                        </li>
                        <li className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wide">
                          {plan.id === 'single_agency' ? 'Agency Features' : 'Multi-Agency Features'}
                        </li>
                        {plan.extras.slice(0, 4).map((extra, index) => (
                          <li key={`extra-${index}`} className="flex items-start gap-2.5">
                            <CheckCircle className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {extra}
                            </span>
                          </li>
                        ))}
                        {plan.extras.length > 4 && (
                          <li className="text-xs text-gray-500 dark:text-gray-400 pl-6">
                            + {plan.extras.length - 4} more agency features
                          </li>
                        )}
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
                      'Start 45-Day Free Trial'
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
              All plans include a 45-day free trial. Cancel anytime for a full refund.
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
