'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  Calendar,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, isSameDay, eachDayOfInterval } from 'date-fns';
import { getScheduledShifts } from '@/lib/firebase/scheduleShifts';
import type { ScheduledShift } from '@/types';

interface ShiftTrackingDashboardProps {
  agencyId: string;
}

interface CaregiverDaySummary {
  caregiverId: string;
  caregiverName: string;
  date: Date;
  plannedMinutes: number;
  actualMinutes: number;
  variance: number;
  shiftsCompleted: number;
  shiftsScheduled: number;
}

interface WeeklySummary {
  caregiverId: string;
  caregiverName: string;
  totalPlannedMinutes: number;
  totalActualMinutes: number;
  totalVariance: number;
  totalShiftsCompleted: number;
  totalShiftsScheduled: number;
  dailySummaries: CaregiverDaySummary[];
}

export function ShiftTrackingDashboard({ agencyId }: ShiftTrackingDashboardProps) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [shifts, setShifts] = useState<ScheduledShift[]>([]);
  const [loading, setLoading] = useState(true);

  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Load shifts for the week
  useEffect(() => {
    async function loadShifts() {
      setLoading(true);
      try {
        const data = await getScheduledShifts(agencyId, weekStart, weekEnd);
        setShifts(data);
      } catch (err) {
        console.error('Error loading shifts:', err);
      } finally {
        setLoading(false);
      }
    }

    loadShifts();
  }, [agencyId, weekStart]);

  // Calculate summaries by caregiver
  const weeklySummaries = useMemo<WeeklySummary[]>(() => {
    const caregiverMap = new Map<string, WeeklySummary>();

    shifts.forEach(shift => {
      if (!caregiverMap.has(shift.caregiverId)) {
        caregiverMap.set(shift.caregiverId, {
          caregiverId: shift.caregiverId,
          caregiverName: shift.caregiverName,
          totalPlannedMinutes: 0,
          totalActualMinutes: 0,
          totalVariance: 0,
          totalShiftsCompleted: 0,
          totalShiftsScheduled: 0,
          dailySummaries: [],
        });
      }

      const summary = caregiverMap.get(shift.caregiverId)!;
      summary.totalShiftsScheduled++;
      summary.totalPlannedMinutes += shift.duration || 0;

      if (shift.status === 'completed' && shift.actualDuration) {
        summary.totalShiftsCompleted++;
        summary.totalActualMinutes += shift.actualDuration;
        summary.totalVariance += shift.durationVariance || 0;
      }
    });

    // Calculate daily summaries for each caregiver
    caregiverMap.forEach(summary => {
      weekDays.forEach(day => {
        const dayShifts = shifts.filter(
          s => s.caregiverId === summary.caregiverId && s.date && isSameDay(s.date, day)
        );

        if (dayShifts.length > 0) {
          const plannedMinutes = dayShifts.reduce((sum, s) => sum + (s.duration || 0), 0);
          const actualMinutes = dayShifts
            .filter(s => s.status === 'completed')
            .reduce((sum, s) => sum + (s.actualDuration || 0), 0);
          const completedCount = dayShifts.filter(s => s.status === 'completed').length;

          summary.dailySummaries.push({
            caregiverId: summary.caregiverId,
            caregiverName: summary.caregiverName,
            date: day,
            plannedMinutes,
            actualMinutes,
            variance: actualMinutes - plannedMinutes,
            shiftsCompleted: completedCount,
            shiftsScheduled: dayShifts.length,
          });
        }
      });
    });

    return Array.from(caregiverMap.values()).sort((a, b) =>
      a.caregiverName.localeCompare(b.caregiverName)
    );
  }, [shifts, weekDays]);

  // Calculate totals
  const totals = useMemo(() => {
    return weeklySummaries.reduce(
      (acc, summary) => ({
        plannedMinutes: acc.plannedMinutes + summary.totalPlannedMinutes,
        actualMinutes: acc.actualMinutes + summary.totalActualMinutes,
        shiftsScheduled: acc.shiftsScheduled + summary.totalShiftsScheduled,
        shiftsCompleted: acc.shiftsCompleted + summary.totalShiftsCompleted,
      }),
      { plannedMinutes: 0, actualMinutes: 0, shiftsScheduled: 0, shiftsCompleted: 0 }
    );
  }, [weeklySummaries]);

  const formatMinutesToHours = (minutes: number) => {
    const hours = Math.floor(Math.abs(minutes) / 60);
    const mins = Math.abs(minutes) % 60;
    const sign = minutes < 0 ? '-' : '';
    return `${sign}${hours}h ${mins}m`;
  };

  const getVarianceBadge = (variance: number) => {
    if (variance > 15) {
      return (
        <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
          <TrendingUp className="w-3 h-3 mr-1" />
          +{formatMinutesToHours(variance)}
        </Badge>
      );
    } else if (variance < -15) {
      return (
        <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50">
          <TrendingDown className="w-3 h-3 mr-1" />
          {formatMinutesToHours(variance)}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">
        <Minus className="w-3 h-3 mr-1" />
        On track
      </Badge>
    );
  };

  const goToPrevWeek = () => setWeekStart(prev => subWeeks(prev, 1));
  const goToNextWeek = () => setWeekStart(prev => addWeeks(prev, 1));
  const goToCurrentWeek = () => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }));

  const isCurrentWeek = isSameDay(weekStart, startOfWeek(new Date(), { weekStartsOn: 0 }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Shift Tracking - Actual vs Planned
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Monitor caregiver hours and variance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToPrevWeek}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium px-3">
            {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
          </span>
          <Button variant="outline" size="sm" onClick={goToNextWeek}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          {!isCurrentWeek && (
            <Button variant="ghost" size="sm" onClick={goToCurrentWeek}>
              Today
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Shifts</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {totals.shiftsCompleted}/{totals.shiftsScheduled}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Clock className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Planned Hours</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {formatMinutesToHours(totals.plannedMinutes)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Actual Hours</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {formatMinutesToHours(totals.actualMinutes)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Variance</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {totals.actualMinutes - totals.plannedMinutes >= 0 ? '+' : ''}
                  {formatMinutesToHours(totals.actualMinutes - totals.plannedMinutes)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Caregiver Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Caregiver Hours Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : weeklySummaries.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">
              No shifts scheduled for this week
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b dark:border-gray-700">
                  <tr className="text-left">
                    <th className="pb-3 text-sm font-semibold text-gray-900 dark:text-white">
                      Caregiver
                    </th>
                    <th className="pb-3 text-sm font-semibold text-gray-900 dark:text-white">
                      Shifts
                    </th>
                    <th className="pb-3 text-sm font-semibold text-gray-900 dark:text-white">
                      Planned
                    </th>
                    <th className="pb-3 text-sm font-semibold text-gray-900 dark:text-white">
                      Actual
                    </th>
                    <th className="pb-3 text-sm font-semibold text-gray-900 dark:text-white">
                      Variance
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-700">
                  {weeklySummaries.map(summary => (
                    <tr key={summary.caregiverId}>
                      <td className="py-3">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {summary.caregiverName}
                        </p>
                      </td>
                      <td className="py-3">
                        <span className="text-gray-600 dark:text-gray-400">
                          {summary.totalShiftsCompleted}/{summary.totalShiftsScheduled}
                        </span>
                        {summary.totalShiftsCompleted === summary.totalShiftsScheduled &&
                          summary.totalShiftsScheduled > 0 && (
                            <CheckCircle2 className="w-4 h-4 text-green-500 inline ml-2" />
                          )}
                        {summary.totalShiftsCompleted < summary.totalShiftsScheduled && (
                          <AlertTriangle className="w-4 h-4 text-amber-500 inline ml-2" />
                        )}
                      </td>
                      <td className="py-3 text-gray-600 dark:text-gray-400">
                        {formatMinutesToHours(summary.totalPlannedMinutes)}
                      </td>
                      <td className="py-3 text-gray-900 dark:text-white font-medium">
                        {formatMinutesToHours(summary.totalActualMinutes)}
                      </td>
                      <td className="py-3">{getVarianceBadge(summary.totalVariance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Daily Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Daily Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b dark:border-gray-700">
                  <tr className="text-left">
                    <th className="pb-3 text-sm font-semibold text-gray-900 dark:text-white">
                      Caregiver
                    </th>
                    {weekDays.map(day => (
                      <th
                        key={day.toISOString()}
                        className="pb-3 text-sm font-semibold text-gray-900 dark:text-white text-center"
                      >
                        <div>{format(day, 'EEE')}</div>
                        <div className="text-xs font-normal text-gray-500">{format(day, 'd')}</div>
                      </th>
                    ))}
                    <th className="pb-3 text-sm font-semibold text-gray-900 dark:text-white text-center">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-700">
                  {weeklySummaries.map(summary => (
                    <tr key={summary.caregiverId}>
                      <td className="py-3 font-medium text-gray-900 dark:text-white">
                        {summary.caregiverName}
                      </td>
                      {weekDays.map(day => {
                        const daySummary = summary.dailySummaries.find(ds =>
                          isSameDay(ds.date, day)
                        );
                        return (
                          <td key={day.toISOString()} className="py-3 text-center">
                            {daySummary ? (
                              <div className="space-y-0.5">
                                <div className="text-xs text-gray-500">
                                  {Math.round(daySummary.plannedMinutes / 60)}h planned
                                </div>
                                <div
                                  className={`text-sm font-medium ${
                                    daySummary.shiftsCompleted > 0
                                      ? 'text-green-600 dark:text-green-400'
                                      : 'text-gray-400'
                                  }`}
                                >
                                  {daySummary.shiftsCompleted > 0
                                    ? `${Math.round(daySummary.actualMinutes / 60)}h`
                                    : '-'}
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-300">-</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="py-3 text-center">
                        <div className="font-bold text-gray-900 dark:text-white">
                          {formatMinutesToHours(summary.totalActualMinutes)}
                        </div>
                        <div className="text-xs text-gray-500">
                          of {formatMinutesToHours(summary.totalPlannedMinutes)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
