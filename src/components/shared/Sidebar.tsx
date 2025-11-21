'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useElder } from '@/contexts/ElderContext';
import {
  Home,
  Users,
  Pill,
  Apple,
  Utensils,
  FileText,
  Settings,
  Sparkles,
  Bell,
  AlertTriangle,
  Clock,
  Brain,
  TrendingUp,
  Mail,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Define collapsible sections structure
const elderCentricSections = [
  {
    id: 'daily-care',
    title: 'Daily Care',
    icon: Heart,
    defaultOpen: true,
    items: [
      { href: '/dashboard/medications', label: 'Medications', icon: Pill },
      { href: '/dashboard/supplements', label: 'Supplements', icon: Apple },
      { href: '/dashboard/diet', label: 'Diet', icon: Utensils },
      { href: '/dashboard/activity', label: 'Activity', icon: FileText }
    ]
  },
  {
    id: 'medical-safety',
    title: 'Medical Safety',
    icon: AlertTriangle,
    defaultOpen: false,
    items: [
      { href: '/dashboard/drug-interactions', label: 'Drug Interactions', icon: AlertTriangle },
      { href: '/dashboard/schedule-conflicts', label: 'Schedule Conflicts', icon: Clock },
      { href: '/dashboard/dementia-screening', label: 'Dementia Screening', icon: Brain }
    ]
  },
  {
    id: 'health-analytics',
    title: 'Health Analytics',
    icon: TrendingUp,
    defaultOpen: false,
    items: [
      { href: '/dashboard/medication-adherence', label: 'Medication Adherence', icon: TrendingUp },
      { href: '/dashboard/nutrition-analysis', label: 'Nutrition Analysis', icon: Apple },
      { href: '/dashboard/insights', label: 'AI Insights', icon: Sparkles }
    ]
  },
  {
    id: 'care-management',
    title: 'Care Management',
    icon: Mail,
    defaultOpen: false,
    items: [
      { href: '/dashboard/family-updates', label: 'Family Updates', icon: Mail },
      { href: '/dashboard/caregiver-burnout', label: 'Caregiver Burnout', icon: Users },
      { href: '/dashboard/alerts', label: 'Alerts', icon: Bell }
    ]
  }
];

// Import Heart icon
import { Heart } from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();
  const { selectedElder, availableElders, setSelectedElder } = useElder();

  // Initialize collapsed state - Daily Care open by default
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    'daily-care': false,
    'medical-safety': true,
    'health-analytics': true,
    'care-management': true
  });

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  return (
    <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col h-screen">
      {/* Logo */}
      <div className="pt-6 pr-6 pb-4 pl-4">
        <Link href="/dashboard" className="flex items-center">
          <h1 className="text-3xl tracking-tight text-slate-900 dark:text-slate-100">
            <span className="font-bold">Health</span>
            <span className="font-light text-blue-600 dark:text-blue-400">Guide</span>
          </h1>
        </Link>
      </div>

      {/* Elder Selector */}
      <div className="px-3 pb-4">
        <div className="px-2">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
            Selected Elder
          </p>
          <select
            value={selectedElder?.id || ''}
            onChange={(e) => {
              const elder = availableElders.find(el => el.id === e.target.value);
              if (elder) setSelectedElder(elder);
            }}
            className="w-full px-3 py-2 text-sm font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100 border-2 border-blue-200 dark:border-blue-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select an elder...</option>
            {availableElders.map((elder) => (
              <option key={elder.id} value={elder.id}>
                {elder.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {/* Overview - Always visible */}
        <Link
          href="/dashboard"
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
            pathname === '/dashboard'
              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          )}
        >
          <Home className="w-5 h-5" />
          Overview
        </Link>

        {/* Elders Management - Always visible */}
        <Link
          href="/dashboard/elders"
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
            pathname === '/dashboard/elders' || pathname.startsWith('/dashboard/elders/')
              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          )}
        >
          <Users className="w-5 h-5" />
          Manage Elders
        </Link>

        {/* Elder-specific sections - Only show when elder is selected */}
        {selectedElder && (
          <>
            <div className="pt-4 pb-2">
              <div className="px-3">
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500">
                  {selectedElder.name}'s Care
                </p>
              </div>
            </div>

            {elderCentricSections.map((section) => {
              const SectionIcon = section.icon;
              const isCollapsed = collapsedSections[section.id];

              return (
                <div key={section.id} className="space-y-1">
                  {/* Section Header - Collapsible */}
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <SectionIcon className="w-4 h-4" />
                      <span>{section.title}</span>
                    </div>
                    {isCollapsed ? (
                      <ChevronRight className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>

                  {/* Section Items */}
                  {!isCollapsed && (
                    <div className="ml-2 space-y-1">
                      {section.items.map((item) => {
                        const ItemIcon = item.icon;
                        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                              isActive
                                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                            )}
                          >
                            <ItemIcon className="w-4 h-4" />
                            {item.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}

        {/* No Elder Selected Message */}
        {!selectedElder && (
          <div className="pt-4 px-3">
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
                Select an elder above to access care features
              </p>
            </div>
          </div>
        )}
      </nav>

      {/* Settings - Always at bottom */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-700">
        <Link
          href="/dashboard/settings"
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
            pathname === '/dashboard/settings'
              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          )}
        >
          <Settings className="w-5 h-5" />
          Settings
        </Link>
      </div>
    </aside>
  );
}
