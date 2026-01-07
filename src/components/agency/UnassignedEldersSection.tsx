'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, UserPlus } from 'lucide-react';
import { Elder } from '@/types';

interface UnassignedEldersSectionProps {
  elders: Elder[];
  onAssign: (elderId: string, elderName: string) => void;
}

// Calculate age from date of birth or approximate age
function getElderAge(elder: Elder): string {
  if (elder.approximateAge) {
    return `~${elder.approximateAge} yrs`;
  }
  if (elder.dateOfBirth) {
    const dob = elder.dateOfBirth instanceof Date
      ? elder.dateOfBirth
      : new Date(elder.dateOfBirth);
    const age = new Date().getFullYear() - dob.getFullYear();
    return isNaN(age) ? '' : `${age} yrs`;
  }
  return '';
}

export function UnassignedEldersSection({
  elders,
  onAssign
}: UnassignedEldersSectionProps) {
  if (elders.length === 0) {
    return null;
  }

  return (
    <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          <CardTitle className="text-lg text-amber-800 dark:text-amber-200">
            Unassigned Loved Ones ({elders.length})
          </CardTitle>
        </div>
        <CardDescription className="text-amber-700 dark:text-amber-300">
          These loved ones need to be assigned to a caregiver
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {elders.map((elder) => (
            <div
              key={elder.id}
              className="flex items-center justify-between py-3 px-4 bg-white dark:bg-gray-800 rounded-lg border border-amber-200 dark:border-amber-800"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                    {elder.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {elder.preferredName || elder.name}
                  </p>
                  {getElderAge(elder) && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {getElderAge(elder)}
                    </p>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAssign(elder.id, elder.preferredName || elder.name)}
                className="border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/30"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Assign Caregiver
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
