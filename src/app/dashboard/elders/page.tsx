'use client';

import { useState, useEffect } from 'react';
import { Plus, User, Calendar, Languages, Heart, Loader2, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useElder } from '@/contexts/ElderContext';
import { ElderService } from '@/lib/firebase/elders';
import type { Elder } from '@/types';

export default function EldersPage() {
  const { user } = useAuth();
  const { refreshElders } = useElder();
  const router = useRouter();
  const [elders, setElders] = useState<Elder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [elderToDelete, setElderToDelete] = useState<Elder | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchElders();
  }, [user]);

  async function fetchElders() {
    if (!user || !user.groups?.[0]?.groupId) {
      setLoading(false);
      return;
    }

    try {
      const groupId = user.groups[0].groupId;
      const userRole = (user.groups[0].role || 'member') as 'admin' | 'caregiver' | 'member';
      const fetchedElders = await ElderService.getEldersByGroup(groupId, user.id, userRole);
      setElders(fetchedElders);
    } catch (err) {
      console.error('Error fetching elders:', err);
      setError('Failed to load elders');
    } finally {
      setLoading(false);
    }
  }

  // Calculate age from date of birth
  const calculateAge = (dateOfBirth: Date): number => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleDeleteClick = (e: React.MouseEvent, elder: Elder) => {
    e.preventDefault(); // Prevent navigation to elder profile
    e.stopPropagation();
    setElderToDelete(elder);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!elderToDelete || !user) return;

    setDeleting(true);
    try {
      const userRole = (user.groups?.[0]?.role || 'member') as 'admin' | 'caregiver' | 'member';
      await ElderService.deleteElder(elderToDelete.id, user.id, userRole);

      // Update local state
      setElders(prev => prev.filter(e => e.id !== elderToDelete.id));

      // Refresh the ElderContext to update sidebar
      await refreshElders();

      setDeleteDialogOpen(false);
      setElderToDelete(null);
    } catch (err) {
      console.error('Error deleting elder:', err);
      setError('Failed to delete elder. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setElderToDelete(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Elders
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage elder profiles in your care
          </p>
        </div>
        <Link href="/dashboard/elders/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Elder
          </Button>
        </Link>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {elders.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            No elders added yet
          </p>
          <Link href="/dashboard/elders/new">
            <Button>
              Add Your First Elder
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {elders.map((elder) => (
            <Card
              key={elder.id}
              className="p-4 hover:shadow-lg transition-shadow cursor-pointer relative group"
              onClick={() => router.push(`/dashboard/elder-profile?elderId=${elder.id}`)}
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                  <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                    {elder.name}
                  </h3>
                  {elder.preferredName && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      "{elder.preferredName}"
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2 text-sm text-gray-600 dark:text-gray-400">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {elder.dateOfBirth
                        ? `${calculateAge(elder.dateOfBirth)} years old`
                        : elder.approximateAge
                          ? `~${elder.approximateAge} years old`
                          : 'Age not specified'}
                    </span>
                  </div>
                  {elder.languages && elder.languages.length > 0 && (
                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-600 dark:text-gray-400">
                      <Languages className="h-4 w-4" />
                      <span>{elder.languages.join(', ')}</span>
                    </div>
                  )}
                  {elder.knownConditions && elder.knownConditions.length > 0 && (
                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-600 dark:text-gray-400">
                      <Heart className="h-4 w-4" />
                      <span>{elder.knownConditions.length} condition(s)</span>
                    </div>
                  )}
                </div>
                {/* Delete button - only visible on hover */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  onClick={(e) => handleDeleteClick(e, elder)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Remove Elder Profile
            </DialogTitle>
            <DialogDescription className="pt-2">
              Are you sure you want to remove <strong>{elderToDelete?.name}</strong> from your care?
              <br /><br />
              <span className="text-red-600 font-medium">
                This will permanently delete all associated data including medications, diet entries, and health records.
              </span>
              <br /><br />
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={handleCancelDelete}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                'Remove Elder'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
