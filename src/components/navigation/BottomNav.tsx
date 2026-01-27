'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, BarChart3, Sparkles, Menu, Calendar, Users, Clipboard, Heart, MessageSquare } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/lib/subscription';
import { useElder } from '@/contexts/ElderContext';
import { isSuperAdmin } from '@/lib/utils/getUserRole';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  icon: React.ElementType;
  label: string;
  action?: () => void;
}

interface BottomNavProps {
  onMoreClick: () => void;
}

export function BottomNav({ onMoreClick }: BottomNavProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { isMultiAgency } = useSubscription();
  const { selectedElder } = useElder();
  const userIsSuperAdmin = isSuperAdmin(user);

  const isActive = (path: string) => {
    if (path === '/dashboard') return pathname === '/dashboard';
    return pathname === path || pathname.startsWith(path + '/');
  };

  // Build nav items based on role
  const navItems: NavItem[] = [];

  // Home - always first
  navItems.push({ href: '/dashboard', icon: Home, label: 'Home' });

  if (isMultiAgency && userIsSuperAdmin) {
    // Agency Owner: Home, Team, Schedule, Reports, More
    navItems.push({ href: '/dashboard/care-management', icon: Users, label: 'Team' });
    navItems.push({ href: '/dashboard/agency/schedule', icon: Calendar, label: 'Schedule' });
    navItems.push({ href: '/dashboard/analytics', icon: BarChart3, label: 'Reports' });
  } else if (isMultiAgency) {
    // Agency Caregiver: Home, Schedule, Reports, More (no Ask AI - they focus on logging)
    navItems.push({ href: '/dashboard/shift-handoff', icon: Calendar, label: 'Schedule' });
    navItems.push({ href: '/dashboard/analytics', icon: BarChart3, label: 'Reports' });
  } else {
    // Family Plan: Home, Health Profile, Insights, Health Chat (Jan 27, 2026)
    // Matches desktop IconRail - consistent 4-icon nav across devices.
    // No hamburger menu needed - Settings accessible from profile page.
    if (selectedElder) {
      navItems.push({
        href: `/dashboard/elder-profile?elderId=${selectedElder.id}`,
        icon: Heart,
        label: 'Health Profile',
      });
    }
    navItems.push({ href: '/dashboard/insights', icon: Sparkles, label: 'Insights' });
    navItems.push({ href: '/dashboard/health-chat', icon: MessageSquare, label: 'Health Chat' });
  }

  // More - only for Multi-Agency users (Family Plan has all 4 items directly accessible)
  if (isMultiAgency) {
    navItems.push({ href: '#more', icon: Menu, label: 'More', action: onMoreClick });
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 lg:hidden"
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-around h-16 px-2 pb-safe">
        {navItems.map((item) => {
          const active = item.action ? false : isActive(item.href);
          const Icon = item.icon;

          if (item.action) {
            return (
              <button
                key={item.label}
                onClick={item.action}
                className="flex flex-col items-center justify-center w-full h-full gap-1 min-w-[48px]"
                aria-label={item.label}
              >
                <Icon className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                <span className="text-[10px] text-gray-400 dark:text-gray-500">
                  {item.label}
                </span>
              </button>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center w-full h-full gap-1 min-w-[48px] relative"
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
            >
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-full bg-blue-600" />
              )}
              <Icon
                className={cn(
                  'w-5 h-5',
                  active
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-400 dark:text-gray-500'
                )}
              />
              <span
                className={cn(
                  'text-[10px]',
                  active
                    ? 'text-blue-600 dark:text-blue-400 font-medium'
                    : 'text-gray-400 dark:text-gray-500'
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
