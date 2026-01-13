'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DietAnalysis } from '@/types';
import { Utensils, AlertTriangle, TrendingUp, Sparkles } from 'lucide-react';

interface DietAnalysisPanelProps {
  analysis: DietAnalysis;
  meal: string;
  items: string[];
}

export function DietAnalysisPanel({ analysis, meal, items }: DietAnalysisPanelProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadgeVariant = (score: number): "default" | "secondary" | "destructive" | "outline" => {
    if (score >= 80) return 'default';
    if (score >= 60) return 'secondary';
    return 'destructive';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-orange-600" />
          Smart Nutrition
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Meal Details */}
        <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-3">
            <Utensils className="w-5 h-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900 dark:text-white capitalize">{meal}</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {items.map((item, idx) => {
              // Handle both string items and object items {name, calories, portion}
              const itemText = typeof item === 'string' ? item : (item as unknown as { name?: string })?.name || 'Unknown';
              return (
                <Badge key={idx} variant="outline">
                  {itemText}
                </Badge>
              );
            })}
          </div>
        </div>

        {/* Nutrition Score */}
        <div className="text-center p-6 rounded-lg bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border border-orange-200 dark:border-orange-800">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            Nutrition Score
          </p>
          <div className="flex items-center justify-center gap-3">
            <span className={`text-5xl font-bold ${getScoreColor(analysis.nutritionScore)}`}>
              {analysis.nutritionScore}
            </span>
            <span className="text-2xl text-gray-400">/100</span>
          </div>
          <div className="mt-3">
            <Badge variant={getScoreBadgeVariant(analysis.nutritionScore)}>
              {analysis.nutritionScore >= 80 ? 'Excellent' :
               analysis.nutritionScore >= 60 ? 'Good' :
               analysis.nutritionScore >= 40 ? 'Fair' : 'Needs Improvement'}
            </Badge>
          </div>
        </div>

        {/* Concerns */}
        {analysis.concerns && analysis.concerns.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              Nutritional Concerns
            </div>
            <div className="space-y-2">
              {analysis.concerns.map((concern, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800"
                >
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {concern}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {analysis.recommendations && analysis.recommendations.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <TrendingUp className="w-4 h-4 text-green-600" />
              Recommendations
            </div>
            <div className="space-y-2">
              {analysis.recommendations.map((rec, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                >
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {rec}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className="text-xs text-gray-500 dark:text-gray-400 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <p className="font-medium mb-1">Important Note:</p>
          <p>
            This analysis is for informational purposes only and does not constitute medical or dietary advice.
            Always consult with healthcare professionals for personalized nutrition guidance.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
