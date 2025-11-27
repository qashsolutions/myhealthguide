'use client';

import { Bell, Moon, Sun, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ElderSelector } from '@/components/dashboard/ElderSelector';
import { UnifiedSearch } from '@/components/shared/UnifiedSearch';

interface DashboardHeaderProps {
  onMenuClick?: () => void;
}

export function DashboardHeader({ onMenuClick }: DashboardHeaderProps) {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const { signOut, user } = useAuth();

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
        <Button variant="ghost" size="icon" className="hidden sm:flex">
          <Bell className="w-5 h-5" />
        </Button>

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
