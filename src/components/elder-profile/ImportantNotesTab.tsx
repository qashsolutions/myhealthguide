'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileText,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  Pin,
  AlertTriangle,
  Star,
  Info,
} from 'lucide-react';
import {
  getElderImportantNotes,
  addImportantNote,
  updateImportantNote,
  deleteImportantNote,
} from '@/lib/firebase/elderHealthProfile';
import type { ElderImportantNote, NoteCategory } from '@/types';
import { format } from 'date-fns';

interface ImportantNotesTabProps {
  elderId: string;
  groupId: string;
  userId: string;
}

export function ImportantNotesTab({ elderId, groupId, userId }: ImportantNotesTabProps) {
  const [notes, setNotes] = useState<ElderImportantNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingNote, setEditingNote] = useState<ElderImportantNote | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'general' as NoteCategory,
    isPinned: false,
    isUrgent: false,
  });

  useEffect(() => {
    loadNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elderId, groupId]);

  const loadNotes = async () => {
    setLoading(true);
    try {
      const data = await getElderImportantNotes(elderId, groupId);
      setNotes(data);
    } catch (error) {
      console.error('Error loading notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const openAddDialog = () => {
    setEditingNote(null);
    setFormData({
      title: '',
      content: '',
      category: 'general',
      isPinned: false,
      isUrgent: false,
    });
    setShowDialog(true);
  };

  const openEditDialog = (note: ElderImportantNote) => {
    setEditingNote(note);
    setFormData({
      title: note.title,
      content: note.content,
      category: note.category,
      isPinned: note.isPinned || false,
      isUrgent: note.isUrgent || false,
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.content.trim()) return;

    setSaving(true);
    try {
      if (editingNote) {
        await updateImportantNote(editingNote.id!, {
          title: formData.title.trim(),
          content: formData.content.trim(),
          category: formData.category,
          isPinned: formData.isPinned,
          isUrgent: formData.isUrgent,
        });
      } else {
        await addImportantNote({
          elderId,
          groupId,
          title: formData.title.trim(),
          content: formData.content.trim(),
          category: formData.category,
          isPinned: formData.isPinned,
          isUrgent: formData.isUrgent,
          createdBy: userId,
        });
      }
      setShowDialog(false);
      loadNotes();
    } catch (error) {
      console.error('Error saving note:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      await deleteImportantNote(noteId);
      loadNotes();
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  const togglePin = async (note: ElderImportantNote) => {
    try {
      await updateImportantNote(note.id!, { isPinned: !note.isPinned });
      loadNotes();
    } catch (error) {
      console.error('Error toggling pin:', error);
    }
  };

  const getCategoryIcon = (category: NoteCategory) => {
    switch (category) {
      case 'medical': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'care_preference': return <Star className="w-4 h-4 text-yellow-500" />;
      case 'behavior': return <Info className="w-4 h-4 text-blue-500" />;
      case 'communication': return <FileText className="w-4 h-4 text-green-500" />;
      default: return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  const getCategoryLabel = (category: NoteCategory) => {
    switch (category) {
      case 'medical': return 'Medical';
      case 'care_preference': return 'Care Preference';
      case 'behavior': return 'Behavior';
      case 'communication': return 'Communication';
      case 'general': return 'General';
    }
  };

  const getCategoryBadgeColor = (category: NoteCategory) => {
    switch (category) {
      case 'medical': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'care_preference': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'behavior': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'communication': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </CardContent>
      </Card>
    );
  }

  // Separate pinned and regular notes
  const pinnedNotes = notes.filter(n => n.isPinned);
  const regularNotes = notes.filter(n => !n.isPinned);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-500" />
              Important Notes
            </span>
            <Button size="sm" onClick={openAddDialog}>
              <Plus className="w-4 h-4 mr-1" />
              Add Note
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {notes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>No important notes yet.</p>
              <p className="text-sm mt-1">
                Add notes about care preferences, behaviors, or important information.
              </p>
              <Button variant="outline" className="mt-2" onClick={openAddDialog}>
                <Plus className="w-4 h-4 mr-1" />
                Add First Note
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Pinned Notes */}
              {pinnedNotes.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-500 flex items-center gap-1">
                    <Pin className="w-4 h-4" />
                    Pinned
                  </h3>
                  {pinnedNotes.map(note => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      onEdit={openEditDialog}
                      onDelete={handleDelete}
                      onTogglePin={togglePin}
                      getCategoryIcon={getCategoryIcon}
                      getCategoryLabel={getCategoryLabel}
                      getCategoryBadgeColor={getCategoryBadgeColor}
                    />
                  ))}
                </div>
              )}

              {/* Regular Notes */}
              {regularNotes.length > 0 && (
                <div className="space-y-3">
                  {pinnedNotes.length > 0 && (
                    <h3 className="text-sm font-medium text-gray-500 mt-4">Other Notes</h3>
                  )}
                  {regularNotes.map(note => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      onEdit={openEditDialog}
                      onDelete={handleDelete}
                      onTogglePin={togglePin}
                      getCategoryIcon={getCategoryIcon}
                      getCategoryLabel={getCategoryLabel}
                      getCategoryBadgeColor={getCategoryBadgeColor}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingNote ? 'Edit Note' : 'Add Important Note'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                placeholder="Brief title for this note"
              />
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={formData.category}
                onValueChange={v => setFormData({ ...formData, category: v as NoteCategory })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="medical">Medical</SelectItem>
                  <SelectItem value="care_preference">Care Preference</SelectItem>
                  <SelectItem value="behavior">Behavior</SelectItem>
                  <SelectItem value="communication">Communication</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Content *</Label>
              <Textarea
                value={formData.content}
                onChange={e => setFormData({ ...formData, content: e.target.value })}
                placeholder="Detailed information about this note"
                rows={4}
              />
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isPinned}
                  onChange={e => setFormData({ ...formData, isPinned: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <Pin className="w-4 h-4" />
                <span className="text-sm">Pin to top</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isUrgent}
                  onChange={e => setFormData({ ...formData, isUrgent: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="text-sm">Mark as urgent</span>
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !formData.title.trim() || !formData.content.trim()}
            >
              {saving ? 'Saving...' : editingNote ? 'Update' : 'Add Note'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Separate NoteCard component for cleaner code
interface NoteCardProps {
  note: ElderImportantNote;
  onEdit: (note: ElderImportantNote) => void;
  onDelete: (id: string) => void;
  onTogglePin: (note: ElderImportantNote) => void;
  getCategoryIcon: (category: NoteCategory) => JSX.Element;
  getCategoryLabel: (category: NoteCategory) => string;
  getCategoryBadgeColor: (category: NoteCategory) => string;
}

function NoteCard({
  note,
  onEdit,
  onDelete,
  onTogglePin,
  getCategoryIcon,
  getCategoryLabel,
  getCategoryBadgeColor,
}: NoteCardProps) {
  return (
    <div
      className={`p-4 rounded-lg ${
        note.isUrgent
          ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
          : 'bg-gray-50 dark:bg-gray-800'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {getCategoryIcon(note.category)}
            <span className={`font-medium ${note.isUrgent ? 'text-red-700 dark:text-red-300' : ''}`}>
              {note.title}
            </span>
            <Badge className={getCategoryBadgeColor(note.category)}>
              {getCategoryLabel(note.category)}
            </Badge>
            {note.isUrgent && (
              <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                Urgent
              </Badge>
            )}
            {note.isPinned && (
              <Pin className="w-4 h-4 text-blue-500" />
            )}
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
            {note.content}
          </p>

          <p className="text-xs text-gray-500">
            Added {format(note.createdAt, 'MMM d, yyyy')}
            {note.updatedAt && note.updatedAt > note.createdAt && (
              <span> · Updated {format(note.updatedAt, 'MMM d, yyyy')}</span>
            )}
          </p>
        </div>

        <div className="flex gap-1 ml-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onTogglePin(note)}
            title={note.isPinned ? 'Unpin' : 'Pin to top'}
          >
            <Pin className={`w-4 h-4 ${note.isPinned ? 'text-blue-500' : ''}`} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onEdit(note)}>
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onDelete(note.id!)}>
            <Trash2 className="w-4 h-4 text-red-500" />
          </Button>
        </div>
      </div>
    </div>
  );
}
