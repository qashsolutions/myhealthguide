'use client';

import { DietEntry, Elder } from '@/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Edit, Trash2, Utensils } from 'lucide-react';
import { format } from 'date-fns';

interface DietEntryCardProps {
  entry: DietEntry;
  elder?: Elder;
  onDelete?: (id: string) => void;
}

export function DietEntryCard({ entry, elder, onDelete }: DietEntryCardProps) {
  const getMealBadge = () => {
    const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
      breakfast: 'default',
      lunch: 'secondary',
      dinner: 'default',
      snack: 'outline'
    };

    return (
      <Badge variant={variants[entry.meal] || 'outline'} className="capitalize">
        {entry.meal}
      </Badge>
    );
  };

  const getMethodBadge = () => {
    if (entry.method === 'voice') {
      return <Badge variant="outline" className="text-xs">Voice</Badge>;
    }
    return null;
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-orange-100 dark:bg-orange-900 p-2">
              <Utensils className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                {getMealBadge()}
                {getMethodBadge()}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Clock className="w-3 h-3" />
                <span>{format(new Date(entry.timestamp), 'MMM dd, yyyy • h:mm a')}</span>
              </div>
              {elder && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  For: <span className="font-medium">{elder.name}</span>
                </p>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Food Items */}
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Items:
          </p>
          <div className="flex flex-wrap gap-1">
            {entry.items.map((item, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                {item}
              </Badge>
            ))}
          </div>
        </div>

        {/* Voice Transcript */}
        {entry.voiceTranscript && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-md p-2">
            <p className="text-xs text-blue-900 dark:text-blue-100 italic">
              &quot;{entry.voiceTranscript}&quot;
            </p>
          </div>
        )}

        {/* Notes */}
        {entry.notes && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-2">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              <span className="font-medium">Notes:</span> {entry.notes}
            </p>
          </div>
        )}

        {/* AI Analysis */}
        {entry.aiAnalysis && (
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-md p-2">
            <p className="text-xs font-medium text-purple-900 dark:text-purple-100 mb-1">
              AI Insights:
            </p>
            {entry.aiAnalysis.concerns.length > 0 && (
              <div className="space-y-1">
                {entry.aiAnalysis.concerns.map((concern, idx) => (
                  <p key={idx} className="text-xs text-purple-700 dark:text-purple-300">
                    • {concern}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        {onDelete && (
          <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(entry.id)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Delete
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
