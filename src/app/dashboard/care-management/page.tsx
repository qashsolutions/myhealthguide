'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/lib/subscription';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Clock,
  FileText,
  FolderOpen,
  Mail,
  Users,
  Bell,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function CareManagementPage() {
  const { user } = useAuth();
  const { isMultiAgency } = useSubscription();

  // Check if user has agency access
  if (!isMultiAgency) {
    return (
      <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Agency Feature
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Care management features are available on the Multi-Agency plan.
        </p>
        <Link href="/pricing">
          <Button>View Plans</Button>
        </Link>
      </div>
    );
  }

  const features = [
    {
      title: 'Shift Handoff',
      description: 'Share notes between caregivers at shift change',
      icon: Clock,
      href: '/dashboard/shift-handoff',
      color: 'blue',
    },
    {
      title: 'Timesheet',
      description: 'Track caregiver hours worked',
      icon: FileText,
      href: '/dashboard/timesheet',
      color: 'green',
    },
    {
      title: 'Documents',
      description: 'Store and manage medical records',
      icon: FolderOpen,
      href: '/dashboard/documents',
      color: 'purple',
    },
    {
      title: 'Family Updates',
      description: 'Send updates to family members',
      icon: Mail,
      href: '/dashboard/family-updates',
      color: 'orange',
    },
    {
      title: 'Caregiver Burnout',
      description: 'Monitor caregiver stress levels',
      icon: Users,
      href: '/dashboard/caregiver-burnout',
      color: 'red',
    },
    {
      title: 'Alerts',
      description: 'View all notifications and alerts',
      icon: Bell,
      href: '/dashboard/alerts',
      color: 'yellow',
    },
  ];

  const colorClasses: Record<string, { bg: string; icon: string }> = {
    blue: { bg: 'bg-blue-100 dark:bg-blue-900/30', icon: 'text-blue-600 dark:text-blue-400' },
    green: { bg: 'bg-green-100 dark:bg-green-900/30', icon: 'text-green-600 dark:text-green-400' },
    purple: { bg: 'bg-purple-100 dark:bg-purple-900/30', icon: 'text-purple-600 dark:text-purple-400' },
    orange: { bg: 'bg-orange-100 dark:bg-orange-900/30', icon: 'text-orange-600 dark:text-orange-400' },
    red: { bg: 'bg-red-100 dark:bg-red-900/30', icon: 'text-red-600 dark:text-red-400' },
    yellow: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', icon: 'text-yellow-600 dark:text-yellow-400' },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Care Management
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Manage shifts, documents, and communication for your care team
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {features.map((feature) => {
          const Icon = feature.icon;
          const colors = colorClasses[feature.color];

          return (
            <Card key={feature.href} className="p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", colors.bg)}>
                  <Icon className={cn("w-6 h-6", colors.icon)} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {feature.description}
                  </p>
                  <Link href={feature.href}>
                    <Button variant="outline" size="sm">
                      Open
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
