'use client';

import { useState } from 'react';
import { Alert, AlertAction, AlertSeverity, AlertType } from '@/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  AlertCircle,
  AlertTriangle,
  Info,
  Pill,
  Activity,
  FileText,
  Calendar,
  Users,
  X,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface AlertCardProps {
  alert: Alert;
  onAction: (alertId: string, action: string, data?: Record<string, any>) => Promise<void>;
  onDismiss: (alertId: string, reason: string) => Promise<void>;
  compact?: boolean;
}

const SEVERITY_CONFIG: Record<
  AlertSeverity,
  {
    icon: typeof AlertCircle;
    iconColor: string;
    bgColor: string;
    borderColor: string;
  }
> = {
  critical: {
    icon: AlertCircle,
    iconColor: 'text-red-600',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-200 dark:border-red-800'
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-yellow-600',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    borderColor: 'border-yellow-200 dark:border-yellow-800'
  },
  info: {
    icon: Info,
    iconColor: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800'
  }
};

const ALERT_TYPE_ICONS: Record<AlertType, typeof Pill> = {
  medication_refill: Pill,
  emergency_pattern: Activity,
  health_change: Activity,
  compliance_drop: Activity,
  missed_doses: Pill,
  shift_handoff: Users,
  appointment_reminder: Calendar,
  doctor_visit_prep: FileText
};

export function AlertCard({ alert, onAction, onDismiss, compact = false }: AlertCardProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  const [showDismissReasons, setShowDismissReasons] = useState(false);

  const severityConfig = SEVERITY_CONFIG[alert.severity];
  const SeverityIcon = severityConfig.icon;
  const TypeIcon = ALERT_TYPE_ICONS[alert.type];

  const handleAction = async (action: string, data?: Record<string, any>) => {
    setIsProcessing(true);
    try {
      await onAction(alert.id, action, data);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDismiss = async (reason: string) => {
    setIsDismissing(true);
    try {
      await onDismiss(alert.id, reason);
      setShowDismissReasons(false);
    } finally {
      setIsDismissing(false);
    }
  };

  // Render compact version for notification panel
  if (compact) {
    return (
      <div
        className={cn(
          'flex items-start gap-3 p-3 rounded-lg border',
          severityConfig.bgColor,
          severityConfig.borderColor
        )}
      >
        <SeverityIcon className={cn('h-5 w-5 mt-0.5', severityConfig.iconColor)} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{alert.title}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mt-0.5">
            {alert.message}
          </p>
          <span className="text-xs text-gray-500 mt-1 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDistanceToNow(alert.createdAt, { addSuffix: true })}
          </span>
        </div>
        <button
          onClick={() => setShowDismissReasons(true)}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  // Full alert card
  return (
    <Card
      className={cn(
        'border-l-4 transition-all',
        severityConfig.borderColor,
        alert.status === 'dismissed' && 'opacity-60'
      )}
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className={cn('p-2 rounded-lg', severityConfig.bgColor)}>
              <TypeIcon className={cn('h-5 w-5', severityConfig.iconColor)} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {alert.title}
                </h3>
                <span
                  className={cn(
                    'px-2 py-0.5 text-xs font-medium rounded-full',
                    alert.severity === 'critical' &&
                      'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
                    alert.severity === 'warning' &&
                      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
                    alert.severity === 'info' &&
                      'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                  )}
                >
                  {alert.severity.toUpperCase()}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 whitespace-pre-line">
                {alert.message}
              </p>
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(alert.createdAt, { addSuffix: true })}
                </span>
                {alert.expiresAt && alert.status === 'active' && (
                  <span className="flex items-center gap-1 text-yellow-600">
                    Expires {formatDistanceToNow(alert.expiresAt, { addSuffix: true })}
                  </span>
                )}
              </div>
            </div>
          </div>

          {alert.status === 'active' && (
            <button
              onClick={() => setShowDismissReasons(true)}
              className="text-gray-400 hover:text-gray-600 p-1"
              disabled={isDismissing}
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Actions */}
        {alert.actions && alert.actions.length > 0 && alert.status === 'active' && (
          <div className="mt-4 flex flex-wrap gap-2">
            {alert.actions.map((action: AlertAction) => (
              <Button
                key={action.id}
                variant={action.type === 'primary' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleAction(action.action)}
                disabled={isProcessing}
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}

        {/* Status badges */}
        {alert.status !== 'active' && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
            <span
              className={cn(
                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                alert.status === 'dismissed' &&
                  'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
                alert.status === 'actioned' &&
                  'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
                alert.status === 'expired' &&
                  'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
              )}
            >
              {alert.status === 'dismissed' && `Dismissed: ${alert.dismissalReason || 'Unknown'}`}
              {alert.status === 'actioned' && `Resolved: ${alert.actionTaken || 'Actioned'}`}
              {alert.status === 'expired' && 'Expired'}
            </span>
          </div>
        )}

        {/* Dismissal reasons modal */}
        {showDismissReasons && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
              Why are you dismissing this alert?
            </p>
            <div className="space-y-2">
              {[
                { value: 'not_relevant', label: 'Not relevant' },
                { value: 'already_handled', label: 'Already handled' },
                { value: 'false_positive', label: 'False positive' },
                { value: 'too_frequent', label: 'Too frequent' },
                { value: 'low_priority', label: 'Low priority' },
                { value: 'other', label: 'Other' }
              ].map((reason) => (
                <button
                  key={reason.value}
                  onClick={() => handleDismiss(reason.value)}
                  disabled={isDismissing}
                  className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  {reason.label}
                </button>
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDismissReasons(false)}
              className="w-full mt-2"
            >
              Cancel
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
