'use client';

import { useState, useEffect, useCallback } from 'react';
import { format, startOfWeek, subWeeks } from 'date-fns';
import { Copy, X, Loader2, Check, AlertTriangle, Calendar, Users, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getLastScheduledWeek,
  getCopyPreview,
  copyWeekSchedule,
} from '@/lib/firebase/scheduleTemplates';

interface CopyWeekSheetProps {
  agencyId: string;
  userId: string;
  targetWeekStart: Date;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface WeekOption {
  weekStart: Date;
  label: string;
  totalShifts: number;
  assignedShifts: number;
  uniqueElders: number;
}

export function CopyWeekSheet({
  agencyId,
  userId,
  targetWeekStart,
  isOpen,
  onClose,
  onSuccess,
}: CopyWeekSheetProps) {
  // State
  const [loading, setLoading] = useState(true);
  const [copying, setCopying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Source week options
  const [weekOptions, setWeekOptions] = useState<WeekOption[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<Date | null>(null);

  // Copy options
  const [copyAssignments, setCopyAssignments] = useState(true);

  // Preview
  const [preview, setPreview] = useState<{
    sourceShifts: number;
    targetExisting: number;
    willCreate: number;
    elderNames: string[];
  } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Load available weeks to copy from
  useEffect(() => {
    if (!isOpen || !agencyId) return;

    const loadWeekOptions = async () => {
      setLoading(true);
      setError(null);

      try {
        // Get the last scheduled week
        const lastWeek = await getLastScheduledWeek(agencyId);

        const options: WeekOption[] = [];

        // Add last week as default option
        const prevWeek = startOfWeek(subWeeks(targetWeekStart, 1), { weekStartsOn: 0 });

        if (lastWeek && lastWeek.weekStart.getTime() !== targetWeekStart.getTime()) {
          // If we have data from last scheduled week and it's not the target week
          options.push({
            weekStart: lastWeek.weekStart,
            label: `Week of ${format(lastWeek.weekStart, 'MMM d')}`,
            totalShifts: lastWeek.totalShifts,
            assignedShifts: lastWeek.assignedShifts,
            uniqueElders: lastWeek.uniqueElders,
          });
        }

        // Add previous week if different from last scheduled
        if (
          prevWeek.getTime() !== targetWeekStart.getTime() &&
          (!lastWeek || prevWeek.getTime() !== lastWeek.weekStart.getTime())
        ) {
          // We don't have shift counts for this, but offer it as an option
          options.push({
            weekStart: prevWeek,
            label: `Previous Week (${format(prevWeek, 'MMM d')})`,
            totalShifts: 0,
            assignedShifts: 0,
            uniqueElders: 0,
          });
        }

        // Add 2 weeks ago
        const twoWeeksAgo = startOfWeek(subWeeks(targetWeekStart, 2), { weekStartsOn: 0 });
        if (
          twoWeeksAgo.getTime() !== targetWeekStart.getTime() &&
          (!lastWeek || twoWeeksAgo.getTime() !== lastWeek.weekStart.getTime()) &&
          twoWeeksAgo.getTime() !== prevWeek.getTime()
        ) {
          options.push({
            weekStart: twoWeeksAgo,
            label: `2 Weeks Ago (${format(twoWeeksAgo, 'MMM d')})`,
            totalShifts: 0,
            assignedShifts: 0,
            uniqueElders: 0,
          });
        }

        setWeekOptions(options);

        // Auto-select first option if available
        if (options.length > 0) {
          setSelectedWeek(options[0].weekStart);
        }
      } catch (err) {
        console.error('Error loading week options:', err);
        setError('Failed to load available weeks');
      } finally {
        setLoading(false);
      }
    };

    loadWeekOptions();
  }, [isOpen, agencyId, targetWeekStart]);

  // Load preview when week is selected
  useEffect(() => {
    if (!selectedWeek || !agencyId) {
      setPreview(null);
      return;
    }

    const loadPreview = async () => {
      setLoadingPreview(true);
      try {
        const previewData = await getCopyPreview(agencyId, selectedWeek, targetWeekStart);
        setPreview(previewData);
      } catch (err) {
        console.error('Error loading preview:', err);
        setPreview(null);
      } finally {
        setLoadingPreview(false);
      }
    };

    loadPreview();
  }, [selectedWeek, agencyId, targetWeekStart]);

  // Handle copy
  const handleCopy = useCallback(async () => {
    if (!selectedWeek || !agencyId || !userId) return;

    setCopying(true);
    setError(null);

    try {
      const result = await copyWeekSchedule(
        agencyId,
        selectedWeek,
        targetWeekStart,
        userId,
        { copyAssignments, skipExisting: true }
      );

      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1500);
      } else {
        setError(result.error || 'Failed to copy schedule');
      }
    } catch (err: any) {
      console.error('Error copying schedule:', err);
      setError(err.message || 'Failed to copy schedule');
    } finally {
      setCopying(false);
    }
  }, [selectedWeek, agencyId, userId, targetWeekStart, copyAssignments, onSuccess, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        onClick={() => !copying && onClose()}
      />

      {/* Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 bg-white dark:bg-gray-900 rounded-t-2xl shadow-xl max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-200">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Copy className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Copy Week Schedule
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Copy shifts to week of {format(targetWeekStart, 'MMM d, yyyy')}
              </p>
            </div>
          </div>
          <button
            onClick={() => !copying && onClose()}
            disabled={copying}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
            </div>
          ) : success ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
                <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Schedule Copied!
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {preview?.willCreate} shifts created
              </p>
            </div>
          ) : error ? (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-300">
                    Error
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                    {error}
                  </p>
                </div>
              </div>
            </div>
          ) : weekOptions.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                No Previous Schedule
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Create shifts manually to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Source Week Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Copy from
                </label>
                <div className="space-y-2">
                  {weekOptions.map((option) => {
                    const isSelected = selectedWeek?.getTime() === option.weekStart.getTime();
                    return (
                      <button
                        key={option.weekStart.toISOString()}
                        onClick={() => setSelectedWeek(option.weekStart)}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors text-left',
                          isSelected
                            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750'
                        )}
                      >
                        <div
                          className={cn(
                            'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                            isSelected
                              ? 'border-blue-600 bg-blue-600'
                              : 'border-gray-300 dark:border-gray-600'
                          )}
                        >
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {option.label}
                          </p>
                          {option.totalShifts > 0 && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              {option.totalShifts} shifts • {option.assignedShifts} assigned • {option.uniqueElders} elders
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Copy Options */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Options
                </label>
                <button
                  onClick={() => setCopyAssignments(!copyAssignments)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors text-left"
                >
                  <div
                    className={cn(
                      'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
                      copyAssignments
                        ? 'border-blue-600 bg-blue-600'
                        : 'border-gray-300 dark:border-gray-600'
                    )}
                  >
                    {copyAssignments && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      Copy caregiver assignments
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Keep the same caregivers assigned to each elder
                    </p>
                  </div>
                </button>
              </div>

              {/* Preview */}
              {selectedWeek && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Preview
                  </label>
                  {loadingPreview ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                    </div>
                  ) : preview ? (
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <Calendar className="w-4 h-4" />
                          <span>Source shifts</span>
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {preview.sourceShifts}
                        </span>
                      </div>

                      {preview.targetExisting > 0 && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                            <span>Already exists (will skip)</span>
                          </div>
                          <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                            {preview.targetExisting}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-3">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                          <Check className="w-4 h-4 text-green-500" />
                          <span>Will create</span>
                        </div>
                        <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                          {preview.willCreate} shifts
                        </span>
                      </div>

                      {preview.elderNames.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-2">
                          {preview.elderNames.map((name) => (
                            <span
                              key={name}
                              className="px-2 py-1 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs"
                            >
                              {name}
                            </span>
                          ))}
                          {preview.willCreate > preview.elderNames.length && (
                            <span className="px-2 py-1 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs">
                              +{preview.willCreate - preview.elderNames.length} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-sm text-gray-500 dark:text-gray-400">
                      No shifts to copy
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && !success && weekOptions.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleCopy}
              disabled={copying || !selectedWeek || !preview || preview.willCreate === 0}
              className={cn(
                'w-full py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2',
                copying || !selectedWeek || !preview || preview.willCreate === 0
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white'
              )}
            >
              {copying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Copying...
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy {preview?.willCreate || 0} Shifts
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
