'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useElder } from '@/contexts/ElderContext';
import { useTabTracking } from '@/hooks/useFeatureTracking';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  BarChart3,
  TrendingUp,
  Pill,
  Apple,
  Sparkles,
  Loader2,
  AlertCircle,
  ChevronRight,
  Calendar,
  MessageSquareText,
} from 'lucide-react';
import { FeedbackDashboard } from '@/components/feedback/FeedbackDashboard';
import { cn } from '@/lib/utils';
import Link from 'next/link';

type TabType = 'overview' | 'adherence' | 'nutrition' | 'trends' | 'feedback';

function AnalyticsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { selectedElder, availableElders, isLoading: eldersLoading } = useElder();

  // Get active tab from URL or default to overview
  const activeTab = (searchParams.get('tab') as TabType) || 'overview';

  // Feature tracking with tab support
  useTabTracking('analytics', activeTab, {
    overview: 'analytics',
    adherence: 'analytics_adherence',
    nutrition: 'analytics_nutrition',
    trends: 'analytics_trends',
    feedback: 'analytics',
  });

  const [loading, setLoading] = useState(false);

  // Change tab
  const setActiveTab = (tab: TabType) => {
    router.push(`/dashboard/analytics?tab=${tab}`, { scroll: false });
  };

  // Tab configuration
  const tabs: { id: TabType; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'adherence', label: 'Medication Adherence', icon: Pill },
    { id: 'nutrition', label: 'Nutrition', icon: Apple },
    { id: 'trends', label: 'Health Trends', icon: TrendingUp },
    { id: 'feedback', label: 'Smart Feedback', icon: MessageSquareText },
  ];

  // Show loading state while elders are being fetched
  if (eldersLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Show appropriate message based on elder availability
  if (!selectedElder) {
    const hasNoElders = availableElders.length === 0;
    const isCaregiverRole = user?.agencies?.[0]?.role === 'caregiver' || user?.agencies?.[0]?.role === 'caregiver_admin';

    return (
      <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        {hasNoElders && isCaregiverRole ? (
          <>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No Loved Ones Assigned Yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
              Your agency administrator will assign loved ones to you. Once assigned, you&apos;ll be able to view their analytics here.
            </p>
          </>
        ) : hasNoElders ? (
          <>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No Loved Ones Found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
              Add a loved one to your care group to start tracking their health analytics.
            </p>
          </>
        ) : (
          <p className="text-gray-600 dark:text-gray-400">
            Please select a loved one from the header to view analytics.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Analytics
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Health trends and compliance analytics for {selectedElder.name}
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
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnalyticsCard
                  title="Medication Adherence"
                  description="Track medication compliance and identify at-risk patterns"
                  icon={Pill}
                  linkHref="/dashboard/medication-adherence"
                  color="blue"
                />
                <AnalyticsCard
                  title="Nutrition Analysis"
                  description="Analyze eating patterns, meal frequency, and nutritional balance"
                  icon={Apple}
                  linkHref="/dashboard/nutrition-analysis"
                  color="green"
                />
                <AnalyticsCard
                  title="Health Trends"
                  description="View weekly summaries, compliance charts, and AI insights"
                  icon={TrendingUp}
                  linkHref="/dashboard/insights"
                  color="purple"
                />
              </div>

              {/* Smart Feedback Summary - Collapsible */}
              <FeedbackDashboard mode="user" defaultOpen={false} />
            </div>
          )}

          {activeTab === 'adherence' && (
            <div className="space-y-4">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                      <Pill className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">Medication Adherence</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">AI-powered adherence prediction</p>
                    </div>
                  </div>
                  <Link href="/dashboard/medication-adherence">
                    <Button>
                      View Full Analysis
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Track which medications might be missed, identify high-risk times, and get personalized
                  intervention suggestions based on historical patterns.
                </p>
              </Card>
            </div>
          )}

          {activeTab === 'nutrition' && (
            <div className="space-y-4">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                      <Apple className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">Nutrition Analysis</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Eating patterns and food variety</p>
                    </div>
                  </div>
                  <Link href="/dashboard/nutrition-analysis">
                    <Button>
                      View Full Analysis
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Analyze meal patterns, hydration tracking, food variety scores, and get recommendations
                  for improved nutrition.
                </p>
              </Card>
            </div>
          )}

          {activeTab === 'trends' && (
            <div className="space-y-4">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">Health Trends</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Weekly summaries and AI insights</p>
                    </div>
                  </div>
                  <Link href="/dashboard/insights">
                    <Button>
                      View Insights
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  View compliance pattern charts, weekly summaries with export options, and AI-generated
                  health insights based on logged data.
                </p>
              </Card>
            </div>
          )}

          {activeTab === 'feedback' && (
            <div className="space-y-4">
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
                    <MessageSquareText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Smart Feedback Dashboard</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Your feedback helps improve smart feature accuracy and relevance
                    </p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Track your feedback on smart features including Health Chat, Weekly Summaries, and Insights.
                  See how your input helps improve the system.
                </p>
              </Card>

              {/* Feedback Dashboard - Collapsible */}
              <FeedbackDashboard mode="user" defaultOpen={true} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Analytics Card Component
function AnalyticsCard({
  title,
  description,
  icon: Icon,
  linkHref,
  color,
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  linkHref: string;
  color: 'blue' | 'green' | 'purple';
}) {
  const colorClasses = {
    blue: {
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      icon: 'text-blue-600 dark:text-blue-400',
    },
    green: {
      bg: 'bg-green-100 dark:bg-green-900/30',
      icon: 'text-green-600 dark:text-green-400',
    },
    purple: {
      bg: 'bg-purple-100 dark:bg-purple-900/30',
      icon: 'text-purple-600 dark:text-purple-400',
    },
  };

  const colors = colorClasses[color] || colorClasses.blue; // Fallback to blue

  return (
    <Card className="p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4">
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", colors.bg)}>
          <Icon className={cn("w-6 h-6", colors.icon)} />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{title}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{description}</p>
          <Link href={linkHref}>
            <Button variant="outline" size="sm">
              View Details
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    }>
      <AnalyticsContent />
    </Suspense>
  );
}
