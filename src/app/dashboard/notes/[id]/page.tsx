'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  BookOpen,
  ArrowLeft,
  Loader2,
  Edit3,
  Trash2,
  Globe,
  Lock,
  Calendar,
  Mic,
  Tag,
  Sparkles,
  Book,
  User,
  Save,
  X,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { authenticatedFetch } from '@/lib/api/authenticatedFetch';
import { EmailVerificationGate } from '@/components/auth/EmailVerificationGate';
import { TrialExpirationGate } from '@/components/auth/TrialExpirationGate';
import type { CaregiverNote } from '@/types';
import { format } from 'date-fns';

export default function NoteDetailPage() {
  const router = useRouter();
  const params = useParams();
  const noteId = params.id as string;
  const { user } = useAuth();

  const [note, setNote] = useState<CaregiverNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit form state
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editTagInput, setEditTagInput] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);

  // Dialogs
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showUnpublishDialog, setShowUnpublishDialog] = useState(false);
  const [authorFirstName, setAuthorFirstName] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [moderationInfo, setModerationInfo] = useState<{
    safetyScore?: number;
    flags?: string[];
    reason?: string;
  } | null>(null);

  // Load note
  useEffect(() => {
    async function loadNote() {
      if (!user || !noteId) {
        setLoading(false);
        return;
      }

      try {
        const response = await authenticatedFetch(`/api/notes/${noteId}`);
        const data = await response.json();

        if (data.success) {
          setNote(data.note);
          setEditTitle(data.note.title);
          setEditContent(data.note.content);
          setEditTags(data.note.userTags || []);
        } else {
          setError(data.error || 'Failed to load note');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load note');
      } finally {
        setLoading(false);
      }
    }

    loadNote();
  }, [user, noteId]);

  const addTag = () => {
    const tag = editTagInput.trim().toLowerCase();
    if (tag && !editTags.includes(tag) && editTags.length < 10) {
      setEditTags([...editTags, tag]);
      setEditTagInput('');
    }
  };

  const removeTag = (index: number) => {
    setEditTags(editTags.filter((_, i) => i !== index));
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim()) {
      setError('Content is required');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await authenticatedFetch(`/api/notes/${noteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle.trim() || undefined,
          content: editContent.trim(),
          userTags: editTags
        })
      });

      const data = await response.json();

      if (data.success) {
        setNote(data.note);
        setIsEditing(false);
      } else {
        setError(data.error || 'Failed to save changes');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    setPublishError(null);
    setModerationInfo(null);

    try {
      const response = await authenticatedFetch(`/api/notes/${noteId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorFirstName: isAnonymous ? null : authorFirstName.trim() || null
        })
      });

      const data = await response.json();

      if (data.success) {
        setNote({ ...note!, status: 'published', publishedTipId: data.tip.id });
        setShowPublishDialog(false);
      } else {
        setModerationInfo(data.moderation || null);
        setPublishError(data.reason || data.message || data.error || 'Failed to publish');
      }
    } catch (err: any) {
      setPublishError(err.message || 'Failed to publish');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleUnpublish = async () => {
    setIsPublishing(true);

    try {
      const response = await authenticatedFetch(`/api/notes/${noteId}/publish`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        setNote({ ...note!, status: 'private', publishedTipId: undefined });
        setShowUnpublishDialog(false);
      } else {
        setError(data.error || 'Failed to unpublish');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to unpublish');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      const response = await authenticatedFetch(`/api/notes/${noteId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        router.push('/dashboard/notes');
      } else {
        setError(data.error || 'Failed to delete note');
        setShowDeleteDialog(false);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete note');
      setShowDeleteDialog(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const getCategoryLabel = (category?: string) => {
    const labels: Record<string, string> = {
      self_care: 'Self-Care',
      communication: 'Communication',
      medical_knowledge: 'Medical Knowledge',
      daily_care: 'Daily Care'
    };
    return category ? labels[category] || category : '';
  };

  if (loading) {
    return (
      <TrialExpirationGate featureName="caregiver notes">
        <EmailVerificationGate featureName="caregiver notes">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        </EmailVerificationGate>
      </TrialExpirationGate>
    );
  }

  if (!note) {
    return (
      <TrialExpirationGate featureName="caregiver notes">
        <EmailVerificationGate featureName="caregiver notes">
          <div className="max-w-4xl mx-auto">
            <Alert className="bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800">
              <AlertDescription className="text-red-800 dark:text-red-200">
                {error || 'Note not found'}
              </AlertDescription>
            </Alert>
            <div className="mt-4">
              <Link href="/dashboard/notes">
                <Button variant="outline">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Notes
                </Button>
              </Link>
            </div>
          </div>
        </EmailVerificationGate>
      </TrialExpirationGate>
    );
  }

  return (
    <TrialExpirationGate featureName="caregiver notes">
      <EmailVerificationGate featureName="caregiver notes">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard/notes">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <BookOpen className="w-7 h-7 text-blue-600" />
                  {isEditing ? 'Edit Note' : note.title}
                </h1>
                <div className="flex items-center gap-3 mt-1 text-sm text-gray-600 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(note.createdAt), 'MMMM d, yyyy')}
                  </span>
                  {note.inputMethod === 'voice' && (
                    <span className="flex items-center gap-1">
                      <Mic className="w-4 h-4" />
                      Voice
                    </span>
                  )}
                  {note.status === 'published' ? (
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                      <Globe className="w-3 h-3 mr-1" />
                      Published
                    </Badge>
                  ) : (
                    <Badge variant="outline">
                      <Lock className="w-3 h-3 mr-1" />
                      Private
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {!isEditing && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  <Edit3 className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>
            )}
          </div>

          {/* Error Alert */}
          {error && (
            <Alert className="bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800">
              <AlertDescription className="text-red-800 dark:text-red-200">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {isEditing ? (
                    <>
                      <Edit3 className="w-5 h-5 text-blue-600" />
                      Edit Content
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 text-purple-600" />
                      Content
                    </>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <>
                    {/* Edit Title */}
                    <div className="space-y-2">
                      <Label htmlFor="editTitle">Title</Label>
                      <Input
                        id="editTitle"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="Note title..."
                      />
                    </div>

                    {/* Edit Content */}
                    <div className="space-y-2">
                      <Label htmlFor="editContent">Content *</Label>
                      <Textarea
                        id="editContent"
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="min-h-[200px]"
                      />
                    </div>

                    {/* Edit Tags */}
                    <div className="space-y-2">
                      <Label htmlFor="editTags">Tags</Label>
                      <div className="flex gap-2">
                        <Input
                          id="editTags"
                          value={editTagInput}
                          onChange={(e) => setEditTagInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addTag();
                            }
                          }}
                          placeholder="Add a tag..."
                        />
                        <Button onClick={addTag} size="icon" type="button" variant="outline">
                          <Tag className="w-4 h-4" />
                        </Button>
                      </div>
                      {editTags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {editTags.map((tag, idx) => (
                            <Badge
                              key={idx}
                              variant="secondary"
                              className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                            >
                              {tag}
                              <button
                                type="button"
                                onClick={() => removeTag(idx)}
                                className="ml-1 hover:text-blue-900 dark:hover:text-blue-100"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Edit Actions */}
                    <div className="flex gap-2 pt-4">
                      <Button onClick={handleSaveEdit} disabled={isSaving}>
                        {isSaving ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4 mr-2" />
                        )}
                        Save Changes
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsEditing(false);
                          setEditTitle(note.title);
                          setEditContent(note.content);
                          setEditTags(note.userTags || []);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Display Content */}
                    <div className="prose dark:prose-invert max-w-none">
                      <p className="whitespace-pre-wrap">{note.content}</p>
                    </div>

                    {/* AI Summary */}
                    {note.aiMetadata?.summary && (
                      <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                        <p className="text-sm font-medium text-purple-800 dark:text-purple-200 mb-1">
                          AI Summary
                        </p>
                        <p className="text-sm text-purple-700 dark:text-purple-300">
                          {note.aiMetadata.summary}
                        </p>
                      </div>
                    )}

                    {/* Tags Section */}
                    <div className="space-y-3 pt-4 border-t dark:border-gray-700">
                      {/* AI Keywords */}
                      {note.aiMetadata?.keywords && note.aiMetadata.keywords.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
                            <Sparkles className="w-4 h-4 text-purple-600" />
                            AI Keywords
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {note.aiMetadata.keywords.map((keyword, idx) => (
                              <Badge
                                key={idx}
                                variant="outline"
                                className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800"
                              >
                                {keyword}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* User Tags */}
                      {note.userTags && note.userTags.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
                            <Tag className="w-4 h-4 text-blue-600" />
                            Your Tags
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {note.userTags.map((tag, idx) => (
                              <Badge
                                key={idx}
                                variant="secondary"
                                className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Category */}
                      {note.aiMetadata?.category && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Category
                          </p>
                          <Badge variant="outline">
                            {getCategoryLabel(note.aiMetadata.category)}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Source Citation */}
              {note.source?.sourceName && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Book className="w-5 h-5 text-orange-600" />
                      Source
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {note.source.sourceName}
                    </p>
                    {note.source.authorName && (
                      <p className="text-gray-600 dark:text-gray-400">
                        by {note.source.authorName}
                      </p>
                    )}
                    {note.source.sourceType && (
                      <Badge variant="outline" className="text-xs capitalize">
                        {note.source.sourceType.replace('_', ' ')}
                      </Badge>
                    )}
                    {note.source.referencePage && (
                      <p className="text-gray-500 dark:text-gray-500 text-xs">
                        {note.source.referencePage}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Publish/Unpublish Card */}
              {!isEditing && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Globe className="w-5 h-5 text-green-600" />
                      Sharing
                    </CardTitle>
                    <CardDescription>
                      {note.status === 'published'
                        ? 'This note is shared as a public tip'
                        : 'Share this insight with other caregivers'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {note.status === 'published' ? (
                      <div className="space-y-3">
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <p className="text-sm text-green-800 dark:text-green-200">
                            Published as a public tip
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => setShowUnpublishDialog(true)}
                        >
                          <Lock className="w-4 h-4 mr-2" />
                          Make Private
                        </Button>
                      </div>
                    ) : (
                      <Button
                        className="w-full"
                        onClick={() => setShowPublishDialog(true)}
                      >
                        <Globe className="w-4 h-4 mr-2" />
                        Publish as Tip
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>

        {/* Publish Dialog */}
        <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-green-600" />
                Publish as Public Tip
              </DialogTitle>
              <DialogDescription>
                Share this insight with the caregiving community. Your note will be
                reviewed for safety before publishing.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Author Attribution */}
              <div className="space-y-3">
                <Label>Author Attribution</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="anonymous"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="anonymous" className="font-normal cursor-pointer">
                    Publish anonymously
                  </Label>
                </div>
                {!isAnonymous && (
                  <div className="space-y-2">
                    <Label htmlFor="authorName">Your First Name (optional)</Label>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <Input
                        id="authorName"
                        value={authorFirstName}
                        onChange={(e) => setAuthorFirstName(e.target.value)}
                        placeholder="e.g., Sarah"
                      />
                    </div>
                    <p className="text-xs text-gray-500">
                      Only your first name will be shown (e.g., &quot;Tip by Sarah&quot;)
                    </p>
                  </div>
                )}
              </div>

              {/* Moderation Info */}
              {moderationInfo && (
                <Alert className="bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800">
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                    <p className="font-medium mb-1">Content Review Required</p>
                    <p className="text-sm">Safety Score: {moderationInfo.safetyScore}/100</p>
                    {moderationInfo.flags && moderationInfo.flags.length > 0 && (
                      <ul className="text-sm list-disc list-inside mt-1">
                        {moderationInfo.flags.map((flag, idx) => (
                          <li key={idx}>{flag}</li>
                        ))}
                      </ul>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {/* Publish Error */}
              {publishError && (
                <Alert className="bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800">
                  <AlertDescription className="text-red-800 dark:text-red-200">
                    {publishError}
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowPublishDialog(false);
                  setPublishError(null);
                  setModerationInfo(null);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handlePublish} disabled={isPublishing}>
                {isPublishing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Globe className="w-4 h-4 mr-2" />
                    Publish
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Unpublish Dialog */}
        <Dialog open={showUnpublishDialog} onOpenChange={setShowUnpublishDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-gray-600" />
                Make Note Private
              </DialogTitle>
              <DialogDescription>
                This will remove your tip from the public tips page. Other caregivers
                will no longer be able to see it.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowUnpublishDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleUnpublish} disabled={isPublishing}>
                {isPublishing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Unpublishing...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Make Private
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <Trash2 className="w-5 h-5" />
                Delete Note
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this note? This action cannot be undone.
                {note.status === 'published' && (
                  <span className="block mt-2 text-yellow-600 dark:text-yellow-400">
                    Note: This will also remove the published tip from the public tips page.
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </EmailVerificationGate>
    </TrialExpirationGate>
  );
}
