'use client';

import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Check,
  X
} from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  getDay,
  addDays,
  isBefore,
  startOfDay
} from 'date-fns';
import type { ScheduledShift } from '@/types';

// Caregiver color type - must match ShiftSchedulingCalendar
interface CaregiverColor {
  bg: string;
  border: string;
  text: string;
}

interface CaregiverInfo {
  id: string;
  name: string;
  color: CaregiverColor;
}

interface MonthCalendarViewProps {
  shifts: ScheduledShift[];
  selectedDates: Date[];
  onDateSelect: (date: Date) => void;
  onDateDeselect: (date: Date) => void;
  onClearSelection: () => void;
  onSelectPattern: (pattern: 'weekdays' | 'weekends' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday') => void;
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  caregivers?: CaregiverInfo[];
}

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Default color for shifts when caregiver color not found
const DEFAULT_SHIFT_COLOR: CaregiverColor = {
  bg: 'bg-green-100 dark:bg-green-900/30',
  border: 'border-green-400',
  text: 'text-green-700 dark:text-green-300'
};

export function MonthCalendarView({
  shifts,
  selectedDates,
  onDateSelect,
  onDateDeselect,
  onClearSelection,
  onSelectPattern,
  currentMonth,
  onMonthChange,
  caregivers = []
}: MonthCalendarViewProps) {
  const today = startOfDay(new Date());

  // Get color for a caregiver
  const getCaregiverColor = (caregiverId: string): CaregiverColor => {
    const caregiver = caregivers.find(c => c.id === caregiverId);
    return caregiver?.color || DEFAULT_SHIFT_COLOR;
  };

  // Get resolved name for a shift's caregiver
  const getCaregiverName = (shift: ScheduledShift): string => {
    const caregiver = caregivers.find(c => c.id === shift.caregiverId);
    return caregiver?.name || shift.caregiverName || `Caregiver ${shift.caregiverId?.substring(0, 6)}`;
  };

  // Generate calendar days for the month (including padding days from prev/next months)
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  // Check if a date is selected
  const isDateSelected = (date: Date) => {
    return selectedDates.some(d => isSameDay(d, date));
  };

  // Get shifts for a specific date
  const getShiftsForDate = (date: Date) => {
    return shifts.filter(shift => {
      const shiftDate = shift.date instanceof Date ? shift.date : new Date(shift.date);
      return isSameDay(shiftDate, date);
    });
  };

  // Handle date click
  const handleDateClick = (date: Date) => {
    // Don't allow selecting past dates
    if (isBefore(date, today)) return;

    if (isDateSelected(date)) {
      onDateDeselect(date);
    } else {
      onDateSelect(date);
    }
  };

  // Navigation
  const handlePrevMonth = () => onMonthChange(subMonths(currentMonth, 1));
  const handleNextMonth = () => onMonthChange(addMonths(currentMonth, 1));
  const handleToday = () => onMonthChange(new Date());

  return (
    <div className="space-y-4">
      {/* Header with navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Click dates to select, then create shifts for all selected dates
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrevMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleToday}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={handleNextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Quick Pattern Selection */}
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Quick Select:</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSelectPattern('weekdays')}
            className="text-xs"
          >
            All Weekdays
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSelectPattern('weekends')}
            className="text-xs"
          >
            All Weekends
          </Button>
          <div className="h-4 w-px bg-gray-300 dark:bg-gray-600 mx-1" />
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSelectPattern('monday')}
            className="text-xs"
          >
            All Mon
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSelectPattern('tuesday')}
            className="text-xs"
          >
            All Tue
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSelectPattern('wednesday')}
            className="text-xs"
          >
            All Wed
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSelectPattern('thursday')}
            className="text-xs"
          >
            All Thu
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSelectPattern('friday')}
            className="text-xs"
          >
            All Fri
          </Button>
          {selectedDates.length > 0 && (
            <>
              <div className="h-4 w-px bg-gray-300 dark:bg-gray-600 mx-1" />
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearSelection}
                className="text-xs text-red-600 hover:text-red-700"
              >
                <X className="w-3 h-3 mr-1" />
                Clear ({selectedDates.length})
              </Button>
            </>
          )}
        </div>
      </Card>

      {/* Selection Summary */}
      {selectedDates.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium text-blue-800 dark:text-blue-200">
                {selectedDates.length} date{selectedDates.length > 1 ? 's' : ''} selected
              </span>
              <div className="flex flex-wrap gap-1 mt-1">
                {selectedDates
                  .sort((a, b) => a.getTime() - b.getTime())
                  .slice(0, 10)
                  .map((date, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {format(date, 'MMM d')}
                    </Badge>
                  ))}
                {selectedDates.length > 10 && (
                  <Badge variant="secondary" className="text-xs">
                    +{selectedDates.length - 10} more
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Calendar Grid */}
      <Card>
        <div className="p-2">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAY_NAMES.map(day => (
              <div
                key={day}
                className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, idx) => {
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isSelected = isDateSelected(day);
              const isPast = isBefore(day, today);
              const dayShifts = getShiftsForDate(day);
              const hasShifts = dayShifts.length > 0;

              return (
                <div
                  key={idx}
                  onClick={() => !isPast && isCurrentMonth && handleDateClick(day)}
                  className={`
                    relative min-h-[80px] p-1 border rounded-lg transition-all
                    ${isCurrentMonth ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800/50'}
                    ${isPast ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-blue-400'}
                    ${isSelected ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-500' : 'border-gray-200 dark:border-gray-700'}
                    ${isToday(day) ? 'border-blue-400' : ''}
                  `}
                >
                  {/* Date Number */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`
                        text-sm font-medium
                        ${!isCurrentMonth ? 'text-gray-400 dark:text-gray-600' : ''}
                        ${isToday(day) ? 'bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center' : ''}
                        ${isSelected && !isToday(day) ? 'text-blue-700 dark:text-blue-300' : ''}
                      `}
                    >
                      {format(day, 'd')}
                    </span>
                    {isSelected && (
                      <Check className="w-4 h-4 text-blue-600" />
                    )}
                  </div>

                  {/* Shift Indicators */}
                  {hasShifts && (
                    <div className="mt-1 space-y-0.5">
                      {dayShifts.slice(0, 2).map((shift, shiftIdx) => {
                        const color = getCaregiverColor(shift.caregiverId);
                        return (
                          <div
                            key={shiftIdx}
                            className={`text-[10px] ${color.bg} ${color.text} rounded px-1 truncate`}
                          >
                            {shift.startTime} {getCaregiverName(shift).split(' ')[0]}
                          </div>
                        );
                      })}
                      {dayShifts.length > 2 && (
                        <div className="text-[10px] text-gray-500">
                          +{dayShifts.length - 2} more
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </Card>
    </div>
  );
}
