'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Home,
  BarChart3,
  MessageCircle,
  AlertTriangle,
  Calendar,
  Menu,
  Bell,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/lib/subscription';
import { isSuperAdmin } from '@/lib/utils/getUserRole';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import { NotificationItem } from '@/components/notifications/NotificationItem';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface IconRailProps {
  onMoreClick: () => void;
}

export function IconRail({ onMoreClick }: IconRailProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { isMultiAgency } = useSubscription();
  const userIsSuperAdmin = isSuperAdmin(user);
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    dismiss,
  } = useNotifications(user?.id);

  const isActive = (path: string) => {
    if (path === '/dashboard') return pathname === '/dashboard';
    return pathname === path || pathname.startsWith(path + '/');
  };

  const userInitials = user
    ? `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`
    : '';

  // Build nav items
  const navItems: { href: string; icon: React.ElementType; label: string; badge?: number }[] = [
    { href: '/dashboard', icon: Home, label: 'Home' },
  ];

  if (isMultiAgency) {
    navItems.push({ href: '/dashboard/shift-handoff', icon: Calendar, label: 'Schedule' });
  }

  navItems.push({ href: '/dashboard/analytics', icon: BarChart3, label: 'Reports' });
  navItems.push({ href: '/dashboard/ask-ai', icon: MessageCircle, label: 'Ask AI' });
  navItems.push({
    href: '/dashboard/safety-alerts',
    icon: AlertTriangle,
    label: 'Alerts',
    badge: unreadCount > 0 ? unreadCount : undefined,
  });

  return (
    <TooltipProvider delayDuration={200}>
      <aside
        className="hidden lg:flex fixed left-0 top-0 bottom-0 z-40 w-14 flex-col items-center bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 py-4"
        aria-label="Navigation rail"
      >
        {/* Nav Items */}
        <nav className="flex-1 flex flex-col items-center gap-2">
          {navItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;

            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      'relative flex items-center justify-center w-8 h-8 rounded-lg transition-colors',
                      active
                        ? 'bg-blue-50 dark:bg-blue-900/40'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                    )}
                    aria-label={item.label}
                    aria-current={active ? 'page' : undefined}
                  >
                    <Icon
                      className={cn(
                        'w-5 h-5',
                        active
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-gray-500 dark:text-gray-400'
                      )}
                    />
                    {item.badge && (
                      <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-[9px] font-semibold text-white">
                        {item.badge > 9 ? '9+' : item.badge}
                      </span>
                    )}
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-sm">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

        {/* Divider */}
        <div className="w-6 h-px bg-gray-200 dark:bg-gray-700 my-2" />

        {/* More */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onMoreClick}
              className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors mb-2"
              aria-label="More options"
            >
              <Menu className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-sm">
            More
          </TooltipContent>
        </Tooltip>

        {/* Notifications Bell */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="relative flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors mb-2"
              aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
            >
              <Bell className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-[9px] font-semibold text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="end" className="w-80 p-0">
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
                <p className="text-sm text-gray-500 dark:text-gray-400">No notifications</p>
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

        {/* Avatar - entry point for Profile/Settings/Sign Out */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center justify-center rounded-full hover:ring-2 hover:ring-blue-200 dark:hover:ring-blue-800 transition-all"
              aria-label="User menu"
            >
              <Avatar className="w-7 h-7">
                <AvatarImage src={user?.profileImage} alt="Profile" />
                <AvatarFallback className="text-[10px] font-semibold bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="end" className="w-40">
            <DropdownMenuItem onClick={() => router.push('/dashboard/settings')}>
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/dashboard/settings')}>
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={async () => {
              try {
                await signOut();
                router.push('/login');
              } catch (error) {
                console.error('Sign out error:', error);
              }
            }}>
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </aside>
    </TooltipProvider>
  );
}
