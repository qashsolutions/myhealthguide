'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Pill,
  Leaf,
  UtensilsCrossed,
  FileText,
  ArrowRightLeft,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChipConfig {
  id: string;
  icon: LucideIcon;
  label: string;
  action: string;
  highlighted?: boolean;
}

type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

interface SuggestionChipsProps {
  overdueCount?: number;
  isMultiAgency?: boolean;
  isSuperAdmin?: boolean;
}

function getTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

function getChips(
  timeOfDay: TimeOfDay,
  overdueCount: number,
  isMultiAgency: boolean,
): ChipConfig[] {
  const chips: ChipConfig[] = [];

  // Medications chip (always first, highlighted if overdue)
  chips.push({
    id: 'log-meds',
    icon: Pill,
    label: 'Log medications',
    action: '/dashboard/daily-care?tab=medications',
    highlighted: overdueCount > 0,
  });

  // Time-based meal chip
  if (timeOfDay === 'morning') {
    chips.push({ id: 'breakfast', icon: UtensilsCrossed, label: 'Log breakfast', action: '/dashboard/daily-care?tab=diet' });
  } else if (timeOfDay === 'afternoon') {
    chips.push({ id: 'lunch', icon: UtensilsCrossed, label: 'Log lunch', action: '/dashboard/daily-care?tab=diet' });
  } else if (timeOfDay === 'evening') {
    chips.push({ id: 'dinner', icon: UtensilsCrossed, label: 'Log dinner', action: '/dashboard/daily-care?tab=diet' });
  } else {
    chips.push({ id: 'meal', icon: UtensilsCrossed, label: 'Log meal', action: '/dashboard/daily-care?tab=diet' });
  }

  // Supplements
  chips.push({
    id: 'supplements',
    icon: Leaf,
    label: 'Supplements',
    action: '/dashboard/daily-care?tab=supplements',
  });

  // Add note
  chips.push({
    id: 'note',
    icon: FileText,
    label: 'Add note',
    action: '/dashboard/notes/new',
  });

  // Role-specific: Shift handoff for agency caregivers
  if (isMultiAgency) {
    chips.push({
      id: 'handoff',
      icon: ArrowRightLeft,
      label: 'Shift handoff',
      action: '/dashboard/shift-handoff',
    });
  }

  // Ask AI (always available)
  chips.push({
    id: 'ask-ai',
    icon: Sparkles,
    label: 'Ask AI',
    action: '/dashboard/ask-ai',
  });

  return chips;
}

export function SuggestionChips({ overdueCount = 0, isMultiAgency = false, isSuperAdmin = false }: SuggestionChipsProps) {
  const router = useRouter();
  const timeOfDay = getTimeOfDay();

  const chips = useMemo(
    () => getChips(timeOfDay, overdueCount, isMultiAgency),
    [timeOfDay, overdueCount, isMultiAgency]
  );

  // Agency owner does NOT see chips (they have ManageActionGrid)
  if (isSuperAdmin && isMultiAgency) return null;

  return (
    <div
      className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide sm:flex-wrap sm:overflow-visible"
      aria-label="Quick actions"
      role="toolbar"
    >
      {chips.map((chip) => {
        const Icon = chip.icon;
        return (
          <button
            key={chip.id}
            onClick={() => router.push(chip.action)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-full border whitespace-nowrap',
              'text-sm font-medium transition-colors min-h-[36px]',
              'hover:bg-gray-50 dark:hover:bg-gray-800 active:bg-gray-100 dark:active:bg-gray-700',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
              chip.highlighted
                ? 'border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300'
            )}
            aria-label={chip.highlighted ? `${chip.label} - urgent` : chip.label}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}
