'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useElder } from '@/contexts/ElderContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Users,
  Pill,
  TrendingUp,
  Plus,
  ArrowRight,
  Calendar,
  Activity,
  Heart
} from 'lucide-react';
import { Elder } from '@/types';
import Link from 'next/link';
import { format } from 'date-fns';

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { elders, selectElder, selectedElder } = useElder();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Small delay to allow context to load
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, [elders]);

  // Calculate overall stats
  const totalElders = elders.length;
  const totalMedications = 0; // TODO: Aggregate from all elders
  const avgCompliance = 0; // TODO: Calculate from all elders

  const handleElderClick = (elder: Elder) => {
    selectElder(elder);
    router.push('/dashboard/medications');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Overview
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {user?.firstName ? `Welcome back, ${user.firstName}!` : 'Welcome to your caregiving dashboard'}
          </p>
        </div>
        <Link href="/dashboard/elders/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Elder
          </Button>
        </Link>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Elders</h3>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{totalElders}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Medications</h3>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{totalMedications}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <Pill className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Avg Compliance</h3>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {avgCompliance > 0 ? `${avgCompliance}%` : '--'}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Elders Grid */}
      {elders.length > 0 ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Your Elders
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Click on an elder to view their care details
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {elders.map((elder) => (
              <Card
                key={elder.id}
                className={`p-6 cursor-pointer transition-all hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700 ${
                  selectedElder?.id === elder.id
                    ? 'border-2 border-blue-600 dark:border-blue-400 shadow-lg'
                    : ''
                }`}
                onClick={() => handleElderClick(elder)}
              >
                {/* Elder Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {elder.name}
                    </h3>
                    {elder.dateOfBirth && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        <Calendar className="w-3 h-3 inline mr-1" />
                        Born {format(new Date(elder.dateOfBirth), 'MMM dd, yyyy')}
                      </p>
                    )}
                  </div>
                  {selectedElder?.id === elder.id && (
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  )}
                </div>

                {/* Elder Stats */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400 flex items-center">
                      <Pill className="w-4 h-4 mr-2 text-blue-600" />
                      Medications
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      0 {/* TODO: Get from elder data */}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400 flex items-center">
                      <Activity className="w-4 h-4 mr-2 text-green-600" />
                      Recent Logs
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      0 {/* TODO: Get from elder data */}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400 flex items-center">
                      <Heart className="w-4 h-4 mr-2 text-red-600" />
                      Compliance
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      -- {/* TODO: Calculate compliance */}
                    </span>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between group"
                    onClick={(e) => {
                      e.stopPropagation();
                      selectElder(elder);
                      router.push('/dashboard/medications');
                    }}
                  >
                    <span>View Care Details</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        /* No Elders - Getting Started */
        <Card className="p-8">
          <div className="text-center max-w-2xl mx-auto">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Welcome to HealthGuide!
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Get started by adding your first elder profile. You'll be able to track medications,
              diet, activities, and get AI-powered insights to improve care quality.
            </p>
            <Link href="/dashboard/elders/new">
              <Button size="lg">
                <Plus className="w-5 h-5 mr-2" />
                Add Your First Elder
              </Button>
            </Link>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 text-center">
              What You Can Do
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Pill className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h5 className="font-semibold text-gray-900 dark:text-white mb-1">
                    Medication Management
                  </h5>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Track medications, set reminders, and log doses with voice input
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Activity className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h5 className="font-semibold text-gray-900 dark:text-white mb-1">
                    Diet & Activity Tracking
                  </h5>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Log meals and activities to monitor health patterns
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h5 className="font-semibold text-gray-900 dark:text-white mb-1">
                    AI-Powered Insights
                  </h5>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Get intelligent health summaries and pattern detection
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h5 className="font-semibold text-gray-900 dark:text-white mb-1">
                    Family Collaboration
                  </h5>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Invite family members to coordinate care together
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
