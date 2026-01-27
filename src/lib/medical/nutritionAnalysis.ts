/**
 * Nutrition Analysis & Recommendations System
 *
 * Analyzes dietary patterns and provides insights on:
 * - Meal frequency and regularity
 * - Food group variety
 * - Hydration tracking
 * - Eating patterns
 *
 * CRITICAL: This is informational analysis, NOT medical/nutritional advice.
 * Always recommend consulting with doctor or registered dietitian.
 */

import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, orderBy, Timestamp, addDoc } from 'firebase/firestore';
import type { DietEntry } from '@/types';

export interface NutritionInsight {
  type: 'positive' | 'concern' | 'suggestion';
  category: 'meal_frequency' | 'variety' | 'hydration' | 'timing' | 'portions';
  title: string;
  description: string;
  data?: Record<string, any>;
}

export interface FoodGroupAnalysis {
  group: string;
  count: number;
  percentage: number;
  examples: string[];
}

export interface NutritionAnalysisReport {
  id: string;
  groupId: string;
  elderId: string;
  elderName: string;
  analysisDate: Date;
  period: { start: Date; end: Date };

  // Meal patterns
  totalMeals: number;
  avgMealsPerDay: number;
  breakfastCount: number;
  lunchCount: number;
  dinnerCount: number;
  snackCount: number;

  // Food variety
  uniqueFoods: number;
  foodGroups: FoodGroupAnalysis[];
  varietyScore: number; // 0-100

  // Hydration
  waterIntake: number; // Total glasses/cups
  avgWaterPerDay: number;

  // Eating patterns
  regularEatingPattern: boolean;
  skippedMealsCount: number;
  lateNightEatingCount: number; // Meals after 8pm

  // Insights
  positiveInsights: NutritionInsight[];
  concerns: NutritionInsight[];
  suggestions: NutritionInsight[];

  // Overall assessment
  overallScore: number; // 0-100
  assessment: string;

  generatedAt: Date;
}

/**
 * Food group classifications (simplified)
 */
const FOOD_GROUPS = {
  'Fruits': ['apple', 'banana', 'orange', 'berry', 'berries', 'grape', 'melon', 'peach', 'pear', 'fruit'],
  'Vegetables': ['carrot', 'broccoli', 'spinach', 'lettuce', 'tomato', 'cucumber', 'pepper', 'onion', 'vegetable', 'salad', 'greens'],
  'Proteins': ['chicken', 'beef', 'pork', 'fish', 'salmon', 'tuna', 'turkey', 'egg', 'eggs', 'beans', 'tofu', 'meat'],
  'Grains': ['rice', 'bread', 'pasta', 'cereal', 'oats', 'quinoa', 'wheat', 'tortilla', 'bagel'],
  'Dairy': ['milk', 'cheese', 'yogurt', 'butter', 'cream'],
  'Beverages': ['water', 'juice', 'coffee', 'tea', 'soda', 'drink']
};

/**
 * Analyze nutrition from diet entries
 */
export async function analyzeNutrition(
  groupId: string,
  elderId: string,
  elderName: string,
  analysisDays: number = 7
): Promise<NutritionAnalysisReport | null> {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - analysisDays);

    // Get diet entries - query order must match index: elderId, groupId, timestamp
    const entriesQuery = query(
      collection(db, 'diet_entries'),
      where('elderId', '==', elderId),
      where('groupId', '==', groupId),
      orderBy('timestamp', 'desc')
    );

    const entriesSnap = await getDocs(entriesQuery);

    // Filter by date range client-side (to avoid composite index with range query)
    const entries = entriesSnap.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate()
      }))
      .filter(entry => {
        const ts = entry.timestamp;
        return ts && ts >= startDate && ts <= endDate;
      }) as DietEntry[];

    if (entries.length === 0) {
      return null; // No data to analyze
    }

    // Analyze meal patterns
    const mealPatterns = analyzeMealPatterns(entries, analysisDays);

    // Analyze food variety
    const { uniqueFoods, foodGroups, varietyScore } = analyzeFoodVariety(entries);

    // Analyze hydration
    const { waterIntake, avgWaterPerDay } = analyzeHydration(entries, analysisDays);

    // Analyze eating patterns
    const { regularEatingPattern, skippedMealsCount, lateNightEatingCount } =
      analyzeEatingPatterns(entries, analysisDays);

    // Generate insights
    const positiveInsights: NutritionInsight[] = [];
    const concerns: NutritionInsight[] = [];
    const suggestions: NutritionInsight[] = [];

    // POSITIVE INSIGHTS
    if (mealPatterns.avgMealsPerDay >= 3) {
      positiveInsights.push({
        type: 'positive',
        category: 'meal_frequency',
        title: 'Regular Meal Frequency',
        description: `Averaging ${mealPatterns.avgMealsPerDay.toFixed(1)} meals per day - maintaining good eating routine`
      });
    }

    if (varietyScore >= 70) {
      positiveInsights.push({
        type: 'positive',
        category: 'variety',
        title: 'Good Food Variety',
        description: `Consuming ${uniqueFoods} different foods across multiple food groups`
      });
    }

    if (avgWaterPerDay >= 6) {
      positiveInsights.push({
        type: 'positive',
        category: 'hydration',
        title: 'Good Hydration',
        description: `Drinking an average of ${avgWaterPerDay.toFixed(1)} glasses of water daily`
      });
    }

    // CONCERNS
    if (mealPatterns.avgMealsPerDay < 2) {
      concerns.push({
        type: 'concern',
        category: 'meal_frequency',
        title: 'Low Meal Frequency',
        description: `Only ${mealPatterns.avgMealsPerDay.toFixed(1)} meals per day - may not be meeting nutritional needs`,
        data: { avgMealsPerDay: mealPatterns.avgMealsPerDay }
      });
    }

    if (mealPatterns.breakfastCount < analysisDays * 0.5) {
      concerns.push({
        type: 'concern',
        category: 'meal_frequency',
        title: 'Frequently Skipping Breakfast',
        description: `Breakfast logged only ${mealPatterns.breakfastCount} times in ${analysisDays} days`,
        data: { breakfastCount: mealPatterns.breakfastCount, days: analysisDays }
      });
    }

    if (varietyScore < 40) {
      concerns.push({
        type: 'concern',
        category: 'variety',
        title: 'Limited Food Variety',
        description: `Only ${uniqueFoods} different foods logged - may benefit from more diverse diet`,
        data: { uniqueFoods, varietyScore }
      });
    }

    if (avgWaterPerDay < 4) {
      concerns.push({
        type: 'concern',
        category: 'hydration',
        title: 'Low Fluid Intake',
        description: `Averaging ${avgWaterPerDay.toFixed(1)} glasses of water daily - hydration may be inadequate`,
        data: { avgWaterPerDay }
      });
    }

    if (lateNightEatingCount > analysisDays * 0.3) {
      concerns.push({
        type: 'concern',
        category: 'timing',
        title: 'Frequent Late-Night Eating',
        description: `${lateNightEatingCount} meals logged after 8pm in past ${analysisDays} days`,
        data: { lateNightCount: lateNightEatingCount }
      });
    }

    // SUGGESTIONS
    if (mealPatterns.avgMealsPerDay < 3) {
      suggestions.push({
        type: 'suggestion',
        category: 'meal_frequency',
        title: 'Consider More Regular Meals',
        description: 'General guidelines suggest 3 balanced meals per day. Discuss with healthcare provider.'
      });
    }

    if (varietyScore < 60) {
      const missingGroups = Object.keys(FOOD_GROUPS).filter(group =>
        !foodGroups.some(fg => fg.group === group && fg.count > 0)
      );

      if (missingGroups.length > 0) {
        suggestions.push({
          type: 'suggestion',
          category: 'variety',
          title: 'Expand Food Variety',
          description: `Consider adding foods from: ${missingGroups.join(', ')}. Consult with dietitian for personalized advice.`,
          data: { missingGroups }
        });
      }
    }

    if (avgWaterPerDay < 6) {
      suggestions.push({
        type: 'suggestion',
        category: 'hydration',
        title: 'Increase Fluid Intake',
        description: 'General guidelines suggest 6-8 glasses of water daily. Discuss appropriate intake with doctor.'
      });
    }

    // Calculate overall score
    const overallScore = calculateOverallScore(
      mealPatterns.avgMealsPerDay,
      varietyScore,
      avgWaterPerDay,
      regularEatingPattern
    );

    // Generate assessment text
    const assessment = generateAssessment(overallScore, concerns.length, positiveInsights.length);

    const report: Omit<NutritionAnalysisReport, 'id'> = {
      groupId,
      elderId,
      elderName,
      analysisDate: new Date(),
      period: { start: startDate, end: endDate },

      ...mealPatterns,
      uniqueFoods,
      foodGroups,
      varietyScore,
      waterIntake,
      avgWaterPerDay,
      regularEatingPattern,
      skippedMealsCount,
      lateNightEatingCount,

      positiveInsights,
      concerns,
      suggestions,
      overallScore,
      assessment,
      generatedAt: new Date()
    };

    // Save to Firestore
    const reportRef = await addDoc(collection(db, 'nutritionAnalysisReports'), report);

    return { ...report, id: reportRef.id };

  } catch (error) {
    console.error('Error analyzing nutrition:', error);
    return null;
  }
}

/**
 * Analyze meal patterns
 */
function analyzeMealPatterns(entries: DietEntry[], days: number) {
  const totalMeals = entries.length;
  const avgMealsPerDay = totalMeals / days;

  let breakfastCount = 0;
  let lunchCount = 0;
  let dinnerCount = 0;
  let snackCount = 0;

  entries.forEach(entry => {
    const mealType = entry.meal?.toLowerCase();

    if (mealType === 'breakfast') breakfastCount++;
    else if (mealType === 'lunch') lunchCount++;
    else if (mealType === 'dinner') dinnerCount++;
    else if (mealType === 'snack') snackCount++;
  });

  return {
    totalMeals,
    avgMealsPerDay: Math.round(avgMealsPerDay * 10) / 10,
    breakfastCount,
    lunchCount,
    dinnerCount,
    snackCount
  };
}

/**
 * Analyze food variety
 */
function analyzeFoodVariety(entries: DietEntry[]) {
  const uniqueFoodsSet = new Set<string>();
  const foodGroupCounts: Record<string, Set<string>> = {};

  // Initialize food group counters
  Object.keys(FOOD_GROUPS).forEach(group => {
    foodGroupCounts[group] = new Set();
  });

  entries.forEach(entry => {
    // Normalize items to array (may be string from Firestore)
    const itemsArr = Array.isArray(entry.items) ? entry.items : (entry.items ? String(entry.items).split(',').map(s => s.trim()) : []);
    const foodItems = itemsArr.map(item => item.toLowerCase()).join(' ') || '';
    const notes = entry.notes?.toLowerCase() || '';
    const searchText = `${foodItems} ${notes}`;

    // Track unique foods
    itemsArr.forEach(item => {
      if (item) {
        uniqueFoodsSet.add(item.toLowerCase());
      }
    });

    // Categorize into food groups
    Object.entries(FOOD_GROUPS).forEach(([group, keywords]) => {
      if (keywords.some(keyword => searchText.includes(keyword))) {
        foodGroupCounts[group].add(foodItems || entry.id);
      }
    });
  });

  const uniqueFoods = uniqueFoodsSet.size;

  // Calculate food group distribution
  const foodGroups: FoodGroupAnalysis[] = Object.entries(foodGroupCounts).map(([group, items]) => ({
    group,
    count: items.size,
    percentage: uniqueFoods > 0 ? Math.round((items.size / uniqueFoods) * 100) : 0,
    examples: Array.from(items).slice(0, 3) as string[]
  }));

  // Calculate variety score (based on number of food groups with representation)
  const representedGroups = foodGroups.filter(fg => fg.count > 0).length;
  const varietyScore = Math.round((representedGroups / Object.keys(FOOD_GROUPS).length) * 100);

  return { uniqueFoods, foodGroups, varietyScore };
}

/**
 * Analyze hydration
 */
function analyzeHydration(entries: DietEntry[], days: number) {
  let waterIntake = 0;

  entries.forEach(entry => {
    const notes = entry.notes?.toLowerCase() || '';
    // Normalize items to array (may be string from Firestore)
    const itemsArr = Array.isArray(entry.items) ? entry.items : (entry.items ? String(entry.items).split(',').map(s => s.trim()) : []);
    const foodItems = itemsArr.map(item => item.toLowerCase()).join(' ') || '';
    const searchText = `${foodItems} ${notes}`;

    // Count water mentions
    if (searchText.includes('water') || searchText.includes('glass')) {
      // Try to extract quantity
      const match = searchText.match(/(\d+)\s*(glass|cup|oz)/);
      if (match) {
        waterIntake += parseInt(match[1]);
      } else {
        waterIntake += 1; // Default to 1 glass if mentioned but no quantity
      }
    }
  });

  const avgWaterPerDay = Math.round((waterIntake / days) * 10) / 10;

  return { waterIntake, avgWaterPerDay };
}

/**
 * Analyze eating patterns
 */
function analyzeEatingPatterns(entries: DietEntry[], days: number) {
  // Check for regular eating pattern (meals spread throughout day)
  const dailyMealCounts: Record<string, number> = {};
  let lateNightEatingCount = 0;

  entries.forEach(entry => {
    const dateKey = entry.timestamp.toDateString();
    dailyMealCounts[dateKey] = (dailyMealCounts[dateKey] || 0) + 1;

    // Check for late-night eating (after 8pm)
    const hour = entry.timestamp.getHours();
    if (hour >= 20 || hour < 4) {
      lateNightEatingCount++;
    }
  });

  const mealsPerDayArray = Object.values(dailyMealCounts);
  const avgVariance = calculateVariance(mealsPerDayArray);
  const regularEatingPattern = avgVariance < 1.5; // Low variance = regular pattern

  const skippedMealsCount = days - Object.keys(dailyMealCounts).length;

  return {
    regularEatingPattern,
    skippedMealsCount,
    lateNightEatingCount
  };
}

/**
 * Calculate variance
 */
function calculateVariance(numbers: number[]): number {
  if (numbers.length === 0) return 0;

  const avg = numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  const squaredDiffs = numbers.map(n => Math.pow(n - avg, 2));
  return Math.sqrt(squaredDiffs.reduce((sum, n) => sum + n, 0) / numbers.length);
}

/**
 * Calculate overall nutrition score
 */
function calculateOverallScore(
  avgMealsPerDay: number,
  varietyScore: number,
  avgWaterPerDay: number,
  regularPattern: boolean
): number {
  let score = 0;

  // Meal frequency (30 points max)
  score += Math.min((avgMealsPerDay / 3) * 30, 30);

  // Variety (30 points max)
  score += (varietyScore / 100) * 30;

  // Hydration (25 points max)
  score += Math.min((avgWaterPerDay / 8) * 25, 25);

  // Regular pattern (15 points max)
  score += regularPattern ? 15 : 0;

  return Math.round(score);
}

/**
 * Generate assessment text
 */
function generateAssessment(score: number, concernsCount: number, positivesCount: number): string {
  if (score >= 80 && concernsCount === 0) {
    return 'Excellent nutrition patterns observed. Maintaining a balanced, varied diet with good hydration and regular meal timing.';
  } else if (score >= 60) {
    return 'Good overall nutrition patterns with some areas for potential improvement. Consider discussing any concerns with a healthcare provider.';
  } else if (score >= 40) {
    return 'Moderate nutrition patterns. Several areas could benefit from attention. Recommend consulting with a registered dietitian for personalized guidance.';
  } else {
    return 'Nutrition patterns show significant room for improvement. Strongly recommend consultation with healthcare provider or registered dietitian for comprehensive nutrition assessment.';
  }
}

/**
 * Get latest nutrition analysis report
 */
export async function getLatestNutritionAnalysis(
  groupId: string,
  elderId: string
): Promise<NutritionAnalysisReport | null> {
  try {
    const reportsQuery = query(
      collection(db, 'nutritionAnalysisReports'),
      where('groupId', '==', groupId),
      where('elderId', '==', elderId),
      orderBy('analysisDate', 'desc')
    );

    const reportsSnap = await getDocs(reportsQuery);
    if (reportsSnap.empty) return null;

    const doc = reportsSnap.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
      analysisDate: doc.data().analysisDate?.toDate(),
      period: {
        start: doc.data().period?.start?.toDate(),
        end: doc.data().period?.end?.toDate()
      },
      generatedAt: doc.data().generatedAt?.toDate()
    } as NutritionAnalysisReport;

  } catch (error) {
    console.error('Error getting nutrition analysis:', error);
    return null;
  }
}
