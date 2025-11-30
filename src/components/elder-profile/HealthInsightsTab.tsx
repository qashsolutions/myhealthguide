'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sparkles,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Info,
  TrendingUp,
  Calendar,
  Clock,
  Eye,
  EyeOff,
  Shield,
  CheckCircle,
} from 'lucide-react';
import { dismissHealthInsight } from '@/lib/firebase/elderHealthProfile';
import type { ElderHealthInsight } from '@/types';
import { format } from 'date-fns';

interface HealthInsightsTabProps {
  elderId: string;
  groupId: string;
  userId: string;
  elderName: string;
}

export function HealthInsightsTab({ elderId, groupId, userId, elderName }: HealthInsightsTabProps) {
  const [insights, setInsights] = useState<ElderHealthInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDismissed, setShowDismissed] = useState(false);
  const [periodDays, setPeriodDays] = useState('7');

  useEffect(() => {
    loadInsights();
  }, [elderId, showDismissed]);

  const loadInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/elder-insights?elderId=${elderId}&includeDismissed=${showDismissed}&limit=50`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load insights');
      }

      setInsights(data.insights || []);
    } catch (err: any) {
      console.error('Error loading insights:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateInsights = async () => {
    setGenerating(true);
    setError(null);
    setSummary(null);
    try {
      const response = await fetch('/api/elder-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          elderId,
          groupId,
          userId,
          days: parseInt(periodDays),
          includeSummary: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.requiresConsent) {
          setError('AI consent is required to generate insights. Please enable AI features in Settings.');
          return;
        }
        throw new Error(data.error || 'Failed to generate insights');
      }

      setInsights(data.insights || []);
      setSummary(data.summary || null);
      loadInsights(); // Refresh to get the latest from DB
    } catch (err: any) {
      console.error('Error generating insights:', err);
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleDismiss = async (insightId: string) => {
    try {
      await dismissHealthInsight(insightId, userId);
      loadInsights();
    } catch (err) {
      console.error('Error dismissing insight:', err);
    }
  };

  const getInsightTypeIcon = (type: string) => {
    switch (type) {
      case 'symptom_pattern': return <TrendingUp className="w-4 h-4 text-blue-500" />;
      case 'medication_adherence': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'health_trend': return <TrendingUp className="w-4 h-4 text-purple-500" />;
      default: return <Info className="w-4 h-4 text-gray-500" />;
    }
  };

  const getInsightTypeLabel = (type: string) => {
    switch (type) {
      case 'symptom_pattern': return 'Symptom Pattern';
      case 'medication_adherence': return 'Medication Adherence';
      case 'health_trend': return 'Health Trend';
      case 'observation': return 'Observation';
      default: return type.replace(/_/g, ' ');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              Health Insights
            </span>
            <div className="flex items-center gap-2">
              <Select value={periodDays} onValueChange={setPeriodDays}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="14">Last 14 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                </SelectContent>
              </Select>
              <Button
                size="sm"
                onClick={generateInsights}
                disabled={generating}
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Generate
                  </>
                )}
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            AI-generated observations from {elderName}'s logged health data.
            Insights are generated twice weekly (Monday and Thursday).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Critical Disclaimers */}
          <div className="space-y-3 mb-6">
            <Alert className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 dark:text-amber-200 text-sm">
                <strong>Important:</strong> These observations are based solely on data logged in this app.
                They are NOT medical advice and should NOT be used for medical decisions.
                Always consult {elderName}'s healthcare provider for any health concerns.
              </AlertDescription>
            </Alert>

            <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <Shield className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800 dark:text-blue-200 text-sm">
                <strong>What these insights are:</strong> Factual observations from logged data only.
                Example: "Headache was logged 3 times between Nov 1-7."
                <br />
                <strong>What they are NOT:</strong> Diagnoses, recommendations, medical interpretations, or treatment suggestions.
              </AlertDescription>
            </Alert>
          </div>

          {error && (
            <Alert className="mb-4 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800 dark:text-red-200">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* AI Summary (if available) */}
          {summary && (
            <Card className="mb-4 bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-purple-800 dark:text-purple-200">
                  <Sparkles className="w-4 h-4" />
                  Data Summary (Last {periodDays} Days)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-purple-700 dark:text-purple-300 whitespace-pre-wrap">
                  {summary}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Toggle dismissed insights */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-500">
              {insights.filter(i => !i.dismissedAt).length} active insights
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDismissed(!showDismissed)}
              className="text-xs"
            >
              {showDismissed ? (
                <>
                  <EyeOff className="w-3 h-3 mr-1" />
                  Hide Dismissed
                </>
              ) : (
                <>
                  <Eye className="w-3 h-3 mr-1" />
                  Show Dismissed
                </>
              )}
            </Button>
          </div>

          {/* Insights List */}
          {insights.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Sparkles className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>No insights generated yet.</p>
              <p className="text-sm mt-1">
                Click "Generate" to analyze {elderName}'s health data.
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={generateInsights}
                disabled={generating}
              >
                <Sparkles className="w-4 h-4 mr-1" />
                Generate First Insights
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {insights.map(insight => (
                <InsightCard
                  key={insight.id}
                  insight={insight}
                  onDismiss={handleDismiss}
                  getTypeIcon={getInsightTypeIcon}
                  getTypeLabel={getInsightTypeLabel}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Insight Card Component
interface InsightCardProps {
  insight: ElderHealthInsight;
  onDismiss: (id: string) => void;
  getTypeIcon: (type: string) => JSX.Element;
  getTypeLabel: (type: string) => string;
}

function InsightCard({ insight, onDismiss, getTypeIcon, getTypeLabel }: InsightCardProps) {
  const isDismissed = !!insight.dismissedAt;

  return (
    <div
      className={`p-4 rounded-lg border ${
        isDismissed
          ? 'bg-gray-100 dark:bg-gray-900 border-gray-200 dark:border-gray-700 opacity-60'
          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          {/* Header */}
          <div className="flex items-center gap-2 flex-wrap">
            {getTypeIcon(insight.insightType)}
            <Badge variant="outline" className="text-xs">
              {getTypeLabel(insight.insightType)}
            </Badge>
            {insight.dataSource === 'template' && (
              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                Data-Based
              </Badge>
            )}
            {isDismissed && (
              <Badge variant="outline" className="text-xs bg-gray-100 text-gray-600">
                Dismissed
              </Badge>
            )}
          </div>

          {/* Content */}
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {insight.observation}
          </p>

          {/* Metadata */}
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {format(
                typeof insight.createdAt === 'object' && 'seconds' in insight.createdAt
                  ? new Date((insight.createdAt as any).seconds * 1000)
                  : new Date(insight.createdAt),
                'MMM d, yyyy'
              )}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Period: {insight.periodStart && insight.periodEnd ? (
                <>
                  {format(
                    typeof insight.periodStart === 'object' && 'seconds' in insight.periodStart
                      ? new Date((insight.periodStart as any).seconds * 1000)
                      : new Date(insight.periodStart),
                    'MMM d'
                  )}
                  {' - '}
                  {format(
                    typeof insight.periodEnd === 'object' && 'seconds' in insight.periodEnd
                      ? new Date((insight.periodEnd as any).seconds * 1000)
                      : new Date(insight.periodEnd),
                    'MMM d'
                  )}
                </>
              ) : 'N/A'}
            </span>
          </div>
        </div>

        {/* Actions */}
        {!isDismissed && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDismiss(insight.id!)}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            <EyeOff className="w-3 h-3 mr-1" />
            Dismiss
          </Button>
        )}
      </div>
    </div>
  );
}
