'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  ChevronDown,
  ChevronUp,
  ThumbsUp,
  ThumbsDown,
  CheckCircle2,
  XCircle,
  PenLine,
  TrendingUp,
  TrendingDown,
  Minus,
  MessageSquare,
  BarChart3,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useElder } from '@/contexts/ElderContext';
import {
  getGroupFeedbackStats,
  getAgencyFeedbackStats,
  getUserFeedback,
} from '@/lib/feedback/feedbackService';
import type { FeedbackStats, FeedbackTargetType, AIFeedback } from '@/types/feedback';
import { cn } from '@/lib/utils';

interface FeedbackDashboardProps {
  mode?: 'user' | 'group' | 'agency';
  agencyId?: string;
  className?: string;
  defaultOpen?: boolean;
}

const TARGET_TYPE_LABELS: Record<FeedbackTargetType, string> = {
  health_chat: 'Health Chat',
  weekly_summary: 'Weekly Summaries',
  ai_insight: 'AI Insights',
  smart_assistant: 'Smart Assistant',
  medication_optimization: 'Medication Optimization',
  refill_alert: 'Refill Alerts',
  health_change: 'Health Changes',
  compliance_prediction: 'Compliance Predictions',
  burnout_detection: 'Burnout Detection',
};

export function FeedbackDashboard({
  mode = 'group',
  agencyId,
  className,
  defaultOpen = false,
}: FeedbackDashboardProps) {
  const { user } = useAuth();
  const { selectedElder } = useElder();

  // Get groupId from selectedElder
  const groupId = selectedElder?.groupId;

  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [recentFeedback, setRecentFeedback] = useState<AIFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStats() {
      if (!user?.id) return;

      setLoading(true);
      setError(null);

      try {
        let feedbackStats: FeedbackStats;

        if (mode === 'agency' && agencyId) {
          feedbackStats = await getAgencyFeedbackStats(agencyId);
        } else if (mode === 'group' && groupId) {
          feedbackStats = await getGroupFeedbackStats(groupId);
        } else {
          // User mode - get user's own feedback stats
          const { feedback } = await getUserFeedback(user.id, { limit: 100 });
          setRecentFeedback(feedback.slice(0, 5));
          // Calculate stats from user's feedback
          feedbackStats = calculateUserStats(feedback);
        }

        setStats(feedbackStats);

        // Load recent feedback for group/agency modes
        if (mode !== 'user') {
          const { feedback } = await getUserFeedback(user.id, { limit: 5 });
          setRecentFeedback(feedback);
        }
      } catch (err: any) {
        console.error('Error loading feedback stats:', err);
        setError(err.message || 'Failed to load feedback data');
      } finally {
        setLoading(false);
      }
    }

    if (isOpen) {
      loadStats();
    }
  }, [user?.id, groupId, agencyId, mode, isOpen]);

  // Calculate stats from a list of feedback
  function calculateUserStats(feedback: AIFeedback[]): FeedbackStats {
    const total = feedback.length;
    const ratings = feedback.filter((f) => f.feedbackType === 'rating');
    const helpful = ratings.filter((f) => f.rating === 'helpful').length;
    const notHelpful = ratings.filter((f) => f.rating === 'not_helpful').length;

    const actions = feedback.filter((f) => f.feedbackType === 'action');
    const applied = actions.filter((f) =>
      ['applied', 'correct', 'valid'].includes(f.action || '')
    ).length;

    const corrections = feedback.filter((f) => f.feedbackType === 'correction');
    const falsePositives = corrections.filter(
      (f) => f.correctionType === 'false_positive'
    ).length;

    const targetTypes: FeedbackTargetType[] = Object.keys(TARGET_TYPE_LABELS) as FeedbackTargetType[];

    return {
      totalFeedback: total,
      helpfulCount: helpful,
      notHelpfulCount: notHelpful,
      helpfulPercentage: ratings.length > 0 ? Math.round((helpful / ratings.length) * 100) : 0,
      appliedCount: applied,
      ignoredCount: actions.length - applied,
      applicationRate: actions.length > 0 ? Math.round((applied / actions.length) * 100) : 0,
      correctionCount: corrections.length,
      falsePositiveCount: falsePositives,
      falseNegativeCount: corrections.filter((f) => f.correctionType === 'false_negative').length,
      byTargetType: targetTypes.reduce((acc, type) => {
        const typeFeedback = feedback.filter((f) => f.targetType === type);
        const typeRatings = typeFeedback.filter((f) => f.feedbackType === 'rating');
        acc[type] = {
          total: typeFeedback.length,
          helpful: typeRatings.filter((f) => f.rating === 'helpful').length,
          notHelpful: typeRatings.filter((f) => f.rating === 'not_helpful').length,
        };
        return acc;
      }, {} as Record<FeedbackTargetType, { total: number; helpful: number; notHelpful: number }>),
      topReasons: [],
      trendsLastWeek: {
        helpfulTrend: 'stable',
        totalFeedbackTrend: 'stable',
        percentageChange: 0,
      },
    };
  }

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-3.5 w-3.5 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-3.5 w-3.5 text-red-500" />;
      default:
        return <Minus className="h-3.5 w-3.5 text-gray-400" />;
    }
  };

  const title = mode === 'agency'
    ? 'Agency Smart Feedback'
    : mode === 'group'
    ? 'Group Smart Feedback'
    : 'My Smart Feedback';

  return (
    <Card className={cn('', className)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                {title}
                {stats && (
                  <Badge variant="secondary" className="text-xs">
                    {stats.totalFeedback} responses
                  </Badge>
                )}
              </CardTitle>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                {isOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0">
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : error ? (
              <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 py-4">
                <AlertTriangle className="h-4 w-4" />
                {error}
              </div>
            ) : stats ? (
              <div className="space-y-4">
                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-3">
                  {/* Helpful Rate */}
                  <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-3 text-center">
                    <div className="flex items-center justify-center gap-1 text-green-600 dark:text-green-400">
                      <ThumbsUp className="h-4 w-4" />
                      <span className="text-lg font-semibold">{stats.helpfulPercentage}%</span>
                    </div>
                    <p className="text-xs text-green-700 dark:text-green-300 mt-1">Helpful</p>
                    <p className="text-xs text-muted-foreground">
                      {stats.helpfulCount} of {stats.helpfulCount + stats.notHelpfulCount}
                    </p>
                  </div>

                  {/* Application Rate */}
                  <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3 text-center">
                    <div className="flex items-center justify-center gap-1 text-blue-600 dark:text-blue-400">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-lg font-semibold">{stats.applicationRate}%</span>
                    </div>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">Applied</p>
                    <p className="text-xs text-muted-foreground">
                      {stats.appliedCount} suggestions
                    </p>
                  </div>

                  {/* Corrections */}
                  <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 p-3 text-center">
                    <div className="flex items-center justify-center gap-1 text-amber-600 dark:text-amber-400">
                      <PenLine className="h-4 w-4" />
                      <span className="text-lg font-semibold">{stats.correctionCount}</span>
                    </div>
                    <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">Corrections</p>
                    <p className="text-xs text-muted-foreground">
                      {stats.falsePositiveCount} false positives
                    </p>
                  </div>
                </div>

                {/* Trends */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground border-t pt-3">
                  <div className="flex items-center gap-1">
                    {getTrendIcon(stats.trendsLastWeek.helpfulTrend)}
                    <span>Helpful trend</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {getTrendIcon(stats.trendsLastWeek.totalFeedbackTrend)}
                    <span>Activity trend</span>
                  </div>
                </div>

                {/* By Feature Breakdown */}
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-muted-foreground">By Feature</h4>
                  <div className="space-y-1">
                    {Object.entries(stats.byTargetType)
                      .filter(([, data]) => data.total > 0)
                      .sort((a, b) => b[1].total - a[1].total)
                      .slice(0, 5)
                      .map(([type, data]) => (
                        <div
                          key={type}
                          className="flex items-center justify-between text-xs py-1 px-2 rounded hover:bg-muted/50"
                        >
                          <span>{TARGET_TYPE_LABELS[type as FeedbackTargetType]}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-green-600 dark:text-green-400 flex items-center gap-0.5">
                              <ThumbsUp className="h-3 w-3" />
                              {data.helpful}
                            </span>
                            <span className="text-red-600 dark:text-red-400 flex items-center gap-0.5">
                              <ThumbsDown className="h-3 w-3" />
                              {data.notHelpful}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Recent Feedback */}
                {recentFeedback.length > 0 && (
                  <div className="space-y-2 border-t pt-3">
                    <h4 className="text-xs font-medium text-muted-foreground">Recent Feedback</h4>
                    <div className="space-y-2">
                      {recentFeedback.slice(0, 3).map((feedback) => (
                        <div
                          key={feedback.id}
                          className="flex items-start gap-2 text-xs p-2 rounded bg-muted/30"
                        >
                          {feedback.rating === 'helpful' ? (
                            <ThumbsUp className="h-3.5 w-3.5 text-green-500 mt-0.5" />
                          ) : feedback.rating === 'not_helpful' ? (
                            <ThumbsDown className="h-3.5 w-3.5 text-red-500 mt-0.5" />
                          ) : feedback.feedbackType === 'correction' ? (
                            <PenLine className="h-3.5 w-3.5 text-amber-500 mt-0.5" />
                          ) : (
                            <MessageSquare className="h-3.5 w-3.5 text-blue-500 mt-0.5" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-muted-foreground">
                              {TARGET_TYPE_LABELS[feedback.targetType]}
                            </p>
                            {feedback.comment && (
                              <p className="truncate text-foreground">{feedback.comment}</p>
                            )}
                            {feedback.explanation && (
                              <p className="truncate text-foreground">{feedback.explanation}</p>
                            )}
                          </div>
                          <span className="text-muted-foreground shrink-0">
                            {formatTimeAgo(feedback.createdAt)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* System Generated Note */}
                <p className="text-xs text-muted-foreground text-center pt-2 border-t">
                  System generated - Read only
                </p>
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No feedback data yet</p>
                <p className="text-xs mt-1">
                  Feedback will appear here as you interact with AI features
                </p>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

/**
 * Format time ago string
 */
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
