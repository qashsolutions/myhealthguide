'use client';

import { Medication, Elder } from '@/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Edit, CheckCircle, Calendar, Pill } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { format } from 'date-fns';

interface MedicationCardProps {
  medication: Medication;
  elder?: Elder;
  onLogDose?: (medicationId: string) => void;
}

export function MedicationCard({ medication, elder, onLogDose }: MedicationCardProps) {
  const router = useRouter();

  const getFrequencyBadge = () => {
    switch (medication.frequency.type) {
      case 'daily':
        return <Badge>Daily</Badge>;
      case 'weekly':
        return <Badge variant="secondary">Weekly</Badge>;
      case 'asNeeded':
        return <Badge variant="outline">As Needed</Badge>;
      default:
        return <Badge variant="outline">{medication.frequency.type}</Badge>;
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-blue-100 dark:bg-blue-900 p-2">
              <Pill className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{medication.name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{medication.dosage}</p>
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
            {medication.frequency.times.map((time, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {time}
              </Badge>
            ))}
          </div>
        </div>

        {/* Date Range */}
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Calendar className="w-4 h-4" />
          <span>
            Started: {format(new Date(medication.startDate), 'MMM dd, yyyy')}
          </span>
        </div>

        {/* Instructions */}
        {medication.instructions && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-2">
            <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
              <span className="font-medium">Instructions:</span> {medication.instructions}
            </p>
          </div>
        )}

        {/* Prescribed By */}
        {medication.prescribedBy && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Prescribed by: {medication.prescribedBy}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="default"
            size="sm"
            className="flex-1"
            onClick={() => onLogDose?.(medication.id)}
          >
            <CheckCircle className="w-4 h-4 mr-1" />
            Log Dose
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/dashboard/medications/${medication.id}/edit`)}
          >
            <Edit className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
