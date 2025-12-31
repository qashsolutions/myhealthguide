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
  Filter,
  Zap,
  Clock,
  Sparkles
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useFeatureTracking } from '@/hooks/useFeatureTracking';
import { getUserFeatureStats } from '@/lib/engagement/featureTracker';
import { rankNotes, type RankedNote } from '@/lib/engagement/featureRanking';
import { authenticatedFetch } from '@/lib/api/authenticatedFetch';
import { EmailVerificationGate } from '@/components/auth/EmailVerificationGate';
import type { CaregiverNote } from '@/types';
import type { UserFeatureEngagement } from '@/types/engagement';
import { format } from 'date-fns';

type SortOption = 'recent' | 'relevant';

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
  const [sortBy, setSortBy] = useState<SortOption>('relevant');

  // Ranking state
  const [userStats, setUserStats] = useState<UserFeatureEngagement[]>([]);
  const [rankedNotes, setRankedNotes] = useState<Map<string, RankedNote>>(new Map());
  const [isPersonalized, setIsPersonalized] = useState(false);

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

  // Load notes and ranking data
  useEffect(() => {
    async function loadNotesAndRanking() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Load notes and user stats in parallel
        const [notesResponse, stats] = await Promise.all([
          authenticatedFetch('/api/notes'),
          getUserFeatureStats(user.id),
        ]);

        const data = await notesResponse.json();

        if (data.success) {
          setNotes(data.notes);
          setUserStats(stats);
          setIsPersonalized(stats.length > 0);

          // Add to MiniSearch index
          miniSearch.removeAll();
          miniSearch.addAll(data.notes.map((n: CaregiverNote) => ({
            ...n,
            id: n.id,
            userTags: n.userTags?.join(' ') || ''
          })));

          // Calculate rankings
          const notesForRanking = data.notes.map((n: CaregiverNote) => ({
            id: n.id!,
            category: n.aiMetadata?.category,
            createdAt: n.createdAt,
            updatedAt: n.updatedAt,
          }));

          const ranked = rankNotes(notesForRanking, stats);
          const rankedMap = new Map(ranked.map(r => [r.noteId, r]));
          setRankedNotes(rankedMap);
        } else {
          setError(data.error);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load notes');
      } finally {
        setLoading(false);
      }
    }

    loadNotesAndRanking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Get ranking info for a note
  const getRankingInfo = (noteId: string) => rankedNotes.get(noteId);

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

    // Apply sort
    if (sortBy === 'relevant') {
      result = [...result].sort((a, b) => {
        const rankA = rankedNotes.get(a.id!) || { score: 0 };
        const rankB = rankedNotes.get(b.id!) || { score: 0 };
        return rankB.score - rankA.score;
      });
    } else {
      // Sort by recent (created date)
      result = [...result].sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA;
      });
    }

    return result;
  }, [notes, filterStatus, searchQuery, miniSearch, sortBy, rankedNotes]);

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
            <div className="flex gap-2 items-center">
              {/* Sort Toggle */}
              <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                <button
                  onClick={() => setSortBy('relevant')}
                  className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-md transition-colors ${
                    sortBy === 'relevant'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Relevant
                </button>
                <button
                  onClick={() => setSortBy('recent')}
                  className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-md transition-colors ${
                    sortBy === 'recent'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  Recent
                </button>
              </div>

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

          {/* Personalization indicator */}
          {isPersonalized && sortBy === 'relevant' && (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <Zap className="w-4 h-4" />
              <span>Notes ordered by relevance to your recent activity</span>
            </div>
          )}

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
              {filteredNotes.map((note) => {
                const ranking = getRankingInfo(note.id!);
                return (
                  <Card
                    key={note.id}
                    className={`hover:shadow-lg transition-shadow cursor-pointer ${
                      ranking?.isSuggested && sortBy === 'relevant'
                        ? 'ring-2 ring-green-200 dark:ring-green-800'
                        : ''
                    }`}
                    onClick={() => router.push(`/dashboard/notes/${note.id}`)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <CardTitle className="text-lg line-clamp-2">{note.title}</CardTitle>
                          {/* Suggested indicator */}
                          {ranking?.isSuggested && sortBy === 'relevant' && (
                            <div className="flex items-center gap-1 mt-1">
                              <Badge variant="outline" className="text-xs border-green-500 text-green-600 dark:text-green-400">
                                <Zap className="w-3 h-3 mr-1" />
                                Suggested
                              </Badge>
                              {ranking.relevanceReason && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {ranking.relevanceReason}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
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
                );
              })}
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
