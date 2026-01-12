'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useElder } from '@/contexts/ElderContext';
import { useAuth } from '@/contexts/AuthContext';
import { useMemo } from 'react';
import { useSubscription } from '@/lib/subscription';
import {
  isSuperAdmin,
  isAgencyCaregiver,
  isReadOnlyUser,
} from '@/lib/utils/getUserRole';
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
  HelpCircle,
  Clock,
  FileCheck,
  FolderOpen,
  Bell,
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
  '/dashboard/ask-ai': 'Smart health insights and chat',
  '/dashboard/safety-alerts': 'View drug interactions, incidents, and screening results',
  '/dashboard/analytics': 'View health trends and compliance analytics',
  '/dashboard/notes': 'Capture and share caregiving insights',
  '/dashboard/care-management': 'Manage shifts, documents, and family updates',
  '/dashboard/agency': 'Agency overview and management',
  '/dashboard/settings': 'Configure your preferences',
  '/help': 'Get help and learn how to use MyHealthGuide',
  // Care Tools (Agency Caregivers)
  '/dashboard/shift-handoff': 'Complete shift handoff reports',
  '/dashboard/timesheet': 'Track your work hours',
  '/dashboard/documents': 'View and manage care documents',
  '/dashboard/family-updates': 'Send updates to family members',
};

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { isMultiAgency } = useSubscription();
  const { selectedElder, availableElders } = useElder();

  // Check if user is a super admin (has full access to agency features)
  const userIsSuperAdmin = isSuperAdmin(user);

  // Check if user is an agency caregiver (sees Care Tools section)
  const userIsAgencyCaregiver = isAgencyCaregiver(user);

  // Check if user is read-only (family member or agency family member)
  const userIsReadOnly = isReadOnlyUser(user);

  // Show Health Profile: Only for admins and caregivers (NOT for read-only members)
  // Members can see Daily Care but not detailed Health Profile (contains sensitive PII)
  const showHealthProfile = !userIsReadOnly;

  // Show Analytics: Only for admins and caregivers (NOT for read-only members)
  // Family Admin: yes, Family Member: no
  // Agency Owner: yes, Agency Caregiver: yes, Agency Member: no
  const showAnalytics = !userIsReadOnly;

  // Show My Notes: Only for admins and caregivers (NOT for read-only members)
  const showMyNotes = !userIsReadOnly;

  // Show Safety Alerts: Everyone can see
  const showSafetyAlerts = true;

  // Show Care Tools: Only for Agency Caregivers (not super admin, not family member)
  const showCareTools = isMultiAgency && userIsAgencyCaregiver;

  // Get a unique display name for the selected elder
  // Priority: preferredName > unique first name > full name (for duplicates)
  const elderDisplayName = useMemo(() => {
    if (!selectedElder) return null;

    // If preferredName exists, always use it (user explicitly set it)
    if (selectedElder.preferredName) {
      return selectedElder.preferredName;
    }

    const selectedFirstName = selectedElder.name.split(' ')[0].toLowerCase();

    // Check if any other elder has a similar first name (starts with same letters)
    const hasSimilarFirstName = availableElders.some((elder) => {
      if (elder.id === selectedElder.id) return false;
      const otherFirstName = elder.name.split(' ')[0].toLowerCase();
      // Check for exact match or one starts with the other (e.g., "john" vs "john1")
      return (
        otherFirstName === selectedFirstName ||
        otherFirstName.startsWith(selectedFirstName) ||
        selectedFirstName.startsWith(otherFirstName)
      );
    });

    if (hasSimilarFirstName) {
      // Use full name to disambiguate
      return selectedElder.name;
    }

    // Unique first name - just use it
    return selectedElder.name.split(' ')[0];
  }, [selectedElder, availableElders]);

  // Close sidebar on route change (mobile only)
  // Use ref to avoid dependency on onClose callback
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (onCloseRef.current && window.innerWidth < 1024) {
      onCloseRef.current();
    }
  }, [pathname]);

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
              'relative flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-all duration-150 min-h-[44px]',
              'hover:bg-gray-100 dark:hover:bg-gray-700',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
              active
                ? 'text-gray-900 dark:text-white'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            )}
          >
            {/* Left accent bar for active state */}
            {active && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-600 dark:bg-blue-400 rounded-full" />
            )}
            <Icon className={cn('w-5 h-5 flex-shrink-0', active && 'text-blue-600 dark:text-blue-400')} />
            <span className="flex-1">{label}</span>
            {badge !== undefined && (
              <span className={cn(
                'text-sm px-2.5 py-0.5 rounded-full font-semibold',
                badgeColors[badgeColor]
              )}>
                {badge}
              </span>
            )}
          </Link>
        </TooltipTrigger>
        {tooltip && (
          <TooltipContent side="right">
            <p className="text-base">{tooltip}</p>
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
    <div className="px-4 pt-6 pb-2">
      <div className="flex items-center gap-2">
        {showIndicator && (
          <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
        )}
        <span className="text-sm font-semibold text-green-600 dark:text-green-400 uppercase tracking-wider">
          {children}
        </span>
      </div>
    </div>
  );

  // Gray section label (for non-elder sections)
  const GraySectionLabel = ({ children }: { children: React.ReactNode }) => (
    <div className="px-4 pt-6 pb-2">
      <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
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
              <span className="font-bold">MyHealth</span>
              <span className="font-light text-blue-600 dark:text-blue-400">Guide</span>
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
                {showHealthProfile && (
                  <NavItem
                    href={`/dashboard/elder-profile?elderId=${selectedElder.id}`}
                    icon={Heart}
                    label="Health Profile"
                  />
                )}
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
                  Select a loved one from the header to access care features
                </p>
              </div>
            </div>
          )}

          {/* Smart Insights Section */}
          <GraySectionLabel>Smart Insights</GraySectionLabel>
          <div className="space-y-1">
            <NavItem
              href="/dashboard/ask-ai"
              icon={MessageSquare}
              label="Insights"
            />
            {/* Safety Alerts: Everyone can see */}
            {showSafetyAlerts && (
              <NavItem
                href="/dashboard/safety-alerts"
                icon={AlertTriangle}
                label="Safety Alerts"
              />
            )}
            {/* Analytics: Only for admins and caregivers (NOT members) */}
            {showAnalytics && (
              <NavItem
                href="/dashboard/analytics"
                icon={BarChart3}
                label="Analytics"
              />
            )}
          </div>

          {/* Care Tools Section - Agency Caregivers only */}
          {showCareTools && (
            <>
              <GraySectionLabel>Care Tools</GraySectionLabel>
              <div className="space-y-1">
                <NavItem
                  href="/dashboard/shift-handoff"
                  icon={Clock}
                  label="Shift Handoff"
                />
                <NavItem
                  href="/dashboard/timesheet"
                  icon={FileCheck}
                  label="Timesheet"
                />
                <NavItem
                  href="/dashboard/documents"
                  icon={FolderOpen}
                  label="Documents"
                />
                <NavItem
                  href="/dashboard/family-updates"
                  icon={Bell}
                  label="Family Updates"
                />
              </div>
            </>
          )}

          {/* Personal Section - Only for admins and caregivers (NOT members) */}
          {showMyNotes && (
            <>
              <GraySectionLabel>Personal</GraySectionLabel>
              <div className="space-y-1">
                <NavItem
                  href="/dashboard/notes"
                  icon={FileText}
                  label="My Notes"
                />
              </div>
            </>
          )}

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
                {/* Agency Management: Only for super admins */}
                {userIsSuperAdmin && (
                  <NavItem
                    href="/dashboard/agency"
                    icon={Building2}
                    label="Agency Management"
                  />
                )}
              </div>
            </>
          )}
        </nav>

        {/* Footer - Always at bottom */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-700 space-y-1">
          <NavItem href="/dashboard/settings" icon={Settings} label="Settings" />
          <NavItem href="/help" icon={HelpCircle} label="Help" />
        </div>
      </aside>
    </TooltipProvider>
  );
}
