'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Pill,
  Apple,
  Utensils,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronDown,
  Loader2,
  TrendingUp,
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';
import { format, isToday, startOfDay, endOfDay, subDays, isYesterday } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useElder } from '@/contexts/ElderContext';
import { MedicationService } from '@/lib/firebase/medications';
import { SupplementService } from '@/lib/firebase/supplements';
import { DietService } from '@/lib/firebase/diet';
import { QuickInsightsCard } from '@/components/insights/QuickInsightsCard';
import { calculateQuickInsightsFromSchedule, type QuickInsightsData } from '@/lib/utils/complianceCalculation';
import type { Medication, Supplement, DietEntry, MedicationLog, SupplementLog } from '@/types';

interface ScheduleItem {
  id: string;
  type: 'medication' | 'supplement';
  name: string;
  dosage: string;
  time: string;
  mealLabel: string; // Friendly label: Breakfast, Lunch, Dinner, Snack, etc.
  status: 'pending' | 'taken' | 'skipped' | 'late';
  sourceId: string;
}

interface ActivityItem {
  id: string;
  type: 'medication' | 'supplement' | 'diet';
  action: string;
  name: string;
  timestamp: Date;
  details?: string;
  status?: string;
}


export default function ActivityPage() {
  const { user } = useAuth();
  const { selectedElder } = useElder();
  const [loading, setLoading] = useState(true);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [insightsOpen, setInsightsOpen] = useState(true);
  const [insights, setInsights] = useState<QuickInsightsData | null>(null);
  const [yesterdayMissed, setYesterdayMissed] = useState<{medications: string[], supplements: string[]}>({ medications: [], supplements: [] });
  const [showYesterdayAlert, setShowYesterdayAlert] = useState(true);

  // Determine user's role
  const getUserRole = (): 'admin' | 'caregiver' | 'member' => {
    const agencyRole = user?.agencies?.[0]?.role;
    if (agencyRole === 'super_admin' || agencyRole === 'caregiver_admin') return 'admin';
    if (agencyRole === 'caregiver') return 'caregiver';
    const groupRole = user?.groups?.[0]?.role;
    if (groupRole === 'admin') return 'admin';
    return 'member';
  };

  // Load schedule and activities
  useEffect(() => {
    async function loadData() {
      if (!selectedElder || !user) {
        setSchedule([]);
        setActivities([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const userRole = getUserRole();
      const groupId = selectedElder.groupId;

      try {
        // Load medications and supplements
        const [medications, supplements, dietEntries, medLogs, suppLogs] = await Promise.all([
          MedicationService.getMedicationsByElder(selectedElder.id, groupId, user.id, userRole),
          SupplementService.getSupplementsByElder(selectedElder.id, groupId, user.id, userRole),
          DietService.getEntriesByElder(selectedElder.id, groupId, user.id, userRole),
          loadTodaysMedicationLogs(selectedElder.id, groupId, user.id, userRole),
          loadTodaysSupplementLogs(selectedElder.id, groupId, user.id, userRole)
        ]);

        // Build today's schedule
        const scheduleItems = buildSchedule(medications, supplements, medLogs, suppLogs);
        setSchedule(scheduleItems);

        // Build recent activities
        const activityItems = buildActivities(medLogs, suppLogs, dietEntries);
        setActivities(activityItems);

        // Calculate quick insights using shared utility
        const todaysMeals = dietEntries.filter(e => isToday(new Date(e.timestamp))).length;
        const quickInsights = calculateQuickInsightsFromSchedule(scheduleItems, todaysMeals);
        setInsights(quickInsights);

        // Load yesterday's missed items
        const missed = await loadYesterdaysMissed(medications, supplements, groupId, user.id, userRole);
        setYesterdayMissed(missed);
      } catch (err) {
        console.error('Error loading activity data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [selectedElder, user]);

  // Load today's medication logs
  async function loadTodaysMedicationLogs(
    elderId: string,
    groupId: string,
    userId: string,
    userRole: 'admin' | 'caregiver' | 'member'
  ): Promise<MedicationLog[]> {
    try {
      const today = new Date();
      return await MedicationService.getLogsByDateRange(
        groupId,
        startOfDay(today),
        endOfDay(today),
        userId,
        userRole
      );
    } catch {
      return [];
    }
  }

  // Load today's supplement logs
  async function loadTodaysSupplementLogs(
    elderId: string,
    groupId: string,
    userId: string,
    userRole: 'admin' | 'caregiver' | 'member'
  ): Promise<SupplementLog[]> {
    try {
      const today = new Date();
      return await SupplementService.getLogsByDateRange(
        groupId,
        startOfDay(today),
        endOfDay(today),
        userId,
        userRole
      );
    } catch {
      return [];
    }
  }

  // Load yesterday's logs to find missed items
  async function loadYesterdaysMissed(
    medications: Medication[],
    supplements: Supplement[],
    groupId: string,
    userId: string,
    userRole: 'admin' | 'caregiver' | 'member'
  ): Promise<{medications: string[], supplements: string[]}> {
    try {
      const yesterday = subDays(new Date(), 1);
      const [medLogs, suppLogs] = await Promise.all([
        MedicationService.getLogsByDateRange(groupId, startOfDay(yesterday), endOfDay(yesterday), userId, userRole),
        SupplementService.getLogsByDateRange(groupId, startOfDay(yesterday), endOfDay(yesterday), userId, userRole)
      ]);

      // Find medications that were missed or skipped yesterday
      const missedMeds: string[] = [];
      medications.forEach(med => {
        // Skip if medication was created today (didn't exist yesterday)
        const medStartDate = med.startDate instanceof Date ? med.startDate : new Date(med.startDate);
        if (medStartDate > endOfDay(yesterday)) {
          return; // This medication didn't exist yesterday
        }

        const times = med.frequency?.times || [];
        times.forEach(time => {
          const logged = medLogs.find(log =>
            log.medicationId === med.id &&
            (log.status === 'taken')
          );
          if (!logged) {
            // Check if it was skipped or missed
            const skippedOrMissed = medLogs.find(log =>
              log.medicationId === med.id &&
              (log.status === 'skipped' || log.status === 'missed')
            );
            if (skippedOrMissed || !medLogs.some(log => log.medicationId === med.id)) {
              if (!missedMeds.includes(med.name)) {
                missedMeds.push(med.name);
              }
            }
          }
        });
      });

      // Find supplements that were missed or skipped yesterday
      const missedSupps: string[] = [];
      supplements.forEach(supp => {
        // Skip if supplement was created today (didn't exist yesterday)
        const suppCreatedAt = supp.createdAt instanceof Date ? supp.createdAt : new Date(supp.createdAt);
        if (suppCreatedAt > endOfDay(yesterday)) {
          return; // This supplement didn't exist yesterday
        }

        const times = supp.frequency?.times || [];
        times.forEach(time => {
          const logged = suppLogs.find(log =>
            log.supplementId === supp.id &&
            (log.status === 'taken')
          );
          if (!logged) {
            const skippedOrMissed = suppLogs.find(log =>
              log.supplementId === supp.id &&
              (log.status === 'skipped' || log.status === 'missed')
            );
            if (skippedOrMissed || !suppLogs.some(log => log.supplementId === supp.id)) {
              if (!missedSupps.includes(supp.name)) {
                missedSupps.push(supp.name);
              }
            }
          }
        });
      });

      return { medications: missedMeds, supplements: missedSupps };
    } catch (err) {
      console.error('Error loading yesterday missed:', err);
      return { medications: [], supplements: [] };
    }
  }

  // Build schedule from medications and supplements
  function buildSchedule(
    medications: Medication[],
    supplements: Supplement[],
    medLogs: MedicationLog[],
    suppLogs: SupplementLog[]
  ): ScheduleItem[] {
    const items: ScheduleItem[] = [];

    // Add medications
    medications.forEach(med => {
      const times = med.frequency?.times || [];
      times.forEach(time => {
        // Check if already logged for this time today
        const logged = medLogs.find(log =>
          log.medicationId === med.id &&
          isMatchingTime(log.scheduledTime, time)
        );

        items.push({
          id: `med-${med.id}-${time}`,
          type: 'medication',
          name: med.name,
          dosage: med.dosage,
          time: time,
          mealLabel: getMealLabel(time),
          status: logged ? (logged.status as 'taken' | 'skipped' | 'late') : 'pending',
          sourceId: med.id!
        });
      });
    });

    // Add supplements
    supplements.forEach(supp => {
      const times = supp.frequency?.times || [];
      times.forEach(time => {
        // Check if already logged for this time today
        const logged = suppLogs.find(log =>
          log.supplementId === supp.id &&
          isMatchingTime(log.scheduledTime, time)
        );

        items.push({
          id: `supp-${supp.id}-${time}`,
          type: 'supplement',
          name: supp.name,
          dosage: supp.dosage,
          time: time,
          mealLabel: getMealLabel(time),
          status: logged ? (logged.status as 'taken' | 'skipped' | 'late') : 'pending',
          sourceId: supp.id!
        });
      });
    });

    // Sort by time
    return items.sort((a, b) => parseTime(a.time) - parseTime(b.time));
  }

  // Check if log time matches schedule time
  function isMatchingTime(logTime: Date, scheduleTime: string): boolean {
    const logHour = logTime.getHours();
    const logMinute = logTime.getMinutes();
    const { hours, minutes } = parseTimeString(scheduleTime);
    return logHour === hours && Math.abs(logMinute - minutes) < 30;
  }

  // Parse time string like "8 am" or "2:30 pm" to minutes since midnight
  function parseTime(time: string): number {
    const { hours, minutes } = parseTimeString(time);
    return hours * 60 + minutes;
  }

  function parseTimeString(time: string): { hours: number; minutes: number } {
    const match = time.toLowerCase().match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
    if (!match) return { hours: 0, minutes: 0 };

    let hours = parseInt(match[1]);
    const minutes = match[2] ? parseInt(match[2]) : 0;
    const period = match[3];

    if (period === 'pm' && hours !== 12) hours += 12;
    if (period === 'am' && hours === 12) hours = 0;

    // Smart inference when no AM/PM specified
    // Assume caregivers enter times for reasonable medication schedules
    if (!period) {
      // 12 without AM/PM = noon (12 PM)
      if (hours === 12) {
        // Keep as 12 (noon)
      }
      // 1-4 without AM/PM = afternoon (1 PM - 4 PM)
      else if (hours >= 1 && hours <= 4) {
        hours += 12;
      }
      // 5-9 without AM/PM = likely evening (5 PM - 9 PM)
      else if (hours >= 5 && hours <= 9) {
        // Could be morning (5-9 AM) or evening (5-9 PM)
        // For medication schedules, 5-6 is likely AM, 7-9 is ambiguous
        // Default: 5-6 = AM (early morning), 7-9 = AM (breakfast time)
        // This keeps 7, 8, 9 as morning which is common for medications
      }
      // 10-11 without AM/PM = morning (10 AM - 11 AM)
      // Already correct as-is
    }

    return { hours, minutes };
  }

  // Convert time to friendly meal label
  function getMealLabel(time: string): string {
    const { hours } = parseTimeString(time);

    // Morning: 5am - 10am = Breakfast
    if (hours >= 5 && hours < 10) {
      return 'Breakfast';
    }
    // Late Morning: 10am - 12pm = Morning Snack
    if (hours >= 10 && hours < 12) {
      return 'Morning';
    }
    // Midday: 12pm - 2pm = Lunch
    if (hours >= 12 && hours < 14) {
      return 'Lunch';
    }
    // Afternoon: 2pm - 5pm = Afternoon Snack
    if (hours >= 14 && hours < 17) {
      return 'Afternoon';
    }
    // Evening: 5pm - 8pm = Dinner
    if (hours >= 17 && hours < 20) {
      return 'Dinner';
    }
    // Night: 8pm - 10pm = Evening
    if (hours >= 20 && hours < 22) {
      return 'Evening';
    }
    // Late night/early morning: 10pm - 5am = Bedtime
    return 'Bedtime';
  }

  // Build activities from logs
  function buildActivities(
    medLogs: MedicationLog[],
    suppLogs: SupplementLog[],
    dietEntries: DietEntry[]
  ): ActivityItem[] {
    const items: ActivityItem[] = [];

    // Add medication logs
    medLogs.forEach(log => {
      items.push({
        id: `med-log-${log.id}`,
        type: 'medication',
        action: log.status === 'taken' ? 'Medication taken' :
                log.status === 'skipped' ? 'Medication skipped' : 'Medication logged late',
        name: log.medicationId, // Will be resolved to name in a full implementation
        timestamp: log.actualTime || log.scheduledTime,
        status: log.status
      });
    });

    // Add supplement logs
    suppLogs.forEach(log => {
      items.push({
        id: `supp-log-${log.id}`,
        type: 'supplement',
        action: log.status === 'taken' ? 'Supplement taken' :
                log.status === 'skipped' ? 'Supplement skipped' : 'Supplement logged late',
        name: log.supplementId,
        timestamp: log.actualTime || log.scheduledTime,
        status: log.status
      });
    });

    // Add diet entries (only today's)
    dietEntries
      .filter(entry => isToday(new Date(entry.timestamp)))
      .forEach(entry => {
        items.push({
          id: `diet-${entry.id}`,
          type: 'diet',
          action: `${entry.meal} logged`,
          name: entry.items.join(', '),
          timestamp: new Date(entry.timestamp),
          details: entry.items.slice(0, 3).join(', ') + (entry.items.length > 3 ? '...' : '')
        });
      });

    // Sort by timestamp descending
    return items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // Handle action (Take/Skip/Late)
  async function handleAction(item: ScheduleItem, action: 'taken' | 'skipped' | 'late') {
    if (!user || !selectedElder) return;

    setActionLoading(item.id);
    const userRole = getUserRole();
    const now = new Date();
    const { hours, minutes } = parseTimeString(item.time);
    const scheduledTime = new Date();
    scheduledTime.setHours(hours, minutes, 0, 0);

    // Map UI action to database status ('late' is stored as 'taken' with late actualTime)
    const dbStatus: 'taken' | 'missed' | 'skipped' = action === 'late' ? 'taken' : action;

    try {
      if (item.type === 'medication') {
        await MedicationService.logDose({
          groupId: selectedElder.groupId,
          elderId: selectedElder.id,
          medicationId: item.sourceId,
          scheduledTime: scheduledTime,
          actualTime: now,
          status: dbStatus,
          loggedBy: user.id,
          method: 'manual',
          createdAt: now
        }, user.id, userRole);
      } else {
        await SupplementService.logIntake({
          groupId: selectedElder.groupId,
          elderId: selectedElder.id,
          supplementId: item.sourceId,
          scheduledTime: scheduledTime,
          actualTime: now,
          status: dbStatus,
          loggedBy: user.id,
          method: 'manual',
          createdAt: now
        }, user.id, userRole);
      }

      // Update local state and recalculate insights
      setSchedule(prev => {
        const updated = prev.map(s =>
          s.id === item.id ? { ...s, status: action } : s
        );
        // Recalculate insights with updated schedule
        const mealsCount = insights?.mealsLogged || 0;
        const newInsights = calculateQuickInsightsFromSchedule(updated, mealsCount);
        setInsights(newInsights);
        return updated;
      });

      // Add to activities
      setActivities(prev => [{
        id: `new-${Date.now()}`,
        type: item.type,
        action: action === 'taken' ? `${item.type === 'medication' ? 'Medication' : 'Supplement'} taken` :
                action === 'skipped' ? `${item.type === 'medication' ? 'Medication' : 'Supplement'} skipped` :
                `${item.type === 'medication' ? 'Medication' : 'Supplement'} logged late`,
        name: item.name,
        timestamp: now,
        status: action
      }, ...prev]);
    } catch (err) {
      console.error('Error logging action:', err);
    } finally {
      setActionLoading(null);
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'medication':
        return <Pill className="w-4 h-4" />;
      case 'supplement':
        return <Apple className="w-4 h-4" />;
      case 'diet':
        return <Utensils className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'medication':
        return 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20';
      case 'supplement':
        return 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/20';
      case 'diet':
        return 'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-900/20';
      default:
        return 'text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'taken':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'skipped':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'late':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!selectedElder) {
    return (
      <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <p className="text-gray-600 dark:text-gray-400">
          Please select an elder from the sidebar to view activities.
        </p>
      </div>
    );
  }

  const pendingItems = schedule.filter(s => s.status === 'pending');
  const completedItems = schedule.filter(s => s.status !== 'pending');
  const totalYesterdayMissed = yesterdayMissed.medications.length + yesterdayMissed.supplements.length;

  // Calculate today's progress
  const totalItems = schedule.length;
  const completedCount = completedItems.length;
  const progressPercentage = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Today&apos;s Focus
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {format(new Date(), 'EEEE, MMMM d, yyyy')} • {selectedElder.name}
          </p>
        </div>
        <Link href="/dashboard/insights">
          <Button variant="outline" size="sm">
            <TrendingUp className="w-4 h-4 mr-2" />
            Full Insights
            <ExternalLink className="w-3 h-3 ml-2" />
          </Button>
        </Link>
      </div>

      {/* Yesterday's Missed Alert */}
      {showYesterdayAlert && totalYesterdayMissed > 0 && (
        <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-amber-900 dark:text-amber-100">
                    Yesterday: {totalYesterdayMissed} item{totalYesterdayMissed > 1 ? 's' : ''} missed
                  </p>
                  <div className="mt-1 text-sm text-amber-800 dark:text-amber-200">
                    {yesterdayMissed.medications.length > 0 && (
                      <p>
                        <span className="font-medium">Medications:</span> {yesterdayMissed.medications.join(', ')}
                      </p>
                    )}
                    {yesterdayMissed.supplements.length > 0 && (
                      <p>
                        <span className="font-medium">Supplements:</span> {yesterdayMissed.supplements.join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-amber-700 hover:text-amber-900 dark:text-amber-300 -mt-1 -mr-2"
                onClick={() => setShowYesterdayAlert(false)}
              >
                <XCircle className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today's Progress Bar */}
      {totalItems > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Today&apos;s Progress
            </span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {completedCount} of {totalItems} ({progressPercentage}%)
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${
                progressPercentage === 100
                  ? 'bg-green-500'
                  : progressPercentage >= 50
                  ? 'bg-blue-500'
                  : 'bg-amber-500'
              }`}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          {progressPercentage === 100 && (
            <p className="text-sm text-green-600 dark:text-green-400 mt-2 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              All done for today!
            </p>
          )}
          {pendingItems.length > 0 && progressPercentage < 100 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              {pendingItems.length} item{pendingItems.length > 1 ? 's' : ''} remaining
            </p>
          )}
        </Card>
      )}

      {/* Quick Insights - Collapsible */}
      {insights && (
        <QuickInsightsCard
          insights={insights}
          isOpen={insightsOpen}
          onOpenChange={setInsightsOpen}
          showCollapsible={true}
        />
      )}

      {/* Today's Schedule */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Today&apos;s Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          {schedule.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4">
              No medications or supplements scheduled for today
            </p>
          ) : (
            <div className="space-y-3">
              {/* Pending items first */}
              {pendingItems.map(item => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${getTypeColor(item.type)}`}>
                      {getIcon(item.type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {item.name}
                        </p>
                        <Badge variant="outline" className="text-xs font-normal">
                          {item.mealLabel}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {item.dosage} • {item.time}
                      </p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={actionLoading === item.id}
                      >
                        {actionLoading === item.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            Take
                            <ChevronDown className="w-4 h-4 ml-1" />
                          </>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleAction(item, 'taken')}>
                        <CheckCircle2 className="w-4 h-4 mr-2 text-green-600" />
                        Mark as Taken
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleAction(item, 'skipped')}>
                        <XCircle className="w-4 h-4 mr-2 text-red-600" />
                        Mark as Skipped
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleAction(item, 'late')}>
                        <AlertCircle className="w-4 h-4 mr-2 text-yellow-600" />
                        Mark as Late
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}

              {/* Completed items */}
              {completedItems.map(item => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${getTypeColor(item.type)} opacity-60`}>
                      {getIcon(item.type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-600 dark:text-gray-400">
                          {item.name}
                        </p>
                        <Badge variant="outline" className="text-xs font-normal opacity-60">
                          {item.mealLabel}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-400 dark:text-gray-500">
                        {item.dosage} • {item.time}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(item.status)}
                    <Badge
                      variant={item.status === 'taken' ? 'default' :
                               item.status === 'skipped' ? 'destructive' : 'secondary'}
                      className="capitalize"
                    >
                      {item.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4">
              No activities logged today
            </p>
          ) : (
            <div className="space-y-3">
              {activities.slice(0, 10).map(activity => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${getTypeColor(activity.type)}`}>
                      {getIcon(activity.type)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white text-sm">
                        {activity.action}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {activity.type === 'diet' ? activity.details : activity.name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {format(activity.timestamp, 'h:mm a')}
                    </p>
                    {activity.status && (
                      <Badge
                        variant={activity.status === 'taken' ? 'default' :
                                 activity.status === 'skipped' ? 'destructive' : 'secondary'}
                        className="text-xs capitalize mt-1"
                      >
                        {activity.status}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
