'use client';

import { useState, useEffect } from 'react';
import { Plus, User, Calendar, Languages, Heart, Loader2, Archive, RotateCcw, AlertTriangle, Eye, EyeOff, Trash2, MoreVertical } from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useElder } from '@/contexts/ElderContext';
import { ElderService } from '@/lib/firebase/elders';
import type { Elder } from '@/types';

type DialogType = 'archive' | 'delete' | null;

export default function EldersPage() {
  const { user } = useAuth();
  const { refreshElders } = useElder();
  const router = useRouter();
  const [elders, setElders] = useState<Elder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogType, setDialogType] = useState<DialogType>(null);
  const [selectedElder, setSelectedElder] = useState<Elder | null>(null);
  const [processing, setProcessing] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

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

  const handleArchiveClick = (e: React.MouseEvent, elder: Elder) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedElder(elder);
    setDialogType('archive');
  };

  const handleDeleteClick = (e: React.MouseEvent, elder: Elder) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedElder(elder);
    setDialogType('delete');
  };

  const handleConfirmArchive = async () => {
    if (!selectedElder || !user) return;

    setProcessing(true);
    try {
      const userRole = (user.groups?.[0]?.role || 'member') as 'admin' | 'caregiver' | 'member';
      await ElderService.archiveElder(selectedElder.id, user.id, userRole);

      // Update local state - mark as archived
      setElders(prev => prev.map(e =>
        e.id === selectedElder.id
          ? { ...e, archived: true, archivedAt: new Date(), archivedBy: user.id }
          : e
      ));

      // Refresh the ElderContext to update sidebar
      await refreshElders();

      closeDialog();
    } catch (err) {
      console.error('Error archiving elder:', err);
      setError('Failed to archive elder. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedElder || !user) return;

    setProcessing(true);
    try {
      const userRole = (user.groups?.[0]?.role || 'member') as 'admin' | 'caregiver' | 'member';
      await ElderService.deleteElder(selectedElder.id, user.id, userRole);

      // Update local state - remove elder
      setElders(prev => prev.filter(e => e.id !== selectedElder.id));

      // Refresh the ElderContext to update sidebar
      await refreshElders();

      closeDialog();
    } catch (err) {
      console.error('Error deleting elder:', err);
      setError('Failed to delete elder. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleUnarchive = async (e: React.MouseEvent, elder: Elder) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) return;

    try {
      const userRole = (user.groups?.[0]?.role || 'member') as 'admin' | 'caregiver' | 'member';
      await ElderService.unarchiveElder(elder.id, user.id, userRole);

      // Update local state - remove archived status
      setElders(prev => prev.map(e =>
        e.id === elder.id
          ? { ...e, archived: false, archivedAt: undefined, archivedBy: undefined }
          : e
      ));

      // Refresh the ElderContext to update sidebar
      await refreshElders();
    } catch (err) {
      console.error('Error reactivating elder:', err);
      setError('Failed to reactivate elder. Please try again.');
    }
  };

  const closeDialog = () => {
    setDialogType(null);
    setSelectedElder(null);
  };

  // Separate active and archived elders
  const activeElders = elders.filter(e => !e.archived);
  const archivedElders = elders.filter(e => e.archived);

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
        <div className="flex items-center gap-2">
          {archivedElders.length > 0 && (
            <Button
              variant="outline"
              onClick={() => setShowArchived(!showArchived)}
              className="text-gray-600"
            >
              {showArchived ? (
                <>
                  <EyeOff className="w-4 h-4 mr-2" />
                  Hide Archived ({archivedElders.length})
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 mr-2" />
                  Show Archived ({archivedElders.length})
                </>
              )}
            </Button>
          )}
          <Link href="/dashboard/elders/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Elder
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {activeElders.length === 0 && !showArchived ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {archivedElders.length > 0
              ? 'No active elders. You have archived elders that can be reactivated.'
              : 'No elders added yet'}
          </p>
          <div className="flex justify-center gap-2">
            {archivedElders.length > 0 && (
              <Button variant="outline" onClick={() => setShowArchived(true)}>
                View Archived
              </Button>
            )}
            <Link href="/dashboard/elders/new">
              <Button>
                Add Your First Elder
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Active Elders */}
          {activeElders.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeElders.map((elder) => (
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
                    {/* Actions dropdown - only visible on hover */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/dashboard/elder-profile?elderId=${elder.id}`);
                          }}
                        >
                          <User className="h-4 w-4 mr-2" />
                          View Profile
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={(e) => handleArchiveClick(e as any, elder)}
                          className="text-amber-600 focus:text-amber-600"
                        >
                          <Archive className="h-4 w-4 mr-2" />
                          Archive
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => handleDeleteClick(e as any, elder)}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Permanently
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Archived Elders */}
          {showArchived && archivedElders.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                <Archive className="h-5 w-5" />
                Archived Elders
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {archivedElders.map((elder) => (
                  <Card
                    key={elder.id}
                    className="p-4 opacity-60 hover:opacity-80 transition-opacity relative group border-dashed"
                  >
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full">
                        <User className="h-6 w-6 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-500 dark:text-gray-400 truncate">
                          {elder.name}
                        </h3>
                        {elder.preferredName && (
                          <p className="text-sm text-gray-400 dark:text-gray-500">
                            "{elder.preferredName}"
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2 text-sm text-gray-400">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {elder.dateOfBirth
                              ? `${calculateAge(elder.dateOfBirth)} years old`
                              : elder.approximateAge
                                ? `~${elder.approximateAge} years old`
                                : 'Age not specified'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">
                          Archived
                        </p>
                      </div>
                      {/* Actions for archived elders */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => handleUnarchive(e as any, elder)}
                            className="text-green-600 focus:text-green-600"
                          >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Reactivate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={(e) => handleDeleteClick(e as any, elder)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Permanently
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Archive Confirmation Dialog */}
      <Dialog open={dialogType === 'archive'} onOpenChange={() => closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <Archive className="h-5 w-5" />
              Archive Elder Profile
            </DialogTitle>
            <DialogDescription className="pt-2">
              Are you sure you want to archive <strong>{selectedElder?.name}</strong>?
              <br /><br />
              <span className="text-gray-600">
                Archiving will hide this elder from your active list, but all data will be preserved. You can reactivate this elder at any time.
              </span>
              <br /><br />
              <span className="text-green-600 font-medium">
                This will free up your elder slot, allowing you to add a new elder.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={closeDialog}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              className="bg-amber-600 hover:bg-amber-700"
              onClick={handleConfirmArchive}
              disabled={processing}
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Archiving...
                </>
              ) : (
                <>
                  <Archive className="h-4 w-4 mr-2" />
                  Archive Elder
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={dialogType === 'delete'} onOpenChange={() => closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Permanently Delete Elder
            </DialogTitle>
            <DialogDescription className="pt-2">
              Are you sure you want to permanently delete <strong>{selectedElder?.name}</strong>?
              <br /><br />
              <span className="text-red-600 font-medium">
                This will permanently delete all associated data including medications, diet entries, health records, and all other information.
              </span>
              <br /><br />
              <span className="font-bold text-red-700">
                This action cannot be undone.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={closeDialog}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={processing}
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Permanently
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
