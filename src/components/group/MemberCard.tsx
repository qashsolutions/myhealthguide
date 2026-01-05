'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { GroupMember } from '@/types';
import { MoreVertical, Trash2, Crown, Stethoscope, Eye, Shield, User } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format, isValid } from 'date-fns';

/**
 * Safely format a date, handling Firestore Timestamps and invalid dates
 */
function safeFormatDate(date: any, formatStr: string, fallback: string = 'Unknown'): string {
  try {
    if (!date) return fallback;

    // Handle Firestore Timestamp
    let dateObj: Date;
    if (typeof date === 'object' && 'seconds' in date) {
      dateObj = new Date(date.seconds * 1000);
    } else if (date instanceof Date) {
      dateObj = date;
    } else if (typeof date === 'string' || typeof date === 'number') {
      dateObj = new Date(date);
    } else if (typeof date.toDate === 'function') {
      dateObj = date.toDate();
    } else {
      return fallback;
    }

    if (!isValid(dateObj)) return fallback;
    return format(dateObj, formatStr);
  } catch {
    return fallback;
  }
}

interface MemberCardProps {
  member: GroupMember & {
    name: string;
    email: string;
    profileImage?: string;
    isCaregiver?: boolean;
    assignedElderCount?: number;
  };
  isCurrentUser: boolean;
  isGroupAdmin: boolean;
  canManageMembers: boolean;
  onUpdateRole?: (userId: string, newRole: 'admin' | 'member') => void;
  onRemove?: (userId: string) => void;
  onTransferOwnership?: (userId: string) => void;
}

export function MemberCard({
  member,
  isCurrentUser,
  isGroupAdmin,
  canManageMembers,
  onUpdateRole,
  onRemove,
  onTransferOwnership
}: MemberCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleRemove = () => {
    if (confirm(`Are you sure you want to remove ${member.name} from the group?`)) {
      onRemove?.(member.userId);
    }
  };

  const handleTransferOwnership = () => {
    if (confirm(`Are you sure you want to transfer group ownership to ${member.name}? You will become a regular member.`)) {
      onTransferOwnership?.(member.userId);
    }
  };

  const handleRoleChange = () => {
    const newRole = member.role === 'admin' ? 'member' : 'admin';
    onUpdateRole?.(member.userId, newRole);
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <Avatar className="h-12 w-12">
            <AvatarImage src={member.profileImage} alt={member.name} />
            <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
          </Avatar>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                {member.name}
              </h3>
              {isCurrentUser && (
                <Badge variant="outline" className="text-xs">You</Badge>
              )}
            </div>

            <p className="text-sm text-gray-500 dark:text-gray-400 truncate mb-2">
              {member.email}
            </p>

            <div className="flex items-center gap-2">
              {member.role === 'admin' ? (
                <Badge className="bg-purple-600">
                  <Crown className="w-3 h-3 mr-1" />
                  Owner
                </Badge>
              ) : member.isCaregiver ? (
                <Badge className="bg-blue-600">
                  <Stethoscope className="w-3 h-3 mr-1" />
                  Caregiver
                  {member.assignedElderCount ? (
                    <span className="ml-1 opacity-80">
                      ({member.assignedElderCount} elder{member.assignedElderCount > 1 ? 's' : ''})
                    </span>
                  ) : null}
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <Eye className="w-3 h-3 mr-1" />
                  Viewer
                </Badge>
              )}

              <span className="text-xs text-gray-400 dark:text-gray-500">
                Joined {safeFormatDate(member.addedAt, 'MMM d, yyyy')}
              </span>
            </div>
          </div>

          {/* Actions Menu */}
          {canManageMembers && !isCurrentUser && (
            <DropdownMenu open={showMenu} onOpenChange={setShowMenu}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {member.role !== 'admin' && onUpdateRole && (
                  <DropdownMenuItem onClick={handleRoleChange}>
                    <Shield className="w-4 h-4 mr-2" />
                    Make Admin
                  </DropdownMenuItem>
                )}

                {member.role === 'admin' && onUpdateRole && (
                  <DropdownMenuItem onClick={handleRoleChange}>
                    <User className="w-4 h-4 mr-2" />
                    Make Member
                  </DropdownMenuItem>
                )}

                {isGroupAdmin && onTransferOwnership && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleTransferOwnership}>
                      <Crown className="w-4 h-4 mr-2" />
                      Transfer Ownership
                    </DropdownMenuItem>
                  </>
                )}

                {onRemove && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleRemove}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remove from Group
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
