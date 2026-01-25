'use client';

import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';
import {
  UserPlus,
  Pill,
  AlertTriangle,
  FileText,
  Calendar,
  CalendarX,
  Clock,
  Package,
  AlertOctagon,
  Bell,
  X,
  Hand,
  CalendarOff,
  LucideIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserNotification, NotificationType, NotificationPriority } from '@/lib/notifications/types';
import { Timestamp } from 'firebase/firestore';

const notificationIcons: Record<NotificationType, LucideIcon> = {
  pending_approval: UserPlus,
  medication_reminder: Pill,
  missed_dose: AlertTriangle,
  weekly_summary: FileText,
  shift_assigned: Calendar,
  shift_cancelled: CalendarX,
  shift_reminder: Clock,
  shift_swap_request: Bell, // DISABLED - kept for backwards compatibility (uses Bell as fallback)
  shift_offer: Hand,
  shift_unfilled: CalendarOff,
  refill_needed: Package,
  emergency_pattern: AlertOctagon
};

const priorityStyles: Record<NotificationPriority, { bg: string; icon: string }> = {
  low: { bg: 'bg-gray-50 dark:bg-gray-800', icon: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' },
  medium: { bg: 'bg-blue-50 dark:bg-blue-900/20', icon: 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400' },
  high: { bg: 'bg-yellow-50 dark:bg-yellow-900/20', icon: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/50 dark:text-yellow-400' },
  critical: { bg: 'bg-red-50 dark:bg-red-900/20', icon: 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400' }
};

interface NotificationItemProps {
  notification: UserNotification;
  onMarkRead: () => void;
  onDismiss: () => void;
  onAcceptShiftOffer?: (notificationId: string, shiftId: string) => Promise<void>;
  onDeclineShiftOffer?: (notificationId: string, shiftId: string) => Promise<void>;
  compact?: boolean;
}

export function NotificationItem({
  notification,
  onMarkRead,
  onDismiss,
  onAcceptShiftOffer,
  onDeclineShiftOffer,
  compact = false
}: NotificationItemProps) {
  const router = useRouter();
  const Icon = notificationIcons[notification.type] || Bell;
  const styles = priorityStyles[notification.priority];
  const [offerLoading, setOfferLoading] = useState(false);

  const handleClick = () => {
    if (!notification.read) {
      onMarkRead();
    }
    if (notification.actionUrl) {
      router.push(notification.actionUrl);
    }
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDismiss();
  };

  // Convert Firestore Timestamp to Date
  const createdAt = notification.createdAt instanceof Timestamp
    ? notification.createdAt.toDate()
    : new Date(notification.createdAt);

  return (
    <div
      className={`group relative p-3 border-b cursor-pointer transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 ${
        !notification.read ? styles.bg : 'bg-white dark:bg-gray-900'
      }`}
      onClick={handleClick}
    >
      <div className="flex gap-3">
        {/* Icon */}
        <div className={`flex-shrink-0 p-2 rounded-full ${styles.icon}`}>
          <Icon className="w-4 h-4" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm ${!notification.read ? 'font-semibold' : 'font-medium'} text-gray-900 dark:text-gray-100`}>
            {notification.title}
          </p>
          {!compact && (
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2">
              {notification.message}
            </p>
          )}
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {formatDistanceToNow(createdAt, { addSuffix: true })}
          </p>
        </div>

        {/* Unread indicator */}
        {!notification.read && (
          <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2" />
        )}

        {/* Dismiss button (shows on hover) */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={handleDismiss}
        >
          <X className="w-3 h-3" />
        </Button>
      </div>

      {/* Action required badge */}
      {notification.actionRequired && !notification.read && notification.type !== 'shift_offer' && (
        <div className="mt-2 ml-11">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300">
            Action Required
          </span>
        </div>
      )}

      {/* Accept/Decline buttons for shift offers */}
      {notification.type === 'shift_offer' && !notification.read && notification.data?.shiftId && (
        <div className="mt-2 ml-11 flex gap-2">
          <Button
            size="sm"
            disabled={offerLoading}
            onClick={async (e) => {
              e.stopPropagation();
              if (!onAcceptShiftOffer) return;
              setOfferLoading(true);
              try {
                await onAcceptShiftOffer(notification.id!, notification.data!.shiftId);
              } finally {
                setOfferLoading(false);
              }
            }}
          >
            {offerLoading ? 'Processing...' : 'Accept'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={offerLoading}
            onClick={async (e) => {
              e.stopPropagation();
              if (!onDeclineShiftOffer) return;
              setOfferLoading(true);
              try {
                await onDeclineShiftOffer(notification.id!, notification.data!.shiftId);
              } finally {
                setOfferLoading(false);
              }
            }}
          >
            Decline
          </Button>
        </div>
      )}
    </div>
  );
}
