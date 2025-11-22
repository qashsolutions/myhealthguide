'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Clock, TrendingUp, DollarSign, CheckCircle } from 'lucide-react';

interface MonthSummary {
  totalHours: number;
  averagePerDay: number;
  projectedRevenue: number;
  fillRate: number;
}

interface MonthSummaryCardsProps {
  summary: MonthSummary;
  loading?: boolean;
}

export function MonthSummaryCards({ summary, loading }: MonthSummaryCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: 'Total Hours',
      value: summary.totalHours.toFixed(1),
      icon: Clock,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30'
    },
    {
      title: 'Avg Per Day',
      value: summary.averagePerDay.toFixed(1),
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900/30'
    },
    {
      title: 'Revenue Proj.',
      value: `$${summary.projectedRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30'
    },
    {
      title: 'Fill Rate',
      value: `${summary.fillRate}%`,
      icon: CheckCircle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100 dark:bg-orange-900/30'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <Card key={index}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{card.title}</p>
                <p className="text-2xl font-bold mt-1">{card.value}</p>
              </div>
              <div className={`p-3 rounded-lg ${card.bgColor}`}>
                <card.icon className={`w-6 h-6 ${card.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
