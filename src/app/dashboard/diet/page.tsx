'use client';

import { useState, useEffect } from 'react';
import { Plus, Mic, Utensils, Loader2, Clock, TrendingUp, AlertTriangle, CheckCircle2, Info, Flame, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useElder } from '@/contexts/ElderContext';
import { DietService } from '@/lib/firebase/diet';
import type { DietEntry, DietAnalysis } from '@/types';
import { format } from 'date-fns';
import { analyzeDietEntryWithParsing } from '@/lib/ai/geminiService';

export default function DietPage() {
  const { user } = useAuth();
  const { selectedElder } = useElder();
  const [entries, setEntries] = useState<DietEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reanalyzingId, setReanalyzingId] = useState<string | null>(null);

  // Determine user's role
  const getUserRole = (): 'admin' | 'caregiver' | 'member' => {
    const agencyRole = user?.agencies?.[0]?.role;
    if (agencyRole === 'super_admin' || agencyRole === 'caregiver_admin') return 'admin';
    if (agencyRole === 'caregiver') return 'caregiver';
    const groupRole = user?.groups?.[0]?.role;
    if (groupRole === 'admin') return 'admin';
    return 'member';
  };

  // Load diet entries for selected elder
  useEffect(() => {
    async function loadEntries() {
      if (!selectedElder || !user) {
        setEntries([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        console.log('[DietPage] Loading entries for elder:', selectedElder.id, 'groupId:', selectedElder.groupId);
        const dietEntries = await DietService.getEntriesByElder(
          selectedElder.id,
          selectedElder.groupId,
          user.id,
          getUserRole()
        );
        console.log('[DietPage] Loaded entries:', dietEntries.length);
        dietEntries.forEach((entry, idx) => {
          console.log(`[DietPage] Entry ${idx}: ${entry.meal}`, {
            id: entry.id,
            hasAiAnalysis: !!entry.aiAnalysis,
            score: entry.aiAnalysis?.nutritionScore,
            items: entry.items
          });
        });
        setEntries(dietEntries);
      } catch (err: any) {
        console.error('Error loading diet entries:', err);
        setError(err.message || 'Failed to load diet entries');
      } finally {
        setLoading(false);
      }
    }

    loadEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedElder, user]);

  const getMealIcon = (meal: string) => {
    return <Utensils className="w-5 h-5 text-orange-600" />;
  };

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

  // Re-analyze an entry that's missing aiAnalysis
  const handleReanalyze = async (entry: DietEntry) => {
    if (!user || !selectedElder || reanalyzingId) return;

    setReanalyzingId(entry.id);
    setError(null);

    try {
      // Reconstruct freeform text from items
      const freeformText = entry.items.join(', ');

      // Get analysis from Gemini
      const result = await analyzeDietEntryWithParsing(
        {
          meal: entry.meal,
          freeformText,
          elderAge: selectedElder.approximateAge || 75,
          existingConditions: selectedElder.knownConditions || [],
        },
        user.id,
        getUserRole(),
        entry.groupId,
        entry.elderId,
        {
          weight: selectedElder.weight,
          biologicalSex: selectedElder.biologicalSex,
          dietaryRestrictions: selectedElder.dietaryRestrictions || [],
        }
      );

      if (result.analysis) {
        // Update the entry in Firestore
        await DietService.updateEntry(
          entry.id,
          { aiAnalysis: result.analysis },
          user.id,
          getUserRole()
        );

        // Update local state
        setEntries(prev =>
          prev.map(e =>
            e.id === entry.id ? { ...e, aiAnalysis: result.analysis } : e
          )
        );
      } else {
        setError('Analysis failed - please try again');
      }
    } catch (err: any) {
      console.error('Re-analysis failed:', err);
      setError(err.message || 'Failed to re-analyze entry');
    } finally {
      setReanalyzingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
      </div>
    );
  }

  if (!selectedElder) {
    return (
      <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <p className="text-gray-600 dark:text-gray-400">
          Please select an elder from the sidebar to view diet entries.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Diet Tracking
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Log meals and monitor nutrition
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/diet/voice">
            <Button variant="outline">
              <Mic className="w-4 h-4 mr-2" />
              Voice Log
            </Button>
          </Link>
          <Link href="/dashboard/diet/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Log Meal
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
          {error}
        </div>
      )}

      {entries.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <Utensils className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            No meals logged yet for {selectedElder.name}
          </p>
          <Link href="/dashboard/diet/new">
            <Button>
              Log Your First Meal
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {entries.map((entry) => (
            <Card key={entry.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getMealIcon(entry.meal)}
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
                  <span>{format(new Date(entry.timestamp), 'MMM d, yyyy h:mm a')}</span>
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
                {!entry.aiAnalysis && (
                  <div className="p-2 bg-amber-100 text-amber-800 rounded text-xs mb-2">
                    No nutrition analysis - click below to analyze
                  </div>
                )}
                {!entry.aiAnalysis && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleReanalyze(entry)}
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
