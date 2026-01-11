'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Heart,
  Users,
  Shield,
  CheckCircle,
  Loader2,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Building2,
  UserCheck,
  Eye
} from 'lucide-react';
import {
  PLAN_CONFIG,
  CORE_FEATURES,
  getStripePriceId,
  MULTI_AGENCY_TRIAL_DAYS,
  TRIAL_DURATION_DAYS,
  type PlanTier,
} from '@/lib/subscription';
import { canManageBilling, isSuperAdmin, isFamilyAdmin } from '@/lib/utils/getUserRole';
import { cn } from '@/lib/utils';

/**
 * Tabbed Pricing Cards Component
 *
 * Redesigned pricing page with:
 * - Tab 1: Individual & Small Agency (Family Plan A, Family Plan B)
 * - Tab 2: Multi-Agency (Professional care organizations)
 * - Collapsible role-based feature lists
 */

// Feature lists by role - Top 10 for each
const CAREGIVER_FEATURES = [
  'Voice-powered health logging',
  'Medication & supplement tracking with reminders',
  'Diet & nutrition logging with analysis',
  'Smart health insights & AI chat',
  'Drug interaction checking',
  'Dementia screening (Q&A + behavioral)',
  'Clinical notes for doctor visits',
  'Incident reporting & tracking',
  'Push notification reminders',
  'Offline mode support',
];

const MEMBER_FEATURES = [
  'View all health records (read-only)',
  'View medication schedules',
  'View care activity logs',
  'Receive push notifications',
  'Access daily care summaries',
  'View family update reports',
  'Access symptom checker',
  'View incident reports',
  'Mobile app access',
  'Real-time care updates',
];

const AGENCY_OWNER_FEATURES = [
  'Manage up to 10 caregivers',
  'Assign loved ones to caregivers',
  'Shift calendar & scheduling',
  'Smart handoff notes between shifts',
  'Caregiver availability tracking',
  'Caregiver burnout detection',
  'Agency-wide analytics dashboard',
  'Timesheet tracking & reports',
  'Billing & subscription management',
  'Invite & manage team members',
];

type TabType = 'individual' | 'agency';

interface CollapsibleFeaturesProps {
  title: string;
  icon: React.ReactNode;
  features: string[];
  defaultOpen?: boolean;
  iconColor?: string;
}

function CollapsibleFeatures({ title, icon, features, defaultOpen = false, iconColor = 'text-blue-600' }: CollapsibleFeaturesProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className={iconColor}>{icon}</span>
          <span className="font-semibold text-gray-900 dark:text-white">{title}</span>
          <span className="text-sm text-gray-500">({features.length} features)</span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-500" />
        )}
      </button>
      {isOpen && (
        <ul className="p-4 space-y-2 bg-white dark:bg-gray-900">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export interface TabbedPricingCardsProps {
  showHeader?: boolean;
  showTrialInfo?: boolean;
}

export function TabbedPricingCards({
  showHeader = true,
  showTrialInfo = true,
}: TabbedPricingCardsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('individual');
  const [selectedPlan, setSelectedPlan] = useState<PlanTier>('single_agency');
  const [loading, setLoading] = useState<string | null>(null);
  const { user } = useAuth();

  const userCanManageBilling = !user || canManageBilling(user);

  const handleSubscribe = async (planId: PlanTier, planName: string) => {
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

  // Individual tab plans
  const individualPlans = [
    {
      id: 'family' as const,
      name: 'Family Plan A',
      subtitle: 'Solo caregiver with one loved one',
      price: PLAN_CONFIG.family.price,
      priceNote: '/month',
      icon: Heart,
      iconColor: 'text-blue-600',
      iconBgColor: 'bg-blue-100 dark:bg-blue-900',
      trialDays: TRIAL_DURATION_DAYS,
      highlights: [
        '1 Caregiver (admin)',
        '1 Loved One',
        '1 Member (read-only)',
        `${PLAN_CONFIG.family.limits.storageMB} MB storage`,
      ],
      whoCanSubscribe: 'Caregiver (admin) only',
    },
    {
      id: 'single_agency' as const,
      name: 'Family Plan B',
      subtitle: 'Family coordinating care together',
      price: PLAN_CONFIG.single_agency.price,
      priceNote: '/month',
      icon: Users,
      iconColor: 'text-white',
      iconBgColor: 'bg-blue-600',
      trialDays: TRIAL_DURATION_DAYS,
      highlights: [
        '1 Caregiver (admin)',
        '1 Loved One',
        '3 Members (read-only)',
        `${PLAN_CONFIG.single_agency.limits.storageMB} MB storage`,
        'Real-time updates for all',
      ],
      whoCanSubscribe: 'Caregiver (admin) only',
      popular: true,
    },
  ];

  // Agency tab plans
  const agencyPlans = [
    {
      id: 'multi_agency' as const,
      name: 'Multi Agency Plan',
      subtitle: 'Professional care organizations',
      price: PLAN_CONFIG.multi_agency.price,
      priceNote: '/loved one/month',
      icon: Shield,
      iconColor: 'text-purple-600 dark:text-purple-400',
      iconBgColor: 'bg-purple-100 dark:bg-purple-900',
      trialDays: MULTI_AGENCY_TRIAL_DAYS,
      highlights: [
        '1 Agency Owner',
        'Up to 10 Caregivers',
        'Up to 3 Loved Ones per Caregiver (30 total)',
        'Up to 2 Members per Loved One',
        `${PLAN_CONFIG.multi_agency.limits.storageMB} MB storage`,
      ],
      whoCanSubscribe: 'Agency Owner only',
    },
  ];

  const currentPlans = activeTab === 'individual' ? individualPlans : agencyPlans;

  // Check if logged-in user should see specific tab
  const getDefaultTab = (): TabType => {
    if (!user) return 'individual';
    if (isSuperAdmin(user)) return 'agency';
    return 'individual';
  };

  return (
    <div className="py-16 sm:py-20 bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        {showHeader && (
          <div className="mx-auto max-w-2xl text-center mb-12">
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

        {/* Tab Navigation */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex rounded-lg bg-gray-100 dark:bg-gray-800 p-1">
            <button
              onClick={() => setActiveTab('individual')}
              className={cn(
                'px-6 py-3 rounded-md text-sm font-medium transition-all',
                activeTab === 'individual'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              )}
            >
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4" />
                <span>For Families</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('agency')}
              className={cn(
                'px-6 py-3 rounded-md text-sm font-medium transition-all',
                activeTab === 'agency'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              )}
            >
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                <span>For Agencies</span>
              </div>
            </button>
          </div>
        </div>

        {/* Non-billing user message */}
        {user && !userCanManageBilling && (
          <div className="mx-auto max-w-md text-center py-12">
            <div className="inline-flex p-4 rounded-full bg-gray-100 dark:bg-gray-800 mb-6">
              <ShieldAlert className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Subscription Managed by Your Organization
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Your subscription is managed by your administrator. Please contact them for any billing-related questions.
            </p>
          </div>
        )}

        {/* Plan Cards */}
        {(!user || userCanManageBilling) && (
          <div className={cn(
            'grid gap-8 mb-16',
            currentPlans.length === 1 ? 'grid-cols-1 max-w-lg mx-auto' : 'grid-cols-1 lg:grid-cols-2 max-w-4xl mx-auto'
          )}>
            {currentPlans.map((plan) => {
              const Icon = plan.icon;
              const isSelected = selectedPlan === plan.id;

              return (
                <Card
                  key={plan.id}
                  className={cn(
                    'relative transition-all cursor-pointer',
                    isSelected
                      ? 'border-2 border-blue-600 shadow-xl'
                      : 'border hover:border-blue-300',
                    'popular' in plan && plan.popular && 'ring-2 ring-blue-600'
                  )}
                  onClick={() => setSelectedPlan(plan.id)}
                >
                  {'popular' in plan && plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                        Most Popular
                      </span>
                    </div>
                  )}
                  <CardContent className="pt-8">
                    {/* Icon & Title */}
                    <div className="text-center mb-6">
                      <div className={cn(
                        'inline-flex items-center justify-center w-16 h-16 rounded-full mb-4',
                        plan.iconBgColor
                      )}>
                        <Icon className={cn('w-8 h-8', plan.iconColor)} />
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
                          {plan.priceNote}
                        </span>
                      </div>
                    </div>

                    {/* Plan Highlights */}
                    <ul className="space-y-3 mb-6">
                      {plan.highlights.map((highlight, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-700 dark:text-gray-300">{highlight}</span>
                        </li>
                      ))}
                    </ul>

                    {/* Who can subscribe */}
                    <div className="text-center text-sm text-gray-500 dark:text-gray-400 mb-6 py-2 bg-gray-50 dark:bg-gray-800 rounded">
                      <span className="font-medium">Who can subscribe:</span> {plan.whoCanSubscribe}
                    </div>

                    {/* CTA Button */}
                    <Button
                      variant={isSelected ? 'default' : 'outline'}
                      className={cn(
                        'w-full',
                        isSelected && '!bg-blue-600 hover:!bg-blue-700 !text-white !border-blue-600'
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSubscribe(plan.id, plan.name);
                      }}
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
        )}

        {/* Collapsible Feature Sections */}
        <div className="max-w-4xl mx-auto">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white text-center mb-8">
            Feature Details by Role
          </h3>
          <div className="space-y-4">
            <CollapsibleFeatures
              title="Caregiver Features"
              icon={<UserCheck className="w-5 h-5" />}
              features={CAREGIVER_FEATURES}
              defaultOpen={true}
              iconColor="text-blue-600"
            />
            <CollapsibleFeatures
              title="Member Features (Read-Only)"
              icon={<Eye className="w-5 h-5" />}
              features={MEMBER_FEATURES}
              iconColor="text-green-600"
            />
            {activeTab === 'agency' && (
              <CollapsibleFeatures
                title="Agency Owner Features"
                icon={<Building2 className="w-5 h-5" />}
                features={AGENCY_OWNER_FEATURES}
                defaultOpen={true}
                iconColor="text-purple-600"
              />
            )}
          </div>
        </div>

        {/* Core Features Section */}
        <div className="max-w-4xl mx-auto mt-16">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white text-center mb-8">
            All Plans Include
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CORE_FEATURES.map((feature, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg">
                <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700 dark:text-gray-300">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
