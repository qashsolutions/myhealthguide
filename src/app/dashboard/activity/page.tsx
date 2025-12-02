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
  ChevronUp,
  Loader2,
  Sparkles,
  TrendingUp,
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { format, isToday, startOfDay, endOfDay } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useElder } from '@/contexts/ElderContext';
import { MedicationService } from '@/lib/firebase/medications';
import { SupplementService } from '@/lib/firebase/supplements';
import { DietService } from '@/lib/firebase/diet';
import type { Medication, Supplement, DietEntry, MedicationLog, SupplementLog } from '@/types';

interface ScheduleItem {
  id: string;
  type: 'medication' | 'supplement';
  name: string;
  dosage: string;
  time: string;
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

interface QuickInsights {
  medicationCompliance: number;
  medicationsTaken: number;
  medicationsMissed: number;
  medicationsPending: number;
  supplementsTaken: number;
  supplementsMissed: number;
  supplementsPending: number;
  mealsLogged: number;
}

export default function ActivityPage() {
  const { user } = useAuth();
  const { selectedElder } = useElder();
  const [loading, setLoading] = useState(true);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [insightsOpen, setInsightsOpen] = useState(true);
  const [insights, setInsights] = useState<QuickInsights | null>(null);

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

        // Calculate quick insights
        const medPending = scheduleItems.filter(s => s.type === 'medication' && s.status === 'pending').length;
        const medTaken = scheduleItems.filter(s => s.type === 'medication' && s.status === 'taken').length;
        const medMissed = scheduleItems.filter(s => s.type === 'medication' && (s.status === 'skipped' || s.status === 'late')).length;
        const suppPending = scheduleItems.filter(s => s.type === 'supplement' && s.status === 'pending').length;
        const suppTaken = scheduleItems.filter(s => s.type === 'supplement' && s.status === 'taken').length;
        const suppMissed = scheduleItems.filter(s => s.type === 'supplement' && (s.status === 'skipped' || s.status === 'late')).length;
        const todaysMeals = dietEntries.filter(e => isToday(new Date(e.timestamp))).length;

        const totalMedScheduled = medPending + medTaken + medMissed;
        const medCompliance = totalMedScheduled > 0 ? Math.round((medTaken / totalMedScheduled) * 100) : 100;

        setInsights({
          medicationCompliance: medCompliance,
          medicationsTaken: medTaken,
          medicationsMissed: medMissed,
          medicationsPending: medPending,
          supplementsTaken: suppTaken,
          supplementsMissed: suppMissed,
          supplementsPending: suppPending,
          mealsLogged: todaysMeals
        });
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
      const times = med.schedule?.times || [];
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

    return { hours, minutes };
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

    try {
      if (item.type === 'medication') {
        await MedicationService.logDose({
          groupId: selectedElder.groupId,
          elderId: selectedElder.id,
          medicationId: item.sourceId,
          scheduledTime: scheduledTime,
          actualTime: now,
          status: action,
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
          status: action,
          loggedBy: user.id,
          method: 'manual',
          createdAt: now
        }, user.id, userRole);
      }

      // Update local state
      setSchedule(prev => prev.map(s =>
        s.id === item.id ? { ...s, status: action } : s
      ));

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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Activity
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Today&apos;s schedule and recent activities for {selectedElder.name}
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

      {/* Quick Insights - Collapsible */}
      {insights && (
        <Collapsible open={insightsOpen} onOpenChange={setInsightsOpen}>
          <Card className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-purple-200 dark:border-purple-800">
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-3 cursor-pointer hover:bg-purple-100/50 dark:hover:bg-purple-900/30 transition-colors rounded-t-lg">
                <CardTitle className="text-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    Quick Insights
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={insights.medicationCompliance >= 80 ? 'default' : 'destructive'}
                      className="text-xs"
                    >
                      {insights.medicationCompliance}% Compliance
                    </Badge>
                    {insightsOpen ? (
                      <ChevronUp className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Medications */}
                  <div className="p-3 rounded-lg bg-white/60 dark:bg-gray-800/60 border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2 mb-2">
                      <Pill className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Medications</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-green-600">Taken</span>
                        <span className="font-medium">{insights.medicationsTaken}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-yellow-600">Pending</span>
                        <span className="font-medium">{insights.medicationsPending}</span>
                      </div>
                      {insights.medicationsMissed > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-red-600">Missed</span>
                          <span className="font-medium">{insights.medicationsMissed}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Supplements */}
                  <div className="p-3 rounded-lg bg-white/60 dark:bg-gray-800/60 border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2 mb-2">
                      <Apple className="w-4 h-4 text-green-600" />
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Supplements</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-green-600">Taken</span>
                        <span className="font-medium">{insights.supplementsTaken}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-yellow-600">Pending</span>
                        <span className="font-medium">{insights.supplementsPending}</span>
                      </div>
                      {insights.supplementsMissed > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-red-600">Missed</span>
                          <span className="font-medium">{insights.supplementsMissed}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Meals */}
                  <div className="p-3 rounded-lg bg-white/60 dark:bg-gray-800/60 border border-orange-200 dark:border-orange-800">
                    <div className="flex items-center gap-2 mb-2">
                      <Utensils className="w-4 h-4 text-orange-600" />
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Meals</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {insights.mealsLogged}
                    </div>
                    <div className="text-xs text-gray-500">logged today</div>
                  </div>

                  {/* Status */}
                  <div className="p-3 rounded-lg bg-white/60 dark:bg-gray-800/60 border border-purple-200 dark:border-purple-800">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-purple-600" />
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Status</span>
                    </div>
                    {pendingItems.length > 0 ? (
                      <>
                        <div className="text-2xl font-bold text-yellow-600">
                          {pendingItems.length}
                        </div>
                        <div className="text-xs text-gray-500">items pending</div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-1">
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                          <span className="text-sm font-medium text-green-600">All done!</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">Great job today</div>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
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
                      <p className="font-medium text-gray-900 dark:text-white">
                        {item.name}
                      </p>
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
                      <p className="font-medium text-gray-600 dark:text-gray-400">
                        {item.name}
                      </p>
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
