'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, Calendar } from 'lucide-react';
import type { BurnoutAlert } from '@/lib/firebase/agencyAnalytics';

interface BurnoutAlertPanelProps {
  alerts: BurnoutAlert[];
  loading?: boolean;
}

export function BurnoutAlertPanel({ alerts, loading }: BurnoutAlertPanelProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Burnout Risk Alerts</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getRiskBadge = (level: BurnoutAlert['riskLevel']) => {
    const variants = {
      critical: 'bg-red-600 text-white',
      high: 'bg-orange-600 text-white',
      moderate: 'bg-yellow-600 text-white',
      low: 'bg-blue-600 text-white'
    };

    const labels = {
      critical: '🔴 Critical Risk',
      high: '🟠 High Risk',
      moderate: '🟡 Moderate Risk',
      low: '🔵 Low Risk'
    };

    return (
      <Badge className={variants[level]}>
        {labels[level]}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Burnout Risk Alerts
            </CardTitle>
            <CardDescription>
              Caregivers requiring attention
            </CardDescription>
          </div>
          <Badge variant={alerts.length > 0 ? 'destructive' : 'default'}>
            {alerts.length} Alert{alerts.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-green-600 dark:text-green-400 mb-2">
              <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-gray-600 dark:text-gray-400 font-medium">No burnout risks detected</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
              All caregivers are within healthy work limits
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {alerts.map((alert, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${
                  alert.riskLevel === 'critical'
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                    : alert.riskLevel === 'high'
                    ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
                    : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {alert.caregiverName}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {alert.recommendedAction}
                    </p>
                  </div>
                  {getRiskBadge(alert.riskLevel)}
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-700 dark:text-gray-300">
                      {alert.hoursThisWeek} hrs this week
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-700 dark:text-gray-300">
                      {alert.consecutiveDays} consecutive days
                    </span>
                  </div>
                </div>

                {alert.factors.length > 0 && (
                  <div className="space-y-1">
                    {alert.factors.map((factor, idx) => (
                      <div key={idx} className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-gray-400"></span>
                        {factor}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
