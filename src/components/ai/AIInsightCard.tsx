'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, TrendingUp, AlertCircle, Info } from 'lucide-react';
import { ReactNode } from 'react';
import { FeedbackButtons } from '@/components/feedback/FeedbackButtons';
import { HealthChangeFeedback } from '@/components/feedback/ActionFeedback';

interface AIInsightCardProps {
  id?: string;
  title: string;
  description: string;
  type: 'positive' | 'warning' | 'info' | 'insight';
  icon?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  elderId?: string;
  showFeedback?: boolean;
  showActionFeedback?: boolean; // For warnings/alerts that can be marked as valid/false alarm
}

export function AIInsightCard({
  id,
  title,
  description,
  type,
  icon,
  actionLabel,
  onAction,
  elderId,
  showFeedback = true,
  showActionFeedback = false
}: AIInsightCardProps) {
  // Generate a unique ID if not provided
  const insightId = id || `insight-${title.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
  const getTypeStyles = () => {
    switch (type) {
      case 'positive':
        return {
          bg: 'bg-green-50 dark:bg-green-900/20',
          border: 'border-green-200 dark:border-green-800',
          iconColor: 'text-green-600',
          icon: icon || <TrendingUp className="w-5 h-5" />
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50 dark:bg-yellow-900/20',
          border: 'border-yellow-200 dark:border-yellow-800',
          iconColor: 'text-yellow-600',
          icon: icon || <AlertCircle className="w-5 h-5" />
        };
      case 'info':
        return {
          bg: 'bg-blue-50 dark:bg-blue-900/20',
          border: 'border-blue-200 dark:border-blue-800',
          iconColor: 'text-blue-600',
          icon: icon || <Info className="w-5 h-5" />
        };
      case 'insight':
        return {
          bg: 'bg-purple-50 dark:bg-purple-900/20',
          border: 'border-purple-200 dark:border-purple-800',
          iconColor: 'text-purple-600',
          icon: icon || <Sparkles className="w-5 h-5" />
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <Card className={`${styles.bg} ${styles.border}`}>
      <CardContent className="p-4">
        <div className="flex gap-3">
          <div className={`flex-shrink-0 ${styles.iconColor}`}>
            {styles.icon}
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {title}
              </h3>
              <Badge variant="outline" className="flex-shrink-0">
                <Sparkles className="w-3 h-3 mr-1" />
                AI
              </Badge>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {description}
            </p>
            {actionLabel && onAction && (
              <button
                onClick={onAction}
                className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                {actionLabel} →
              </button>
            )}

            {/* Feedback section */}
            {(showFeedback || showActionFeedback) && (
              <div className="flex items-center gap-3 pt-2 border-t border-gray-200/50 dark:border-gray-700/50 mt-2">
                {showActionFeedback && type === 'warning' ? (
                  <HealthChangeFeedback
                    targetId={insightId}
                    elderId={elderId}
                  />
                ) : showFeedback ? (
                  <FeedbackButtons
                    targetType="ai_insight"
                    targetId={insightId}
                    elderId={elderId}
                    size="sm"
                    showComment={true}
                  />
                ) : null}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
