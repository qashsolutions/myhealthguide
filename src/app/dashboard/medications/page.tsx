'use client';

import { useState } from 'react';
import { Plus, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function MedicationsPage() {
  const [medications, setMedications] = useState([]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Medications
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage medication schedules and tracking
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/medications/voice">
            <Button variant="outline">
              <Mic className="w-4 h-4 mr-2" />
              Voice Log
            </Button>
          </Link>
          <Link href="/dashboard/medications/new">
            <Button size="icon" className="rounded-full w-10 h-10">
              <Plus className="w-5 h-5" />
              <span className="sr-only">Add Medication</span>
            </Button>
          </Link>
        </div>
      </div>

      {medications.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            No medications added yet
          </p>
          <Link href="/dashboard/medications/new">
            <Button>
              Add Your First Medication
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Medication cards will appear here */}
        </div>
      )}
    </div>
  );
}
