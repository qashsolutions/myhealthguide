'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, TrendingUp, TrendingDown, Activity, AlertTriangle } from 'lucide-react';
import { HealthChangeAlert as HealthChangeAlertType } from '@/lib/ai/healthChangeDetection';

interface HealthChangeAlertProps {
  alert: HealthChangeAlertType;
  elderName?: string;
}

export function HealthChangeAlert({ alert, elderName }: HealthChangeAlertProps) {
  if (!alert.detected) {
    return (
      <Alert className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800">
        <Activity className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-900 dark:text-green-100">
          Health Patterns Stable
        </AlertTitle>
        <AlertDescription className="text-green-800 dark:text-green-200">
          {alert.message || alert.summary}
        </AlertDescription>
      </Alert>
    );
  }

  // Determine alert styling based on severity
  const severityConfig = {
    info: {
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      borderColor: 'border-blue-200 dark:border-blue-800',
      textColor: 'text-blue-900 dark:text-blue-100',
      descColor: 'text-blue-800 dark:text-blue-200',
      icon: Activity,
      iconColor: 'text-blue-600'
    },
    warning: {
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      borderColor: 'border-orange-200 dark:border-orange-800',
      textColor: 'text-orange-900 dark:text-orange-100',
      descColor: 'text-orange-800 dark:text-orange-200',
      icon: AlertCircle,
      iconColor: 'text-orange-600'
    },
    critical: {
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      borderColor: 'border-red-200 dark:border-red-800',
      textColor: 'text-red-900 dark:text-red-100',
      descColor: 'text-red-800 dark:text-red-200',
      icon: AlertTriangle,
      iconColor: 'text-red-600'
    }
  };

  const config = severityConfig[alert.severity || 'info'];
  const Icon = config.icon;

  return (
    <Card className={`${config.bgColor} ${config.borderColor} border-2`}>
      <CardHeader>
        <CardTitle className={`flex items-center gap-2 ${config.textColor}`}>
          <Icon className={`h-5 w-5 ${config.iconColor}`} />
          Health Change Detected
          {elderName && <span className="text-base font-normal">- {elderName}</span>}
        </CardTitle>
        <CardDescription className={config.descColor}>
          {alert.summary}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Change Details */}
        <div className="space-y-3">
          {alert.changes?.map((change, idx) => {
            const isPositive = change.direction === 'improved' || change.direction === 'increased';
            const isNegative = change.direction === 'declined' || change.direction === 'decreased';

            return (
              <div
                key={idx}
                className="flex items-start gap-3 p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                {isPositive ? (
                  <TrendingUp className="w-5 h-5 text-green-600 mt-0.5" />
                ) : isNegative ? (
                  <TrendingDown className="w-5 h-5 text-red-600 mt-0.5" />
                ) : (
                  <Activity className="w-5 h-5 text-gray-600 mt-0.5" />
                )}

                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {change.description}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-600 dark:text-gray-400">
                    <span>
                      Last week: <strong>{change.lastWeek.toFixed(change.type === 'medication_compliance' ? 0 : 0)}{change.type === 'medication_compliance' ? '%' : ' entries'}</strong>
                    </span>
                    <span>→</span>
                    <span>
                      This week: <strong>{change.thisWeek.toFixed(change.type === 'medication_compliance' ? 0 : 0)}{change.type === 'medication_compliance' ? '%' : ' entries'}</strong>
                    </span>
                    <span className={`font-semibold ${isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-gray-600'}`}>
                      ({(change.percentChange * 100).toFixed(0)}% change)
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Data Observation */}
        {alert.recommendation && (
          <Alert className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Data Observation</AlertTitle>
            <AlertDescription className="text-sm">
              {alert.recommendation}
              <p className="text-xs text-gray-500 mt-2 italic">
                Note: This is data analysis only. Consult healthcare provider for medical decisions.
              </p>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
