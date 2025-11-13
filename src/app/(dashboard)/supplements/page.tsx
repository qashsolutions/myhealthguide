'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function SupplementsPage() {
  const [supplements, setSupplements] = useState([]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Supplements
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Track supplements and vitamins
          </p>
        </div>
        <Link href="/dashboard/supplements/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Supplement
          </Button>
        </Link>
      </div>

      {supplements.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            No supplements added yet
          </p>
          <Link href="/dashboard/supplements/new">
            <Button>
              Add Your First Supplement
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Supplement cards will appear here */}
        </div>
      )}
    </div>
  );
}
