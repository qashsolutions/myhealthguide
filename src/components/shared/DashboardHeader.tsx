'use client';

import { useState, useEffect } from 'react';
import { Bell, Moon, Sun, Menu, UserPlus, CheckCircle } from 'lucide-react';
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
import { ElderSelector } from '@/components/dashboard/ElderSelector';
import { UnifiedSearch } from '@/components/shared/UnifiedSearch';
import { GroupService } from '@/lib/firebase/groups';
import { PendingApproval } from '@/types';

interface DashboardHeaderProps {
  onMenuClick?: () => void;
}

export function DashboardHeader({ onMenuClick }: DashboardHeaderProps) {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const { signOut, user } = useAuth();
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [notificationCount, setNotificationCount] = useState(0);

  // Fetch pending approvals for admin users
  useEffect(() => {
    const fetchPendingApprovals = async () => {
      if (!user) return;

      // Check if user is admin of any group
      const isAdmin = user.groups?.some(g => g.role === 'admin');
      if (!isAdmin) return;

      const groupId = user.groups?.find(g => g.role === 'admin')?.groupId;
      if (!groupId) return;

      try {
        const approvals = await GroupService.getPendingApprovals(groupId);
        setPendingApprovals(approvals);
        setNotificationCount(approvals.length);
      } catch (error) {
        console.error('Error fetching pending approvals:', error);
      }
    };

    fetchPendingApprovals();

    // Refresh every 30 seconds
    const interval = setInterval(fetchPendingApprovals, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const handleNotificationClick = (type: string) => {
    if (type === 'pending_approval') {
      router.push('/dashboard/settings?tab=group');
    }
  };

  // Get user initials for avatar
  const userInitials = user
    ? `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`
    : 'JD';

  return (
    <header className="h-16 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-between px-4 lg:px-6 gap-2 lg:gap-6">
      <div className="flex items-center gap-2 lg:gap-4">
        {/* Hamburger Menu - Mobile Only */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="w-6 h-6" />
        </Button>

        <h2 className="text-base lg:text-lg font-semibold text-gray-900 dark:text-white">
          Dashboard
        </h2>

        {/* Elder Selector - Hidden on small mobile */}
        <div className="hidden sm:block ml-2 lg:ml-4 border-l border-gray-300 dark:border-gray-700 pl-2 lg:pl-4">
          <ElderSelector />
        </div>
      </div>

      {/* Center spacer for desktop */}
      <div className="hidden md:block flex-1" />

      <div className="flex items-center gap-2 lg:gap-4">
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

        {/* Notifications - Hidden on small mobile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="hidden sm:flex relative">
              <Bell className="w-5 h-5" />
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-medium">
                  {notificationCount > 9 ? '9+' : notificationCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Notifications</span>
              {notificationCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {notificationCount} new
                </Badge>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            {notificationCount === 0 ? (
              <div className="py-6 text-center">
                <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No new notifications
                </p>
              </div>
            ) : (
              <>
                {/* Pending Approvals */}
                {pendingApprovals.length > 0 && (
                  <>
                    {pendingApprovals.slice(0, 3).map((approval) => (
                      <DropdownMenuItem
                        key={approval.id}
                        onClick={() => handleNotificationClick('pending_approval')}
                        className="cursor-pointer py-3"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
                            <UserPlus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              Join request from {approval.userName}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Waiting for approval
                            </p>
                          </div>
                        </div>
                      </DropdownMenuItem>
                    ))}
                    {pendingApprovals.length > 3 && (
                      <DropdownMenuItem
                        onClick={() => handleNotificationClick('pending_approval')}
                        className="cursor-pointer text-center text-sm text-blue-600 dark:text-blue-400"
                      >
                        View all {pendingApprovals.length} requests
                      </DropdownMenuItem>
                    )}
                  </>
                )}
              </>
            )}

            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => router.push('/dashboard/settings?tab=notifications')}
              className="cursor-pointer text-center text-sm text-gray-600 dark:text-gray-400"
            >
              Notification Settings
            </DropdownMenuItem>
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
