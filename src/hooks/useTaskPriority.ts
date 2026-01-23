'use client';

import { useTaskPriorityContext } from '@/contexts/TaskPriorityContext';

export function useTaskPriority() {
  return useTaskPriorityContext();
}

export function useNextTask() {
  const { nextTask } = useTaskPriorityContext();
  return nextTask;
}

export function useOverdueTasks() {
  const { overdueTasks } = useTaskPriorityContext();
  return overdueTasks;
}

export function useCompletionProgress() {
  const { completedCount, totalCount, completionPercentage } = useTaskPriorityContext();
  return { completedCount, totalCount, completionPercentage };
}
