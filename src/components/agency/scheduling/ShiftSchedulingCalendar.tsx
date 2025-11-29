'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Plus,
  Clock,
  User,
  Users,
  AlertTriangle,
  Filter
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
  addWeeks,
  subWeeks,
  eachDayOfInterval,
  isSameDay,
  isToday,
  addDays
} from 'date-fns';
import { getScheduledShifts } from '@/lib/firebase/scheduleShifts';
import { AgencyService } from '@/lib/firebase/agencies';
import type { ScheduledShift, CaregiverAssignment, Elder } from '@/types';
import { CreateShiftDialog } from './CreateShiftDialog';
import { ShiftDetailsPopover } from './ShiftDetailsPopover';

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

export function ShiftSchedulingCalendar({
  agencyId,
  groupId,
  userId
}: ShiftSchedulingCalendarProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 0 })
  );
  const [shifts, setShifts] = useState<ScheduledShift[]>([]);
  const [caregivers, setCaregivers] = useState<CaregiverInfo[]>([]);
  const [elders, setElders] = useState<Elder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCaregiver, setSelectedCaregiver] = useState<string>('all');
  const [selectedElder, setSelectedElder] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedShift, setSelectedShift] = useState<ScheduledShift | null>(null);

  const weekDays = useMemo(() =>
    eachDayOfInterval({
      start: currentWeekStart,
      end: endOfWeek(currentWeekStart, { weekStartsOn: 0 })
    }),
    [currentWeekStart]
  );

  useEffect(() => {
    loadData();
  }, [agencyId, groupId, currentWeekStart]);

  const loadData = async () => {
    try {
      setLoading(true);

      const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 0 });

      // Load shifts for the week
      const shiftsData = await getScheduledShifts(
        agencyId,
        currentWeekStart,
        weekEnd
      );
      setShifts(shiftsData);

      // Load caregivers from assignments
      const assignments = await AgencyService.getAgencyAssignments(agencyId);
      const uniqueCaregivers = new Map<string, string>();

      assignments.forEach(a => {
        if (a.active && !uniqueCaregivers.has(a.caregiverId)) {
          uniqueCaregivers.set(a.caregiverId, a.caregiverId);
        }
      });

      // Get caregiver names from shifts or use IDs
      const caregiverInfos: CaregiverInfo[] = [];
      const seenCaregivers = new Set<string>();

      // First from shifts (has names)
      shiftsData.forEach(shift => {
        if (!seenCaregivers.has(shift.caregiverId)) {
          seenCaregivers.add(shift.caregiverId);
          caregiverInfos.push({
            id: shift.caregiverId,
            name: shift.caregiverName || `Caregiver ${shift.caregiverId.substring(0, 6)}`,
            color: CAREGIVER_COLORS[caregiverInfos.length % CAREGIVER_COLORS.length]
          });
        }
      });

      // Then from assignments
      uniqueCaregivers.forEach((_, id) => {
        if (!seenCaregivers.has(id)) {
          seenCaregivers.add(id);
          caregiverInfos.push({
            id,
            name: `Caregiver ${id.substring(0, 6)}`,
            color: CAREGIVER_COLORS[caregiverInfos.length % CAREGIVER_COLORS.length]
          });
        }
      });

      setCaregivers(caregiverInfos);

      // Get unique elders from shifts
      const elderMap = new Map<string, Elder>();
      shiftsData.forEach(shift => {
        if (!elderMap.has(shift.elderId)) {
          elderMap.set(shift.elderId, {
            id: shift.elderId,
            groupId: shift.groupId,
            name: shift.elderName || 'Unknown Elder',
            dateOfBirth: new Date(),
            notes: '',
            createdAt: new Date()
          });
        }
      });
      setElders(Array.from(elderMap.values()));

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

  const handlePrevWeek = () => setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  const handleNextWeek = () => setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  const handleToday = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }));

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setCreateDialogOpen(true);
  };

  const handleShiftCreated = () => {
    loadData();
    setCreateDialogOpen(false);
    setSelectedDate(null);
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

  // Calculate weekly stats
  const weeklyStats = useMemo(() => {
    const totalShifts = filteredShifts.length;
    const totalHours = filteredShifts.reduce((sum, s) => sum + (s.duration || 0) / 60, 0);
    const uniqueCaregiversThisWeek = new Set(filteredShifts.map(s => s.caregiverId)).size;
    const pendingConfirmation = filteredShifts.filter(s => s.status === 'scheduled').length;

    return { totalShifts, totalHours, uniqueCaregiversThisWeek, pendingConfirmation };
  }, [filteredShifts]);

  return (
    <div className="space-y-4">
      {/* Header with Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Shift Schedule
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {format(currentWeekStart, 'MMM d')} - {format(endOfWeek(currentWeekStart, { weekStartsOn: 0 }), 'MMM d, yyyy')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrevWeek}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleToday}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={handleNextWeek}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button onClick={() => {
            setSelectedDate(new Date());
            setCreateDialogOpen(true);
          }}>
            <Plus className="w-4 h-4 mr-2" />
            New Shift
          </Button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-3">
          <div className="text-2xl font-bold">{weeklyStats.totalShifts}</div>
          <div className="text-xs text-gray-500">Total Shifts</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold">{weeklyStats.totalHours.toFixed(1)}h</div>
          <div className="text-xs text-gray-500">Total Hours</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold">{weeklyStats.uniqueCaregiversThisWeek}</div>
          <div className="text-xs text-gray-500">Caregivers</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold text-amber-600">{weeklyStats.pendingConfirmation}</div>
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

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="h-96 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : (
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
          )}
        </CardContent>
      </Card>

      {/* Create Shift Dialog */}
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
