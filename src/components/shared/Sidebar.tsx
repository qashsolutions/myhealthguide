'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Users,
  Pill,
  Apple,
  Utensils,
  FileText,
  Settings,
  Heart,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: Home },
  { href: '/dashboard/elders', label: 'Elders', icon: Users },
  { href: '/dashboard/medications', label: 'Medications', icon: Pill },
  { href: '/dashboard/supplements', label: 'Supplements', icon: Apple },
  { href: '/dashboard/diet', label: 'Diet', icon: Utensils },
  { href: '/dashboard/activity', label: 'Activity', icon: FileText },
  { href: '/dashboard/insights', label: 'AI Insights', icon: Sparkles },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings }
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
      <div className="p-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Heart className="h-8 w-8 text-blue-600" />
          <span className="text-xl font-bold text-gray-900 dark:text-white">
            myguide
          </span>
        </Link>
      </div>
      <nav className="px-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              )}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
