'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useElder } from '@/contexts/ElderContext';
import { useMemo } from 'react';
import { useSubscription } from '@/lib/subscription';
import {
  Home,
  Heart,
  Clipboard,
  MessageSquare,
  AlertTriangle,
  BarChart3,
  FileText,
  Settings,
  X,
  Building2,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Tooltip descriptions for features
const featureTooltips: Record<string, string> = {
  '/dashboard': 'View your overall caregiving dashboard',
  '/dashboard/elder-profile': 'View and manage health profile information',
  '/dashboard/daily-care': 'Track medications, supplements, diet & activity',
  '/dashboard/ask-ai': 'AI-powered health insights and chat',
  '/dashboard/safety-alerts': 'View drug interactions, incidents, and screening results',
  '/dashboard/analytics': 'View health trends and compliance analytics',
  '/dashboard/notes': 'Capture and share caregiving insights',
  '/dashboard/care-management': 'Manage shifts, documents, and family updates',
  '/dashboard/agency': 'Agency overview and management',
  '/dashboard/settings': 'Configure your preferences',
};

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { isMultiAgency } = useSubscription();
  const { selectedElder, availableElders } = useElder();

  // Get a unique display name for the selected elder
  // If multiple elders have the same first name, use preferredName or full name
  const elderDisplayName = useMemo(() => {
    if (!selectedElder) return null;

    const selectedFirstName = selectedElder.name.split(' ')[0].toLowerCase();

    // Check if any other elder has the same first name
    const hasDuplicateFirstName = availableElders.some(
      (elder) =>
        elder.id !== selectedElder.id &&
        elder.name.split(' ')[0].toLowerCase() === selectedFirstName
    );

    if (hasDuplicateFirstName) {
      // Use preferredName (nickname) if available, otherwise use full name
      return selectedElder.preferredName || selectedElder.name;
    }

    // Unique first name - just use it
    return selectedElder.name.split(' ')[0];
  }, [selectedElder, availableElders]);

  // Close sidebar on route change (mobile only)
  useEffect(() => {
    if (onClose && window.innerWidth < 1024) {
      onClose();
    }
  }, [pathname, onClose]);

  // Helper to check if a path is active
  const isActive = (path: string) => {
    // Remove query string from path for comparison
    const basePath = path.split('?')[0];

    if (basePath === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname === basePath || pathname.startsWith(basePath + '/');
  };

  // Navigation item component
  const NavItem = ({
    href,
    icon: Icon,
    label,
    badge,
    badgeColor = 'blue',
  }: {
    href: string;
    icon: React.ElementType;
    label: string;
    badge?: string | number;
    badgeColor?: 'blue' | 'green' | 'red';
  }) => {
    const active = isActive(href);
    const tooltip = featureTooltips[href];

    const badgeColors = {
      blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
      green: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
      red: 'bg-red-500 text-white',
    };

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              active
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            )}
          >
            <Icon className={cn('w-5 h-5', active && 'text-blue-600 dark:text-blue-400')} />
            <span className="flex-1">{label}</span>
            {badge !== undefined && (
              <span className={cn(
                'text-xs px-2 py-0.5 rounded-full font-semibold',
                badgeColors[badgeColor]
              )}>
                {badge}
              </span>
            )}
          </Link>
        </TooltipTrigger>
        {tooltip && (
          <TooltipContent side="right">
            <p>{tooltip}</p>
          </TooltipContent>
        )}
      </Tooltip>
    );
  };

  // Section label component
  const SectionLabel = ({
    children,
    showIndicator = false,
  }: {
    children: React.ReactNode;
    showIndicator?: boolean;
  }) => (
    <div className="px-3 pt-5 pb-2">
      <div className="flex items-center gap-2">
        {showIndicator && (
          <span className="w-2 h-2 rounded-full bg-green-500" />
        )}
        <span className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wider">
          {children}
        </span>
      </div>
    </div>
  );

  // Gray section label (for non-elder sections)
  const GraySectionLabel = ({ children }: { children: React.ReactNode }) => (
    <div className="px-3 pt-5 pb-2">
      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        {children}
      </span>
    </div>
  );

  return (
    <TooltipProvider delayDuration={300}>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        data-sidebar
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50",
          "w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700",
          "flex flex-col h-screen",
          "transform transition-transform duration-300 ease-in-out lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo with Close Button (Mobile) */}
        <div className="pt-6 pr-6 pb-4 pl-4 flex items-center justify-between lg:hidden">
          <Link href="/dashboard" className="flex items-center">
            <h1 className="text-2xl tracking-tight text-slate-900 dark:text-slate-100">
              <span className="font-bold">Care</span>
              <span className="font-light text-blue-600 dark:text-blue-400">guide</span>
            </h1>
          </Link>
          {/* Close button - Mobile only */}
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Close menu"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 overflow-y-auto pt-4 lg:pt-6">
          {/* Overview - Always visible */}
          <NavItem href="/dashboard" icon={Home} label="Overview" />

          {/* Elder's Care Section */}
          {selectedElder ? (
            <>
              <SectionLabel showIndicator>
                {elderDisplayName}&apos;s Care
              </SectionLabel>

              <div className="space-y-1">
                <NavItem
                  href={`/dashboard/elder-profile?elderId=${selectedElder.id}`}
                  icon={Heart}
                  label="Health Profile"
                />
                <NavItem
                  href="/dashboard/daily-care"
                  icon={Clipboard}
                  label="Daily Care"
                />
              </div>
            </>
          ) : (
            <div className="px-3 py-4 mt-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
                  Select an elder from the header to access care features
                </p>
              </div>
            </div>
          )}

          {/* AI & Insights Section */}
          <GraySectionLabel>AI & Insights</GraySectionLabel>
          <div className="space-y-1">
            <NavItem
              href="/dashboard/ask-ai"
              icon={MessageSquare}
              label="Smart Insights"
              badge="New"
              badgeColor="green"
            />
            <NavItem
              href="/dashboard/safety-alerts"
              icon={AlertTriangle}
              label="Safety Alerts"
            />
            <NavItem
              href="/dashboard/analytics"
              icon={BarChart3}
              label="Analytics"
            />
          </div>

          {/* Personal Section */}
          <GraySectionLabel>Personal</GraySectionLabel>
          <div className="space-y-1">
            <NavItem
              href="/dashboard/notes"
              icon={FileText}
              label="My Notes"
            />
          </div>

          {/* Agency Section - Only for multi-agency tier */}
          {isMultiAgency && (
            <>
              <GraySectionLabel>Agency</GraySectionLabel>
              <div className="space-y-1">
                <NavItem
                  href="/dashboard/care-management"
                  icon={Users}
                  label="Care Management"
                />
                <NavItem
                  href="/dashboard/agency"
                  icon={Building2}
                  label="Agency Management"
                />
              </div>
            </>
          )}
        </nav>

        {/* Settings - Always at bottom */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-700">
          <NavItem href="/dashboard/settings" icon={Settings} label="Settings" />
        </div>
      </aside>
    </TooltipProvider>
  );
}
