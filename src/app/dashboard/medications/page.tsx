'use client';

import { useState } from 'react';
import { Plus, Mic, Pill, Clock, Calendar, Loader2, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useElder } from '@/contexts/ElderContext';
import { MedicationService } from '@/lib/firebase/medications';
import { isReadOnlyForElderCare } from '@/lib/utils/getUserRole';
import { useElderDataLoader } from '@/hooks/useDataLoader';
import { format } from 'date-fns';
import type { Medication } from '@/types';

export default function MedicationsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { selectedElder } = useElder();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [medicationToDelete, setMedicationToDelete] = useState<Medication | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Check if user has read-only access for elder care data
  // Agency Owner (super_admin) is read-only for care data, only caregivers can modify
  const readOnly = isReadOnlyForElderCare(user);

  // Determine user's role for HIPAA audit logging
  const getUserRole = (): 'admin' | 'caregiver' | 'member' => {
    const agencyRole = user?.agencies?.[0]?.role;
    if (agencyRole === 'super_admin' || agencyRole === 'caregiver_admin') {
      return 'admin';
    }
    if (agencyRole === 'caregiver') {
      return 'caregiver';
    }
    const groupRole = user?.groups?.[0]?.role;
    if (groupRole === 'admin') {
      return 'admin';
    }
    return 'member';
  };

  const { data: medications, loading, error, reload } = useElderDataLoader<Medication[]>({
    fetcher: (elder, user, role) =>
      MedicationService.getMedicationsByElder(elder.id, elder.groupId, user.id, role),
    elder: selectedElder,
    user,
    errorPrefix: 'Failed to load medications',
  });

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
          Please select a loved one from the sidebar to view medications.
        </p>
      </div>
    );
  }

  const handleDeleteClick = (med: Medication) => {
    setMedicationToDelete(med);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!medicationToDelete || !user) return;

    setDeleting(true);
    try {
      const userRole = getUserRole();
      await MedicationService.deleteMedication(medicationToDelete.id, user.id, userRole);
      setDeleteDialogOpen(false);
      setMedicationToDelete(null);
      reload();
    } catch (err: any) {
      console.error('Error deleting medication:', err);
    } finally {
      setDeleting(false);
    }
  };

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
          {!readOnly && (
            <Link href="/dashboard/medications/new">
              <Button size="icon" className="rounded-full w-10 h-10">
                <Plus className="w-5 h-5" />
                <span className="sr-only">Add Medication</span>
              </Button>
            </Link>
          )}
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
          {!readOnly && (
            <Link href="/dashboard/medications/new">
              <Button>
                Add Your First Medication
              </Button>
            </Link>
          )}
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

                {!readOnly && (
                  <div className="flex gap-2 pt-3 border-t border-gray-200 dark:border-gray-700 mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/dashboard/medications/${med.id}/edit`)}
                      className="flex-1"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteClick(med)}
                      className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Medication</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{medicationToDelete?.name}&rdquo;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
