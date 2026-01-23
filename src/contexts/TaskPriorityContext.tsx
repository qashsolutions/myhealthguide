'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useElder } from '@/contexts/ElderContext';
import { MedicationService } from '@/lib/firebase/medications';
import { SupplementService } from '@/lib/firebase/supplements';
import { generateDayTasks, prioritizeTasks, getNextTask, PrioritizedTask } from '@/lib/prioritization/taskPriorityEngine';
import type { Medication, Supplement, MedicationLog, SupplementLog } from '@/types';

interface TaskPriorityContextType {
  tasks: PrioritizedTask[];
  nextTask: PrioritizedTask | null;
  overdueTasks: PrioritizedTask[];
  completedCount: number;
  totalCount: number;
  completionPercentage: number;
  isLoading: boolean;
  refreshPriorities: () => Promise<void>;
}

const TaskPriorityContext = createContext<TaskPriorityContextType | undefined>(undefined);

const REFRESH_INTERVAL_MS = 60_000; // Re-calculate every 60 seconds

/**
 * Determine user role for HIPAA audit logging
 */
function getUserRole(user: any): 'admin' | 'caregiver' | 'member' {
  if (!user) return 'member';
  const agencyRole = user.agencies?.[0]?.role;
  if (agencyRole === 'super_admin' || agencyRole === 'caregiver_admin') return 'admin';
  if (agencyRole === 'caregiver') return 'caregiver';
  const groupRole = user.groups?.[0]?.role;
  if (groupRole === 'admin') return 'admin';
  return 'member';
}

export function TaskPriorityProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { selectedElder } = useElder();

  const [tasks, setTasks] = useState<PrioritizedTask[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchRef = useRef<string>(''); // Track last elder to avoid duplicate fetches

  const fetchAndCalculate = useCallback(async () => {
    if (!user || !selectedElder) {
      setTasks([]);
      return;
    }

    const elderKey = `${selectedElder.id}-${selectedElder.groupId}`;
    const isFirstLoad = lastFetchRef.current !== elderKey;

    if (isFirstLoad) {
      setIsLoading(true);
    }
    lastFetchRef.current = elderKey;

    try {
      const role = getUserRole(user);
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

      // Fetch medications, supplements, and their logs in parallel
      const [medications, supplements, medicationLogs, supplementLogs] = await Promise.all([
        MedicationService.getMedicationsByElder(
          selectedElder.id, selectedElder.groupId, user.id, role
        ),
        SupplementService.getSupplementsByElder(
          selectedElder.id, selectedElder.groupId, user.id, role
        ),
        MedicationService.getTodaysDosesForElder(
          selectedElder.id, selectedElder.groupId, user.id, role
        ),
        SupplementService.getLogsByDateRange(
          selectedElder.groupId, startOfDay, endOfDay, user.id, role
        ),
      ]);

      // Filter supplements to selected elder only (getLogsByDateRange is group-wide)
      const elderSupplementLogs = supplementLogs.filter(
        (log: SupplementLog) => log.elderId === selectedElder.id
      );

      const dayTasks = generateDayTasks(
        medications,
        supplements,
        medicationLogs,
        elderSupplementLogs,
        selectedElder.name || 'Loved One',
        now
      );

      setTasks(dayTasks);
    } catch (error) {
      console.error('[TaskPriority] Error calculating priorities:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, selectedElder]);

  // Recalculate statuses without refetching data (just update time-based statuses)
  const recalculateStatuses = useCallback(() => {
    if (tasks.length === 0) return;

    const now = new Date();
    const updatedTasks = tasks.map(task => {
      if (task.status === 'completed' || task.status === 'skipped') return task;

      // Recalculate time-based status
      const scheduledDate = task.scheduledDate;
      const minutesUntilDue = (scheduledDate.getTime() - now.getTime()) / (1000 * 60);

      let status = task.status;
      let overdueMinutes = task.overdueMinutes;

      if (minutesUntilDue < -15) {
        status = 'overdue';
        overdueMinutes = Math.abs(Math.round(minutesUntilDue));
      } else if (minutesUntilDue >= -15 && minutesUntilDue <= 15) {
        status = 'due_now';
        overdueMinutes = 0;
      } else {
        status = 'upcoming';
        overdueMinutes = 0;
      }

      const priority = status === 'overdue'
        ? Math.max(1, 10 - Math.floor(overdueMinutes / 30))
        : status === 'due_now' ? 20 : 50;

      return { ...task, status, overdueMinutes, priority };
    });

    setTasks(prioritizeTasks(updatedTasks));
  }, [tasks]);

  // Initial fetch when elder changes
  useEffect(() => {
    fetchAndCalculate();
  }, [fetchAndCalculate]);

  // Set up periodic recalculation
  useEffect(() => {
    intervalRef.current = setInterval(recalculateStatuses, REFRESH_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [recalculateStatuses]);

  // Derived values
  const overdueTasks = tasks.filter(t => t.status === 'overdue');
  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const totalCount = tasks.length;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const nextTaskValue = getNextTask(tasks);

  return (
    <TaskPriorityContext.Provider
      value={{
        tasks,
        nextTask: nextTaskValue,
        overdueTasks,
        completedCount,
        totalCount,
        completionPercentage,
        isLoading,
        refreshPriorities: fetchAndCalculate,
      }}
    >
      {children}
    </TaskPriorityContext.Provider>
  );
}

export function useTaskPriorityContext() {
  const context = useContext(TaskPriorityContext);
  if (!context) {
    throw new Error('useTaskPriorityContext must be used within a TaskPriorityProvider');
  }
  return context;
}
