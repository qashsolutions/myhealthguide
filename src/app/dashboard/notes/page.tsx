'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import MiniSearch from 'minisearch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Plus,
  Search,
  BookOpen,
  Loader2,
  Globe,
  Mic,
  Calendar,
  Filter
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useFeatureTracking } from '@/hooks/useFeatureTracking';
import { authenticatedFetch } from '@/lib/api/authenticatedFetch';
import { EmailVerificationGate } from '@/components/auth/EmailVerificationGate';
import type { CaregiverNote } from '@/types';
import { format } from 'date-fns';

export default function NotesPage() {
  const router = useRouter();
  const { user } = useAuth();

  // Feature tracking
  useFeatureTracking('my_notes');

  const [notes, setNotes] = useState<CaregiverNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'private' | 'published'>('all');

  // Initialize MiniSearch for local search
  const miniSearch = useMemo(() => {
    const ms = new MiniSearch<CaregiverNote>({
      fields: ['title', 'content', 'userTags'],
      storeFields: ['id', 'title', 'content', 'userTags', 'status', 'createdAt', 'aiMetadata', 'inputMethod'],
      searchOptions: {
        boost: { title: 2, userTags: 1.5 },
        fuzzy: 0.2,
        prefix: true,
      },
    });
    return ms;
  }, []);

  // Load notes
  useEffect(() => {
    async function loadNotes() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const response = await authenticatedFetch('/api/notes');
        const data = await response.json();

        if (data.success) {
          setNotes(data.notes);
          // Add to MiniSearch index
          miniSearch.removeAll();
          miniSearch.addAll(data.notes.map((n: CaregiverNote) => ({
            ...n,
            id: n.id,
            userTags: n.userTags?.join(' ') || ''
          })));
        } else {
          setError(data.error);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load notes');
      } finally {
        setLoading(false);
      }
    }

    loadNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Filter and search notes
  const filteredNotes = useMemo(() => {
    let result = notes;

    // Apply status filter
    if (filterStatus !== 'all') {
      result = result.filter(n => n.status === filterStatus);
    }

    // Apply search
    if (searchQuery.trim()) {
      const searchResults = miniSearch.search(searchQuery);
      const matchIds = new Set(searchResults.map(r => r.id));
      result = result.filter(n => matchIds.has(n.id!));
    }

    return result;
  }, [notes, filterStatus, searchQuery, miniSearch]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">Published</Badge>;
      case 'draft':
        return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">Draft</Badge>;
      default:
        return <Badge variant="outline">Private</Badge>;
    }
  };

  const getCategoryLabel = (category?: string) => {
    const labels: Record<string, string> = {
      self_care: 'Self-Care',
      communication: 'Communication',
      medical_knowledge: 'Medical',
      daily_care: 'Daily Care'
    };
    return category ? labels[category] || category : '';
  };

  if (loading) {
    return (
      <EmailVerificationGate featureName="caregiver notes">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </EmailVerificationGate>
    );
  }

  return (
    <EmailVerificationGate featureName="caregiver notes">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <BookOpen className="w-8 h-8 text-blue-600" />
                My Notes
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Capture caregiving insights and share tips with the community
              </p>
            </div>
            <div className="flex gap-2">
              <Link href="/tips">
                <Button variant="outline">
                  <Globe className="w-4 h-4 mr-2" />
                  Browse Tips
                </Button>
              </Link>
              <Link href="/dashboard/notes/new">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  New Note
                </Button>
              </Link>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-3 py-2 border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="all">All Notes</option>
                <option value="private">Private</option>
                <option value="published">Published</option>
              </select>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert className="bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800">
              <AlertDescription className="text-red-800 dark:text-red-200">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Empty State */}
          {filteredNotes.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BookOpen className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {searchQuery ? 'No notes match your search' : 'No notes yet'}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-center mb-4 max-w-md">
                  {searchQuery
                    ? 'Try different keywords or clear your search'
                    : 'Start capturing your caregiving insights, tips from books, or experiences to help yourself and others.'}
                </p>
                {!searchQuery && (
                  <Link href="/dashboard/notes/new">
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Your First Note
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ) : (
            /* Notes Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredNotes.map((note) => (
                <Card
                  key={note.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => router.push(`/dashboard/notes/${note.id}`)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg line-clamp-2">{note.title}</CardTitle>
                      {getStatusBadge(note.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Summary */}
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                      {note.aiMetadata?.summary || note.content.substring(0, 150)}
                    </p>

                    {/* Category Badge */}
                    {note.aiMetadata?.category && (
                      <Badge variant="outline" className="text-xs">
                        {getCategoryLabel(note.aiMetadata.category)}
                      </Badge>
                    )}

                    {/* Tags */}
                    {note.userTags && note.userTags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {note.userTags.slice(0, 3).map((tag, idx) => (
                          <Badge
                            key={idx}
                            variant="secondary"
                            className="text-xs bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                          >
                            {tag}
                          </Badge>
                        ))}
                        {note.userTags.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{note.userTags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Footer: Date and Input Method */}
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-2 border-t dark:border-gray-700">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{format(new Date(note.createdAt), 'MMM d, yyyy')}</span>
                      </div>
                      {note.inputMethod === 'voice' && (
                        <div className="flex items-center gap-1">
                          <Mic className="w-3 h-3" />
                          <span>Voice</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Results Count */}
          {notes.length > 0 && (
            <div className="text-center text-sm text-gray-500 dark:text-gray-400">
              Showing {filteredNotes.length} of {notes.length} notes
            </div>
          )}
        </div>
    </EmailVerificationGate>
  );
}
