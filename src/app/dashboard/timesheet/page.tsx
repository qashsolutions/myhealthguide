'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useElder } from '@/contexts/ElderContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Download, Calendar, Filter } from 'lucide-react';
import { authenticatedFetch } from '@/lib/api/authenticatedFetch';
import type { ShiftSession } from '@/types';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, differenceInMinutes } from 'date-fns';

type TimeRange = 'week' | 'month' | 'all';

export default function TimesheetPage() {
  const { user } = useAuth();
  const { selectedElder, availableElders } = useElder();
  const [shifts, setShifts] = useState<ShiftSession[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'caregiver' | 'elder'>('caregiver');

  useEffect(() => {
    loadShifts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, selectedElder, timeRange, viewMode]);

  const loadShifts = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { startDate, endDate } = getDateRange(timeRange);

      const params = new URLSearchParams({
        viewMode,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });

      if (viewMode === 'elder' && selectedElder) {
        params.set('elderId', selectedElder.id);
      }

      const response = await authenticatedFetch(`/api/timesheet?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        const allShifts = data.shifts.map((s: any) => ({
          ...s,
          startTime: s.startTime ? new Date(s.startTime) : null,
          endTime: s.endTime ? new Date(s.endTime) : null,
          createdAt: s.createdAt ? new Date(s.createdAt) : null,
          updatedAt: s.updatedAt ? new Date(s.updatedAt) : null
        })) as ShiftSession[];

        setShifts(allShifts);
      } else {
        console.error('Error loading shifts:', data.error);
        setShifts([]);
      }
    } catch (err: any) {
      console.error('Error loading shifts:', err);
    } finally {
      setLoading(false);
    }
  };

  const getDateRange = (range: TimeRange) => {
    const now = new Date();
    let startDate, endDate;

    if (range === 'week') {
      startDate = startOfWeek(now);
      endDate = endOfWeek(now);
    } else if (range === 'month') {
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
    } else {
      // All time - last 90 days
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 90);
      endDate = now;
    }

    return { startDate, endDate };
  };

  const calculateTotalHours = () => {
    return shifts.reduce((total, shift) => {
      if (shift.actualDuration) {
        return total + shift.actualDuration;
      } else if (shift.startTime && shift.endTime) {
        const minutes = differenceInMinutes(shift.endTime, shift.startTime);
        return total + minutes;
      }
      return total;
    }, 0);
  };

  const totalMinutes = calculateTotalHours();
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  const exportTimesheet = () => {
    // Create CSV
    const headers = ['Date', 'Start Time', 'End Time', 'Duration (hours)', 'Elder', 'Caregiver'];
    const rows = shifts.map(shift => [
      format(shift.startTime, 'yyyy-MM-dd'),
      format(shift.startTime, 'HH:mm'),
      shift.endTime ? format(shift.endTime, 'HH:mm') : 'N/A',
      shift.actualDuration ? (shift.actualDuration / 60).toFixed(2) : '0',
      shift.elderId,
      shift.caregiverId
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timesheet-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Timesheet
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            View and export shift hours
          </p>
        </div>
        <Button onClick={exportTimesheet} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* View Mode Toggle */}
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'caregiver' ? 'default' : 'outline'}
                onClick={() => setViewMode('caregiver')}
                size="sm"
              >
                My Shifts
              </Button>
              <Button
                variant={viewMode === 'elder' ? 'default' : 'outline'}
                onClick={() => setViewMode('elder')}
                size="sm"
                disabled={!selectedElder}
              >
                Elder Shifts
              </Button>
            </div>

            {/* Time Range */}
            <div className="flex gap-2">
              <Button
                variant={timeRange === 'week' ? 'default' : 'outline'}
                onClick={() => setTimeRange('week')}
                size="sm"
              >
                This Week
              </Button>
              <Button
                variant={timeRange === 'month' ? 'default' : 'outline'}
                onClick={() => setTimeRange('month')}
                size="sm"
              >
                This Month
              </Button>
              <Button
                variant={timeRange === 'all' ? 'default' : 'outline'}
                onClick={() => setTimeRange('all')}
                size="sm"
              >
                Last 90 Days
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Shifts</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{shifts.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Hours</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {totalHours}h {remainingMinutes}m
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Average Shift</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {shifts.length > 0 ? (totalMinutes / shifts.length / 60).toFixed(1) : '0'}h
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shifts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Shift History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : shifts.length === 0 ? (
            <p className="text-center text-gray-600 dark:text-gray-400 py-8">
              No shifts found for selected period
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b dark:border-gray-700">
                  <tr className="text-left">
                    <th className="pb-3 text-sm font-semibold text-gray-900 dark:text-white">Date</th>
                    <th className="pb-3 text-sm font-semibold text-gray-900 dark:text-white">Start</th>
                    <th className="pb-3 text-sm font-semibold text-gray-900 dark:text-white">End</th>
                    <th className="pb-3 text-sm font-semibold text-gray-900 dark:text-white">Duration</th>
                    {viewMode === 'elder' && (
                      <th className="pb-3 text-sm font-semibold text-gray-900 dark:text-white">Caregiver</th>
                    )}
                    {viewMode === 'caregiver' && (
                      <th className="pb-3 text-sm font-semibold text-gray-900 dark:text-white">Elder</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-700">
                  {shifts.map((shift) => {
                    const duration = shift.actualDuration
                      ? shift.actualDuration
                      : shift.endTime && shift.startTime
                      ? differenceInMinutes(shift.endTime, shift.startTime)
                      : 0;
                    const hours = Math.floor(duration / 60);
                    const minutes = duration % 60;

                    return (
                      <tr key={shift.id}>
                        <td className="py-3 text-sm text-gray-900 dark:text-white">
                          {format(shift.startTime, 'MMM d, yyyy')}
                        </td>
                        <td className="py-3 text-sm text-gray-600 dark:text-gray-400">
                          {format(shift.startTime, 'h:mm a')}
                        </td>
                        <td className="py-3 text-sm text-gray-600 dark:text-gray-400">
                          {shift.endTime ? format(shift.endTime, 'h:mm a') : 'N/A'}
                        </td>
                        <td className="py-3 text-sm font-medium text-gray-900 dark:text-white">
                          {hours}h {minutes}m
                        </td>
                        {viewMode === 'elder' && (
                          <td className="py-3 text-sm text-gray-600 dark:text-gray-400">
                            {shift.caregiverId}
                          </td>
                        )}
                        {viewMode === 'caregiver' && (
                          <td className="py-3 text-sm text-gray-600 dark:text-gray-400">
                            {availableElders.find(e => e.id === shift.elderId)?.name || shift.elderId}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
