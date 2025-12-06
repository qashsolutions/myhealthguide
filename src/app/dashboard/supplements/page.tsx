'use client';

import { useState, useEffect } from 'react';
import { Plus, Pill, Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useElder } from '@/contexts/ElderContext';
import { SupplementService } from '@/lib/firebase/supplements';
import type { Supplement } from '@/types';

export default function SupplementsPage() {
  const { user } = useAuth();
  const { selectedElder } = useElder();
  const [supplements, setSupplements] = useState<Supplement[]>([]);
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

  // Load supplements for selected elder
  useEffect(() => {
    async function loadSupplements() {
      if (!selectedElder || !user) {
        setSupplements([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const supps = await SupplementService.getSupplementsByElder(
          selectedElder.id,
          selectedElder.groupId,
          user.id,
          getUserRole()
        );
        setSupplements(supps);
      } catch (err: any) {
        console.error('Error loading supplements:', err);
        setError(err.message || 'Failed to load supplements');
      } finally {
        setLoading(false);
      }
    }

    loadSupplements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          Please select an elder from the sidebar to view supplements.
        </p>
      </div>
    );
  }

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
          <Button size="icon" className="rounded-full w-10 h-10">
            <Plus className="w-5 h-5" />
            <span className="sr-only">Add Supplement</span>
          </Button>
        </Link>
      </div>

      {error && (
        <div className="text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
          {error}
        </div>
      )}

      {supplements.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <Pill className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            No supplements added yet for {selectedElder.name}
          </p>
          <Link href="/dashboard/supplements/new">
            <Button>
              Add Your First Supplement
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {supplements.map((supp) => (
            <Card key={supp.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Pill className="w-5 h-5 text-green-600" />
                  <CardTitle className="text-lg">{supp.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Dosage:</span> {supp.dosage}
                </div>

                {supp.frequency?.times && supp.frequency.times.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Clock className="w-4 h-4" />
                    <span>{supp.frequency.times.join(', ')}</span>
                  </div>
                )}

                {supp.notes && (
                  <div className="text-sm text-gray-500 dark:text-gray-500 italic">
                    {supp.notes}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
