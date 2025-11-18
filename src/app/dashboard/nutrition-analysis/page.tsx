'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Apple,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Lightbulb,
  Droplet,
  Utensils,
  TrendingUp,
  RefreshCw,
  Info
} from 'lucide-react';
import {
  analyzeNutrition,
  getLatestNutritionAnalysis,
  type NutritionAnalysisReport
} from '@/lib/medical/nutritionAnalysis';

export default function NutritionAnalysisPage() {
  const { user } = useAuth();
  const groupId = user?.groups?.[0]?.groupId;
  // TODO: Implement proper elder selection - elderId should come from state/props
  const elderId = undefined as string | undefined;
  const elderName = 'Elder'; // TODO: Get from selected elder

  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [report, setReport] = useState<NutritionAnalysisReport | null>(null);

  useEffect(() => {
    loadReport();
  }, [groupId, elderId]);

  async function loadReport() {
    if (!groupId || !elderId) return;

    setLoading(true);
    try {
      const result = await getLatestNutritionAnalysis(groupId, elderId);
      setReport(result);
    } catch (error) {
      console.error('Error loading report:', error);
    } finally {
      setLoading(false);
    }
  }

  async function runAnalysis() {
    if (!groupId || !elderId) return;

    setAnalyzing(true);
    try {
      const newReport = await analyzeNutrition(groupId, elderId, elderName, 7);
      setReport(newReport);
    } catch (error) {
      console.error('Error running analysis:', error);
    } finally {
      setAnalyzing(false);
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-blue-600 dark:text-blue-400';
    if (score >= 40) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-100 dark:bg-green-900/30';
    if (score >= 60) return 'bg-blue-100 dark:bg-blue-900/30';
    if (score >= 40) return 'bg-yellow-100 dark:bg-yellow-900/30';
    return 'bg-red-100 dark:bg-red-900/30';
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
            <Apple className="h-8 w-8 text-green-600" />
            Nutrition Analysis
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            AI-powered dietary pattern analysis and insights
          </p>
        </div>
        <Button onClick={runAnalysis} disabled={analyzing || loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${analyzing ? 'animate-spin' : ''}`} />
          Run Analysis
        </Button>
      </div>

      {/* Disclaimer */}
      <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-yellow-900 dark:text-yellow-100">
              Informational Analysis Only
            </p>
            <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
              This analysis provides general dietary insights. It is NOT nutritional advice or a
              substitute for professional consultation. Always consult with a registered dietitian or
              healthcare provider for personalized nutrition guidance.
            </p>
          </div>
        </div>
      </Card>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      )}

      {/* No Report */}
      {!loading && !report && (
        <Card className="p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="p-4 bg-green-100 dark:bg-green-900/20 rounded-full inline-block mb-4">
              <Apple className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              No Analysis Yet
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Run your first nutrition analysis to get insights on dietary patterns. Requires at least
              a few days of diet entry data.
            </p>
            <Button onClick={runAnalysis} disabled={analyzing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${analyzing ? 'animate-spin' : ''}`} />
              Run First Analysis
            </Button>
          </div>
        </Card>
      )}

      {/* Report */}
      {!loading && report && (
        <div className="space-y-6">
          {/* Overall Score */}
          <Card className={`${getScoreBg(report.overallScore)} p-6 border-2`}>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Overall Nutrition Score
                </h3>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                  {report.assessment}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Analysis Period: {report.period.start.toLocaleDateString()} -{' '}
                  {report.period.end.toLocaleDateString()}
                </p>
              </div>
              <div className="text-center">
                <div className={`text-6xl font-bold ${getScoreColor(report.overallScore)}`}>
                  {report.overallScore}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">out of 100</div>
              </div>
            </div>
          </Card>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Meals Per Day */}
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Utensils className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <h4 className="font-semibold text-gray-900 dark:text-gray-100">Meals/Day</h4>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {report.avgMealsPerDay}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {report.totalMeals} total meals logged
              </p>
            </Card>

            {/* Food Variety */}
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Apple className="h-5 w-5 text-green-600 dark:text-green-400" />
                <h4 className="font-semibold text-gray-900 dark:text-gray-100">Variety</h4>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {report.uniqueFoods}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                different foods ({report.varietyScore}% score)
              </p>
            </Card>

            {/* Hydration */}
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Droplet className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                <h4 className="font-semibold text-gray-900 dark:text-gray-100">Hydration</h4>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {report.avgWaterPerDay}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                glasses/day average
              </p>
            </Card>

            {/* Eating Pattern */}
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                <h4 className="font-semibold text-gray-900 dark:text-gray-100">Pattern</h4>
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {report.regularEatingPattern ? 'Regular' : 'Irregular'}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                eating schedule
              </p>
            </Card>
          </div>

          {/* Meal Breakdown */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Meal Type Breakdown
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Breakfast</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {report.breakfastCount}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Lunch</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {report.lunchCount}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Dinner</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {report.dinnerCount}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Snacks</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {report.snackCount}
                </p>
              </div>
            </div>
          </Card>

          {/* Food Groups */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Food Group Distribution
            </h3>
            <div className="space-y-3">
              {report.foodGroups
                .filter(fg => fg.count > 0)
                .map((foodGroup) => (
                  <div key={foodGroup.group}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {foodGroup.group}
                      </span>
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        {foodGroup.count} foods ({foodGroup.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full transition-all"
                        style={{ width: `${foodGroup.percentage}%` }}
                      ></div>
                    </div>
                    {foodGroup.examples.length > 0 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Examples: {foodGroup.examples.join(', ')}
                      </p>
                    )}
                  </div>
                ))}
            </div>
          </Card>

          {/* Positive Insights */}
          {report.positiveInsights.length > 0 && (
            <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 p-6">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                <h3 className="text-lg font-semibold text-green-900 dark:text-green-100">
                  Positive Insights
                </h3>
              </div>
              <div className="space-y-3">
                {report.positiveInsights.map((insight, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-green-900 dark:text-green-100 text-sm">
                        {insight.title}
                      </p>
                      <p className="text-sm text-green-800 dark:text-green-200">
                        {insight.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Concerns */}
          {report.concerns.length > 0 && (
            <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-100">
                  Areas of Concern
                </h3>
              </div>
              <div className="space-y-3">
                {report.concerns.map((concern, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-yellow-900 dark:text-yellow-100 text-sm">
                        {concern.title}
                      </p>
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        {concern.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Suggestions */}
          {report.suggestions.length > 0 && (
            <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                  Suggestions for Improvement
                </h3>
              </div>
              <div className="space-y-3">
                {report.suggestions.map((suggestion, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <Lightbulb className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-blue-900 dark:text-blue-100 text-sm">
                        {suggestion.title}
                      </p>
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        {suggestion.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Professional Consultation Reminder */}
          <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 p-4">
            <p className="text-sm text-purple-900 dark:text-purple-100 font-medium">
              💡 Next Steps
            </p>
            <p className="text-xs text-purple-800 dark:text-purple-200 mt-2">
              This analysis provides general insights based on logged food data. For personalized
              nutrition advice, comprehensive dietary planning, or management of specific health
              conditions, please consult with a registered dietitian or healthcare provider.
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}
