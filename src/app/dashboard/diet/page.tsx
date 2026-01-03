'use client';

import { useState, useMemo } from 'react';
import { Plus, Mic, Utensils, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useElder } from '@/contexts/ElderContext';
import { DietService } from '@/lib/firebase/diet';
import { useElderDataLoader } from '@/hooks/useDataLoader';
import type { DietEntry } from '@/types';
import { isToday, startOfDay, format } from 'date-fns';
import { analyzeDietEntryWithParsing } from '@/lib/ai/geminiService';
import { WeeklyNutritionSummary } from '@/components/diet/WeeklyNutritionSummary';
import { CollapsibleDaySection } from '@/components/diet/CollapsibleDaySection';

export default function DietPage() {
  const { user } = useAuth();
  const { selectedElder } = useElder();
  const [reanalyzingId, setReanalyzingId] = useState<string | null>(null);
  const [reanalyzeError, setReanalyzeError] = useState<string | null>(null);

  const { data: entries, loading, error, setData: setEntries } = useElderDataLoader<DietEntry[]>({
    fetcher: (elder, user, role) =>
      DietService.getEntriesByElder(elder.id, elder.groupId, user.id, role),
    elder: selectedElder,
    user,
    errorPrefix: 'Failed to load diet entries',
  });

  // Get user role for re-analysis (still needed for handleReanalyze)
  const getUserRole = (): 'admin' | 'caregiver' | 'member' => {
    const agencyRole = user?.agencies?.[0]?.role;
    if (agencyRole === 'super_admin' || agencyRole === 'caregiver_admin') return 'admin';
    if (agencyRole === 'caregiver') return 'caregiver';
    const groupRole = user?.groups?.[0]?.role;
    if (groupRole === 'admin') return 'admin';
    return 'member';
  };

  // Group entries by date
  const entriesByDate = useMemo(() => {
    const grouped = new Map<string, { date: Date; entries: DietEntry[] }>();

    entries.forEach(entry => {
      const entryDate = new Date(entry.timestamp);
      const dateKey = format(startOfDay(entryDate), 'yyyy-MM-dd');

      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, {
          date: startOfDay(entryDate),
          entries: []
        });
      }
      grouped.get(dateKey)!.entries.push(entry);
    });

    // Convert to array and sort by date descending
    return Array.from(grouped.values()).sort(
      (a, b) => b.date.getTime() - a.date.getTime()
    );
  }, [entries]);

  // Re-analyze an entry that's missing aiAnalysis
  const handleReanalyze = async (entry: DietEntry) => {
    if (!user || !selectedElder || reanalyzingId) return;

    setReanalyzingId(entry.id);
    setReanalyzeError(null);

    try {
      const freeformText = entry.items.join(', ');

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

      if (result) {
        await DietService.updateEntry(
          entry.id,
          { aiAnalysis: result },
          user.id,
          getUserRole()
        );

        setEntries(prev =>
          prev.map(e =>
            e.id === entry.id ? { ...e, aiAnalysis: result } : e
          )
        );
      } else {
        setReanalyzeError('Analysis failed - please try again');
      }
    } catch (err: any) {
      console.error('Re-analysis failed:', err);
      setReanalyzeError(err.message || 'Failed to re-analyze entry');
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
      {/* Header */}
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

      {(error || reanalyzeError) && (
        <div className="text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
          {error || reanalyzeError}
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
        <>
          {/* Weekly Nutrition Summary with Day Tabs */}
          {entriesByDate.length > 0 && (
            <WeeklyNutritionSummary entries={entries} />
          )}

          {/* Entries Grouped by Day */}
          <div className="space-y-3">
            {entriesByDate.map(({ date, entries: dayEntries }) => (
              <CollapsibleDaySection
                key={date.toISOString()}
                date={date}
                entries={dayEntries}
                defaultOpen={isToday(date)}
                onReanalyze={handleReanalyze}
                reanalyzingId={reanalyzingId}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
