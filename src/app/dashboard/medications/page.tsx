'use client';

import { useState, useEffect } from 'react';
import { Plus, Mic, Pill, Clock, Calendar, Loader2, Trash2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useElder } from '@/contexts/ElderContext';
import { MedicationService } from '@/lib/firebase/medications';
import { format } from 'date-fns';
import type { Medication } from '@/types';

export default function MedicationsPage() {
  const { user } = useAuth();
  const { selectedElder } = useElder();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Determine user's role
  const getUserRole = (): 'admin' | 'caregiver' | 'member' => {
    const agencyRole = user?.agencies?.[0]?.role;
    if (agencyRole === 'super_admin' || agencyRole === 'caregiver_admin') return 'admin';
    if (agencyRole === 'caregiver') return 'caregiver';
    const groupRole = user?.groups?.[0]?.role;
    if (groupRole === 'admin') return 'admin';
    return 'member';
  };

  // Load medications for selected elder
  useEffect(() => {
    async function loadMedications() {
      if (!selectedElder || !user) {
        setMedications([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const meds = await MedicationService.getMedicationsByElder(
          selectedElder.id,
          selectedElder.groupId,
          user.id,
          getUserRole()
        );
        setMedications(meds);
      } catch (err: any) {
        console.error('Error loading medications:', err);
        setError(err.message || 'Failed to load medications');
      } finally {
        setLoading(false);
      }
    }

    loadMedications();
  }, [selectedElder, user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!selectedElder) {
    return (
      <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <p className="text-gray-600 dark:text-gray-400">
          Please select an elder from the sidebar to view medications.
        </p>
      </div>
    );
  }

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

      {error && (
        <div className="text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
          {error}
        </div>
      )}

      {medications.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <Pill className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            No medications added yet for {selectedElder.name}
          </p>
          <Link href="/dashboard/medications/new">
            <Button>
              Add Your First Medication
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {medications.map((med) => {
            // Medication is active if no endDate or endDate is in the future
            const isActive = !med.endDate || new Date(med.endDate) > new Date();
            return (
            <Card key={med.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Pill className="w-5 h-5 text-blue-600" />
                    <CardTitle className="text-lg">{med.name}</CardTitle>
                  </div>
                  <Badge variant={isActive ? 'default' : 'secondary'}>
                    {isActive ? 'Active' : 'Ended'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Dosage:</span> {med.dosage}
                </div>

                {med.frequency?.times && med.frequency.times.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Clock className="w-4 h-4" />
                    <span>{med.frequency.times.join(', ')}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Calendar className="w-4 h-4" />
                  <span>
                    Started {med.startDate ? format(new Date(med.startDate), 'MMM d, yyyy') : 'N/A'}
                  </span>
                </div>

                {med.instructions && (
                  <div className="text-sm text-gray-500 dark:text-gray-500 italic">
                    {med.instructions}
                  </div>
                )}
              </CardContent>
            </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
