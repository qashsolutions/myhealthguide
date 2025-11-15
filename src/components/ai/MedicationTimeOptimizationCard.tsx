'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Clock, AlertCircle, TrendingUp, CheckCircle, ArrowRight } from 'lucide-react';
import { MedicationTimeOptimization } from '@/lib/ai/medicationTimeOptimization';

interface MedicationTimeOptimizationCardProps {
  medicationName: string;
  optimization: MedicationTimeOptimization;
  onApplySuggestion?: (suggestedTime: string) => void;
}

export function MedicationTimeOptimizationCard({
  medicationName,
  optimization,
  onApplySuggestion
}: MedicationTimeOptimizationCardProps) {
  // No optimization needed - show success state
  if (!optimization.optimizationNeeded) {
    return (
      <Card className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-900 dark:text-green-100">
            <CheckCircle className="h-5 w-5 text-green-600" />
            {medicationName} - Times Working Well
          </CardTitle>
          <CardDescription className="text-green-800 dark:text-green-200">
            {optimization.message}
          </CardDescription>
        </CardHeader>

        {optimization.analysisData && (
          <CardContent>
            <div className="flex gap-4 text-sm text-green-800 dark:text-green-200">
              <span>
                <strong>{optimization.analysisData.totalDoses}</strong> doses logged
              </span>
              <span>•</span>
              <span>
                <strong>{optimization.analysisData.currentCompliance}</strong> compliance
              </span>
              <span>•</span>
              <span>
                Last <strong>{optimization.analysisData.analysisPeriod}</strong>
              </span>
            </div>
          </CardContent>
        )}
      </Card>
    );
  }

  // Optimization suggestions available
  return (
    <Card className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
          <Clock className="h-5 w-5 text-blue-600" />
          {medicationName} - Time Optimization Available
        </CardTitle>
        <CardDescription className="text-blue-800 dark:text-blue-200">
          AI detected patterns that could improve medication adherence
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Analysis Data */}
        {optimization.analysisData && (
          <div className="flex flex-wrap gap-4 text-sm text-blue-800 dark:text-blue-200 pb-3 border-b border-blue-200 dark:border-blue-700">
            <span>
              <strong>{optimization.analysisData.totalDoses}</strong> doses analyzed
            </span>
            <span>•</span>
            <span>
              Current: <strong>{optimization.analysisData.currentCompliance}</strong>
            </span>
            {optimization.analysisData.potentialImprovement && (
              <>
                <span>•</span>
                <span className="text-green-700 dark:text-green-300 font-semibold">
                  Potential: <strong>{optimization.analysisData.potentialImprovement}</strong> improvement
                </span>
              </>
            )}
          </div>
        )}

        {/* Problematic Times */}
        {optimization.problematicTimes && optimization.problematicTimes.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Times with Poor Compliance
            </h4>
            <div className="space-y-2">
              {optimization.problematicTimes.map((time, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-lg border border-red-200 dark:border-red-800"
                >
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{time.time}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {time.missed} of {time.total} doses missed
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-red-600">{time.missRate}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">miss rate</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Suggestions */}
        {optimization.suggestions && optimization.suggestions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Times With Better Compliance Patterns
            </h4>
            <div className="space-y-2">
              {optimization.suggestions.map((suggestion, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-lg border border-green-200 dark:border-green-800"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">{suggestion.time}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{suggestion.reason}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">{suggestion.missRate}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">miss rate</p>
                    </div>
                    {onApplySuggestion && idx === 0 && (
                      <Button
                        size="sm"
                        onClick={() => onApplySuggestion(suggestion.time)}
                        className="gap-1"
                        title="Discuss this timing with healthcare provider before applying"
                      >
                        View Pattern
                        <ArrowRight className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Data Analysis */}
        {optimization.recommendation && (
          <Alert className="bg-white dark:bg-gray-900 border-blue-300 dark:border-blue-700">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-900 dark:text-blue-100">Data Analysis</AlertTitle>
            <AlertDescription className="text-sm text-blue-800 dark:text-blue-200">
              {optimization.recommendation}
              <p className="text-xs text-gray-500 mt-2 italic">
                Note: Only a healthcare provider should adjust medication timing. This is data analysis only.
              </p>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
