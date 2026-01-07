'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Utensils, Clock, TrendingUp, AlertTriangle, CheckCircle2, Info, Flame, RefreshCw, Loader2, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { DietEntry } from '@/types';
import { format, isToday, isYesterday } from 'date-fns';
import { useRouter } from 'next/navigation';

interface CollapsibleDaySectionProps {
  date: Date;
  entries: DietEntry[];
  defaultOpen?: boolean;
  onReanalyze?: (entry: DietEntry) => void;
  reanalyzingId?: string | null;
  onDelete?: (entry: DietEntry) => void;
}

const getMealBadgeColor = (meal: string) => {
  switch (meal) {
    case 'breakfast': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'lunch': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case 'dinner': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    case 'snack': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
  }
};

const getScoreColor = (score: number) => {
  if (score >= 75) return 'text-green-600 dark:text-green-400';
  if (score >= 50) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
};

const getScoreBgColor = (score: number) => {
  if (score >= 75) return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
  if (score >= 50) return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
  return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
};

const getSeverityIcon = (severity: string) => {
  switch (severity) {
    case 'alert': return <AlertTriangle className="w-3 h-3 text-red-500" />;
    case 'warning': return <AlertTriangle className="w-3 h-3 text-amber-500" />;
    default: return <Info className="w-3 h-3 text-blue-500" />;
  }
};

export function CollapsibleDaySection({
  date,
  entries,
  defaultOpen = false,
  onReanalyze,
  reanalyzingId,
  onDelete,
}: CollapsibleDaySectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const router = useRouter();

  // Calculate daily totals
  const totalCalories = entries.reduce((sum, e) => sum + (e.aiAnalysis?.estimatedCalories || 0), 0);
  const mealsLogged = entries.length;

  // Format date label
  const getDateLabel = () => {
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'EEEE, MMM d');
  };

  // Sort entries by meal order
  const mealOrder: Record<string, number> = {
    'breakfast': 1,
    'lunch': 2,
    'dinner': 3,
    'snack': 4
  };
  const sortedEntries = [...entries].sort((a, b) =>
    (mealOrder[a.meal] || 99) - (mealOrder[b.meal] || 99)
  );

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* Collapsible Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <div className="flex items-center gap-3">
          {isOpen ? (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-500" />
          )}
          <span className="font-medium text-gray-900 dark:text-white">
            {getDateLabel()}
          </span>
          <Badge variant="secondary" className="text-xs">
            {mealsLogged} {mealsLogged === 1 ? 'meal' : 'meals'}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {totalCalories > 0 && (
            <span className="text-sm font-medium text-orange-600 dark:text-orange-400">
              {totalCalories} cal
            </span>
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isOpen && (
        <div className="p-4 bg-white dark:bg-gray-900 space-y-3">
          {sortedEntries.map((entry) => (
            <Card key={entry.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Utensils className="w-5 h-5 text-orange-600" />
                    <CardTitle className="text-lg capitalize">{entry.meal}</CardTitle>
                  </div>
                  <Badge className={getMealBadgeColor(entry.meal)}>
                    {entry.meal}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-1">
                  {entry.items.map((item, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {item}
                    </Badge>
                  ))}
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <Clock className="w-4 h-4" />
                  <span>{format(new Date(entry.timestamp), 'h:mm a')}</span>
                </div>

                {entry.aiAnalysis && (
                  <div className={`p-3 rounded-lg border ${getScoreBgColor(entry.aiAnalysis.nutritionScore)}`}>
                    {/* Score Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <TrendingUp className={`w-4 h-4 ${getScoreColor(entry.aiAnalysis.nutritionScore)}`} />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Nutrition Score</span>
                      </div>
                      <span className={`text-lg font-bold ${getScoreColor(entry.aiAnalysis.nutritionScore)}`}>
                        {entry.aiAnalysis.nutritionScore}/100
                      </span>
                    </div>

                    {/* Macros Display */}
                    {entry.aiAnalysis.macros && (
                      <div className="grid grid-cols-3 gap-2 mb-2 text-xs">
                        <div className="text-center p-1.5 bg-white/50 dark:bg-gray-800/50 rounded">
                          <div className="font-medium text-blue-600 dark:text-blue-400">
                            {entry.aiAnalysis.macros.carbs.grams}g
                          </div>
                          <div className="text-gray-500 dark:text-gray-400">Carbs</div>
                        </div>
                        <div className="text-center p-1.5 bg-white/50 dark:bg-gray-800/50 rounded">
                          <div className="font-medium text-green-600 dark:text-green-400">
                            {entry.aiAnalysis.macros.protein.grams}g
                          </div>
                          <div className="text-gray-500 dark:text-gray-400">Protein</div>
                        </div>
                        <div className="text-center p-1.5 bg-white/50 dark:bg-gray-800/50 rounded">
                          <div className="font-medium text-amber-600 dark:text-amber-400">
                            {entry.aiAnalysis.macros.fat.grams}g
                          </div>
                          <div className="text-gray-500 dark:text-gray-400">Fat</div>
                        </div>
                      </div>
                    )}

                    {/* Calories */}
                    {entry.aiAnalysis.estimatedCalories && (
                      <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 mb-2">
                        <Flame className="w-3 h-3 text-orange-500" />
                        <span>~{entry.aiAnalysis.estimatedCalories} calories</span>
                      </div>
                    )}

                    {/* Condition Flags */}
                    {entry.aiAnalysis.conditionFlags && entry.aiAnalysis.conditionFlags.length > 0 && (
                      <div className="space-y-1 mb-2">
                        {entry.aiAnalysis.conditionFlags.slice(0, 2).map((flag, idx) => (
                          <div key={idx} className="flex items-start gap-1.5 text-xs">
                            {getSeverityIcon(flag.severity)}
                            <span className="text-gray-600 dark:text-gray-400">{flag.concern}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Positives */}
                    {entry.aiAnalysis.positives && entry.aiAnalysis.positives.length > 0 && (
                      <div className="flex items-start gap-1.5 text-xs text-green-600 dark:text-green-400">
                        <CheckCircle2 className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <span>{entry.aiAnalysis.positives[0]}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Re-analyze button for entries without analysis */}
                {!entry.aiAnalysis && onReanalyze && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onReanalyze(entry)}
                    disabled={reanalyzingId === entry.id}
                    className="w-full"
                  >
                    {reanalyzingId === entry.id ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Analyze Nutrition
                      </>
                    )}
                  </Button>
                )}

                {entry.notes && (
                  <div className="text-sm text-gray-500 dark:text-gray-500 italic">
                    {entry.notes}
                  </div>
                )}

                {/* Edit/Delete Buttons */}
                <div className="flex gap-2 pt-3 border-t border-gray-200 dark:border-gray-700 mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/dashboard/diet/${entry.id}/edit`)}
                    className="flex-1"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  {onDelete && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDelete(entry)}
                      className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
