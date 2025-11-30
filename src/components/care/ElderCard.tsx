'use client';

import { Elder } from '@/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, User, Heart } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

interface ElderCardProps {
  elder: Elder;
  onDelete?: (id: string) => void;
}

export function ElderCard({ elder, onDelete }: ElderCardProps) {
  const router = useRouter();

  const age = new Date().getFullYear() - new Date(elder.dateOfBirth).getFullYear();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={elder.profileImage} />
            <AvatarFallback className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400">
              {getInitials(elder.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-lg">{elder.name}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Age {age}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium">Date of Birth:</span>{' '}
            {format(new Date(elder.dateOfBirth), 'MMM dd, yyyy')}
          </p>
          {elder.notes && (
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
              <span className="font-medium">Notes:</span> {elder.notes}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/dashboard/elders/${elder.id}/edit`)}
          >
            <Edit className="w-4 h-4 mr-1" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/dashboard/elders/${elder.id}`)}
          >
            <User className="w-4 h-4 mr-1" />
            Care
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/dashboard/elder-profile?elderId=${elder.id}`)}
            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <Heart className="w-4 h-4 mr-1" />
            Health
          </Button>
          {onDelete && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(elder.id)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
