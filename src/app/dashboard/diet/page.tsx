'use client';

import { useState } from 'react';
import { Plus, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function DietPage() {
  const [entries, setEntries] = useState([]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Diet Tracking
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Log meals and monitor nutrition
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/diet/voice">
            <Button variant="outline">
              <Mic className="w-4 h-4 mr-2" />
              Voice Log
            </Button>
          </Link>
          <Link href="/dashboard/diet/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Log Meal
            </Button>
          </Link>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            No meals logged yet
          </p>
          <Link href="/dashboard/diet/new">
            <Button>
              Log Your First Meal
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Diet entries will appear here */}
        </div>
      )}
    </div>
  );
}
