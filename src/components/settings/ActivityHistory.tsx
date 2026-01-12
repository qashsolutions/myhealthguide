'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Activity, Calendar, Monitor, MapPin, Chrome, Download } from 'lucide-react';
import { getUserActivity, ActivityLog } from '@/lib/firebase/activity';
import { format } from 'date-fns';

interface ActivityHistoryProps {
  userId: string;
}

export function ActivityHistory({ userId }: ActivityHistoryProps) {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  // Initialize end date to today
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState(today);

  useEffect(() => {
    // Load activities without date filter to get all recent activity
    loadActivities(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const loadActivities = async (skipDateFilter = false) => {
    try {
      setLoading(true);
      // If skipDateFilter is true (initial load), don't use date filters
      // This allows us to see all activity regardless of dates
      const start = !skipDateFilter && startDate ? new Date(startDate) : undefined;

      // For end date, set to end of day (23:59:59.999) to include all activities on that day
      let end: Date | undefined;
      if (!skipDateFilter && endDate) {
        end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
      }

      const logs = await getUserActivity(userId, start, end, 50);
      setActivities(logs);
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => {
    loadActivities(false);
  };

  const handleExport = () => {
    // Export to CSV
    const headers = ['Date', 'Action', 'Page', 'Device', 'Browser', 'Location'];
    const rows = activities.map(log => [
      format(log.timestamp, 'yyyy-MM-dd HH:mm:ss'),
      log.action,
      log.page,
      log.deviceType,
      `${log.browser} ${log.browserVersion || ''}`,
      `${log.city || ''}, ${log.state || ''}, ${log.country || ''}`.trim()
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-history-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'mobile':
        return '📱';
      case 'tablet':
        return '📱';
      case 'desktop':
        return '💻';
      default:
        return '🖥️';
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="bg-gray-50 dark:bg-gray-800/50">
        <CardHeader>
          <CardTitle className="text-lg">Filter Activity</CardTitle>
          <CardDescription>Select a date range to filter your activity history</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={handleFilter} className="flex-1">
                <Calendar className="w-4 h-4 mr-2" />
                Filter
              </Button>
              <Button onClick={handleExport} variant="outline">
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Activity History
          </CardTitle>
          <CardDescription>
            View your login history and activity across devices
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading activity...</div>
          ) : activities.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="mb-2">No activity found{startDate || endDate ? ' for the selected period' : ''}</p>
              <p className="text-xs">Activity tracking captures login events, page visits, and security-related actions.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activities.map((log, index) => (
                <div
                  key={log.id || index}
                  className={`p-4 rounded-lg border ${
                    index % 2 === 0
                      ? 'bg-white dark:bg-gray-900'
                      : 'bg-gray-50 dark:bg-gray-800/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      {/* Action and Time */}
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{getDeviceIcon(log.deviceType)}</span>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {log.action}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {format(log.timestamp, 'MMM dd, yyyy • hh:mm a')}
                          </p>
                        </div>
                      </div>

                      {/* Details Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 ml-11">
                        {/* Page */}
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-400">📄</span>
                          <span className="text-gray-700 dark:text-gray-300">{log.page}</span>
                        </div>

                        {/* Device */}
                        <div className="flex items-center gap-2 text-sm">
                          <Monitor className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-700 dark:text-gray-300">
                            {log.deviceType} • {log.os}
                          </span>
                        </div>

                        {/* Browser */}
                        <div className="flex items-center gap-2 text-sm">
                          <Chrome className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-700 dark:text-gray-300">
                            {log.browser} {log.browserVersion}
                          </span>
                        </div>

                        {/* Location */}
                        {(log.city || log.state) && (
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-700 dark:text-gray-300">
                              {[log.city, log.state, log.country].filter(Boolean).join(', ')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Privacy Notice */}
      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-6">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            <strong>Privacy:</strong> Your IP address is stored as a one-way hash for security purposes.
            We only track approximate location (city/state) and device information to help you monitor
            account activity. You can export or delete this data anytime.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
