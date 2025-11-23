'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  TrendingDown,
  Activity,
  Phone,
  ChevronRight,
  Shield
} from 'lucide-react';
import type { EmergencyPattern, EmergencyFactor } from '@/types';

interface EmergencyPatternAlertProps {
  pattern: EmergencyPattern;
  elderName?: string;
  onCallDoctor?: () => void;
  onViewDetails?: () => void;
}

/**
 * Emergency Pattern Detection Alert Component
 *
 * Displays AI-detected emergency patterns with severity levels
 * Multi-factor scoring: 0-15 points across health signals
 * Only shows when score >= 8 (medium sensitivity)
 */
export function EmergencyPatternAlert({
  pattern,
  elderName,
  onCallDoctor,
  onViewDetails
}: EmergencyPatternAlertProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
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

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />;
      case 'medium':
        return <TrendingDown className="w-6 h-6 text-orange-600 dark:text-orange-400" />;
      default:
        return <Activity className="w-6 h-6 text-blue-600 dark:text-blue-400" />;
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'critical':
        return { text: 'CRITICAL ALERT', color: 'bg-red-600 text-white' };
      case 'high':
        return { text: 'HIGH PRIORITY', color: 'bg-orange-600 text-white' };
      case 'medium':
        return { text: 'ATTENTION NEEDED', color: 'bg-yellow-600 text-white' };
      default:
        return { text: 'MONITORING', color: 'bg-blue-600 text-white' };
    }
  };

  const severityLabel = getSeverityLabel(pattern.severity);

  return (
    <Card className={`border-2 ${getSeverityColor(pattern.severity)}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            {getSeverityIcon(pattern.severity)}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <CardTitle className="text-lg">
                  Emergency Pattern Detected
                </CardTitle>
                <Badge className={severityLabel.color}>
                  {severityLabel.text}
                </Badge>
              </div>
              {elderName && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  AI-detected concerning pattern for {elderName}
                </p>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Risk Score */}
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertTitle>Risk Score: {pattern.riskScore}/15</AlertTitle>
          <AlertDescription>
            Multi-factor analysis across medication, diet, and health tracking patterns
          </AlertDescription>
        </Alert>

        {/* Detected Factors */}
        <div>
          <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Concerning Patterns ({pattern.factors.length})
          </h4>
          <div className="space-y-2">
            {pattern.factors.map((factor, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  factor.points >= 4 ? 'bg-red-100 dark:bg-red-900/30' :
                  factor.points >= 2 ? 'bg-orange-100 dark:bg-orange-900/30' :
                  'bg-yellow-100 dark:bg-yellow-900/30'
                }`}>
                  <span className={`text-sm font-bold ${
                    factor.points >= 4 ? 'text-red-600 dark:text-red-400' :
                    factor.points >= 2 ? 'text-orange-600 dark:text-orange-400' :
                    'text-yellow-600 dark:text-yellow-400'
                  }`}>
                    {factor.points}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm text-gray-900 dark:text-white capitalize">
                    {factor.type.replace(/_/g, ' ')}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {factor.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        {pattern.recommendations && pattern.recommendations.length > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="font-semibold text-sm mb-2 text-blue-900 dark:text-blue-100">
              Recommended Actions
            </h4>
            <ul className="space-y-1.5">
              {pattern.recommendations.map((rec, idx) => (
                <li key={idx} className="text-sm text-blue-800 dark:text-blue-200 flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          {pattern.severity === 'critical' && onCallDoctor && (
            <Button
              onClick={onCallDoctor}
              className="gap-2 bg-red-600 hover:bg-red-700"
            >
              <Phone className="w-4 h-4" />
              Contact Healthcare Provider
            </Button>
          )}
          {onViewDetails && (
            <Button
              variant="outline"
              onClick={onViewDetails}
              className="gap-2"
            >
              View Full Analysis
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Timestamp */}
        <p className="text-xs text-gray-500 dark:text-gray-500 pt-2 border-t border-gray-200 dark:border-gray-700">
          Detected: {new Date(pattern.detectedAt).toLocaleString()} •
          Alert ID: {pattern.id.slice(0, 8)}
        </p>
      </CardContent>
    </Card>
  );
}
