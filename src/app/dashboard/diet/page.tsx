'use client';

import { useState, useEffect } from 'react';
import { Plus, Mic, Utensils, Loader2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useElder } from '@/contexts/ElderContext';
import { DietService } from '@/lib/firebase/diet';
import type { DietEntry } from '@/types';
import { format } from 'date-fns';

export default function DietPage() {
  const { user } = useAuth();
  const { selectedElder } = useElder();
  const [entries, setEntries] = useState<DietEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        const dietEntries = await DietService.getEntriesByElder(
          selectedElder.id,
          selectedElder.groupId,
          user.id,
          getUserRole()
        );
        setEntries(dietEntries);
      } catch (err: any) {
        console.error('Error loading diet entries:', err);
        setError(err.message || 'Failed to load diet entries');
      } finally {
        setLoading(false);
      }
    }

    loadEntries();
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
                  <div className="text-sm text-gray-600 dark:text-gray-400 bg-orange-50 dark:bg-orange-900/20 p-2 rounded">
                    <span className="font-medium">Nutrition Score:</span> {entry.aiAnalysis.nutritionScore}/100
                  </div>
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
