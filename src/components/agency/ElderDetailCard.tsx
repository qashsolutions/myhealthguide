'use client';

import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Elder } from '@/types';

interface ElderTaskStats {
  remaining: number;
  completed: number;
  medsLogged: number;
  medsTotal: number;
  mealsLogged: number;
  mealsTotal: number;
}

interface ElderDetailCardProps {
  elder: Elder;
  taskStats?: ElderTaskStats;
  isActive?: boolean;
  onViewDetails?: (elderId: string) => void;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function getAgeDisplay(elder: Elder): string | null {
  if (elder.approximateAge) return `~${elder.approximateAge} years old`;
  if (elder.dateOfBirth) {
    const dob = elder.dateOfBirth instanceof Date ? elder.dateOfBirth : new Date(elder.dateOfBirth as any);
    const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    return `${age} years old`;
  }
  return null;
}

export function ElderDetailCard({ elder, taskStats, isActive, onViewDetails }: ElderDetailCardProps) {
  const router = useRouter();

  const handleViewDetails = () => {
    if (onViewDetails) {
      onViewDetails(elder.id);
    } else {
      router.push(`/dashboard/daily-care?elderId=${elder.id}`);
    }
  };

  const ageDisplay = getAgeDisplay(elder);
  const allDone = taskStats && taskStats.remaining === 0 && taskStats.completed > 0;
  const recipientEmails = elder.reportRecipients?.map(r => r.email).filter(Boolean) || [];

  return (
    <Card className="p-4 relative">
      {/* Active/Completed indicator */}
      {isActive && (
        <div className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-green-500" aria-label="Currently active" />
      )}
      {allDone && !isActive && (
        <div className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-blue-500" aria-label="All tasks complete" />
      )}

      {/* Header: Avatar + Name + Age */}
      <div className="flex items-start gap-3 mb-3">
        <div className={cn(
          'flex items-center justify-center w-10 h-10 rounded-full shrink-0 text-sm font-semibold',
          isActive
            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
            : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
        )}>
          {getInitials(elder.name)}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
            {elder.name}
          </h3>
          {ageDisplay && (
            <p className="text-xs text-gray-500 dark:text-gray-400">{ageDisplay}</p>
          )}
        </div>
      </div>

      {/* Task stats */}
      {taskStats && (
        <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1 mb-3">
          <div className="flex items-center justify-between">
            <span>Tasks</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {taskStats.remaining} remaining · {taskStats.completed} done
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Meds</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {taskStats.medsLogged}/{taskStats.medsTotal} logged
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Meals</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {taskStats.mealsLogged}/{taskStats.mealsTotal}
            </span>
          </div>
        </div>
      )}

      {/* Member emails (report recipients) */}
      {recipientEmails.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Member Emails (PDF report recipients):
          </p>
          <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
            {recipientEmails.map((email, idx) => (
              <li key={idx} className="truncate">· {email}</li>
            ))}
          </ul>
        </div>
      )}

      {/* View Details link */}
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-between group text-xs mt-1"
        onClick={handleViewDetails}
      >
        <span>View Care Details</span>
        <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
      </Button>
    </Card>
  );
}
