'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DollarSign,
  Users,
  Calendar,
  AlertCircle,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { PRICING } from '@/lib/constants/pricing';
import type { ElderSubscription } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { authenticatedFetch } from '@/lib/api/authenticatedFetch';

interface AgencyBillingDashboardProps {
  agencyId: string;
}

export function AgencyBillingDashboard({ agencyId }: AgencyBillingDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState<ElderSubscription[]>([]);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');

  useEffect(() => {
    loadBillingData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agencyId]);

  const loadBillingData = async () => {
    try {
      setLoading(true);
      const response = await authenticatedFetch(`/api/billing/subscriptions?agencyId=${agencyId}`);
      if (response.ok) {
        const data = await response.json();
        setSubscriptions(data.subscriptions);
      }
    } catch (error) {
      console.error('Error loading billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async (subscriptionId: string) => {
    try {
      const response = await authenticatedFetch('/api/billing/cancel-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionId,
          reason: cancellationReason || 'No reason provided',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(
          data.refundIssued
            ? `Subscription cancelled. Refund of $${data.refundAmount} issued.`
            : 'Subscription cancelled. No refund issued (outside 7-day window).'
        );
        loadBillingData();
      } else {
        alert('Failed to cancel subscription');
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      alert('Error cancelling subscription');
    } finally {
      setCancellingId(null);
      setCancellationReason('');
    }
  };

  const calculateRefundEligibility = (subscription: ElderSubscription) => {
    const createdAt =
      subscription.createdAt instanceof Date
        ? subscription.createdAt
        : new Date(subscription.createdAt);
    const now = new Date();
    const daysSinceCreation = Math.floor(
      (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    const daysRemaining = PRICING.REFUND_WINDOW_DAYS - daysSinceCreation;
    return {
      eligible: daysRemaining > 0,
      daysRemaining: Math.max(0, daysRemaining),
    };
  };

  const activeSubscriptions = subscriptions.filter((sub) => sub.subscriptionStatus === 'active');
  const totalMonthly = activeSubscriptions.length * PRICING.MULTI_AGENCY.ELDER_MONTHLY_RATE;
  const nextBillingDates = activeSubscriptions.map((sub) => new Date(sub.nextBillingDate));
  const earliestBillingDate =
    nextBillingDates.length > 0
      ? new Date(Math.min(...nextBillingDates.map((d) => d.getTime())))
      : null;

  const getStatusBadge = (status: ElderSubscription['subscriptionStatus']) => {
    const variants = {
      active: 'bg-green-600 text-white',
      cancelled: 'bg-gray-600 text-white',
      refunded: 'bg-blue-600 text-white',
      at_risk: 'bg-red-600 text-white',
    };

    const labels = {
      active: 'Active',
      cancelled: 'Cancelled',
      refunded: 'Refunded',
      at_risk: 'Payment Failed',
    };

    return (
      <Badge className={variants[status]}>
        {labels[status]}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading billing data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-green-600" />
            Billing Dashboard
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your loved one subscriptions and billing
          </p>
        </div>
        <Button onClick={loadBillingData} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Pricing Info */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-lg">Multi-Agency Pricing</CardTitle>
          <CardDescription>
            ${PRICING.MULTI_AGENCY.ELDER_MONTHLY_RATE} per loved one per {PRICING.BILLING_CYCLE_DAYS} days • {PRICING.REFUND_WINDOW_DAYS}-day full refund window
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Active Loved Ones</p>
                <p className="text-3xl font-bold mt-1">{activeSubscriptions.length}</p>
                <p className="text-xs text-gray-500 mt-1">
                  of {PRICING.MULTI_AGENCY.MAX_ELDERS} max
                </p>
              </div>
              <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Monthly Total</p>
                <p className="text-3xl font-bold mt-1">${totalMonthly}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {activeSubscriptions.length} × ${PRICING.MULTI_AGENCY.ELDER_MONTHLY_RATE}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Next Billing</p>
                <p className="text-lg font-bold mt-1">
                  {earliestBillingDate
                    ? earliestBillingDate.toLocaleDateString()
                    : 'N/A'}
                </p>
                <p className="text-xs text-gray-500 mt-1">Earliest due date</p>
              </div>
              <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subscriptions List */}
      <Card>
        <CardHeader>
          <CardTitle>Loved One Subscriptions</CardTitle>
          <CardDescription>All loved one subscriptions under this agency</CardDescription>
        </CardHeader>
        <CardContent>
          {subscriptions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No loved one subscriptions yet
            </div>
          ) : (
            <div className="space-y-4">
              {subscriptions.map((subscription) => {
                const refundInfo = calculateRefundEligibility(subscription);
                return (
                  <div
                    key={subscription.id}
                    className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold text-gray-900 dark:text-white">
                            {subscription.elderName}
                          </h4>
                          {getStatusBadge(subscription.subscriptionStatus)}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div>
                            <span className="text-gray-500">Monthly Rate:</span>
                            <p className="font-semibold">${subscription.monthlyRate}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Billing Cycle:</span>
                            <p className="font-semibold">
                              {new Date(subscription.billingCycleStart).toLocaleDateString()} -{' '}
                              {new Date(subscription.billingCycleEnd).toLocaleDateString()}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-500">Next Billing:</span>
                            <p className="font-semibold">
                              {new Date(subscription.nextBillingDate).toLocaleDateString()}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-500">Added:</span>
                            <p className="font-semibold">
                              {new Date(subscription.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        {subscription.subscriptionStatus === 'active' && refundInfo.eligible && (
                          <div className="mt-3 flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                            <AlertCircle className="w-4 h-4" />
                            <span>
                              Eligible for full refund ({refundInfo.daysRemaining} days remaining)
                            </span>
                          </div>
                        )}

                        {subscription.subscriptionStatus === 'cancelled' && (
                          <div className="mt-3 text-sm text-gray-600">
                            Cancelled: {subscription.cancelledAt ? new Date(subscription.cancelledAt).toLocaleDateString() : 'N/A'}
                            {subscription.cancellationReason && (
                              <> • Reason: {subscription.cancellationReason}</>
                            )}
                          </div>
                        )}

                        {subscription.subscriptionStatus === 'refunded' && (
                          <div className="mt-3 text-sm text-green-600">
                            Refunded: ${subscription.refundAmount} on{' '}
                            {subscription.refundIssuedAt ? new Date(subscription.refundIssuedAt).toLocaleDateString() : 'N/A'}
                          </div>
                        )}
                      </div>

                      {subscription.subscriptionStatus === 'active' && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setCancellingId(subscription.id)}
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Cancel
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Cancel Loved One Subscription</DialogTitle>
                              <DialogDescription>
                                Are you sure you want to cancel the subscription for{' '}
                                <strong>{subscription.elderName}</strong>?
                                <br />
                                <br />
                                {refundInfo.eligible ? (
                                  <span className="text-green-600 font-semibold">
                                    This subscription is eligible for a full ${subscription.monthlyRate} refund
                                    ({refundInfo.daysRemaining} days remaining in refund window).
                                  </span>
                                ) : (
                                  <span className="text-orange-600 font-semibold">
                                    This subscription is NOT eligible for a refund (outside 7-day window).
                                    The full ${subscription.monthlyRate} has been charged.
                                  </span>
                                )}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="my-4">
                              <label className="block text-sm font-medium mb-2">
                                Cancellation Reason (optional)
                              </label>
                              <textarea
                                className="w-full p-2 border rounded-md"
                                rows={3}
                                value={cancellationReason}
                                onChange={(e) => setCancellationReason(e.target.value)}
                                placeholder="Why are you cancelling this subscription?"
                              />
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setCancellingId(null)}>
                                Keep Subscription
                              </Button>
                              <Button
                                onClick={() => handleCancelSubscription(subscription.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Confirm Cancellation
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
