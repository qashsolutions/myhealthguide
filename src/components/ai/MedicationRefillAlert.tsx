'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Pill,
  Calendar,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';

interface RefillPrediction {
  medicationId: string;
  medicationName: string;
  daysUntilEmpty: number;
  currentSupply: number;
  dailyUsageRate: number;
  predictedEmptyDate: Date;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  recommendation: string;
  confidence: number; // 0-100
}

interface MedicationRefillAlertProps {
  predictions: RefillPrediction[];
  onOrderRefill?: (medicationId: string) => void;
  compact?: boolean;
}

/**
 * Medication Refill Prediction Alert Component
 *
 * AI-powered prediction of when medications will run out
 * Based on actual usage patterns, not just prescribed schedule
 */
export function MedicationRefillAlert({
  predictions,
  onOrderRefill,
  compact = false
}: MedicationRefillAlertProps) {
  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical':
        return 'bg-red-100 border-red-300 dark:bg-red-900/30 dark:border-red-800';
      case 'high':
        return 'bg-orange-100 border-orange-300 dark:bg-orange-900/30 dark:border-orange-800';
      case 'medium':
        return 'bg-yellow-100 border-yellow-300 dark:bg-yellow-900/30 dark:border-yellow-800';
      default:
        return 'bg-blue-100 border-blue-300 dark:bg-blue-900/30 dark:border-blue-800';
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'critical':
        return { text: 'URGENT', color: 'bg-red-600 text-white' };
      case 'high':
        return { text: 'SOON', color: 'bg-orange-600 text-white' };
      case 'medium':
        return { text: 'PLAN AHEAD', color: 'bg-yellow-600 text-white' };
      default:
        return { text: 'SUFFICIENT', color: 'bg-green-600 text-white' };
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'critical':
        return <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />;
      case 'high':
        return <TrendingDown className="w-5 h-5 text-orange-600 dark:text-orange-400" />;
      case 'medium':
        return <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />;
      default:
        return <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />;
    }
  };

  if (predictions.length === 0) {
    return null;
  }

  // Sort by urgency (critical first)
  const sortedPredictions = [...predictions].sort((a, b) => {
    const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
  });

  if (compact) {
    // Compact view for medication list page
    return (
      <div className="space-y-2">
        {sortedPredictions.map((pred) => {
          const badge = getUrgencyBadge(pred.urgency);
          return (
            <Alert
              key={pred.medicationId}
              className={`${getUrgencyColor(pred.urgency)} border-2`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {getUrgencyIcon(pred.urgency)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm">{pred.medicationName}</span>
                      <Badge className={`${badge.color} text-xs`}>
                        {badge.text}
                      </Badge>
                    </div>
                    <AlertDescription className="text-sm">
                      <strong>{pred.daysUntilEmpty} days</strong> of supply remaining
                      {pred.urgency === 'critical' && ' - Order refill now!'}
                    </AlertDescription>
                  </div>
                </div>
                {onOrderRefill && pred.urgency !== 'low' && (
                  <Button
                    size="sm"
                    variant={pred.urgency === 'critical' ? 'default' : 'outline'}
                    onClick={() => onOrderRefill(pred.medicationId)}
                    className={pred.urgency === 'critical' ? 'bg-red-600 hover:bg-red-700' : ''}
                  >
                    Order Refill
                  </Button>
                )}
              </div>
            </Alert>
          );
        })}
      </div>
    );
  }

  // Full card view for insights page
  return (
    <Card className="border-2 border-orange-200 dark:border-orange-800">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <Pill className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            <div>
              <CardTitle className="text-lg">
                Medication Refill Alerts
              </CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                AI-predicted refill needs based on actual usage patterns
              </p>
            </div>
          </div>
          <Badge className="bg-orange-600 text-white">
            {sortedPredictions.length} {sortedPredictions.length === 1 ? 'Alert' : 'Alerts'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {sortedPredictions.map((pred) => {
          const badge = getUrgencyBadge(pred.urgency);
          return (
            <div
              key={pred.medicationId}
              className={`p-4 rounded-lg border-2 ${getUrgencyColor(pred.urgency)}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3 flex-1">
                  {getUrgencyIcon(pred.urgency)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">{pred.medicationName}</h4>
                      <Badge className={badge.color}>
                        {badge.text}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {pred.recommendation}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-3">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-500 uppercase mb-1">
                    Days Remaining
                  </p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {pred.daysUntilEmpty}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-500 uppercase mb-1">
                    Current Supply
                  </p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {pred.currentSupply}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-500 uppercase mb-1">
                    Empty Date
                  </p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {pred.predictedEmptyDate.toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-300 dark:border-gray-700">
                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                  <Calendar className="w-3 h-3" />
                  <span>Daily usage: {pred.dailyUsageRate.toFixed(1)} doses</span>
                  <span>•</span>
                  <span>Confidence: {pred.confidence}%</span>
                </div>
                {onOrderRefill && (
                  <Button
                    size="sm"
                    variant={pred.urgency === 'critical' ? 'default' : 'outline'}
                    onClick={() => onOrderRefill(pred.medicationId)}
                    className={pred.urgency === 'critical' ? 'bg-red-600 hover:bg-red-700' : ''}
                  >
                    Order Refill
                  </Button>
                )}
              </div>
            </div>
          );
        })}

        <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <AlertDescription className="text-sm text-blue-800 dark:text-blue-200">
            💡 <strong>Pro Tip:</strong> Predictions are based on actual usage patterns over the last 30 days,
            accounting for missed doses and compliance rates. More accurate than standard refill schedules.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
