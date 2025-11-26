'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CreditCard, Calendar, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { format, differenceInDays } from 'date-fns';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

// Plan type definition
interface Plan {
  name: string;
  price: number;
  priceId: string | undefined;
  priceText?: string;
  features: string[];
}

// Plan configuration
const PLANS: Record<string, Plan> = {
  family: {
    name: 'Family Plan',
    price: 8.99,
    priceId: process.env.NEXT_PUBLIC_STRIPE_FAMILY_PRICE_ID,
    features: [
      'Up to 2 elders',
      '1 admin + 1 member',
      '25 MB storage',
      'Daily health summaries',
      'Medication reminders',
      'Voice-based logging'
    ]
  },
  single_agency: {
    name: 'Single Agency Plan',
    price: 14.99,
    priceId: process.env.NEXT_PUBLIC_STRIPE_SINGLE_AGENCY_PRICE_ID,
    features: [
      'Up to 4 elders',
      '1 caregiver + 3 members',
      '50 MB storage',
      'Agency dashboard',
      'Shift scheduling',
      'Compliance tracking'
    ]
  },
  multi_agency: {
    name: 'Multi Agency Plan',
    price: 30.00,
    priceId: process.env.NEXT_PUBLIC_STRIPE_MULTI_AGENCY_PRICE_ID,
    priceText: 'per elder/month',
    features: [
      'Up to 30 elders',
      'Up to 10 caregivers',
      '500 MB storage',
      'Multi-caregiver coordination',
      'Advanced analytics',
      'Priority support'
    ]
  }
};

export function SubscriptionSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'family' | 'single_agency' | 'multi_agency' | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Calculate trial status
  const trialDaysLeft = user?.trialEndDate
    ? differenceInDays(new Date(user.trialEndDate), new Date())
    : 0;
  const isTrialActive = user?.subscriptionStatus === 'trial' && trialDaysLeft > 0;
  const isExpired = user?.subscriptionStatus === 'expired';
  const isActive = user?.subscriptionStatus === 'active';
  const inGracePeriod = isExpired && user?.gracePeriodEndDate && new Date() < new Date(user.gracePeriodEndDate);

  // Calculate grace period hours left
  const gracePeriodHoursLeft = user?.gracePeriodEndDate
    ? Math.max(0, Math.floor((new Date(user.gracePeriodEndDate).getTime() - Date.now()) / (1000 * 60 * 60)))
    : 0;

  const handleUpgrade = async (planKey: 'family' | 'single_agency' | 'multi_agency') => {
    setLoading(true);
    setError(null);

    try {
      const plan = PLANS[planKey];

      if (!plan.priceId) {
        throw new Error('Price ID not configured for this plan');
      }

      // Create checkout session
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: plan.priceId,
          userId: user?.id,
          userEmail: user?.email,
          planName: plan.name,
          // If user is in trial, don't add another trial period
          skipTrial: isTrialActive
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const { url } = await response.json();

      // Redirect to Stripe Checkout
      if (url) {
        window.location.href = url;
      }
    } catch (err) {
      console.error('Error creating checkout session:', err);
      setError(err instanceof Error ? err.message : 'Failed to start checkout process');
    } finally {
      setLoading(false);
    }
  };

  const handleManageBilling = async () => {
    setLoading(true);
    try {
      // Create portal session for existing customers
      const response = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to access billing portal');
      }

      const { url } = await response.json();
      if (url) {
        window.location.href = url;
      }
    } catch (err) {
      setError('Unable to access billing portal. Please contact support.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Status Card */}
      <Card className={isExpired ? 'border-red-500' : isTrialActive ? 'border-blue-500' : 'border-green-500'}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Current Subscription Status
            {isActive && <CheckCircle className="w-5 h-5 text-green-600" />}
            {isTrialActive && <Clock className="w-5 h-5 text-blue-600" />}
            {isExpired && <XCircle className="w-5 h-5 text-red-600" />}
          </CardTitle>
          <CardDescription>
            {isActive && `Active ${user.subscriptionTier?.replace('_', ' ').toUpperCase()} subscription`}
            {isTrialActive && `Free trial - ${trialDaysLeft} days remaining`}
            {isExpired && inGracePeriod && `Trial expired - ${gracePeriodHoursLeft} hours to save your data`}
            {isExpired && !inGracePeriod && 'Account expired - Data will be deleted soon'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Trial Status */}
          {isTrialActive && (
            <Alert className="mb-4 bg-blue-50 border-blue-200">
              <Clock className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>Trial Period Active</strong>
                <br />
                Your trial ends on {user.trialEndDate ? format(new Date(user.trialEndDate), 'MMMM dd, yyyy') : 'unknown'}.
                <br />
                Upgrade now to ensure uninterrupted service.
              </AlertDescription>
            </Alert>
          )}

          {/* Grace Period Warning */}
          {isExpired && inGracePeriod && (
            <Alert className="mb-4 bg-red-50 border-red-300">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>⚠️ URGENT: Your data will be deleted in {gracePeriodHoursLeft} hours!</strong>
                <br />
                Your trial has expired. Subscribe now to keep your data or export it immediately.
                <br />
                After the grace period, all your data will be permanently deleted.
              </AlertDescription>
            </Alert>
          )}

          {/* Expired Warning */}
          {isExpired && !inGracePeriod && (
            <Alert className="mb-4 bg-gray-100 border-gray-300">
              <XCircle className="h-4 w-4 text-gray-600" />
              <AlertDescription className="text-gray-800">
                Your account has expired and data deletion is pending.
                Contact support if you need assistance.
              </AlertDescription>
            </Alert>
          )}

          {/* Active Subscription Info */}
          {isActive && user.subscriptionTier && (
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
                <div>
                  <p className="font-semibold">{PLANS[user.subscriptionTier as keyof typeof PLANS]?.name}</p>
                  <p className="text-sm text-gray-600">
                    ${PLANS[user.subscriptionTier as keyof typeof PLANS]?.price}/month
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleManageBilling}
                  disabled={loading}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Manage Billing
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Plans - Show if not active or in trial/expired */}
      {!isActive && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">
            {isTrialActive ? 'Upgrade Your Plan' : 'Choose Your Plan'}
          </h3>

          {error && (
            <Alert className="bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(PLANS).map(([key, plan]) => (
              <Card
                key={key}
                className={selectedPlan === key ? 'border-blue-500 shadow-lg' : ''}
              >
                <CardHeader>
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <div className="mt-2">
                    <span className="text-3xl font-bold">${plan.price}</span>
                    <span className="text-gray-500">
                      /{plan.priceText || 'month'}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={selectedPlan === key ? 'default' : 'outline'}
                    onClick={() => handleUpgrade(key as keyof typeof PLANS)}
                    disabled={loading || isActive}
                  >
                    {loading && selectedPlan === key ? 'Processing...' : 'Select Plan'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Billing Information - Show if active */}
      {isActive && (
        <Card>
          <CardHeader>
            <CardTitle>Billing Information</CardTitle>
            <CardDescription>Manage your payment methods and billing details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleManageBilling}
                disabled={loading}
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Update Payment Method
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleManageBilling}
                disabled={loading}
              >
                <Calendar className="w-4 h-4 mr-2" />
                View Billing History
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help Text */}
      <div className="text-sm text-gray-500 text-center">
        {isTrialActive && (
          <p>
            Questions about plans?{' '}
            <a href="/help" className="text-blue-600 hover:underline">
              Visit our help center
            </a>{' '}
            or{' '}
            <a href="mailto:support@myguide.health" className="text-blue-600 hover:underline">
              contact support
            </a>
          </p>
        )}
      </div>
    </div>
  );
}