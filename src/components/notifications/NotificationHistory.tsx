'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { NotificationService, NotificationLog } from '@/lib/firebase/notifications';
import { Clock, MessageSquare, CheckCircle, XCircle, Bell, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface NotificationHistoryProps {
  groupId: string;
}

export function NotificationHistory({ groupId }: NotificationHistoryProps) {
  const [notifications, setNotifications] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'sent' | 'failed'>('all');

  useEffect(() => {
    loadNotifications();
  }, [groupId]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const logs = await NotificationService.getNotificationLogs(groupId);
      setNotifications(logs);
    } catch (error) {
      console.error('Error loading notification history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeLabel = (type: NotificationLog['type']): string => {
    const labels: Record<NotificationLog['type'], string> = {
      medication_reminder: 'Medication Reminder',
      medication_missed: 'Missed Dose Alert',
      supplement_reminder: 'Supplement Reminder',
      daily_summary: 'Daily Summary',
      weekly_summary: 'Weekly Summary',
      compliance_alert: 'Compliance Alert'
    };
    return labels[type];
  };

  const getTypeColor = (type: NotificationLog['type']): string => {
    const colors: Record<NotificationLog['type'], string> = {
      medication_reminder: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      medication_missed: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
      supplement_reminder: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      daily_summary: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
      weekly_summary: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400',
      compliance_alert: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
    };
    return colors[type];
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'all') return true;
    return n.status === filter;
  });

  if (loading) {
    return <div className="text-center py-8">Loading notification history...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notification History
          </CardTitle>
          <CardDescription>
            View all SMS notifications sent to your group
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filter Buttons */}
          <div className="flex gap-2">
            {[
              { value: 'all', label: 'All' },
              { value: 'sent', label: 'Sent' },
              { value: 'failed', label: 'Failed' }
            ].map(option => (
              <button
                key={option.value}
                onClick={() => setFilter(option.value as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === option.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">
              {filter === 'all'
                ? 'No notifications sent yet'
                : `No ${filter} notifications`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map(notification => (
            <Card key={notification.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`p-2 rounded-lg ${
                    notification.status === 'sent'
                      ? 'bg-green-100 dark:bg-green-900/20'
                      : 'bg-red-100 dark:bg-red-900/20'
                  }`}>
                    {notification.status === 'sent' ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={getTypeColor(notification.type)}>
                            {getTypeLabel(notification.type)}
                          </Badge>
                          <Badge variant={notification.status === 'sent' ? 'default' : 'destructive'}>
                            {notification.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                          {notification.message}
                        </p>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        <span>{notification.recipient}</span>
                      </div>
                      {notification.sentAt && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{format(notification.sentAt, 'MMM dd, yyyy • h:mm a')}</span>
                        </div>
                      )}
                      {notification.messageId && (
                        <div className="flex items-center gap-1">
                          <span className="text-gray-400">ID: {notification.messageId.slice(0, 8)}</span>
                        </div>
                      )}
                    </div>

                    {/* Error */}
                    {notification.error && (
                      <div className="mt-2 p-2 rounded bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                        <p className="text-xs text-red-800 dark:text-red-200">
                          <strong>Error:</strong> {notification.error}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Stats */}
      {notifications.length > 0 && (
        <Card className="bg-gray-50 dark:bg-gray-800">
          <CardContent className="pt-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {notifications.length}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Total</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {notifications.filter(n => n.status === 'sent').length}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Sent</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {notifications.filter(n => n.status === 'failed').length}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Failed</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
