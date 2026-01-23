'use client';

import { useRouter } from 'next/navigation';
import { UserPlus, CalendarPlus, UserCheck, Calendar } from 'lucide-react';
import { Card } from '@/components/ui/card';

const actions = [
  {
    id: 'assign-elder',
    icon: UserPlus,
    label: 'Assign Elder',
    href: '/dashboard/agency?tab=assignments',
  },
  {
    id: 'send-slots',
    icon: CalendarPlus,
    label: 'Send Slots',
    href: '/dashboard/agency?tab=scheduling',
  },
  {
    id: 'onboard-caregiver',
    icon: UserCheck,
    label: 'Onboard Caregiver',
    href: '/dashboard/care-management',
  },
  {
    id: 'create-schedule',
    icon: Calendar,
    label: 'Create Schedule',
    href: '/dashboard/agency?tab=scheduling',
  },
];

export function ManageActionGrid() {
  const router = useRouter();

  return (
    <div>
      <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Manage</h2>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Card
              key={action.id}
              className="p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 min-h-[100px]"
              onClick={() => router.push(action.href)}
            >
              <Icon className="w-7 h-7 text-gray-500 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center">
                {action.label}
              </span>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
