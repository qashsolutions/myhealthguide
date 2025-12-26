'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, UserPlus, Calendar } from 'lucide-react';
import { Elder } from '@/types';

interface CaregiverEldersCardProps {
  caregiverId: string;
  caregiverName: string;
  role: 'caregiver_admin' | 'caregiver';
  elders: Elder[];
  maxElders?: number;
  onAssignMore?: () => void;
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

export function CaregiverEldersCard({
  caregiverId,
  caregiverName,
  role,
  elders,
  maxElders = 3,
  onAssignMore
}: CaregiverEldersCardProps) {
  const elderCount = elders.length;
  const canAddMore = elderCount < maxElders;

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-base font-medium">{caregiverName}</CardTitle>
              <Badge
                variant="outline"
                className={role === 'caregiver_admin'
                  ? 'text-purple-600 border-purple-300 dark:text-purple-400 dark:border-purple-600'
                  : 'text-gray-600 border-gray-300 dark:text-gray-400 dark:border-gray-600'
                }
              >
                {role === 'caregiver_admin' ? 'Admin' : 'Caregiver'}
              </Badge>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs">
            {elderCount}/{maxElders}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {elders.length > 0 ? (
          <div className="space-y-2">
            {elders.map((elder) => (
              <div
                key={elder.id}
                className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <span className="text-xs font-medium text-green-700 dark:text-green-400">
                      {elder.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {elder.preferredName || elder.name}
                    </p>
                    {getElderAge(elder) && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {getElderAge(elder)}
                      </p>
                    )}
                  </div>
                </div>
                {elder.primaryCaregiverId === caregiverId && (
                  <Badge variant="default" className="bg-amber-500 text-xs">
                    Primary
                  </Badge>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500 dark:text-gray-400">
            <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No elders assigned yet</p>
          </div>
        )}

        {canAddMore && onAssignMore && (
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-3"
            onClick={onAssignMore}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Assign Elder ({maxElders - elderCount} remaining)
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
