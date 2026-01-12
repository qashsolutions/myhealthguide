'use client';

import { useState, useEffect } from 'react';
import { Bell, Moon, Sun, Menu, CheckCircle, HelpCircle, UsersRound } from 'lucide-react';
import { ClipboardHeartIcon } from '@/components/icons/ClipboardHeartIcon';
import { OfflineIndicator } from '@/components/pwa/OfflineIndicator';
import { PendingSyncIndicator } from '@/components/PendingSyncIndicator';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ElderDropdown } from '@/components/dashboard/ElderDropdown';
import { UnifiedSearch } from '@/components/shared/UnifiedSearch';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationItem } from '@/components/notifications/NotificationItem';
import { AccessibilitySettingsButton } from '@/components/accessibility/AccessibilitySettingsButton';

interface DashboardHeaderProps {
  onMenuClick?: () => void;
}

export function DashboardHeader({ onMenuClick }: DashboardHeaderProps) {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const { signOut, user } = useAuth();

  // Use unified notifications hook
  const {
    notifications,
    unreadCount,
    loading: notificationsLoading,
    markAsRead,
    markAllAsRead,
    dismiss
  } = useNotifications(user?.id);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  // Get user initials for avatar
  const userInitials = user
    ? `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`
    : 'JD';

  return (
    <header data-header className="sticky top-0 z-30 h-16 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-between px-4 lg:px-6 gap-2 lg:gap-6">
      <div className="flex items-center gap-3 lg:gap-4">
        {/* Hamburger Menu - Mobile Only */}
        <button
          type="button"
          onClick={() => {
            console.log('[DashboardHeader] Hamburger clicked, onMenuClick exists:', !!onMenuClick);
            if (onMenuClick) {
              onMenuClick();
            }
          }}
          className="lg:hidden flex items-center justify-center w-11 h-11 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 touch-manipulation"
          aria-label="Open menu"
        >
          <Menu className="w-6 h-6" />
        </button>

        {/* Logo - Hidden on mobile (shown in sidebar) */}
        <div className="hidden lg:flex items-center">
          <span className="text-xl tracking-tight text-slate-900 dark:text-slate-100">
            <span className="font-bold">MyHealth</span>
            <span className="font-light text-blue-600 dark:text-blue-400">Guide</span>
          </span>
        </div>

        {/* Divider - Hidden on mobile */}
        <div className="hidden lg:block h-8 w-px bg-gray-200 dark:bg-gray-700" />

        {/* Elder Dropdown */}
        <ElderDropdown className="hidden sm:flex" />
      </div>

      {/* Center spacer for desktop */}
      <div className="hidden md:block flex-1" />

      <div className="flex items-center gap-2 lg:gap-4">
        {/* Offline/Sync Indicators */}
        <PendingSyncIndicator />
        <OfflineIndicator />

        {/* Unified Search - Always visible */}
        <UnifiedSearch />
        {/* Theme Toggle - Hidden on small mobile */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="hidden sm:flex"
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5" />
          ) : (
            <Moon className="w-5 h-5" />
          )}
        </Button>

        {/* Accessibility Settings - Hidden on small mobile */}
        <div className="hidden sm:flex">
          <AccessibilitySettingsButton />
        </div>

        {/* Symptom Checker - Hidden on small mobile */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/dashboard/symptom-checker')}
          className="hidden sm:flex"
          title="Symptom Checker"
        >
          <ClipboardHeartIcon size={20} />
        </Button>

        {/* Care Community - Hidden on small mobile */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/tips')}
          className="hidden sm:flex"
          title="Care Community"
        >
          <UsersRound className="w-5 h-5" />
        </Button>

        {/* Help - Hidden on small mobile */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/help')}
          className="hidden sm:flex"
          title="Help Center"
        >
          <HelpCircle className="w-5 h-5" />
        </Button>

        {/* Notifications - Hidden on small mobile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="hidden sm:flex relative">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-medium">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-0">
            <div className="flex items-center justify-between p-3 border-b">
              <span className="font-semibold text-sm">Notifications</span>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 text-blue-600 hover:text-blue-700"
                  onClick={(e) => {
                    e.preventDefault();
                    markAllAsRead();
                  }}
                >
                  Mark all read
                </Button>
              )}
            </div>

            {notifications.length === 0 ? (
              <div className="py-8 text-center">
                <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  All caught up!
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  No new notifications
                </p>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                {notifications.slice(0, 10).map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkRead={() => notification.id && markAsRead(notification.id)}
                    onDismiss={() => notification.id && dismiss(notification.id)}
                    compact
                  />
                ))}
              </div>
            )}

            <div className="border-t p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-gray-600 dark:text-gray-400"
                onClick={() => router.push('/dashboard/settings?tab=notifications')}
              >
                Notification Settings
              </Button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full" aria-label="User menu">
              <Avatar>
                <AvatarImage src={user?.profileImage} alt={`${user?.firstName || 'User'}'s profile photo`} />
                <AvatarFallback>{userInitials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => router.push('/dashboard/settings')}>
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
