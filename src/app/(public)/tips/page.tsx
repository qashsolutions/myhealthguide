'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Search,
  Lightbulb,
  Loader2,
  Calendar,
  User,
  Book,
  ChevronDown,
  Heart,
  Sparkles,
  Filter,
  ArrowLeft,
  LogIn,
  ShieldCheck,
  TrendingUp,
  Zap,
  Eye
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserFeatureStats } from '@/lib/engagement/featureTracker';
import {
  trackTipView,
  getTipEngagement,
  getTrendingTipIds,
  rankTips,
  type TipEngagement,
  type RankedTip,
} from '@/lib/engagement/featureRanking';
import type { PublishedTip, CaregiverNoteCategory } from '@/types';
import type { UserFeatureEngagement } from '@/types/engagement';
import { format, isToday, isThisWeek, isThisMonth, parseISO } from 'date-fns';

type SortOption = 'date' | 'author' | 'relevant';
type CategoryFilter = CaregiverNoteCategory | 'all';

interface GroupedTips {
  today: PublishedTip[];
  thisWeek: PublishedTip[];
  thisMonth: PublishedTip[];
  older: PublishedTip[];
}

export default function TipsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [tips, setTips] = useState<PublishedTip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('relevant');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');

  // Ranking state
  const [userStats, setUserStats] = useState<UserFeatureEngagement[]>([]);
  const [tipEngagement, setTipEngagement] = useState<Map<string, TipEngagement>>(new Map());
  const [trendingIds, setTrendingIds] = useState<string[]>([]);
  const [rankedTips, setRankedTips] = useState<Map<string, RankedTip>>(new Map());
  const [isPersonalized, setIsPersonalized] = useState(false);

  // Collapsible state for date groups
  const [todayOpen, setTodayOpen] = useState(true);
  const [weekOpen, setWeekOpen] = useState(true);
  const [monthOpen, setMonthOpen] = useState(true);
  const [olderOpen, setOlderOpen] = useState(false);

  // Check if user can share tips (signed in + email verified + phone verified)
  // NOTE: Subscription is NOT required for notes/tips feature
  const isSignedIn = !!user;
  const isEmailVerified = user?.emailVerified === true;
  const isPhoneVerified = user?.phoneVerified === true;
  const canShareTip = isSignedIn && isEmailVerified && isPhoneVerified;

  // Determine what message to show
  const getShareTipMessage = () => {
    if (!isSignedIn) {
      return 'Sign in to share tips with the community';
    }
    if (!isEmailVerified && !isPhoneVerified) {
      return 'Verify your email and phone number to share tips';
    }
    if (!isEmailVerified) {
      return 'Verify your email address to share tips';
    }
    if (!isPhoneVerified) {
      return 'Verify your phone number to share tips';
    }
    return '';
  };

  const handleShareTipClick = () => {
    if (!isSignedIn) {
      router.push('/login?redirect=/tips');
    } else if (!isEmailVerified) {
      router.push('/verify-email');
    } else if (!isPhoneVerified) {
      router.push('/dashboard/settings?tab=security');
    } else {
      router.push('/dashboard/notes/new');
    }
  };

  // Load tips and ranking data
  useEffect(() => {
    async function loadTipsAndRanking() {
      try {
        // Load tips
        const response = await fetch('/api/tips?limit=200&sortBy=date');
        const data = await response.json();

        if (data.success) {
          setTips(data.tips);

          // Load ranking data in parallel
          const tipIds = data.tips.map((t: PublishedTip) => t.id!);

          const [engagement, trending, stats] = await Promise.all([
            getTipEngagement(tipIds),
            getTrendingTipIds(10),
            user?.id ? getUserFeatureStats(user.id) : Promise.resolve([]),
          ]);

          setTipEngagement(engagement);
          setTrendingIds(trending);
          setUserStats(stats);
          setIsPersonalized(stats.length > 0);

          // Calculate rankings
          const tipsForRanking = data.tips.map((t: PublishedTip) => ({
            id: t.id!,
            category: t.category,
            publishedAt: t.publishedAt,
          }));

          const ranked = rankTips(tipsForRanking, stats, engagement, trending);
          const rankedMap = new Map(ranked.map(r => [r.tipId, r]));
          setRankedTips(rankedMap);
        } else {
          setError(data.error || 'Failed to load tips');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load tips');
      } finally {
        setLoading(false);
      }
    }

    loadTipsAndRanking();
  }, [user?.id]);

  // Search tips
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      // Reset to full list
      setLoading(true);
      try {
        const response = await fetch('/api/tips?limit=200&sortBy=date');
        const data = await response.json();
        if (data.success) {
          setTips(data.tips);
        }
      } catch (err) {
        // Keep existing tips
      }
      setLoading(false);
      return;
    }

    setSearching(true);
    try {
      const params = new URLSearchParams({
        q: searchQuery,
        hitsPerPage: '50'
      });
      if (categoryFilter !== 'all') {
        params.append('category', categoryFilter);
      }

      const response = await fetch(`/api/tips/search?${params}`);
      const data = await response.json();

      if (data.success) {
        setTips(data.tips || data.hits || []);
      }
    } catch (err: any) {
      // Keep existing tips on error
    } finally {
      setSearching(false);
    }
  };

  // Get ranking info for a tip
  const getRankingInfo = (tipId: string) => rankedTips.get(tipId);

  // Filter and sort tips
  const filteredTips = useMemo(() => {
    let result = [...tips];

    // Apply category filter
    if (categoryFilter !== 'all') {
      result = result.filter(tip => tip.category === categoryFilter);
    }

    // Apply sort
    if (sortBy === 'relevant') {
      // Sort by ranking score
      result.sort((a, b) => {
        const rankA = rankedTips.get(a.id!) || { score: 0 };
        const rankB = rankedTips.get(b.id!) || { score: 0 };
        return rankB.score - rankA.score;
      });
    } else if (sortBy === 'author') {
      result.sort((a, b) => {
        const nameA = a.authorFirstName || 'zzz'; // Anonymous at end
        const nameB = b.authorFirstName || 'zzz';
        return nameA.localeCompare(nameB);
      });
    } else {
      result.sort((a, b) => {
        const dateA = new Date(a.publishedAt).getTime();
        const dateB = new Date(b.publishedAt).getTime();
        return dateB - dateA; // Newest first
      });
    }

    return result;
  }, [tips, categoryFilter, sortBy, rankedTips]);

  // Group tips by date
  const groupedTips = useMemo((): GroupedTips => {
    if (sortBy !== 'date') {
      return { today: [], thisWeek: [], thisMonth: [], older: filteredTips };
    }

    const groups: GroupedTips = {
      today: [],
      thisWeek: [],
      thisMonth: [],
      older: []
    };

    filteredTips.forEach(tip => {
      const date = new Date(tip.publishedAt);
      if (isToday(date)) {
        groups.today.push(tip);
      } else if (isThisWeek(date)) {
        groups.thisWeek.push(tip);
      } else if (isThisMonth(date)) {
        groups.thisMonth.push(tip);
      } else {
        groups.older.push(tip);
      }
    });

    return groups;
  }, [filteredTips, sortBy]);

  // Group tips by author (A-Z)
  const authorGroupedTips = useMemo(() => {
    if (sortBy !== 'author') return {};

    const groups: Record<string, PublishedTip[]> = {};
    filteredTips.forEach(tip => {
      const firstLetter = tip.authorFirstName
        ? tip.authorFirstName.charAt(0).toUpperCase()
        : 'Anonymous';
      if (!groups[firstLetter]) {
        groups[firstLetter] = [];
      }
      groups[firstLetter].push(tip);
    });

    return groups;
  }, [filteredTips, sortBy]);

  const getCategoryLabel = (category: CaregiverNoteCategory) => {
    const labels: Record<CaregiverNoteCategory, string> = {
      self_care: 'Self-Care',
      communication: 'Communication',
      medical_knowledge: 'Medical Knowledge',
      daily_care: 'Daily Care'
    };
    return labels[category];
  };

  const getCategoryColor = (category: CaregiverNoteCategory) => {
    const colors: Record<CaregiverNoteCategory, string> = {
      self_care: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
      communication: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      medical_knowledge: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      daily_care: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
    };
    return colors[category];
  };

  const TipCard = ({ tip }: { tip: PublishedTip }) => {
    const ranking = getRankingInfo(tip.id!);
    const engagement = tipEngagement.get(tip.id!);

    // Track view on click
    const handleClick = () => {
      trackTipView(tip.id!, user?.id);
    };

    return (
      <Card
        className="hover:shadow-lg transition-shadow cursor-pointer"
        onClick={handleClick}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <CardTitle className="text-lg line-clamp-2">{tip.title}</CardTitle>
              {/* Ranking indicators */}
              <div className="flex items-center gap-2 mt-1">
                {ranking?.isTrending && (
                  <Badge variant="outline" className="text-xs border-orange-500 text-orange-600 dark:text-orange-400">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    Trending
                  </Badge>
                )}
                {ranking?.isRelevant && isPersonalized && (
                  <Badge variant="outline" className="text-xs border-green-500 text-green-600 dark:text-green-400">
                    <Zap className="w-3 h-3 mr-1" />
                    For You
                  </Badge>
                )}
                {engagement && engagement.viewCount > 10 && !ranking?.isTrending && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {engagement.viewCount}
                  </span>
                )}
              </div>
            </div>
            <Badge className={getCategoryColor(tip.category)}>
              {getCategoryLabel(tip.category)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Summary */}
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
            {tip.summary}
          </p>

        {/* Keywords */}
        {tip.keywords && tip.keywords.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tip.keywords.slice(0, 4).map((keyword, idx) => (
              <Badge
                key={idx}
                variant="outline"
                className="text-xs bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300"
              >
                {keyword}
              </Badge>
            ))}
            {tip.keywords.length > 4 && (
              <Badge variant="outline" className="text-xs">
                +{tip.keywords.length - 4}
              </Badge>
            )}
          </div>
        )}

        {/* Source */}
        {tip.source?.sourceName && (
          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <Book className="w-3 h-3" />
            <span className="truncate">
              {tip.source.sourceName}
              {tip.source.authorName && ` by ${tip.source.authorName}`}
            </span>
          </div>
        )}

        {/* Footer */}
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-2 border-t dark:border-gray-700">
            <div className="flex items-center gap-1">
              <User className="w-3 h-3" />
              <span>
                {tip.isAnonymous || !tip.authorFirstName
                  ? 'Anonymous'
                  : tip.authorFirstName}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{format(new Date(tip.publishedAt), 'MMM d, yyyy')}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const DateGroupSection = ({
    title,
    tips,
    isOpen,
    onOpenChange
  }: {
    title: string;
    tips: PublishedTip[];
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
  }) => {
    if (tips.length === 0) return null;

    return (
      <Collapsible open={isOpen} onOpenChange={onOpenChange}>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 mb-4">
          <span className="font-semibold text-gray-900 dark:text-white">
            {title} ({tips.length})
          </span>
          <ChevronDown
            className={`w-5 h-5 text-gray-500 transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {tips.map((tip) => (
              <TipCard key={tip.id} tip={tip} />
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Lightbulb className="w-8 h-8 text-yellow-500" />
              Caregiver Tips
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Insights and tips shared by fellow caregivers
            </p>
          </div>
          {canShareTip ? (
            <Link href="/dashboard/notes/new">
              <Button>
                <Sparkles className="w-4 h-4 mr-2" />
                Share a Tip
              </Button>
            </Link>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={handleShareTipClick} variant="outline">
                  {!isSignedIn ? (
                    <LogIn className="w-4 h-4 mr-2" />
                  ) : (
                    <ShieldCheck className="w-4 h-4 mr-2" />
                  )}
                  Share a Tip
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{getShareTipMessage()}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search tips..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
                className="pl-10"
              />
            </div>
            <Button onClick={handleSearch} disabled={searching}>
              {searching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              <span className="ml-2">Search</span>
            </Button>
          </div>

          <div className="flex flex-wrap gap-4 mt-4">
            {/* Category Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
                className="px-3 py-1.5 text-sm border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="all">All Categories</option>
                <option value="self_care">Self-Care</option>
                <option value="communication">Communication</option>
                <option value="medical_knowledge">Medical Knowledge</option>
                <option value="daily_care">Daily Care</option>
              </select>
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="px-3 py-1.5 text-sm border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="relevant">Relevant</option>
                <option value="date">Date</option>
                <option value="author">Author (A-Z)</option>
              </select>
            </div>

            {/* Personalization indicator */}
            {isPersonalized && sortBy === 'relevant' && (
              <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                <Zap className="w-3 h-3" />
                <span>Personalized for you</span>
              </div>
            )}
            {!user && sortBy === 'relevant' && (
              <Link href="/login?redirect=/tips" className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 hover:underline">
                <LogIn className="w-3 h-3" />
                <span>Sign in for personalized tips</span>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert className="bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800">
          <AlertDescription className="text-red-800 dark:text-red-200">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Empty State */}
      {filteredTips.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Lightbulb className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {searchQuery ? 'No tips found' : 'No tips yet'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-center mb-4 max-w-md">
              {searchQuery
                ? 'Try different keywords or clear your search'
                : 'Be the first to share a caregiving tip with the community!'}
            </p>
            {!searchQuery && (
              canShareTip ? (
                <Link href="/dashboard/notes/new">
                  <Button>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Share the First Tip
                  </Button>
                </Link>
              ) : (
                <Button onClick={handleShareTipClick} variant="outline">
                  {!isSignedIn ? (
                    <LogIn className="w-4 h-4 mr-2" />
                  ) : (
                    <ShieldCheck className="w-4 h-4 mr-2" />
                  )}
                  Share the First Tip
                </Button>
              )
            )}
          </CardContent>
        </Card>
      ) : sortBy === 'date' ? (
        /* Date-grouped view */
        <div>
          <DateGroupSection
            title="Today"
            tips={groupedTips.today}
            isOpen={todayOpen}
            onOpenChange={setTodayOpen}
          />
          <DateGroupSection
            title="This Week"
            tips={groupedTips.thisWeek}
            isOpen={weekOpen}
            onOpenChange={setWeekOpen}
          />
          <DateGroupSection
            title="This Month"
            tips={groupedTips.thisMonth}
            isOpen={monthOpen}
            onOpenChange={setMonthOpen}
          />
          <DateGroupSection
            title="Older"
            tips={groupedTips.older}
            isOpen={olderOpen}
            onOpenChange={setOlderOpen}
          />
        </div>
      ) : (
        /* Author-grouped view (A-Z) */
        <div className="space-y-6">
          {Object.keys(authorGroupedTips)
            .sort()
            .map((letter) => (
              <div key={letter}>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    {letter === 'Anonymous' ? <User className="w-4 h-4" /> : letter}
                  </span>
                  {letter === 'Anonymous' ? 'Anonymous Contributors' : letter}
                  <span className="text-sm font-normal text-gray-500">
                    ({authorGroupedTips[letter].length})
                  </span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {authorGroupedTips[letter].map((tip) => (
                    <TipCard key={tip.id} tip={tip} />
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Results Count */}
      {tips.length > 0 && (
        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
          Showing {filteredTips.length} of {tips.length} tips
        </div>
      )}
      </div>
    </TooltipProvider>
  );
}
