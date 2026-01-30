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
import { CreditCard, Calendar, AlertCircle, CheckCircle, Clock, XCircle, ArrowUp, ArrowDown, Ban, ShieldAlert, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import {
  PLAN_CONFIG,
  PLAN_HIERARCHY,
  PRICING,
  CORE_FEATURES,
  getStripePriceId,
  TRIAL_DURATION_DAYS,
  MULTI_AGENCY_TRIAL_DAYS,
  type PlanTier,
} from '@/lib/subscription';
import { canManageBilling } from '@/lib/utils/getUserRole';
import { validateDowngrade, type DowngradeBlocker } from '@/lib/firebase/planLimits';
import { DowngradeBlockedModal } from './DowngradeBlockedModal';

// Helper function to convert Firestore Timestamp to Date
function convertFirestoreTimestamp(timestamp: unknown): Date | null {
  if (!timestamp) return null;
  if (typeof timestamp === 'object' && timestamp !== null && 'seconds' in timestamp) {
    return new Date((timestamp as { seconds: number }).seconds * 1000);
  }
  if (timestamp instanceof Date) {
    return timestamp;
  }
  if (typeof timestamp === 'string' || typeof timestamp === 'number') {
    const parsed = new Date(timestamp);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

// Plan type definition
interface Plan {
  name: string;
  price: number;
  priceId: string | undefined;
  limits: string[];
  extras: string[];
}

// Plan configuration - using centralized PLAN_CONFIG from subscription service
const PLANS: Record<string, Plan> = {
  family: {
    name: PLAN_CONFIG.family.name,
    price: PLAN_CONFIG.family.price,
    priceId: getStripePriceId('family'),
    limits: [
      `${PLAN_CONFIG.family.limits.maxElders} loved one`,
      `1 admin + 1 member`,
      `${PLAN_CONFIG.family.limits.storageMB} MB storage`,
    ],
    extras: PLAN_CONFIG.family.extras,
  },
  single_agency: {
    name: PLAN_CONFIG.single_agency.name,
    price: PLAN_CONFIG.single_agency.price,
    priceId: getStripePriceId('single_agency'),
    limits: [
      `${PLAN_CONFIG.single_agency.limits.maxElders} loved one`,
      `1 admin + ${PLAN_CONFIG.single_agency.limits.maxMembers - 1} members`,
      `${PLAN_CONFIG.single_agency.limits.storageMB} MB storage`,
    ],
    extras: PLAN_CONFIG.single_agency.extras,
  },
  multi_agency: {
    name: PLAN_CONFIG.multi_agency.name,
    price: PLAN_CONFIG.multi_agency.price,
    priceId: getStripePriceId('multi_agency'),
    limits: [
      `Up to ${PLAN_CONFIG.multi_agency.limits.maxElders} loved ones`,
      `Up to ${PLAN_CONFIG.multi_agency.limits.maxCaregivers} caregivers`,
      `${PLAN_CONFIG.multi_agency.limits.storageMB} MB storage`,
    ],
    extras: PLAN_CONFIG.multi_agency.extras,
  }
};

type PlanKey = PlanTier;

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
  const [showDowngradeBlockedModal, setShowDowngradeBlockedModal] = useState(false);
  const [downgradeBlockers, setDowngradeBlockers] = useState<DowngradeBlocker[]>([]);
  const [downgradeTargetPlan, setDowngradeTargetPlan] = useState<string>('');
  const [validatingDowngrade, setValidatingDowngrade] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: 'downgrade' | 'cancel'; plan?: PlanKey } | null>(null);

  // Convert Firestore timestamps to proper Date objects
  const trialEndDate = convertFirestoreTimestamp(user?.trialEndDate);
  const gracePeriodEndDate = convertFirestoreTimestamp(user?.gracePeriodEndDate);
  const currentPeriodEnd = convertFirestoreTimestamp(user?.currentPeriodEnd);
  const subscriptionStartDate = convertFirestoreTimestamp(user?.subscriptionStartDate);

  // Calculate trial day based on plan type
  // All plans: 15 days trial
  const trialDuration = user?.subscriptionTier === 'multi_agency'
    ? MULTI_AGENCY_TRIAL_DAYS
    : TRIAL_DURATION_DAYS;
  const trialStartDate = trialEndDate
    ? new Date(trialEndDate.getTime() - trialDuration * 24 * 60 * 60 * 1000)
    : null;
  const currentTrialDay = trialStartDate
    ? Math.min(trialDuration, Math.max(1, Math.ceil((Date.now() - trialStartDate.getTime()) / (24 * 60 * 60 * 1000))))
    : 0;
  const trialDaysLeft = trialEndDate
    ? Math.max(0, Math.ceil((trialEndDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
    : 0;

  // Calculate days since subscription started (for refund window)
  const daysSinceSubscriptionStart = subscriptionStartDate
    ? Math.floor((Date.now() - subscriptionStartDate.getTime()) / (24 * 60 * 60 * 1000))
    : 999;
  const isWithinRefundWindow = daysSinceSubscriptionStart <= PRICING.REFUND_WINDOW_DAYS;

  // Check if user has an active Stripe subscription
  const hasPaidSubscription = !!user?.stripeSubscriptionId;
  // Check if user has Stripe customer ID (needed for billing portal)
  const hasStripeCustomer = !!user?.stripeCustomerId;
  // Free trial: trial status without a Stripe subscription
  const isFreeTrialActive = user?.subscriptionStatus === 'trial' && !hasPaidSubscription && trialDaysLeft > 0;
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

      // Validate required fields before making API call
      if (!plan.priceId) {
        throw new Error('Price ID not configured for this plan. Please contact support.');
      }
      if (!user?.id) {
        throw new Error('Please sign in to subscribe to a plan.');
      }

      // For trial users, validate that their current usage fits within the target plan limits
      // This prevents users from selecting a lower-tier plan than their current usage requires
      const validation = await validateDowngrade(user.id, planKey);

      if (!validation.allowed) {
        // Show blocked modal with blockers
        setDowngradeBlockers(validation.blockers);
        setDowngradeTargetPlan(plan.name || planKey);
        setShowDowngradeBlockedModal(true);
        setLoading(false);
        return;
      }
      // Stripe requires email for checkout - check if user has one
      const userEmail = user?.email?.trim();
      if (!userEmail) {
        throw new Error('An email address is required for billing. Please add your email in Profile settings before subscribing.');
      }

      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: plan.priceId,
          userId: user.id,
          userEmail: userEmail,
          planName: plan.name,
          skipTrial: isFreeTrialActive
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
      // Validate downgrade before showing confirmation
      setValidatingDowngrade(true);
      setError(null);

      try {
        if (!user?.id) {
          setError('User not found');
          return;
        }

        const validation = await validateDowngrade(user.id, newPlan);

        if (!validation.allowed) {
          // Show blocked modal with blockers
          setDowngradeBlockers(validation.blockers);
          setDowngradeTargetPlan(PLANS[newPlan]?.name || newPlan);
          setShowDowngradeBlockedModal(true);
          return;
        }

        // Check if there are storage warnings (allowed but with warnings)
        const storageWarnings = validation.blockers.filter(b => b.type === 'storage');
        if (storageWarnings.length > 0) {
          // Store warnings to show in confirmation dialog
          setDowngradeBlockers(storageWarnings);
        } else {
          setDowngradeBlockers([]);
        }

        // Validation passed - show confirmation dialog
        setPendingAction({ type: 'downgrade', plan: newPlan });
        setShowDowngradeDialog(true);
      } catch (err) {
        console.error('Error validating downgrade:', err);
        setError('Failed to validate downgrade. Please try again.');
      } finally {
        setValidatingDowngrade(false);
      }
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

  // Check if user can manage billing (only admins/owners)
  const userCanManageBilling = canManageBilling(user);

  // If user cannot manage billing, show read-only view
  if (!userCanManageBilling) {
    return (
      <div className="space-y-6">
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-blue-600" />
              Subscription Managed by Admin
            </CardTitle>
            <CardDescription>
              Your subscription is managed by your organization&apos;s administrator.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Show current plan info if available */}
              {user?.subscriptionTier && (
                <div className="p-4 bg-white rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="font-semibold text-gray-900">
                      {PLANS[user.subscriptionTier as keyof typeof PLANS]?.name || 'Active Plan'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    You have access to all features included in your organization&apos;s plan.
                  </p>
                </div>
              )}

              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700">
                  <strong>Need to make changes?</strong>
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Contact your organization&apos;s administrator to manage subscription settings,
                  upgrade plans, or update billing information.
                </p>
              </div>

              <div className="text-sm text-gray-500">
                <p>
                  Questions?{' '}
                  <a href="/help" className="text-blue-600 hover:underline">Visit our help center</a>
                  {' '}or{' '}
                  <a href="mailto:support@myguide.health" className="text-blue-600 hover:underline">contact support</a>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
      <Card className={isExpired || isCanceled ? 'border-red-500' : isFreeTrialActive ? 'border-blue-500' : cancelAtPeriodEnd ? 'border-yellow-500' : 'border-green-500'}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Current Subscription Status
            {isActive && !cancelAtPeriodEnd && <CheckCircle className="w-5 h-5 text-green-600" />}
            {isFreeTrialActive && <Clock className="w-5 h-5 text-blue-600" />}
            {(isExpired || isCanceled) && <XCircle className="w-5 h-5 text-red-600" />}
            {cancelAtPeriodEnd && <Clock className="w-5 h-5 text-yellow-600" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Free Trial Status Display (no Stripe subscription yet) */}
          {isFreeTrialActive && (
            <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-5 w-5 text-blue-600" />
                <span className="text-xl font-semibold text-blue-800">Trial</span>
              </div>
              <p className="text-blue-700 font-medium">Day {currentTrialDay} of {trialDuration}</p>
              <p className="text-sm text-blue-600 mt-2">
                Your trial ends on {trialEndDate ? format(trialEndDate, 'MMMM dd, yyyy') : 'unknown'}.
                Subscribe now to ensure uninterrupted service.
              </p>
            </div>
          )}

          {/* Active Subscription Status Display */}
          {isActive && user?.subscriptionTier && (
            <div className={`mb-4 p-4 rounded-lg border ${
              cancelAtPeriodEnd ? 'bg-yellow-50 border-yellow-200' :
              'bg-green-50 border-green-200'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                {cancelAtPeriodEnd ? (
                  <Clock className="h-5 w-5 text-yellow-600" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                )}
                <span className={`text-xl font-semibold ${
                  cancelAtPeriodEnd ? 'text-yellow-800' :
                  'text-green-800'
                }`}>
                  {PLANS[user.subscriptionTier as keyof typeof PLANS]?.name || 'Active'}
                </span>
              </div>
              <p className={cancelAtPeriodEnd ? 'text-yellow-700' : 'text-green-700'}>
                ${PLANS[user.subscriptionTier as keyof typeof PLANS]?.price}/loved one/month
              </p>
              {/* Show billing date for active users */}
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

              {!cancelAtPeriodEnd && !pendingPlanChange && hasStripeCustomer && (
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
              {hasStripeCustomer && (
                <div className="mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleManageBilling}
                    disabled={loading}
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    View Billing History
                  </Button>
                </div>
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

      {/* Available Plans - Show for free trial/expired/canceled users (NOT subscribed trial) */}
      {(isFreeTrialActive || isExpired || isCanceled) && (
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
                      <span className="text-gray-500">/loved one/month</span>
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

      {/* Change Plan - Show for active users who can upgrade (not Multi Agency) */}
      {isActive && !cancelAtPeriodEnd && user?.subscriptionTier !== 'multi_agency' && (
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

              // Determine if downgrade is allowed:
              // - Family plan: lowest tier, no downgrade possible (but can show upgrade from here)
              // - Single Agency: can downgrade to Family, can upgrade to Multi-Agency
              // - Multi Agency: cannot downgrade (would lose caregivers/elders data)
              const currentTier = user?.subscriptionTier;
              const isDowngradeBlocked =
                changeType === 'downgrade' &&
                (currentTier === 'multi_agency' || currentTier === 'family');

              return (
                <Card
                  key={key}
                  className={`cursor-pointer transition-all duration-200 ${
                    isCurrentPlan
                      ? 'border-2 border-green-500 bg-green-50'
                      : isPendingPlan
                      ? 'border-2 border-blue-500 bg-blue-50'
                      : isDowngradeBlocked
                      ? 'border border-gray-200 opacity-60'
                      : isSelected
                      ? 'border-2 border-blue-500 shadow-lg'
                      : 'border border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => !isCurrentPlan && !isPendingPlan && !isDowngradeBlocked && setSelectedPlan(planKey)}
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
                      <span className="text-gray-500">/loved one/month</span>
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
                    ) : isDowngradeBlocked ? (
                      <Button className="w-full" variant="outline" disabled>
                        Not Available
                      </Button>
                    ) : (
                      <Button
                        className={`w-full ${isSelected ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}`}
                        variant={isSelected ? 'default' : 'outline'}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleChangePlan(planKey);
                        }}
                        disabled={actionLoading === planKey || (validatingDowngrade && changeType === 'downgrade')}
                      >
                        {actionLoading === planKey ? (
                          'Processing...'
                        ) : validatingDowngrade && changeType === 'downgrade' ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" /> Checking...
                          </>
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
            <div className="space-y-4">
              {/* Payment Method Display */}
              {hasPaidSubscription && (
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-md border border-gray-200">
                      <CreditCard className="w-5 h-5 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Payment Method on File</p>
                      <p className="text-xs text-gray-500">
                        Your card will be charged on your next billing date
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
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

          {/* Storage Warning */}
          {downgradeBlockers.filter(b => b.type === 'storage').length > 0 && (
            <div className="py-2">
              <Alert className="bg-yellow-50 border-yellow-200">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  <strong>Storage Warning:</strong> After downgrading, you will not be able to upload or download files until you reduce your storage usage to within the new plan&apos;s limit.
                </AlertDescription>
              </Alert>
            </div>
          )}

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

      {/* Downgrade Blocked Modal */}
      <DowngradeBlockedModal
        open={showDowngradeBlockedModal}
        onOpenChange={setShowDowngradeBlockedModal}
        targetPlanName={downgradeTargetPlan}
        blockers={downgradeBlockers}
      />
    </div>
  );
}
