'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useElder } from '@/contexts/ElderContext';
import { useAuth } from '@/contexts/AuthContext';
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
  ChevronRight,
  FolderOpen,
  Calendar,
  MessageSquare,
  X,
  Building2,
  BarChart3,
  DollarSign,
  CalendarDays,
  UserCog,
  CalendarCheck,
  ClockIcon
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
      { href: '/dashboard/incidents', label: 'Incident Reports', icon: AlertTriangle },
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
      { href: '/dashboard/insights', label: 'Health Trends', icon: Sparkles }
    ]
  },
  {
    id: 'care-management',
    title: 'Care Management',
    icon: Mail,
    defaultOpen: false,
    items: [
      { href: '/dashboard/shift-handoff', label: 'Shift Handoff', icon: Clock },
      { href: '/dashboard/timesheet', label: 'Timesheet', icon: Clock },
      { href: '/dashboard/documents', label: 'Documents', icon: FolderOpen },
      { href: '/dashboard/family-updates', label: 'Family Updates', icon: Mail },
      { href: '/dashboard/caregiver-burnout', label: 'Caregiver Burnout', icon: Users },
      { href: '/dashboard/alerts', label: 'Alerts', icon: Bell }
    ]
  }
];

// Import Heart icon
import { Heart } from 'lucide-react';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { selectedElder, availableElders, setSelectedElder } = useElder();

  // Check if user is multi-agency tier (calendar is only for multi-agency)
  const isMultiAgency = user?.subscriptionTier === 'multi_agency';

  // Initialize collapsed state - Daily Care open by default
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    'daily-care': false,
    'medical-safety': true,
    'health-analytics': true,
    'care-management': true
  });

  // Close sidebar on route change (mobile only)
  useEffect(() => {
    if (onClose && window.innerWidth < 1024) {
      onClose();
    }
  }, [pathname, onClose]);

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50",
          "w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700",
          "flex flex-col h-screen",
          "transform transition-transform duration-300 ease-in-out lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo with Close Button (Mobile) */}
        <div className="pt-6 pr-6 pb-4 pl-4 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center">
            <h1 className="text-3xl tracking-tight text-slate-900 dark:text-slate-100">
              <span className="font-bold">Care</span>
              <span className="font-light text-blue-600 dark:text-blue-400">guide</span>
            </h1>
          </Link>
          {/* Close button - Mobile only */}
          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Close menu"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

      {/* Elder Selector - Always visible in sidebar */}
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
        <p className="px-2 mt-2 text-xs text-gray-500 dark:text-gray-400 sm:hidden">
          Use the menu to select an elder and access care features
        </p>
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

        {/* Health Profile - Show when elder is selected */}
        {selectedElder && (
          <Link
            href={`/dashboard/elder-profile?elderId=${selectedElder.id}`}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              pathname === '/dashboard/elder-profile'
                ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            )}
          >
            <Heart className="w-5 h-5 text-red-500" />
            Health Profile
          </Link>
        )}

        {/* Agency Management - Only for multi-agency tier */}
        {isMultiAgency && (
          <>
            <div className="pt-4 pb-2">
              <div className="px-3">
                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  Agency Management
                </p>
              </div>
            </div>

            <Link
              href="/dashboard/agency"
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                pathname === '/dashboard/agency'
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              )}
            >
              <Building2 className="w-5 h-5" />
              Agency Overview
            </Link>

            <Link
              href="/dashboard/agency?tab=scheduling"
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ml-2',
                pathname === '/dashboard/calendar' || (pathname === '/dashboard/agency' && typeof window !== 'undefined' && window.location.search.includes('scheduling'))
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              )}
            >
              <CalendarDays className="w-4 h-4" />
              Shift Scheduling
            </Link>

            <Link
              href="/dashboard/agency?tab=assignments"
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ml-2',
                pathname === '/dashboard/agency' && typeof window !== 'undefined' && window.location.search.includes('assignments')
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              )}
            >
              <UserCog className="w-4 h-4" />
              Caregiver Assignments
            </Link>

            <Link
              href="/dashboard/agency?tab=analytics"
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ml-2',
                pathname === '/dashboard/agency' && typeof window !== 'undefined' && window.location.search.includes('analytics')
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              )}
            >
              <BarChart3 className="w-4 h-4" />
              Analytics
            </Link>

            <Link
              href="/dashboard/agency?tab=billing"
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ml-2',
                pathname === '/dashboard/agency' && typeof window !== 'undefined' && window.location.search.includes('billing')
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              )}
            >
              <DollarSign className="w-4 h-4" />
              Billing
            </Link>

            <Link
              href="/dashboard/calendar"
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ml-2',
                pathname === '/dashboard/calendar'
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              )}
            >
              <CalendarCheck className="w-4 h-4" />
              Shift Calendar
            </Link>

            <Link
              href="/dashboard/availability"
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ml-2',
                pathname === '/dashboard/availability'
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              )}
            >
              <ClockIcon className="w-4 h-4" />
              Caregiver Availability
            </Link>
          </>
        )}

        {/* Health Assistant Section - Always visible, prominent */}
        <div className="pt-4 pb-2">
          <div className="px-3">
            <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Ask Questions
            </p>
          </div>
        </div>

        {/* Health Assistant Hub */}
        <Link
          href="/dashboard/medgemma"
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
            pathname === '/dashboard/medgemma'
              ? 'bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 dark:hover:from-blue-900/10 dark:hover:to-purple-900/10'
          )}
        >
          <Brain className="w-5 h-5" />
          Health Assistant
          <span className="ml-auto text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded-full font-semibold">
            NEW
          </span>
        </Link>

        {/* Health Assistant Features */}
        <Link
          href="/dashboard/health-chat"
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ml-2',
            pathname === '/dashboard/health-chat'
              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
          )}
        >
          <MessageSquare className="w-4 h-4" />
          Ask a Question
        </Link>

        <Link
          href="/dashboard/clinical-notes"
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ml-2',
            pathname === '/dashboard/clinical-notes'
              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
          )}
        >
          <FileText className="w-4 h-4" />
          Clinical Notes
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
    </>
  );
}
