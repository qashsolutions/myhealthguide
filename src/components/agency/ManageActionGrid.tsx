'use client';

import { useRouter } from 'next/navigation';
import { UserPlus, CalendarPlus, UserCheck, Calendar } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

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
      href: '/dashboard/agency?tab=assignments',
      disabled: eldersFull,
      hint: eldersFull
        ? 'At capacity'
        : `${maxElders - elderCount} slot${maxElders - elderCount !== 1 ? 's' : ''} available`,
    },
    {
      id: 'send-slots',
      icon: CalendarPlus,
      label: 'Send Slots',
      href: '/dashboard/agency?tab=scheduling',
      disabled: false,
      hint: '',
    },
    {
      id: 'onboard-caregiver',
      icon: UserCheck,
      label: 'Onboard Caregiver',
      href: '/dashboard/care-management',
      disabled: caregiversFull,
      hint: caregiversFull
        ? 'All slots filled'
        : `${maxCaregivers - caregiverCount} slot${maxCaregivers - caregiverCount !== 1 ? 's' : ''} available`,
    },
    {
      id: 'create-schedule',
      icon: Calendar,
      label: 'Create Schedule',
      href: '/dashboard/agency?tab=scheduling',
      disabled: false,
      hint: '',
    },
  ];

  return (
    <div>
      <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Manage</h2>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Card
              key={action.id}
              className={cn(
                'p-4 flex flex-col items-center justify-center gap-2 min-h-[100px] transition-colors',
                action.disabled
                  ? 'opacity-50 cursor-not-allowed'
                  : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800'
              )}
              onClick={() => {
                if (!action.disabled) router.push(action.href);
              }}
            >
              <Icon
                className={cn(
                  'w-7 h-7',
                  action.disabled
                    ? 'text-gray-300 dark:text-gray-600'
                    : 'text-gray-500 dark:text-gray-400'
                )}
              />
              <span
                className={cn(
                  'text-sm font-medium text-center',
                  action.disabled
                    ? 'text-gray-400 dark:text-gray-500'
                    : 'text-gray-700 dark:text-gray-300'
                )}
              >
                {action.label}
              </span>
              {action.hint && (
                <span
                  className={cn(
                    'text-[10px] text-center leading-tight',
                    action.disabled
                      ? 'text-gray-400 dark:text-gray-500'
                      : 'text-gray-400 dark:text-gray-500'
                  )}
                >
                  {action.hint}
                </span>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
