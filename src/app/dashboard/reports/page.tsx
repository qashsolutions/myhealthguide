'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useElder } from '@/contexts/ElderContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Link from 'next/link';
import {
  FileText,
  TrendingUp,
  Apple,
  Sparkles,
  ArrowRight,
  AlertCircle,
  Download,
  Calendar,
  Pill,
  BarChart3
} from 'lucide-react';
import { EmailVerificationGate } from '@/components/auth/EmailVerificationGate';
import { TrialExpirationGate } from '@/components/auth/TrialExpirationGate';

// Report types with descriptions
const reportTypes = [
  {
    id: 'health-trends',
    title: 'Health Trends',
    description: 'See how medication and diet tracking is going over time. Includes weekly summaries, charts, and patterns.',
    longDescription: 'View daily summaries, weekly reports, compliance charts over 12 weeks, and get alerts about patterns in care.',
    icon: Sparkles,
    href: '/dashboard/insights',
    color: 'purple',
    features: ['Daily summary', 'Weekly reports', '12-week trend charts', 'Pattern detection'],
  },
  {
    id: 'medication-adherence',
    title: 'Medication Adherence',
    description: 'Find out which medications might be missed and when. Get suggestions to improve compliance.',
    longDescription: 'Analyzes past medication logs to predict which doses are at risk of being missed, and suggests reminders.',
    icon: TrendingUp,
    href: '/dashboard/medication-adherence',
    color: 'blue',
    features: ['Risk predictions', 'High-risk times', 'High-risk days', 'Intervention suggestions'],
  },
  {
    id: 'nutrition-analysis',
    title: 'Nutrition Analysis',
    description: 'Understand eating patterns, food variety, and meal regularity over the past week.',
    longDescription: 'Analyzes diet entries to show meal frequency, food groups consumed, hydration, and eating patterns.',
    icon: Apple,
    href: '/dashboard/nutrition-analysis',
    color: 'green',
    features: ['Nutrition score', 'Food variety', 'Hydration tracking', 'Meal patterns'],
  },
  {
    id: 'clinical-notes',
    title: 'Clinical Notes',
    description: 'Generate a summary report to share with doctors. Perfect for medical appointments.',
    longDescription: 'Creates a printable/downloadable PDF with medication compliance, health summary, and questions to ask the doctor.',
    icon: FileText,
    href: '/dashboard/clinical-notes',
    color: 'orange',
    features: ['PDF export', 'Doctor-ready format', 'Discussion points', 'Questions for provider'],
  },
];

const getColorClasses = (color: string) => {
  const colors: Record<string, { bg: string; border: string; text: string; icon: string }> = {
    purple: {
      bg: 'bg-purple-50 dark:bg-purple-900/20',
      border: 'border-purple-200 dark:border-purple-800 hover:border-purple-400 dark:hover:border-purple-600',
      text: 'text-purple-700 dark:text-purple-300',
      icon: 'text-purple-600 dark:text-purple-400',
    },
    blue: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800 hover:border-blue-400 dark:hover:border-blue-600',
      text: 'text-blue-700 dark:text-blue-300',
      icon: 'text-blue-600 dark:text-blue-400',
    },
    green: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-800 hover:border-green-400 dark:hover:border-green-600',
      text: 'text-green-700 dark:text-green-300',
      icon: 'text-green-600 dark:text-green-400',
    },
    orange: {
      bg: 'bg-orange-50 dark:bg-orange-900/20',
      border: 'border-orange-200 dark:border-orange-800 hover:border-orange-400 dark:hover:border-orange-600',
      text: 'text-orange-700 dark:text-orange-300',
      icon: 'text-orange-600 dark:text-orange-400',
    },
  };
  return colors[color] || colors.blue;
};

export default function ReportsPage() {
  const { user } = useAuth();
  const { selectedElder } = useElder();

  return (
    <TrialExpirationGate featureName="health reports">
      <EmailVerificationGate featureName="health reports">
        <div className="p-6 max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-blue-600" />
              Reports Center
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              All your health reports in one place. Each report helps you understand different aspects of care.
            </p>
          </div>

          {/* No Loved One Warning */}
          {!selectedElder && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please select a loved one from the sidebar to view reports.
              </AlertDescription>
            </Alert>
          )}

          {/* Elder Info */}
          {selectedElder && (
            <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <CardContent className="p-4">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  Viewing reports for <span className="font-semibold">{selectedElder.name}</span>
                </p>
              </CardContent>
            </Card>
          )}

          {/* Report Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {reportTypes.map((report) => {
              const Icon = report.icon;
              const colors = getColorClasses(report.color);

              return (
                <Card
                  key={report.id}
                  className={`${colors.border} border-2 transition-all hover:shadow-lg`}
                >
                  <CardHeader className={`${colors.bg} rounded-t-lg`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg bg-white dark:bg-gray-800`}>
                          <Icon className={`h-6 w-6 ${colors.icon}`} />
                        </div>
                        <div>
                          <CardTitle className="text-lg text-gray-900 dark:text-gray-100">
                            {report.title}
                          </CardTitle>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <p className="text-gray-700 dark:text-gray-300 text-sm">
                      {report.description}
                    </p>

                    {/* Features list */}
                    <div className="flex flex-wrap gap-2">
                      {report.features.map((feature) => (
                        <span
                          key={feature}
                          className={`text-xs px-2 py-1 rounded-full ${colors.bg} ${colors.text}`}
                        >
                          {feature}
                        </span>
                      ))}
                    </div>

                    {/* Action Button */}
                    <Link href={report.href}>
                      <Button
                        className="w-full mt-2"
                        variant={selectedElder ? 'default' : 'secondary'}
                        disabled={!selectedElder}
                      >
                        View Report
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Quick Tips */}
          <Card className="bg-gray-50 dark:bg-gray-800/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-500" />
                Tips for Using Reports
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span><strong>Health Trends</strong> is best for daily check-ins and weekly reviews</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span><strong>Medication Adherence</strong> helps when you notice missed doses happening often</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span><strong>Nutrition Analysis</strong> works best with at least a week of meal logs</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span><strong>Clinical Notes</strong> - generate this before doctor appointments to share health data</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Disclaimer */}
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center p-4">
            All reports analyze data you&apos;ve logged. They do not provide medical advice, diagnosis, or treatment recommendations.
            Always consult healthcare providers for medical decisions.
          </div>
        </div>
      </EmailVerificationGate>
    </TrialExpirationGate>
  );
}
