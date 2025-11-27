'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CreditCard, Calendar, AlertCircle, CheckCircle, Clock, XCircle, ArrowUp, ArrowDown, Ban } from 'lucide-react';
import { format } from 'date-fns';
import { PLAN_HIERARCHY, PRICING, PLAN_FEATURES, CORE_FEATURES } from '@/lib/constants/pricing';

// Helper function to convert Firestore Timestamp to Date
function convertFirestoreTimestamp(timestamp: any): Date | null {
  if (!timestamp) return null;
  if (typeof timestamp === 'object' && 'seconds' in timestamp) {
    return new Date(timestamp.seconds * 1000);
  }
  if (timestamp instanceof Date) {
    return timestamp;
  }
  const parsed = new Date(timestamp);
  return isNaN(parsed.getTime()) ? null : parsed;
}

// Plan type definition
interface Plan {
  name: string;
  price: number;
  priceId: string | undefined;
  limits: readonly string[];
  extras: readonly string[];
}

// Plan configuration - using centralized PLAN_FEATURES
const PLANS: Record<string, Plan> = {
  family: {
    name: PLAN_FEATURES.family.name,
    price: PRICING.FAMILY.MONTHLY_RATE,
    priceId: process.env.NEXT_PUBLIC_STRIPE_FAMILY_PRICE_ID,
    limits: PLAN_FEATURES.family.limits,
    extras: PLAN_FEATURES.family.extras,
  },
  single_agency: {
    name: PLAN_FEATURES.single_agency.name,
    price: PRICING.SINGLE_AGENCY.MONTHLY_RATE,
    priceId: process.env.NEXT_PUBLIC_STRIPE_SINGLE_AGENCY_PRICE_ID,
    limits: PLAN_FEATURES.single_agency.limits,
    extras: PLAN_FEATURES.single_agency.extras,
  },
  multi_agency: {
    name: PLAN_FEATURES.multi_agency.name,
    price: PRICING.MULTI_AGENCY.MONTHLY_RATE,
    priceId: process.env.NEXT_PUBLIC_STRIPE_MULTI_AGENCY_PRICE_ID,
    limits: PLAN_FEATURES.multi_agency.limits,
    extras: PLAN_FEATURES.multi_agency.extras,
  }
};

type PlanKey = 'family' | 'single_agency' | 'multi_agency';

export function SubscriptionSettings() {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Dialog states
  const [showDowngradeDialog, setShowDowngradeDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: 'downgrade' | 'cancel'; plan?: PlanKey } | null>(null);

  // Convert Firestore timestamps to proper Date objects
  const trialEndDate = convertFirestoreTimestamp(user?.trialEndDate);
  const gracePeriodEndDate = convertFirestoreTimestamp(user?.gracePeriodEndDate);
  const currentPeriodEnd = convertFirestoreTimestamp(user?.currentPeriodEnd);
  const subscriptionStartDate = convertFirestoreTimestamp(user?.subscriptionStartDate);

  // Calculate trial day (Day X of 14)
  const TRIAL_DURATION = 14;
  const trialStartDate = trialEndDate
    ? new Date(trialEndDate.getTime() - TRIAL_DURATION * 24 * 60 * 60 * 1000)
    : null;
  const currentTrialDay = trialStartDate
    ? Math.min(TRIAL_DURATION, Math.max(1, Math.ceil((Date.now() - trialStartDate.getTime()) / (24 * 60 * 60 * 1000))))
    : 0;
  const trialDaysLeft = trialEndDate
    ? Math.max(0, Math.ceil((trialEndDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
    : 0;

  // Calculate days since subscription started (for refund window)
  const daysSinceSubscriptionStart = subscriptionStartDate
    ? Math.floor((Date.now() - subscriptionStartDate.getTime()) / (24 * 60 * 60 * 1000))
    : 999;
  const isWithinRefundWindow = daysSinceSubscriptionStart <= PRICING.REFUND_WINDOW_DAYS;

  const isTrialActive = user?.subscriptionStatus === 'trial' && trialDaysLeft > 0;
  const isExpired = user?.subscriptionStatus === 'expired';
  const isActive = user?.subscriptionStatus === 'active';
  const isCanceled = user?.subscriptionStatus === 'canceled';
  const inGracePeriod = isExpired && gracePeriodEndDate && new Date() < gracePeriodEndDate;
  const cancelAtPeriodEnd = user?.cancelAtPeriodEnd || false;
  const pendingPlanChange = user?.pendingPlanChange || null;

  // Calculate grace period hours left
  const gracePeriodHoursLeft = gracePeriodEndDate
    ? Math.max(0, Math.floor((gracePeriodEndDate.getTime() - Date.now()) / (1000 * 60 * 60)))
    : 0;

  // Determine if a plan change is upgrade or downgrade
  const getPlanChangeType = (newPlan: PlanKey): 'upgrade' | 'downgrade' | 'same' => {
    const currentRank = PLAN_HIERARCHY[user?.subscriptionTier || ''] || 0;
    const newRank = PLAN_HIERARCHY[newPlan] || 0;
    if (newRank > currentRank) return 'upgrade';
    if (newRank < currentRank) return 'downgrade';
    return 'same';
  };

  // Handle new subscription (trial/expired users)
  const handleSelectPlan = async (planKey: PlanKey) => {
    setSelectedPlan(planKey);
    setLoading(true);
    setError(null);

    try {
      const plan = PLANS[planKey];
      if (!plan.priceId) {
        throw new Error('Price ID not configured for this plan');
      }

      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: plan.priceId,
          userId: user?.id,
          userEmail: user?.email,
          planName: plan.name,
          skipTrial: isTrialActive
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const { url } = await response.json();
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

  // Handle plan change (upgrade/downgrade)
  const handleChangePlan = async (newPlan: PlanKey) => {
    const changeType = getPlanChangeType(newPlan);

    if (changeType === 'downgrade') {
      // Show confirmation dialog for downgrade
      setPendingAction({ type: 'downgrade', plan: newPlan });
      setShowDowngradeDialog(true);
      return;
    }

    // Upgrade - proceed immediately
    await executeChangePlan(newPlan);
  };

  const executeChangePlan = async (newPlan: PlanKey) => {
    setActionLoading(newPlan);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/billing/change-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          newPlan,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to change plan');
      }

      setSuccess(data.message);

      // Refresh user data
      if (refreshUser) {
        await refreshUser();
      }
    } catch (err) {
      console.error('Error changing plan:', err);
      setError(err instanceof Error ? err.message : 'Failed to change plan');
    } finally {
      setActionLoading(null);
      setShowDowngradeDialog(false);
      setPendingAction(null);
    }
  };

  // Handle cancellation
  const handleCancelSubscription = () => {
    setPendingAction({ type: 'cancel' });
    setShowCancelDialog(true);
  };

  const executeCancelSubscription = async () => {
    setActionLoading('cancel');
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/billing/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          reason: 'User requested cancellation',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel subscription');
      }

      setSuccess(data.message);

      // Refresh user data
      if (refreshUser) {
        await refreshUser();
      }
    } catch (err) {
      console.error('Error cancelling subscription:', err);
      setError(err instanceof Error ? err.message : 'Failed to cancel subscription');
    } finally {
      setActionLoading(null);
      setShowCancelDialog(false);
      setPendingAction(null);
    }
  };

  // Reactivate subscription (undo cancel at period end)
  const handleReactivateSubscription = async () => {
    setActionLoading('reactivate');
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/billing/cancel', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reactivate subscription');
      }

      setSuccess(data.message);

      if (refreshUser) {
        await refreshUser();
      }
    } catch (err) {
      console.error('Error reactivating subscription:', err);
      setError(err instanceof Error ? err.message : 'Failed to reactivate subscription');
    } finally {
      setActionLoading(null);
    }
  };

  // Cancel pending downgrade
  const handleCancelPendingChange = async () => {
    setActionLoading('cancelPending');
    setError(null);

    try {
      const response = await fetch('/api/billing/change-plan', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel pending change');
      }

      setSuccess(data.message);

      if (refreshUser) {
        await refreshUser();
      }
    } catch (err) {
      console.error('Error cancelling pending change:', err);
      setError(err instanceof Error ? err.message : 'Failed to cancel pending change');
    } finally {
      setActionLoading(null);
    }
  };

  const handleManageBilling = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id }),
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
      {/* Success/Error Messages */}
      {success && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert className="bg-red-50 border-red-200">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {/* Current Status Card */}
      <Card className={isExpired || isCanceled ? 'border-red-500' : isTrialActive ? 'border-blue-500' : cancelAtPeriodEnd ? 'border-yellow-500' : 'border-green-500'}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Current Subscription Status
            {isActive && !cancelAtPeriodEnd && <CheckCircle className="w-5 h-5 text-green-600" />}
            {isTrialActive && <Clock className="w-5 h-5 text-blue-600" />}
            {(isExpired || isCanceled) && <XCircle className="w-5 h-5 text-red-600" />}
            {cancelAtPeriodEnd && <Clock className="w-5 h-5 text-yellow-600" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Trial Status Display */}
          {isTrialActive && (
            <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-5 w-5 text-blue-600" />
                <span className="text-xl font-semibold text-blue-800">Trial</span>
              </div>
              <p className="text-blue-700 font-medium">Day {currentTrialDay} of {TRIAL_DURATION}</p>
              <p className="text-sm text-blue-600 mt-2">
                Your trial ends on {trialEndDate ? format(trialEndDate, 'MMMM dd, yyyy') : 'unknown'}.
                Subscribe now to ensure uninterrupted service.
              </p>
            </div>
          )}

          {/* Active Subscription Status Display */}
          {isActive && user?.subscriptionTier && (
            <div className={`mb-4 p-4 rounded-lg border ${cancelAtPeriodEnd ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'}`}>
              <div className="flex items-center gap-2 mb-1">
                {cancelAtPeriodEnd ? (
                  <Clock className="h-5 w-5 text-yellow-600" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                )}
                <span className={`text-xl font-semibold ${cancelAtPeriodEnd ? 'text-yellow-800' : 'text-green-800'}`}>
                  {PLANS[user.subscriptionTier as keyof typeof PLANS]?.name || 'Active'}
                </span>
              </div>
              <p className={cancelAtPeriodEnd ? 'text-yellow-700' : 'text-green-700'}>
                ${PLANS[user.subscriptionTier as keyof typeof PLANS]?.price}/elder/month
              </p>
              {currentPeriodEnd && (
                <p className="text-sm text-gray-600 mt-1">
                  {cancelAtPeriodEnd
                    ? `Access until ${format(currentPeriodEnd, 'MMMM dd, yyyy')}`
                    : `Next billing: ${format(currentPeriodEnd, 'MMMM dd, yyyy')}`}
                </p>
              )}

              {/* Cancellation warning */}
              {cancelAtPeriodEnd && (
                <div className="mt-3 p-3 bg-yellow-100 rounded-lg">
                  <p className="text-sm text-yellow-800 font-medium">
                    Your subscription is set to cancel at the end of your billing period.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={handleReactivateSubscription}
                    disabled={actionLoading === 'reactivate'}
                  >
                    {actionLoading === 'reactivate' ? 'Processing...' : 'Reactivate Subscription'}
                  </Button>
                </div>
              )}

              {/* Pending plan change */}
              {pendingPlanChange && (
                <div className="mt-3 p-3 bg-blue-100 rounded-lg">
                  <p className="text-sm text-blue-800 font-medium">
                    Pending change to {PLANS[pendingPlanChange]?.name} at end of billing period.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={handleCancelPendingChange}
                    disabled={actionLoading === 'cancelPending'}
                  >
                    {actionLoading === 'cancelPending' ? 'Processing...' : 'Cancel Pending Change'}
                  </Button>
                </div>
              )}

              {!cancelAtPeriodEnd && !pendingPlanChange && (
                <div className="mt-3 flex gap-2">
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
              )}
            </div>
          )}

          {/* Expired Status Display */}
          {(isExpired || isCanceled) && (
            <div className="mb-4 p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center gap-2 mb-1">
                <XCircle className="h-5 w-5 text-red-600" />
                <span className="text-xl font-semibold text-red-800">
                  {isCanceled ? 'Cancelled' : 'Expired'}
                </span>
              </div>
              {inGracePeriod ? (
                <p className="text-red-700">{gracePeriodHoursLeft} hours left to save your data</p>
              ) : (
                <p className="text-red-700">Subscribe to restore access</p>
              )}
            </div>
          )}

          {/* Grace Period Warning */}
          {isExpired && inGracePeriod && (
            <Alert className="mb-4 bg-red-50 border-red-300">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>Your data will be deleted in {gracePeriodHoursLeft} hours!</strong>
                <br />
                Subscribe now to keep your data or export it immediately.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Available Plans - Show for trial/expired/canceled users */}
      {(isTrialActive || isExpired || isCanceled) && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Choose Your Plan</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(PLANS).map(([key, plan]) => {
              const isSelected = selectedPlan === key;
              return (
                <Card
                  key={key}
                  className={`cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? 'border-2 border-blue-500 shadow-lg'
                      : 'border border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedPlan(key as PlanKey)}
                >
                  <CardHeader>
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    <div className="mt-2">
                      <span className="text-3xl font-bold">${plan.price}</span>
                      <span className="text-gray-500">/elder/month</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 mb-6">
                      {/* Plan limits */}
                      {plan.limits.map((limit, index) => (
                        <li key={`limit-${index}`} className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <span className="text-sm font-medium">{limit}</span>
                        </li>
                      ))}
                      {/* Core features (all plans) */}
                      {CORE_FEATURES.slice(0, 3).map((feature, index) => (
                        <li key={`core-${index}`} className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                      {/* Plan extras */}
                      {plan.extras.map((extra, index) => (
                        <li key={`extra-${index}`} className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{extra}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      className={`w-full ${isSelected ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}`}
                      variant={isSelected ? 'default' : 'outline'}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectPlan(key as PlanKey);
                      }}
                      disabled={loading}
                    >
                      {loading && selectedPlan === key ? 'Processing...' : 'Select Plan'}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Change Plan - Show for active users */}
      {isActive && !cancelAtPeriodEnd && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Change Your Plan</h3>
          <p className="text-sm text-gray-600">
            Upgrades take effect immediately (prorated). Downgrades take effect at the end of your billing period.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(PLANS).map(([key, plan]) => {
              const planKey = key as PlanKey;
              const isCurrentPlan = user?.subscriptionTier === key;
              const isPendingPlan = pendingPlanChange === key;
              const changeType = getPlanChangeType(planKey);
              const isSelected = selectedPlan === key;

              return (
                <Card
                  key={key}
                  className={`cursor-pointer transition-all duration-200 ${
                    isCurrentPlan
                      ? 'border-2 border-green-500 bg-green-50'
                      : isPendingPlan
                      ? 'border-2 border-blue-500 bg-blue-50'
                      : isSelected
                      ? 'border-2 border-blue-500 shadow-lg'
                      : 'border border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => !isCurrentPlan && !isPendingPlan && setSelectedPlan(planKey)}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                      {isCurrentPlan && (
                        <span className="text-xs bg-green-600 text-white px-2 py-1 rounded-full">Current</span>
                      )}
                      {isPendingPlan && (
                        <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded-full">Pending</span>
                      )}
                    </div>
                    <div className="mt-2">
                      <span className="text-3xl font-bold">${plan.price}</span>
                      <span className="text-gray-500">/elder/month</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 mb-6">
                      {/* Plan limits */}
                      {plan.limits.map((limit, index) => (
                        <li key={`limit-${index}`} className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <span className="text-sm font-medium">{limit}</span>
                        </li>
                      ))}
                      {/* Core features (all plans) */}
                      {CORE_FEATURES.slice(0, 3).map((feature, index) => (
                        <li key={`core-${index}`} className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                      {/* Plan extras */}
                      {plan.extras.map((extra, index) => (
                        <li key={`extra-${index}`} className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{extra}</span>
                        </li>
                      ))}
                    </ul>
                    {isCurrentPlan ? (
                      <Button className="w-full" variant="outline" disabled>
                        Current Plan
                      </Button>
                    ) : isPendingPlan ? (
                      <Button className="w-full" variant="outline" disabled>
                        Pending Change
                      </Button>
                    ) : (
                      <Button
                        className={`w-full ${isSelected ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}`}
                        variant={isSelected ? 'default' : 'outline'}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleChangePlan(planKey);
                        }}
                        disabled={actionLoading === planKey}
                      >
                        {actionLoading === planKey ? (
                          'Processing...'
                        ) : changeType === 'upgrade' ? (
                          <>
                            <ArrowUp className="w-4 h-4 mr-1" /> Upgrade
                          </>
                        ) : (
                          <>
                            <ArrowDown className="w-4 h-4 mr-1" /> Downgrade
                          </>
                        )}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Cancel Subscription Section */}
      {isActive && !cancelAtPeriodEnd && (
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-gray-700">Cancel Subscription</CardTitle>
            <CardDescription>
              {isWithinRefundWindow
                ? `You're within the ${PRICING.REFUND_WINDOW_DAYS}-day refund window. Cancelling now will provide a full refund.`
                : `Cancelling will keep your access until ${currentPeriodEnd ? format(currentPeriodEnd, 'MMMM dd, yyyy') : 'end of billing period'}.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50"
              onClick={handleCancelSubscription}
              disabled={loading}
            >
              <Ban className="w-4 h-4 mr-2" />
              Cancel Subscription
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Billing Information */}
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
        <p>
          Questions about plans?{' '}
          <a href="/help" className="text-blue-600 hover:underline">Visit our help center</a>
          {' '}or{' '}
          <a href="mailto:support@myguide.health" className="text-blue-600 hover:underline">contact support</a>
        </p>
      </div>

      {/* Downgrade Confirmation Dialog */}
      <Dialog open={showDowngradeDialog} onOpenChange={setShowDowngradeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Plan Downgrade</DialogTitle>
            <DialogDescription>
              {pendingAction?.plan && (
                <>
                  You are downgrading to the <strong>{PLANS[pendingAction.plan]?.name}</strong>.
                  <br /><br />
                  This change will take effect at the end of your current billing period
                  {currentPeriodEnd && ` (${format(currentPeriodEnd, 'MMMM dd, yyyy')})`}.
                  You will continue to have access to your current plan until then.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDowngradeDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => pendingAction?.plan && executeChangePlan(pendingAction.plan)}
              disabled={actionLoading !== null}
            >
              {actionLoading ? 'Processing...' : 'Confirm Downgrade'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Subscription Confirmation Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Subscription</DialogTitle>
            <DialogDescription>
              {isWithinRefundWindow ? (
                <>
                  You are within the <strong>{PRICING.REFUND_WINDOW_DAYS}-day refund window</strong>.
                  <br /><br />
                  Cancelling now will:
                  <ul className="list-disc ml-5 mt-2">
                    <li>Immediately cancel your subscription</li>
                    <li>Provide a <strong>full refund</strong> to your payment method</li>
                    <li>Remove access to premium features</li>
                  </ul>
                </>
              ) : (
                <>
                  Your subscription has been active for more than {PRICING.REFUND_WINDOW_DAYS} days.
                  <br /><br />
                  Cancelling will:
                  <ul className="list-disc ml-5 mt-2">
                    <li>Keep your access until <strong>{currentPeriodEnd ? format(currentPeriodEnd, 'MMMM dd, yyyy') : 'end of billing period'}</strong></li>
                    <li>Stop future billing</li>
                    <li>No refund will be issued</li>
                  </ul>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
              Keep Subscription
            </Button>
            <Button
              variant="destructive"
              onClick={executeCancelSubscription}
              disabled={actionLoading === 'cancel'}
            >
              {actionLoading === 'cancel' ? 'Processing...' : 'Cancel Subscription'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
