'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  History,
  ChevronDown,
  ChevronUp,
  Calendar,
  AlertTriangle,
  Clock,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { authenticatedFetch } from '@/lib/api/authenticatedFetch';
import { URGENCY_LEVEL_CONFIG, UrgencyLevel } from '@/types/symptomChecker';

interface SymptomHistoryItem {
  id: string;
  symptomsDescription: string;
  createdAt: string;
  urgencyLevel: UrgencyLevel | null;
  age: number;
  gender: string;
  assessmentHeadline?: string;
  isEmergency: boolean;
  elderId?: string;
  elderName?: string;
}

interface SymptomHistoryProps {
  onSelectQuery?: (query: SymptomHistoryItem) => void;
  className?: string;
}

export function SymptomHistory({ onSelectQuery, className = '' }: SymptomHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [history, setHistory] = useState<SymptomHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await authenticatedFetch('/api/symptom-checker/history?limit=20');
      if (!response.ok) {
        throw new Error('Failed to fetch history');
      }
      const data = await response.json();
      setHistory(data.history || []);
      setHasLoaded(true);
    } catch (err) {
      console.error('Error fetching symptom history:', err);
      setError('Unable to load history');
    } finally {
      setLoading(false);
    }
  };

  // Load history when opened
  useEffect(() => {
    if (isOpen && !hasLoaded) {
      fetchHistory();
    }
  }, [isOpen, hasLoaded]);

  // Group queries by date
  const groupByDate = (items: SymptomHistoryItem[]) => {
    const groups: Record<string, SymptomHistoryItem[]> = {};
    items.forEach(item => {
      const date = new Date(item.createdAt);
      const dateKey = date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(item);
    });
    return groups;
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (history.length === 0 && hasLoaded && !loading) {
    return null; // Don't show if no history
  }

  return (
    <Card className={`border-blue-200 dark:border-blue-900 ${className}`}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors py-3">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                <History className="w-5 h-5" />
                Your Symptom Check History
                {history.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {history.length}
                  </Badge>
                )}
              </span>
              <div className="flex items-center gap-2">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {isOpen ? (
                  <ChevronUp className="w-5 h-5 text-gray-500" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-500" />
                )}
              </div>
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0">
            {error ? (
              <div className="text-center py-4">
                <p className="text-red-600 dark:text-red-400 text-sm mb-2">{error}</p>
                <Button variant="outline" size="sm" onClick={fetchHistory}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry
                </Button>
              </div>
            ) : loading && !hasLoaded ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : history.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400 py-4 text-sm">
                No symptom checks yet. Your history will appear here.
              </p>
            ) : (
              <div className="space-y-4 max-h-80 overflow-y-auto">
                {Object.entries(groupByDate(history)).map(([date, items]) => (
                  <div key={date}>
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 mb-2 sticky top-0 bg-white dark:bg-gray-900 py-1">
                      <Calendar className="w-4 h-4" />
                      {date}
                    </div>
                    <div className="space-y-2 pl-2">
                      {items.map(item => {
                        const urgency = item.urgencyLevel
                          ? URGENCY_LEVEL_CONFIG[item.urgencyLevel]
                          : null;

                        return (
                          <div
                            key={item.id}
                            className={`p-3 rounded-lg border transition-colors ${
                              onSelectQuery
                                ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800'
                                : ''
                            } ${
                              item.isEmergency
                                ? 'border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
                                : 'border-gray-200 dark:border-gray-700'
                            }`}
                            onClick={() => onSelectQuery?.(item)}
                          >
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <div className="flex items-center gap-2">
                                <Clock className="w-3 h-3 text-gray-400" />
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {formatTime(item.createdAt)}
                                </span>
                                {item.elderName && (
                                  <Badge variant="outline" className="text-xs">
                                    {item.elderName}
                                  </Badge>
                                )}
                              </div>
                              {urgency && (
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${urgency.color}`}
                                >
                                  {item.isEmergency && (
                                    <AlertTriangle className="w-3 h-3 mr-1" />
                                  )}
                                  {urgency.label}
                                </Badge>
                              )}
                            </div>

                            {item.assessmentHeadline && (
                              <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                                {item.assessmentHeadline}
                              </p>
                            )}

                            <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                              {item.symptomsDescription}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* Refresh button */}
                <div className="text-center pt-2 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      fetchHistory();
                    }}
                    disabled={loading}
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
