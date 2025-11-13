'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Pill,
  Apple,
  Utensils,
  Users,
  Settings as SettingsIcon,
  Calendar,
  Clock,
  Filter
} from 'lucide-react';
import { format } from 'date-fns';

// Mock activity data - will be replaced with Firebase
const mockActivities = [
  {
    id: '1',
    timestamp: new Date(),
    userId: 'user1',
    userName: 'John Doe',
    action: 'Logged medication dose',
    entityType: 'medication',
    entityName: 'Lisinopril 10mg',
    elderName: 'Mary Smith',
    details: { status: 'taken', method: 'manual' }
  },
  {
    id: '2',
    timestamp: new Date(Date.now() - 3600000),
    userId: 'user1',
    userName: 'John Doe',
    action: 'Added new medication',
    entityType: 'medication',
    entityName: 'Metformin 500mg',
    elderName: 'Mary Smith',
    details: {}
  },
  {
    id: '3',
    timestamp: new Date(Date.now() - 7200000),
    userId: 'user2',
    userName: 'Jane Doe',
    action: 'Logged meal',
    entityType: 'diet',
    entityName: 'Breakfast',
    elderName: 'Mary Smith',
    details: { items: ['Oatmeal', 'Orange juice', 'Toast'] }
  }
];

export default function ActivityPage() {
  const [filter, setFilter] = useState('all');
  const [activities] = useState(mockActivities);

  const getIcon = (type: string) => {
    switch (type) {
      case 'medication':
        return <Pill className="w-4 h-4" />;
      case 'supplement':
        return <Apple className="w-4 h-4" />;
      case 'diet':
        return <Utensils className="w-4 h-4" />;
      case 'user':
        return <Users className="w-4 h-4" />;
      default:
        return <SettingsIcon className="w-4 h-4" />;
    }
  };

  const getActionColor = (type: string) => {
    switch (type) {
      case 'medication':
        return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20';
      case 'supplement':
        return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
      case 'diet':
        return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20';
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800';
    }
  };

  const filteredActivities = filter === 'all'
    ? activities
    : activities.filter(a => a.entityType === filter);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Activity Log
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Track all actions and changes in your caregiving
          </p>
        </div>
        <Button variant="outline">
          <Calendar className="w-4 h-4 mr-2" />
          Export to CSV
        </Button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-gray-500" />
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter activities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Activities</SelectItem>
            <SelectItem value="medication">Medications</SelectItem>
            <SelectItem value="supplement">Supplements</SelectItem>
            <SelectItem value="diet">Diet Entries</SelectItem>
            <SelectItem value="user">User Actions</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Activity Timeline */}
      <div className="space-y-4">
        {filteredActivities.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-600 dark:text-gray-400">
                No activities found
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredActivities.map((activity) => (
            <Card key={activity.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`rounded-lg p-2 ${getActionColor(activity.entityType)}`}>
                    {getIcon(activity.entityType)}
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {activity.action}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          <span className="font-medium">{activity.entityName}</span>
                          {activity.elderName && (
                            <span> for {activity.elderName}</span>
                          )}
                        </p>
                        {activity.details.items && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {activity.details.items.map((item: string, idx: number) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {item}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                          <Clock className="w-3 h-3" />
                          <span>{format(activity.timestamp, 'h:mm a')}</span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {format(activity.timestamp, 'MMM dd, yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        by {activity.userName}
                      </span>
                      {activity.details.method && (
                        <Badge variant="outline" className="text-xs capitalize">
                          {activity.details.method}
                        </Badge>
                      )}
                      {activity.details.status && (
                        <Badge
                          variant={activity.details.status === 'taken' ? 'default' : 'secondary'}
                          className="text-xs capitalize"
                        >
                          {activity.details.status}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Load More */}
      {filteredActivities.length > 0 && (
        <div className="flex justify-center pt-4">
          <Button variant="outline">
            Load More Activities
          </Button>
        </div>
      )}
    </div>
  );
}
