/**
 * useNotifications Hook
 * Real-time notification subscription for the bell icon
 *
 * Usage:
 * const { notifications, unreadCount, loading, markAsRead, markAllAsRead, dismiss } = useNotifications(userId);
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  subscribeToNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  dismissNotification
} from '@/lib/notifications/userNotifications';
import { authenticatedFetch } from '@/lib/api/authenticatedFetch';
import { UserNotification } from '@/lib/notifications/types';

interface UseNotificationsReturn {
  notifications: UserNotification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  dismiss: (notificationId: string) => Promise<void>;
  acceptShiftOffer: (notificationId: string, shiftId: string) => Promise<void>;
  declineShiftOffer: (notificationId: string, shiftId: string, reason?: string) => Promise<void>;
  refresh: () => void;
}

export function useNotifications(userId: string | undefined): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = subscribeToNotifications(userId, (notifs) => {
      setNotifications(notifs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId, refreshKey]);

  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.read).length;

  // Mark single notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);
      // Update local state immediately for responsiveness
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
    } catch (err) {
      console.error('Error marking notification as read:', err);
      setError('Failed to mark notification as read');
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!userId) return;

    try {
      await markAllNotificationsAsRead(userId);
      // Update local state immediately
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      setError('Failed to mark all notifications as read');
    }
  }, [userId]);

  // Dismiss notification
  const dismiss = useCallback(async (notificationId: string) => {
    try {
      await dismissNotification(notificationId);
      // Update local state immediately
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (err) {
      console.error('Error dismissing notification:', err);
      setError('Failed to dismiss notification');
    }
  }, []);

  // Accept a shift offer
  const acceptShiftOffer = useCallback(async (notificationId: string, shiftId: string) => {
    try {
      const response = await authenticatedFetch('/api/shift-offer/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shiftId })
      });

      const data = await response.json();
      if (!response.ok) {
        // If the offer has moved on, mark notification as read to hide buttons
        if (data.error?.includes('not the current offer recipient') ||
            data.error?.includes('no longer in offered status')) {
          await markNotificationAsRead(notificationId);
          setNotifications(prev =>
            prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
          );
        }
        throw new Error(data.error || 'Failed to accept shift offer');
      }

      // Mark notification as read
      await markNotificationAsRead(notificationId);
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
    } catch (err: any) {
      console.error('Error accepting shift offer:', err);
      setError(err.message || 'Failed to accept shift offer');
      throw err;
    }
  }, []);

  // Decline a shift offer
  const declineShiftOffer = useCallback(async (notificationId: string, shiftId: string, reason?: string) => {
    try {
      const response = await authenticatedFetch('/api/shift-offer/decline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shiftId, reason })
      });

      const data = await response.json();
      if (!response.ok) {
        // If the offer has moved on, mark notification as read to hide buttons
        if (data.error?.includes('not the current offer recipient') ||
            data.error?.includes('no longer in offered status')) {
          await markNotificationAsRead(notificationId);
          setNotifications(prev =>
            prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
          );
        }
        throw new Error(data.error || 'Failed to decline shift offer');
      }

      // Mark notification as read
      await markNotificationAsRead(notificationId);
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
    } catch (err: any) {
      console.error('Error declining shift offer:', err);
      setError(err.message || 'Failed to decline shift offer');
      throw err;
    }
  }, []);

  // Manual refresh
  const refresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    dismiss,
    acceptShiftOffer,
    declineShiftOffer,
    refresh
  };
}
