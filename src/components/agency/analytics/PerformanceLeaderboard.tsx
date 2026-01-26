'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Clock } from 'lucide-react';
import type { CaregiverPerformance } from '@/lib/firebase/agencyAnalytics';

interface PerformanceLeaderboardProps {
  data: CaregiverPerformance[];
  loading?: boolean;
}

export function PerformanceLeaderboard({ data, loading }: PerformanceLeaderboardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Performance Leaderboard</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getMedalEmoji = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-600" />
          Performance Leaderboard
        </CardTitle>
        <CardDescription>
          Top performers this month
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No performance data available yet
          </div>
        ) : (
          <div className="space-y-3">
            {data.slice(0, 10).map((performer) => (
              <div
                key={performer.caregiverId}
                className={`p-4 rounded-lg border transition-all ${
                  performer.rank <= 3
                    ? 'bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-200 dark:border-yellow-800'
                    : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`text-2xl font-bold ${performer.rank <= 3 ? 'text-yellow-600' : 'text-gray-500'}`}>
                      {getMedalEmoji(performer.rank)}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {performer.caregiverName}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        {performer.noShows === 0 && (
                          <Badge variant="default" className="bg-green-600 text-xs">
                            Perfect Attendance
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Rating hidden - not yet implemented */}
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400 text-xs">
                      <Clock className="w-3 h-3" />
                      Hours
                    </div>
                    <div className="font-bold text-gray-900 dark:text-white">
                      {performer.hoursWorked}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500 dark:text-gray-400 text-xs">
                      No-Shows
                    </div>
                    <div className={`font-bold ${performer.noShows === 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {performer.noShows}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
