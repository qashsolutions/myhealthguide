'use client';

import { useState } from 'react';
import { Plus, Pill, Clock, Loader2, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { SupplementService } from '@/lib/firebase/supplements';
import { useElderDataLoader } from '@/hooks/useDataLoader';
import type { Supplement } from '@/types';

export default function SupplementsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { selectedElder } = useElder();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [supplementToDelete, setSupplementToDelete] = useState<Supplement | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  const { data: supplements, loading, error, reload } = useElderDataLoader<Supplement[]>({
    fetcher: (elder, user, role) =>
      SupplementService.getSupplementsByElder(elder.id, elder.groupId, user.id, role),
    elder: selectedElder,
    user,
    errorPrefix: 'Failed to load supplements',
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
          Please select a loved one from the sidebar to view supplements.
        </p>
      </div>
    );
  }

  const handleDeleteClick = (supp: Supplement) => {
    setSupplementToDelete(supp);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!supplementToDelete || !user) return;

    setDeleting(true);
    try {
      const userRole = getUserRole();
      await SupplementService.deleteSupplement(supplementToDelete.id, user.id, userRole);
      setDeleteDialogOpen(false);
      setSupplementToDelete(null);
      reload();
    } catch (err: any) {
      console.error('Error deleting supplement:', err);
    } finally {
      setDeleting(false);
    }
  };

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

                <div className="flex gap-2 pt-3 border-t border-gray-200 dark:border-gray-700 mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/dashboard/supplements/${supp.id}/edit`)}
                    className="flex-1"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteClick(supp)}
                    className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Supplement</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{supplementToDelete?.name}&rdquo;? This action cannot be undone.
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
