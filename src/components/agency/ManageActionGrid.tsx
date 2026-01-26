'use client';

import { useRouter } from 'next/navigation';
import { UserPlus, CalendarPlus, UserCheck, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ManageActionGridProps {
  caregiverCount: number;
  elderCount: number;
  maxCaregivers: number;
  maxElders: number;
}

export function ManageActionGrid({
  caregiverCount,
  elderCount,
  maxCaregivers,
  maxElders,
}: ManageActionGridProps) {
  const router = useRouter();

  const caregiversFull = caregiverCount >= maxCaregivers;
  const eldersFull = elderCount >= maxElders;

  const actions = [
    {
      id: 'assign-elder',
      icon: UserPlus,
      label: 'Assign Elder',
      tooltip: eldersFull ? 'At capacity (30/30)' : `Assign Elder (${maxElders - elderCount} slots)`,
      href: '/dashboard/agency?tab=assignments',
      disabled: eldersFull,
    },
    {
      id: 'send-slots',
      icon: CalendarPlus,
      label: 'Send Slots',
      tooltip: 'Send Slots',
      href: '/dashboard/agency/schedule',
      disabled: false,
    },
    {
      id: 'onboard-caregiver',
      icon: UserCheck,
      label: 'Onboard Caregiver',
      tooltip: caregiversFull ? 'All slots filled (10/10)' : `Onboard Caregiver (${maxCaregivers - caregiverCount} slots)`,
      href: '/dashboard/care-management',
      disabled: caregiversFull,
    },
    {
      id: 'create-schedule',
      icon: Calendar,
      label: 'Create Schedule',
      tooltip: 'Create Schedule',
      href: '/dashboard/agency/schedule',
      disabled: false,
    },
  ];

  return (
    <div>
      <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Manage</h2>
      <TooltipProvider delayDuration={300}>
        <div className="flex items-center justify-center gap-3">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Tooltip key={action.id}>
                <TooltipTrigger asChild>
                  <button
                    className={cn(
                      'w-12 h-12 rounded-xl flex items-center justify-center transition-colors border-2',
                      action.disabled
                        ? 'cursor-default bg-green-50 dark:bg-green-900/20 border-green-400 dark:border-green-600'
                        : 'cursor-pointer bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                    )}
                    onClick={() => {
                      if (!action.disabled) router.push(action.href);
                    }}
                    aria-label={action.label}
                  >
                    <Icon
                      className={cn(
                        'w-5 h-5',
                        action.disabled
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-gray-600 dark:text-gray-400'
                      )}
                    />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  {action.tooltip}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>
    </div>
  );
}
