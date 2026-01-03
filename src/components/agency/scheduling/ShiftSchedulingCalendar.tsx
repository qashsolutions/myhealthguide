'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Plus,
  User,
  Filter,
  Grid3X3,
  LayoutGrid
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  eachDayOfInterval,
  isSameDay,
  isToday,
  getDay,
  isBefore,
  startOfDay
} from 'date-fns';
import { getScheduledShifts } from '@/lib/firebase/scheduleShifts';
import { AgencyService } from '@/lib/firebase/agencies';
import { authenticatedFetch } from '@/lib/api/authenticatedFetch';
import type { ScheduledShift, Elder } from '@/types';
import { CreateShiftDialog } from './CreateShiftDialog';
import { ShiftDetailsPopover } from './ShiftDetailsPopover';
import { MonthCalendarView } from './MonthCalendarView';
import { BulkCreateShiftDialog } from './BulkCreateShiftDialog';

interface ShiftSchedulingCalendarProps {
  agencyId: string;
  groupId: string;
  userId: string;
}

// Generate distinct colors for caregivers
const CAREGIVER_COLORS = [
  { bg: 'bg-blue-100 dark:bg-blue-900/30', border: 'border-blue-400', text: 'text-blue-700 dark:text-blue-300' },
  { bg: 'bg-green-100 dark:bg-green-900/30', border: 'border-green-400', text: 'text-green-700 dark:text-green-300' },
  { bg: 'bg-purple-100 dark:bg-purple-900/30', border: 'border-purple-400', text: 'text-purple-700 dark:text-purple-300' },
  { bg: 'bg-orange-100 dark:bg-orange-900/30', border: 'border-orange-400', text: 'text-orange-700 dark:text-orange-300' },
  { bg: 'bg-pink-100 dark:bg-pink-900/30', border: 'border-pink-400', text: 'text-pink-700 dark:text-pink-300' },
  { bg: 'bg-teal-100 dark:bg-teal-900/30', border: 'border-teal-400', text: 'text-teal-700 dark:text-teal-300' },
  { bg: 'bg-indigo-100 dark:bg-indigo-900/30', border: 'border-indigo-400', text: 'text-indigo-700 dark:text-indigo-300' },
  { bg: 'bg-amber-100 dark:bg-amber-900/30', border: 'border-amber-400', text: 'text-amber-700 dark:text-amber-300' },
  { bg: 'bg-cyan-100 dark:bg-cyan-900/30', border: 'border-cyan-400', text: 'text-cyan-700 dark:text-cyan-300' },
  { bg: 'bg-rose-100 dark:bg-rose-900/30', border: 'border-rose-400', text: 'text-rose-700 dark:text-rose-300' },
];

interface CaregiverInfo {
  id: string;
  name: string;
  color: typeof CAREGIVER_COLORS[0];
}

type ViewMode = 'week' | 'month';
type PatternType = 'weekdays' | 'weekends' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export function ShiftSchedulingCalendar({
  agencyId,
  groupId,
  userId
}: ShiftSchedulingCalendarProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 0 })
  );
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [shifts, setShifts] = useState<ScheduledShift[]>([]);
  const [caregivers, setCaregivers] = useState<CaregiverInfo[]>([]);
  const [elders, setElders] = useState<Elder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCaregiver, setSelectedCaregiver] = useState<string>('all');
  const [selectedElder, setSelectedElder] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [bulkCreateDialogOpen, setBulkCreateDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [selectedShift, setSelectedShift] = useState<ScheduledShift | null>(null);

  const weekDays = useMemo(() =>
    eachDayOfInterval({
      start: currentWeekStart,
      end: endOfWeek(currentWeekStart, { weekStartsOn: 0 })
    }),
    [currentWeekStart]
  );

  // Load data based on view mode
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agencyId, groupId, currentWeekStart, currentMonth, viewMode]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Determine date range based on view mode
      let startDate: Date;
      let endDate: Date;

      if (viewMode === 'week') {
        startDate = currentWeekStart;
        endDate = endOfWeek(currentWeekStart, { weekStartsOn: 0 });
      } else {
        startDate = startOfMonth(currentMonth);
        endDate = endOfMonth(currentMonth);
      }

      // Load shifts for the period
      const shiftsData = await getScheduledShifts(agencyId, startDate, endDate);
      setShifts(shiftsData);

      // Load caregivers from assignments
      const assignments = await AgencyService.getAgencyAssignments(agencyId);
      const uniqueCaregiverIds = new Set<string>();

      assignments.forEach(a => {
        if (a.active) {
          uniqueCaregiverIds.add(a.caregiverId);
        }
      });

      // Also add caregivers from shifts
      shiftsData.forEach(shift => {
        uniqueCaregiverIds.add(shift.caregiverId);
      });

      // Fetch actual caregiver names via API
      let caregiverNames = new Map<string, string>();
      try {
        const response = await authenticatedFetch('/api/agency/caregiver-names', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userIds: Array.from(uniqueCaregiverIds),
            agencyId
          })
        });
        const data = await response.json();
        if (data.success && data.names) {
          caregiverNames = new Map(Object.entries(data.names));
        }
      } catch (err) {
        console.error('Error fetching caregiver names:', err);
      }

      // Build caregiver info list with real names
      const caregiverInfos: CaregiverInfo[] = [];
      let colorIndex = 0;

      uniqueCaregiverIds.forEach(caregiverId => {
        const shiftWithName = shiftsData.find(s => s.caregiverId === caregiverId && s.caregiverName);
        const name = shiftWithName?.caregiverName || caregiverNames.get(caregiverId) || `Caregiver ${caregiverId.substring(0, 6)}`;

        caregiverInfos.push({
          id: caregiverId,
          name,
          color: CAREGIVER_COLORS[colorIndex % CAREGIVER_COLORS.length]
        });
        colorIndex++;
      });

      setCaregivers(caregiverInfos);

      // Load elders from agency
      const eldersData = await AgencyService.getAgencyElders(agencyId);
      setElders(eldersData);

    } catch (error) {
      console.error('Error loading shift data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredShifts = useMemo(() => {
    let result = shifts;

    if (selectedCaregiver !== 'all') {
      result = result.filter(s => s.caregiverId === selectedCaregiver);
    }

    if (selectedElder !== 'all') {
      result = result.filter(s => s.elderId === selectedElder);
    }

    return result;
  }, [shifts, selectedCaregiver, selectedElder]);

  const getShiftsForDay = (date: Date) =>
    filteredShifts.filter(shift => isSameDay(new Date(shift.date), date));

  const getCaregiverColor = (caregiverId: string) => {
    const caregiver = caregivers.find(c => c.id === caregiverId);
    return caregiver?.color || CAREGIVER_COLORS[0];
  };

  // Week view navigation
  const handlePrevWeek = () => setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  const handleNextWeek = () => setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  const handleTodayWeek = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }));

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setCreateDialogOpen(true);
  };

  const handleShiftCreated = () => {
    loadData();
    setCreateDialogOpen(false);
    setBulkCreateDialogOpen(false);
    setSelectedDate(null);
  };

  // Multi-select date handlers for month view
  const handleDateSelect = (date: Date) => {
    setSelectedDates(prev => [...prev, date]);
  };

  const handleDateDeselect = (date: Date) => {
    setSelectedDates(prev => prev.filter(d => !isSameDay(d, date)));
  };

  const handleClearSelection = () => {
    setSelectedDates([]);
  };

  // Pattern selection for bulk scheduling
  const handleSelectPattern = (pattern: PatternType) => {
    const today = startOfDay(new Date());
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    let patternDays: number[] = [];

    switch (pattern) {
      case 'weekdays':
        patternDays = [1, 2, 3, 4, 5]; // Mon-Fri
        break;
      case 'weekends':
        patternDays = [0, 6]; // Sun, Sat
        break;
      case 'monday':
        patternDays = [1];
        break;
      case 'tuesday':
        patternDays = [2];
        break;
      case 'wednesday':
        patternDays = [3];
        break;
      case 'thursday':
        patternDays = [4];
        break;
      case 'friday':
        patternDays = [5];
        break;
      case 'saturday':
        patternDays = [6];
        break;
      case 'sunday':
        patternDays = [0];
        break;
    }

    const newSelectedDates = daysInMonth.filter(day => {
      // Only future dates
      if (isBefore(day, today)) return false;
      // Match pattern
      return patternDays.includes(getDay(day));
    });

    // Add to existing selection (toggle behavior)
    setSelectedDates(prev => {
      const existingSet = new Set(prev.map(d => d.toISOString()));
      const newDates = newSelectedDates.filter(d => !existingSet.has(d.toISOString()));

      if (newDates.length === 0) {
        // All pattern dates already selected, deselect them
        return prev.filter(d => !patternDays.includes(getDay(d)));
      }

      return [...prev, ...newDates];
    });
  };

  const getShiftStatusColor = (status: ScheduledShift['status']) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-500';
      case 'confirmed': return 'bg-green-500';
      case 'in_progress': return 'bg-yellow-500';
      case 'completed': return 'bg-gray-400';
      case 'cancelled': return 'bg-red-500';
      case 'no_show': return 'bg-red-700';
      default: return 'bg-gray-500';
    }
  };

  // Calculate stats
  const stats = useMemo(() => {
    const totalShifts = filteredShifts.length;
    const totalHours = filteredShifts.reduce((sum, s) => sum + (s.duration || 0) / 60, 0);
    const uniqueCaregiversCount = new Set(filteredShifts.map(s => s.caregiverId)).size;
    const pendingConfirmation = filteredShifts.filter(s => s.status === 'scheduled').length;

    return { totalShifts, totalHours, uniqueCaregiversCount, pendingConfirmation };
  }, [filteredShifts]);

  return (
    <div className="space-y-4">
      {/* Header with View Toggle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Shift Schedule
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {viewMode === 'week'
              ? `${format(currentWeekStart, 'MMM d')} - ${format(endOfWeek(currentWeekStart, { weekStartsOn: 0 }), 'MMM d, yyyy')}`
              : format(currentMonth, 'MMMM yyyy')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex border rounded-lg overflow-hidden">
            <Button
              variant={viewMode === 'week' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('week')}
              className="rounded-none"
            >
              <Grid3X3 className="w-4 h-4 mr-1" />
              Week
            </Button>
            <Button
              variant={viewMode === 'month' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('month')}
              className="rounded-none"
            >
              <LayoutGrid className="w-4 h-4 mr-1" />
              Month
            </Button>
          </div>

          {viewMode === 'week' && (
            <>
              <Button variant="outline" size="sm" onClick={handlePrevWeek}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleTodayWeek}>
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={handleNextWeek}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </>
          )}

          {viewMode === 'week' && (
            <Button onClick={() => {
              setSelectedDate(new Date());
              setCreateDialogOpen(true);
            }}>
              <Plus className="w-4 h-4 mr-2" />
              New Shift
            </Button>
          )}

          {viewMode === 'month' && selectedDates.length > 0 && (
            <Button onClick={() => setBulkCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create {selectedDates.length} Shift{selectedDates.length > 1 ? 's' : ''}
            </Button>
          )}
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-3">
          <div className="text-2xl font-bold">{stats.totalShifts}</div>
          <div className="text-xs text-gray-500">Total Shifts</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold">{stats.totalHours.toFixed(1)}h</div>
          <div className="text-xs text-gray-500">Total Hours</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold">{stats.uniqueCaregiversCount}</div>
          <div className="text-xs text-gray-500">Caregivers</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold text-amber-600">{stats.pendingConfirmation}</div>
          <div className="text-xs text-gray-500">Pending Confirmation</div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-600 dark:text-gray-400">Filter:</span>
        </div>
        <Select value={selectedCaregiver} onValueChange={setSelectedCaregiver}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Caregivers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Caregivers</SelectItem>
            {caregivers.map(c => (
              <SelectItem key={c.id} value={c.id}>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${c.color.bg} ${c.color.border} border`} />
                  {c.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedElder} onValueChange={setSelectedElder}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Elders" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Elders</SelectItem>
            {elders.map(e => (
              <SelectItem key={e.id} value={e.id!}>{e.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(selectedCaregiver !== 'all' || selectedElder !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedCaregiver('all');
              setSelectedElder('all');
            }}
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Caregiver Legend */}
      {caregivers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {caregivers.map(c => (
            <Badge
              key={c.id}
              variant="outline"
              className={`${c.color.bg} ${c.color.border} ${c.color.text} cursor-pointer`}
              onClick={() => setSelectedCaregiver(selectedCaregiver === c.id ? 'all' : c.id)}
            >
              <User className="w-3 h-3 mr-1" />
              {c.name}
            </Badge>
          ))}
        </div>
      )}

      {/* Calendar Views */}
      {loading ? (
        <Card className="h-96 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </Card>
      ) : viewMode === 'month' ? (
        <MonthCalendarView
          shifts={filteredShifts}
          selectedDates={selectedDates}
          onDateSelect={handleDateSelect}
          onDateDeselect={handleDateDeselect}
          onClearSelection={handleClearSelection}
          onSelectPattern={handleSelectPattern}
          currentMonth={currentMonth}
          onMonthChange={setCurrentMonth}
        />
      ) : (
        /* Week View */
        <Card>
          <CardContent className="p-0">
            <div className="grid grid-cols-7 border-b dark:border-gray-700">
              {/* Day Headers */}
              {weekDays.map(day => (
                <div
                  key={day.toISOString()}
                  className={`p-2 text-center border-r last:border-r-0 dark:border-gray-700 ${
                    isToday(day) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {format(day, 'EEE')}
                  </div>
                  <div className={`text-lg font-semibold ${
                    isToday(day) ? 'text-blue-600 dark:text-blue-400' : ''
                  }`}>
                    {format(day, 'd')}
                  </div>
                </div>
              ))}

              {/* Shift Cells */}
              {weekDays.map(day => {
                const dayShifts = getShiftsForDay(day);
                return (
                  <div
                    key={`cell-${day.toISOString()}`}
                    className={`min-h-[150px] p-1 border-r border-t last:border-r-0 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
                      isToday(day) ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                    }`}
                    onClick={() => handleDayClick(day)}
                  >
                    <div className="h-[140px] overflow-y-auto space-y-1">
                      {dayShifts.map(shift => {
                        const color = getCaregiverColor(shift.caregiverId);
                        return (
                          <div
                            key={shift.id}
                            className={`p-1.5 rounded text-xs ${color.bg} ${color.border} border-l-2 cursor-pointer hover:opacity-80`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedShift(shift);
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <span className={`font-medium ${color.text}`}>
                                {shift.startTime}-{shift.endTime}
                              </span>
                              <div className={`w-2 h-2 rounded-full ${getShiftStatusColor(shift.status)}`} />
                            </div>
                            <div className="text-gray-600 dark:text-gray-400 truncate">
                              {shift.caregiverName}
                            </div>
                            <div className="text-gray-500 dark:text-gray-500 truncate text-[10px]">
                              → {shift.elderName}
                            </div>
                          </div>
                        );
                      })}
                      {dayShifts.length === 0 && (
                        <div className="h-full flex items-center justify-center text-gray-400 text-xs">
                          <Plus className="w-3 h-3 mr-1" />
                          Add
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Single Shift Dialog (Week View) */}
      <CreateShiftDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        agencyId={agencyId}
        groupId={groupId}
        userId={userId}
        initialDate={selectedDate}
        caregivers={caregivers}
        onShiftCreated={handleShiftCreated}
      />

      {/* Bulk Create Shift Dialog (Month View) */}
      <BulkCreateShiftDialog
        open={bulkCreateDialogOpen}
        onOpenChange={setBulkCreateDialogOpen}
        agencyId={agencyId}
        groupId={groupId}
        userId={userId}
        selectedDates={selectedDates}
        caregivers={caregivers}
        elders={elders}
        onShiftsCreated={handleShiftCreated}
        onClearSelection={handleClearSelection}
      />

      {/* Shift Details Popover */}
      {selectedShift && (
        <ShiftDetailsPopover
          shift={selectedShift}
          caregiverColor={getCaregiverColor(selectedShift.caregiverId)}
          onClose={() => setSelectedShift(null)}
          onUpdate={loadData}
          agencyId={agencyId}
          userId={userId}
        />
      )}
    </div>
  );
}
