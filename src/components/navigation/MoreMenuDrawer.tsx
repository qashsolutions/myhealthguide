'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Heart,
  Clipboard,
  MessageSquare,
  AlertTriangle,
  BarChart3,
  FileText,
  Settings,
  HelpCircle,
  LogOut,
  Building2,
  Users,
  Clock,
  FileCheck,
  FolderOpen,
  Bell,
  X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/lib/subscription';
import { useElder } from '@/contexts/ElderContext';
import {
  isSuperAdmin,
  isAgencyCaregiver,
  isReadOnlyUser,
} from '@/lib/utils/getUserRole';
import { cn } from '@/lib/utils';

interface MoreMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MoreMenuDrawer({ isOpen, onClose }: MoreMenuDrawerProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { isMultiAgency } = useSubscription();
  const { selectedElder } = useElder();

  const userIsSuperAdmin = isSuperAdmin(user);
  const userIsAgencyCaregiver = isAgencyCaregiver(user);
  const userIsReadOnly = isReadOnlyUser(user);

  // Close on route change
  useEffect(() => {
    if (isOpen) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const isActive = (path: string) => {
    if (path === '/dashboard') return pathname === '/dashboard';
    return pathname === path || pathname.startsWith(path + '/');
  };

  const MenuItem = ({
    href,
    icon: Icon,
    label,
    onClick,
  }: {
    href?: string;
    icon: React.ElementType;
    label: string;
    onClick?: () => void;
  }) => {
    const active = href ? isActive(href) : false;

    if (onClick) {
      return (
        <button
          onClick={onClick}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-left hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors min-h-[44px]"
        >
          <Icon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
        </button>
      );
    }

    return (
      <Link
        href={href!}
        className={cn(
          'flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors min-h-[44px]',
          active && 'bg-blue-50 dark:bg-blue-900/30'
        )}
      >
        <Icon
          className={cn(
            'w-5 h-5',
            active ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
          )}
        />
        <span
          className={cn(
            'text-sm',
            active
              ? 'text-blue-700 dark:text-blue-300 font-medium'
              : 'text-gray-700 dark:text-gray-300'
          )}
        >
          {label}
        </span>
      </Link>
    );
  };

  const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <div className="px-4 pt-4 pb-1">
      <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
        {children}
      </span>
    </div>
  );

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={cn(
          'fixed z-50 bg-white dark:bg-gray-900 overflow-y-auto',
          // Mobile: slide up from bottom
          'inset-x-0 bottom-0 max-h-[85vh] rounded-t-2xl',
          // Desktop: slide in from left (next to icon rail)
          'lg:inset-y-0 lg:left-14 lg:right-auto lg:w-72 lg:max-h-none lg:rounded-t-none lg:rounded-r-xl lg:border-r lg:border-gray-200 lg:dark:border-gray-700'
        )}
        role="dialog"
        aria-label="More menu"
      >
        {/* Handle bar (mobile) */}
        <div className="lg:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
        </div>

        {/* Close button (desktop) */}
        <div className="hidden lg:flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <span className="text-sm font-semibold text-gray-900 dark:text-white">Menu</span>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Close menu"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="px-2 py-2">
          {/* Care Section */}
          {selectedElder && (
            <>
              <SectionLabel>Care</SectionLabel>
              {!userIsReadOnly && (
                <MenuItem
                  href={`/dashboard/elder-profile?elderId=${selectedElder.id}`}
                  icon={Heart}
                  label="Health Profile"
                />
              )}
              <MenuItem href="/dashboard/daily-care" icon={Clipboard} label="Daily Care" />
            </>
          )}

          {/* DISABLED FOR AGENCY OWNERS: Entire Insights Section (Jan 26, 2026)

              Reason: All Insights features (AI Insights, Safety Alerts, Analytics) are
              elder-specific and not actionable for agency owners who:
              1. Manage 30+ elders across multiple caregivers
              2. Focus on business operations (scheduling, staffing, compliance)
              3. Don't need individual health conversations - that's the caregiver's job

              Who still has access:
              - Agency caregivers: Need insights for their assigned elders (max 3/day)
              - Family Plan A/B admins: Need insights for their loved ones

              NOTE: Members (all plans) do NOT have login access. They only receive
              automated daily health reports via email at 7 PM PST.

              To re-enable for agency owners:
              1. Remove the condition wrapping the Insights section below
              2. Consider building aggregated agency-wide summaries instead
              3. Update CLAUDE.md documentation
          */}
          {!(isMultiAgency && userIsSuperAdmin) && (
            <>
              <SectionLabel>Insights</SectionLabel>
              <MenuItem href="/dashboard/ask-ai" icon={MessageSquare} label="AI Insights" />
              <MenuItem href="/dashboard/safety-alerts" icon={AlertTriangle} label="Safety Alerts" />
              {!userIsReadOnly && (
                <MenuItem href="/dashboard/analytics" icon={BarChart3} label="Analytics" />
              )}
            </>
          )}

          {/* Care Tools (Agency Caregivers) */}
          {isMultiAgency && userIsAgencyCaregiver && (
            <>
              <SectionLabel>Care Tools</SectionLabel>
              <MenuItem href="/dashboard/shift-handoff" icon={Clock} label="Shift Handoff" />
              {/* REMOVED: Timesheet menu item for caregivers (Jan 26, 2026)
                  Reason: Timesheet management is overhead for small agencies not tracking billing.
                  Shift sessions already capture all work time (check-in/check-out).
                  Re-enable by uncommenting if payroll integration is added later.
              <MenuItem href="/dashboard/timesheet" icon={FileCheck} label="Timesheet" />
              */}
              <MenuItem href="/dashboard/documents" icon={FolderOpen} label="Documents" />
              <MenuItem href="/dashboard/family-updates" icon={Bell} label="Family Updates" />
            </>
          )}

          {/* Personal */}
          {!userIsReadOnly && (
            <>
              <SectionLabel>Personal</SectionLabel>
              <MenuItem href="/dashboard/notes" icon={FileText} label="My Notes" />
            </>
          )}

          {/* Agency */}
          {isMultiAgency && (
            <>
              <SectionLabel>Agency</SectionLabel>
              <MenuItem href="/dashboard/care-management" icon={Users} label="Care Management" />
              {userIsSuperAdmin && (
                <MenuItem href="/dashboard/agency" icon={Building2} label="Agency Management" />
              )}
            </>
          )}

          {/* System */}
          <SectionLabel>System</SectionLabel>
          <MenuItem href="/dashboard/settings" icon={Settings} label="Settings" />
          <MenuItem href="/help" icon={HelpCircle} label="Help" />
          <MenuItem icon={LogOut} label="Sign Out" onClick={handleSignOut} />
        </div>

        {/* Safe area padding for iOS */}
        <div className="h-8 lg:h-4" />
      </div>
    </>
  );
}
