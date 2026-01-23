'use client';

import { useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/lib/subscription';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NotificationItem } from '@/components/notifications/NotificationItem';
import { OfflineIndicator } from '@/components/pwa/OfflineIndicator';
import { PendingSyncIndicator } from '@/components/PendingSyncIndicator';

export function MinimalHeader() {
  const router = useRouter();
  const { user } = useAuth();
  const { isMultiAgency } = useSubscription();

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    dismiss,
  } = useNotifications(user?.id);

  // Get agency name if multi-agency
  const agencyName = isMultiAgency && user?.agencies?.[0]
    ? (user.agencies[0] as any).agencyName || null
    : null;

  return (
    <header className="sticky top-0 z-30 h-12 border-b border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm flex items-center justify-between px-4 lg:px-5">
      {/* Left: Logo + Agency Badge */}
      <div className="flex items-center gap-2">
        <span className="text-base tracking-tight">
          <span className="font-bold text-gray-900 dark:text-white">MyHealth</span><span className="font-light text-blue-600 dark:text-blue-400">Guide</span>
        </span>
        {agencyName && (
          <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            {agencyName}
          </span>
        )}
      </div>

      {/* Right: Status indicators + Bell */}
      <div className="flex items-center gap-2">
        <PendingSyncIndicator />
        <OfflineIndicator />

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative h-8 w-8"
              aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
            >
              <Bell className="w-[18px] h-[18px] text-gray-500 dark:text-gray-400" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center h-4 w-4 rounded-full bg-red-500 text-[9px] font-semibold text-white">
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
              <div className="py-6 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No notifications
                </p>
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                {notifications.slice(0, 8).map((notification) => (
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

      </div>
    </header>
  );
}
