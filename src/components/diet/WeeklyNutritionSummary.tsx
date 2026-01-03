'use client';

import { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { DietEntry } from '@/types';
import { format, startOfWeek, endOfWeek, addDays, isSameDay, subWeeks, addWeeks, isToday } from 'date-fns';

interface WeeklyNutritionSummaryProps {
  entries: DietEntry[];
}

const MEAL_COLORS: Record<string, string> = {
  breakfast: '#FBBF24', // amber-400
  lunch: '#22C55E',     // green-500
  dinner: '#3B82F6',    // blue-500
  snack: '#A855F7',     // purple-500
};

const MACRO_COLORS = {
  carbs: '#3B82F6',    // blue-500
  protein: '#22C55E',  // green-500
  fat: '#F59E0B',      // amber-500
};

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

export function WeeklyNutritionSummary({ entries }: WeeklyNutritionSummaryProps) {
  const [selectedWeekStart, setSelectedWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [selectedDayIndex, setSelectedDayIndex] = useState(() => {
    const today = new Date();
    return today.getDay(); // 0 = Sunday
  });

  // Get the selected date
  const selectedDate = useMemo(() => {
    return addDays(selectedWeekStart, selectedDayIndex);
  }, [selectedWeekStart, selectedDayIndex]);

  // Generate week days
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(selectedWeekStart, i);
      return {
        date,
        dayName: format(date, 'EEE'),
        dayNum: format(date, 'd'),
        isToday: isToday(date),
      };
    });
  }, [selectedWeekStart]);

  // Filter entries for the selected date
  const dayEntries = useMemo(() => {
    return entries.filter(entry => {
      const entryDate = new Date(entry.timestamp);
      return isSameDay(entryDate, selectedDate);
    });
  }, [entries, selectedDate]);

  // Calculate meal breakdown
  const mealData = useMemo(() => {
    return ['breakfast', 'lunch', 'dinner', 'snack'].map(mealType => {
      const mealEntries = dayEntries.filter(e => e.meal === mealType);
      const totalCalories = mealEntries.reduce((sum, e) => {
        return sum + (e.aiAnalysis?.estimatedCalories || 0);
      }, 0);
      return {
        name: MEAL_LABELS[mealType],
        value: totalCalories,
        color: MEAL_COLORS[mealType],
      };
    }).filter(d => d.value > 0);
  }, [dayEntries]);

  // Calculate macros breakdown
  const macroData = useMemo(() => {
    const totalCarbs = dayEntries.reduce((sum, e) => sum + (e.aiAnalysis?.macros?.carbs?.grams || 0), 0);
    const totalProtein = dayEntries.reduce((sum, e) => sum + (e.aiAnalysis?.macros?.protein?.grams || 0), 0);
    const totalFat = dayEntries.reduce((sum, e) => sum + (e.aiAnalysis?.macros?.fat?.grams || 0), 0);

    return [
      { name: 'Carbs', value: totalCarbs, color: MACRO_COLORS.carbs, unit: 'g' },
      { name: 'Protein', value: totalProtein, color: MACRO_COLORS.protein, unit: 'g' },
      { name: 'Fat', value: totalFat, color: MACRO_COLORS.fat, unit: 'g' },
    ].filter(d => d.value > 0);
  }, [dayEntries]);

  const totalCalories = mealData.reduce((sum, d) => sum + d.value, 0);

  // Navigate weeks
  const goToPrevWeek = () => setSelectedWeekStart(prev => subWeeks(prev, 1));
  const goToNextWeek = () => setSelectedWeekStart(prev => addWeeks(prev, 1));
  const goToCurrentWeek = () => {
    setSelectedWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }));
    setSelectedDayIndex(new Date().getDay());
  };

  const isCurrentWeek = isSameDay(selectedWeekStart, startOfWeek(new Date(), { weekStartsOn: 0 }));

  // Custom tooltips
  const MealTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-2 shadow-lg text-sm">
          <p className="font-medium">{data.name}</p>
          <p className="text-gray-600 dark:text-gray-400">{data.value} cal</p>
        </div>
      );
    }
    return null;
  };

  const MacroTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-2 shadow-lg text-sm">
          <p className="font-medium">{data.name}</p>
          <p className="text-gray-600 dark:text-gray-400">{data.value}{data.unit}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">
              {isToday(selectedDate) ? "Today's Nutrition" : `Nutrition for ${format(selectedDate, 'EEEE')}`}
            </CardTitle>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {format(selectedDate, 'MMMM d, yyyy')}
            </p>
          </div>
          {totalCalories > 0 && (
            <span className="text-2xl font-bold text-orange-600">{totalCalories} cal</span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Week Navigation */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={goToPrevWeek}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-1">
            {weekDays.map((day, index) => (
              <button
                key={day.date.toISOString()}
                onClick={() => setSelectedDayIndex(index)}
                className={`flex flex-col items-center px-2 py-1 rounded-lg transition-colors min-w-[40px] ${
                  index === selectedDayIndex
                    ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                    : day.isToday
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
                }`}
              >
                <span className="text-xs font-medium">{day.dayName}</span>
                <span className="text-sm font-bold">{day.dayNum}</span>
              </button>
            ))}
          </div>
          <Button variant="ghost" size="sm" onClick={goToNextWeek}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Today button if not on current week */}
        {!isCurrentWeek && (
          <div className="flex justify-center">
            <Button variant="outline" size="sm" onClick={goToCurrentWeek}>
              Go to Today
            </Button>
          </div>
        )}

        {/* Charts */}
        {dayEntries.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400 py-6">
            No meals logged for this day
          </p>
        ) : mealData.length === 0 && macroData.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400 py-6">
            No nutrition data available (meals need analysis)
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {/* Meals Pie Chart */}
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 text-center mb-2">
                Calories by Meal
              </p>
              {mealData.length > 0 ? (
                <>
                  <div className="h-28">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={mealData}
                          cx="50%"
                          cy="50%"
                          innerRadius={25}
                          outerRadius={45}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {mealData.map((entry, index) => (
                            <Cell key={`meal-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<MealTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2 mt-2">
                    {mealData.map((meal) => (
                      <div key={meal.name} className="flex items-center gap-1 text-xs">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: meal.color }}
                        />
                        <span className="text-gray-600 dark:text-gray-400">
                          {meal.name}: {meal.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-center text-gray-400 text-xs py-8">No data</p>
              )}
            </div>

            {/* Macros Pie Chart */}
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 text-center mb-2">
                Macros Breakdown
              </p>
              {macroData.length > 0 ? (
                <>
                  <div className="h-28">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={macroData}
                          cx="50%"
                          cy="50%"
                          innerRadius={25}
                          outerRadius={45}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {macroData.map((entry, index) => (
                            <Cell key={`macro-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<MacroTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-center gap-3 mt-2">
                    {macroData.map((macro) => (
                      <div key={macro.name} className="flex items-center gap-1 text-xs">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: macro.color }}
                        />
                        <span style={{ color: macro.color }} className="font-medium">
                          {macro.value}g
                        </span>
                        <span className="text-gray-500 dark:text-gray-400">
                          {macro.name.toLowerCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-center text-gray-400 text-xs py-8">No data</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
