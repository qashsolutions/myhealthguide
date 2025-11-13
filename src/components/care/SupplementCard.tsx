'use client';

import { Supplement, Elder } from '@/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Edit, CheckCircle, Apple } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SupplementCardProps {
  supplement: Supplement;
  elder?: Elder;
  onLogIntake?: (supplementId: string) => void;
}

export function SupplementCard({ supplement, elder, onLogIntake }: SupplementCardProps) {
  const router = useRouter();

  const getFrequencyBadge = () => {
    switch (supplement.frequency.type) {
      case 'daily':
        return <Badge>Daily</Badge>;
      case 'weekly':
        return <Badge variant="secondary">Weekly</Badge>;
      case 'asNeeded':
        return <Badge variant="outline">As Needed</Badge>;
      default:
        return <Badge variant="outline">{supplement.frequency.type}</Badge>;
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-green-100 dark:bg-green-900 p-2">
              <Apple className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{supplement.name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{supplement.dosage}</p>
            </div>
          </div>
          {getFrequencyBadge()}
        </div>
        {elder && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            For: <span className="font-medium">{elder.name}</span>
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Schedule */}
        <div className="space-y-1">
          <p className="text-sm font-medium flex items-center gap-1 text-gray-700 dark:text-gray-300">
            <Clock className="w-4 h-4" />
            Schedule
          </p>
          <div className="flex flex-wrap gap-1">
            {supplement.frequency.times.map((time, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {time}
              </Badge>
            ))}
          </div>
        </div>

        {/* Notes */}
        {supplement.notes && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-2">
            <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
              {supplement.notes}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="default"
            size="sm"
            className="flex-1"
            onClick={() => onLogIntake?.(supplement.id)}
          >
            <CheckCircle className="w-4 h-4 mr-1" />
            Log Intake
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/dashboard/supplements/${supplement.id}/edit`)}
          >
            <Edit className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
