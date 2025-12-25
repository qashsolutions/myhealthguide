'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useElder } from '@/contexts/ElderContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  Pill,
  Clock,
  Brain,
  FileText,
  Loader2,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

type TabType = 'all' | 'interactions' | 'conflicts' | 'incidents' | 'screening';

function SafetyAlertsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { selectedElder } = useElder();

  // Get active tab from URL or default to all
  const activeTab = (searchParams.get('tab') as TabType) || 'all';

  // Placeholder data - in a real app, this would come from your backend
  const [loading, setLoading] = useState(false);

  // Change tab
  const setActiveTab = (tab: TabType) => {
    router.push(`/dashboard/safety-alerts?tab=${tab}`, { scroll: false });
  };

  // Tab configuration
  const tabs: { id: TabType; label: string; icon: React.ElementType }[] = [
    { id: 'all', label: 'All Alerts', icon: AlertTriangle },
    { id: 'interactions', label: 'Drug Interactions', icon: Pill },
    { id: 'conflicts', label: 'Schedule Conflicts', icon: Clock },
    { id: 'incidents', label: 'Incidents', icon: FileText },
    { id: 'screening', label: 'Screening', icon: Brain },
  ];

  if (!selectedElder) {
    return (
      <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400">
          Please select an elder from the header to view safety alerts.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Safety Alerts
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Monitor drug interactions, schedule conflicts, incidents, and cognitive screening for {selectedElder.name}
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-1 -mb-px overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                  isActive
                    ? "border-blue-600 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-300"
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <>
          {(activeTab === 'all' || activeTab === 'interactions') && (
            <AlertSection
              title="Drug Interactions"
              icon={Pill}
              description="FDA drug label analysis for potential interactions"
              linkHref="/dashboard/drug-interactions"
              linkText="View Details"
              color="orange"
            />
          )}

          {(activeTab === 'all' || activeTab === 'conflicts') && (
            <AlertSection
              title="Schedule Conflicts"
              icon={Clock}
              description="Overlapping medication times and scheduling issues"
              linkHref="/dashboard/schedule-conflicts"
              linkText="View Details"
              color="yellow"
            />
          )}

          {(activeTab === 'all' || activeTab === 'incidents') && (
            <AlertSection
              title="Incident Reports"
              icon={FileText}
              description="Falls, injuries, medication errors, and other incidents"
              linkHref="/dashboard/incidents"
              linkText="View Reports"
              color="red"
            />
          )}

          {(activeTab === 'all' || activeTab === 'screening') && (
            <AlertSection
              title="Dementia Screening"
              icon={Brain}
              description="Cognitive assessments and behavioral pattern detection"
              linkHref="/dashboard/dementia-screening"
              linkText="View Screening"
              color="purple"
            />
          )}
        </>
      )}

      {/* Disclaimer */}
      <Card className="p-4 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
        <div className="flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800 dark:text-amber-200">
            <strong>Important:</strong> Safety alerts are automatically generated based on logged data and FDA information.
            Always consult with healthcare professionals for medical decisions.
          </div>
        </div>
      </Card>
    </div>
  );
}

// Alert Section Component
function AlertSection({
  title,
  icon: Icon,
  description,
  linkHref,
  linkText,
  color,
}: {
  title: string;
  icon: React.ElementType;
  description: string;
  linkHref: string;
  linkText: string;
  color: 'orange' | 'yellow' | 'red' | 'purple';
}) {
  const colorClasses = {
    orange: {
      bg: 'bg-orange-100 dark:bg-orange-900/30',
      icon: 'text-orange-600 dark:text-orange-400',
      badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
    },
    yellow: {
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      icon: 'text-yellow-600 dark:text-yellow-400',
      badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
    },
    red: {
      bg: 'bg-red-100 dark:bg-red-900/30',
      icon: 'text-red-600 dark:text-red-400',
      badge: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
    },
    purple: {
      bg: 'bg-purple-100 dark:bg-purple-900/30',
      icon: 'text-purple-600 dark:text-purple-400',
      badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
    },
  };

  const colors = colorClasses[color];

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", colors.bg)}>
            <Icon className={cn("w-6 h-6", colors.icon)} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
              <Badge className={cn("text-xs", colors.badge)}>
                <CheckCircle className="w-3 h-3 mr-1" />
                Monitored
              </Badge>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
          </div>
        </div>
        <Link href={linkHref}>
          <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
            {linkText}
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </Link>
      </div>
    </Card>
  );
}

export default function SafetyAlertsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    }>
      <SafetyAlertsContent />
    </Suspense>
  );
}
