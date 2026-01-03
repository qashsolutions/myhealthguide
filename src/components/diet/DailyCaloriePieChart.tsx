'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DietEntry } from '@/types';

interface DailyCaloriePieChartProps {
  entries: DietEntry[];
  selectedDate: Date;
}

const MEAL_COLORS: Record<string, string> = {
  breakfast: '#FBBF24', // amber-400
  lunch: '#22C55E',     // green-500
  dinner: '#3B82F6',    // blue-500
  snack: '#A855F7',     // purple-500
};

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

export function DailyCaloriePieChart({ entries, selectedDate }: DailyCaloriePieChartProps) {
  // Filter entries for the selected date
  const dayEntries = entries.filter(entry => {
    const entryDate = new Date(entry.timestamp);
    return (
      entryDate.getFullYear() === selectedDate.getFullYear() &&
      entryDate.getMonth() === selectedDate.getMonth() &&
      entryDate.getDate() === selectedDate.getDate()
    );
  });

  // Aggregate calories by meal type
  const mealData = ['breakfast', 'lunch', 'dinner', 'snack'].map(mealType => {
    const mealEntries = dayEntries.filter(e => e.meal === mealType);
    const totalCalories = mealEntries.reduce((sum, e) => {
      return sum + (e.aiAnalysis?.estimatedCalories || 0);
    }, 0);
    const totalCarbs = mealEntries.reduce((sum, e) => {
      return sum + (e.aiAnalysis?.macros?.carbs?.grams || 0);
    }, 0);
    const totalProtein = mealEntries.reduce((sum, e) => {
      return sum + (e.aiAnalysis?.macros?.protein?.grams || 0);
    }, 0);
    const totalFat = mealEntries.reduce((sum, e) => {
      return sum + (e.aiAnalysis?.macros?.fat?.grams || 0);
    }, 0);

    return {
      name: MEAL_LABELS[mealType],
      value: totalCalories,
      carbs: totalCarbs,
      protein: totalProtein,
      fat: totalFat,
      color: MEAL_COLORS[mealType],
    };
  }).filter(d => d.value > 0);

  const totalCalories = mealData.reduce((sum, d) => sum + d.value, 0);
  const totalCarbs = mealData.reduce((sum, d) => sum + d.carbs, 0);
  const totalProtein = mealData.reduce((sum, d) => sum + d.protein, 0);
  const totalFat = mealData.reduce((sum, d) => sum + d.fat, 0);

  if (mealData.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Daily Nutrition</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
            No nutrition data for this day
          </p>
        </CardContent>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg">
          <p className="font-medium text-gray-900 dark:text-white">{data.name}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {data.value} calories
          </p>
          <div className="mt-1 pt-1 border-t border-gray-200 dark:border-gray-700 text-xs">
            <p className="text-blue-600 dark:text-blue-400">Carbs: {data.carbs}g</p>
            <p className="text-green-600 dark:text-green-400">Protein: {data.protein}g</p>
            <p className="text-amber-600 dark:text-amber-400">Fat: {data.fat}g</p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <span>Daily Nutrition</span>
          <span className="text-lg font-bold text-orange-600">{totalCalories} cal</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          {/* Pie Chart */}
          <div className="w-32 h-32">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={mealData}
                  cx="50%"
                  cy="50%"
                  innerRadius={25}
                  outerRadius={50}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {mealData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend and Macros */}
          <div className="flex-1 space-y-2">
            {/* Meal breakdown */}
            <div className="grid grid-cols-2 gap-1 text-xs">
              {mealData.map((meal) => (
                <div key={meal.name} className="flex items-center gap-1.5">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: meal.color }}
                  />
                  <span className="text-gray-600 dark:text-gray-400">
                    {meal.name}: {meal.value}
                  </span>
                </div>
              ))}
            </div>

            {/* Total macros */}
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Total Macros
              </p>
              <div className="flex gap-3 text-xs">
                <span className="text-blue-600 dark:text-blue-400">{totalCarbs}g carbs</span>
                <span className="text-green-600 dark:text-green-400">{totalProtein}g protein</span>
                <span className="text-amber-600 dark:text-amber-400">{totalFat}g fat</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
