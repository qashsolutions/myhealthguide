/**
 * Feature Ranking Utilities
 *
 * Shared utilities for dynamic ranking of features, tips, and notes
 * based on user engagement data.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  increment,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { TrackableFeature, UserFeatureEngagement } from '@/types/engagement';

// ============= Constants =============

/**
 * Critical features that should always be prioritized
 * Order matters - first items get highest priority
 */
export const CRITICAL_FEATURES = [
  'voice',      // Voice logging
  'ai',         // Smart Summaries (displayed as "Helpful Summaries")
  'analytics',  // Analytics
  'safety',     // Safety Checks
  'tracking',   // Core tracking
] as const;

/**
 * Mapping from feature page categories to trackable features
 */
export const FEATURE_CATEGORY_MAP: Record<string, TrackableFeature[]> = {
  voice: ['daily_care', 'daily_care_medications', 'daily_care_diet'],
  ai: ['ask_ai', 'ask_ai_chat', 'ask_ai_clinical_notes', 'ask_ai_reports'],
  tracking: ['daily_care', 'daily_care_medications', 'daily_care_supplements', 'daily_care_diet', 'daily_care_activity'],
  safety: ['safety_alerts', 'safety_alerts_interactions', 'safety_alerts_incidents', 'safety_alerts_conflicts', 'safety_alerts_screening'],
  notifications: ['overview', 'daily_care'],
  collaboration: ['care_management'],
  agency: ['agency_management', 'care_management'],
  analytics: ['analytics', 'analytics_adherence', 'analytics_nutrition', 'analytics_trends'],
  security: ['settings'],
  data: ['analytics', 'ask_ai_reports'],
};

/**
 * Mapping from note categories to feature categories
 */
export const NOTE_CATEGORY_TO_FEATURE: Record<string, string[]> = {
  self_care: ['notifications', 'collaboration'],
  communication: ['collaboration', 'agency'],
  medical_knowledge: ['safety', 'ai', 'tracking'],
  daily_care: ['tracking', 'voice'],
};

/**
 * Mapping from tip categories to feature categories
 */
export const TIP_CATEGORY_TO_FEATURE: Record<string, string[]> = {
  self_care: ['notifications', 'collaboration'],
  communication: ['collaboration', 'agency'],
  medical_knowledge: ['safety', 'ai', 'analytics'],
  daily_care: ['tracking', 'voice'],
};

// ============= Engagement Score Calculation =============

/**
 * Calculate engagement score for a feature based on user stats
 */
export function calculateEngagementScore(stats: UserFeatureEngagement): number {
  const visitWeight = 1;
  const timeWeight = 0.001; // Convert ms to reasonable scale
  const completionWeight = 10;
  const recencyWeight = 0.5;

  // Base score from visits and time
  const baseScore = (stats.visitCount * visitWeight) + (stats.avgTimeSpentMs * timeWeight);

  // Bonus for action completion
  const completionBonus = stats.actionsCompleted * completionWeight * stats.completionRate;

  // Recency bonus (decay over 7 days)
  const daysSinceVisit = Math.max(0, (Date.now() - new Date(stats.lastVisit).getTime()) / (1000 * 60 * 60 * 24));
  const recencyMultiplier = Math.max(0.1, 1 - (daysSinceVisit / 7) * recencyWeight);

  return (baseScore + completionBonus) * recencyMultiplier;
}

/**
 * Get aggregated engagement score for a feature category
 */
export function getCategoryEngagementScore(
  categoryId: string,
  userStats: UserFeatureEngagement[]
): number {
  const trackableFeatures = FEATURE_CATEGORY_MAP[categoryId] || [];

  const relevantStats = userStats.filter(s =>
    trackableFeatures.includes(s.feature)
  );

  if (relevantStats.length === 0) return 0;

  return relevantStats.reduce((sum, stats) => sum + calculateEngagementScore(stats), 0);
}

// ============= Feature Category Ranking =============

export interface RankedFeatureCategory {
  id: string;
  score: number;
  isCritical: boolean;
  isPersonalized: boolean;
}

/**
 * Rank feature categories based on user engagement
 */
export function rankFeatureCategories(
  categoryIds: string[],
  userStats: UserFeatureEngagement[],
  isAgencyUser: boolean = false
): RankedFeatureCategory[] {
  const ranked: RankedFeatureCategory[] = categoryIds.map(id => {
    const isCritical = CRITICAL_FEATURES.includes(id as any);
    const engagementScore = getCategoryEngagementScore(id, userStats);

    // Critical features get a large base score
    const criticalBonus = isCritical ? 1000 - (CRITICAL_FEATURES.indexOf(id as any) * 100) : 0;

    // Agency users get bonus for agency features
    const agencyBonus = isAgencyUser && id === 'agency' ? 500 : 0;

    return {
      id,
      score: criticalBonus + agencyBonus + engagementScore,
      isCritical,
      isPersonalized: engagementScore > 0,
    };
  });

  // Sort by score descending
  return ranked.sort((a, b) => b.score - a.score);
}

// ============= Aggregate Feature Stats =============

const AGGREGATE_STATS_COLLECTION = 'aggregateFeatureStats';

export interface AggregateFeatureStats {
  categoryId: string;
  totalViews: number;
  uniqueUsers: number;
  avgEngagementScore: number;
  lastUpdated: Date;
}

/**
 * Get aggregate feature stats for anonymous users
 */
export async function getAggregateFeatureStats(): Promise<AggregateFeatureStats[]> {
  try {
    const snapshot = await getDocs(collection(db, AGGREGATE_STATS_COLLECTION));
    return snapshot.docs.map(doc => ({
      ...doc.data(),
      lastUpdated: doc.data().lastUpdated?.toDate?.() || new Date(),
    })) as AggregateFeatureStats[];
  } catch (error) {
    console.error('Error getting aggregate stats:', error);
    return [];
  }
}

/**
 * Update aggregate feature stats (called when user engages with features)
 */
export async function updateAggregateFeatureStats(
  categoryId: string,
  engagementScore: number
): Promise<void> {
  try {
    const statsRef = doc(db, AGGREGATE_STATS_COLLECTION, categoryId);
    const existing = await getDoc(statsRef);

    if (existing.exists()) {
      const data = existing.data();
      const newTotalViews = (data.totalViews || 0) + 1;
      const newAvgScore = ((data.avgEngagementScore || 0) * data.totalViews + engagementScore) / newTotalViews;

      await setDoc(statsRef, {
        categoryId,
        totalViews: increment(1),
        avgEngagementScore: newAvgScore,
        lastUpdated: Timestamp.now(),
      }, { merge: true });
    } else {
      await setDoc(statsRef, {
        categoryId,
        totalViews: 1,
        uniqueUsers: 1,
        avgEngagementScore: engagementScore,
        lastUpdated: Timestamp.now(),
      });
    }
  } catch (error) {
    console.error('Error updating aggregate stats:', error);
  }
}

/**
 * Rank categories for anonymous users based on aggregate popularity
 */
export function rankCategoriesForAnonymous(
  categoryIds: string[],
  aggregateStats: AggregateFeatureStats[]
): RankedFeatureCategory[] {
  const statsMap = new Map(aggregateStats.map(s => [s.categoryId, s]));

  const ranked: RankedFeatureCategory[] = categoryIds.map(id => {
    const isCritical = CRITICAL_FEATURES.includes(id as any);
    const stats = statsMap.get(id);
    const popularityScore = stats ? (stats.totalViews * 0.1 + stats.avgEngagementScore) : 0;

    // Critical features get priority
    const criticalBonus = isCritical ? 1000 - (CRITICAL_FEATURES.indexOf(id as any) * 100) : 0;

    return {
      id,
      score: criticalBonus + popularityScore,
      isCritical,
      isPersonalized: false,
    };
  });

  return ranked.sort((a, b) => b.score - a.score);
}

// ============= Tip Engagement =============

const TIP_ENGAGEMENT_COLLECTION = 'tipEngagement';

export interface TipEngagement {
  tipId: string;
  viewCount: number;
  uniqueViewers: number;
  lastViewedAt: Date;
  trendingScore: number; // Views in last 7 days weighted by recency
}

/**
 * Track a tip view
 */
export async function trackTipView(tipId: string, userId?: string): Promise<void> {
  try {
    const engagementRef = doc(db, TIP_ENGAGEMENT_COLLECTION, tipId);
    const existing = await getDoc(engagementRef);

    if (existing.exists()) {
      await setDoc(engagementRef, {
        viewCount: increment(1),
        lastViewedAt: Timestamp.now(),
      }, { merge: true });
    } else {
      await setDoc(engagementRef, {
        tipId,
        viewCount: 1,
        uniqueViewers: 1,
        lastViewedAt: Timestamp.now(),
        trendingScore: 1,
      });
    }
  } catch (error) {
    console.error('Error tracking tip view:', error);
  }
}

/**
 * Get tip engagement data
 */
export async function getTipEngagement(tipIds: string[]): Promise<Map<string, TipEngagement>> {
  const result = new Map<string, TipEngagement>();

  if (tipIds.length === 0) return result;

  try {
    // Fetch in batches of 10 (Firestore 'in' query limit)
    const batchSize = 10;
    for (let i = 0; i < tipIds.length; i += batchSize) {
      const batch = tipIds.slice(i, i + batchSize);
      const q = query(
        collection(db, TIP_ENGAGEMENT_COLLECTION),
        where('tipId', 'in', batch)
      );
      const snapshot = await getDocs(q);

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        result.set(data.tipId, {
          ...data,
          lastViewedAt: data.lastViewedAt?.toDate?.() || new Date(),
        } as TipEngagement);
      });
    }
  } catch (error) {
    console.error('Error getting tip engagement:', error);
  }

  return result;
}

/**
 * Get trending tips (most viewed in last 7 days)
 */
export async function getTrendingTipIds(limitCount: number = 10): Promise<string[]> {
  try {
    const q = query(
      collection(db, TIP_ENGAGEMENT_COLLECTION),
      orderBy('viewCount', 'desc'),
      limit(limitCount)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data().tipId);
  } catch (error) {
    console.error('Error getting trending tips:', error);
    return [];
  }
}

// ============= Tip Ranking =============

export interface RankedTip {
  tipId: string;
  score: number;
  isTrending: boolean;
  isRelevant: boolean;
}

/**
 * Calculate relevance score for a tip based on user's engaged features
 */
export function calculateTipRelevanceScore(
  tipCategory: string,
  userStats: UserFeatureEngagement[]
): number {
  const relatedFeatureCategories = TIP_CATEGORY_TO_FEATURE[tipCategory] || [];

  let relevanceScore = 0;
  for (const featureCategory of relatedFeatureCategories) {
    relevanceScore += getCategoryEngagementScore(featureCategory, userStats);
  }

  return relevanceScore;
}

/**
 * Rank tips based on user engagement and popularity
 */
export function rankTips(
  tips: Array<{ id: string; category: string; publishedAt: Date | string }>,
  userStats: UserFeatureEngagement[],
  tipEngagement: Map<string, TipEngagement>,
  trendingIds: string[]
): RankedTip[] {
  const trendingSet = new Set(trendingIds);

  const ranked: RankedTip[] = tips.map(tip => {
    const engagement = tipEngagement.get(tip.id);
    const isTrending = trendingSet.has(tip.id);

    // Relevance based on user's engaged features
    const relevanceScore = calculateTipRelevanceScore(tip.category, userStats);
    const isRelevant = relevanceScore > 0;

    // Popularity score
    const popularityScore = engagement ? engagement.viewCount * 0.5 : 0;

    // Trending bonus
    const trendingBonus = isTrending ? 100 : 0;

    // Relevance bonus
    const relevanceBonus = relevanceScore * 2;

    // Recency score (newer tips get slight boost)
    const publishedDate = new Date(tip.publishedAt);
    const daysSincePublished = (Date.now() - publishedDate.getTime()) / (1000 * 60 * 60 * 24);
    const recencyScore = Math.max(0, 30 - daysSincePublished); // Decays over 30 days

    return {
      tipId: tip.id,
      score: trendingBonus + relevanceBonus + popularityScore + recencyScore,
      isTrending,
      isRelevant,
    };
  });

  return ranked.sort((a, b) => b.score - a.score);
}

// ============= Note Ranking =============

export interface RankedNote {
  noteId: string;
  score: number;
  isSuggested: boolean;
  relevanceReason?: string;
}

/**
 * Calculate relevance score for a note based on user's engaged features
 */
export function calculateNoteRelevanceScore(
  noteCategory: string | undefined,
  userStats: UserFeatureEngagement[]
): { score: number; reason?: string } {
  if (!noteCategory) return { score: 0 };

  const relatedFeatureCategories = NOTE_CATEGORY_TO_FEATURE[noteCategory] || [];

  let relevanceScore = 0;
  let topFeature = '';
  let topScore = 0;

  for (const featureCategory of relatedFeatureCategories) {
    const score = getCategoryEngagementScore(featureCategory, userStats);
    if (score > topScore) {
      topScore = score;
      topFeature = featureCategory;
    }
    relevanceScore += score;
  }

  const reason = topScore > 0
    ? `Related to your ${topFeature} activity`
    : undefined;

  return { score: relevanceScore, reason };
}

/**
 * Rank notes based on relevance and recency
 */
export function rankNotes(
  notes: Array<{
    id: string;
    category?: string;
    createdAt: Date | string;
    updatedAt?: Date | string;
  }>,
  userStats: UserFeatureEngagement[]
): RankedNote[] {
  const ranked: RankedNote[] = notes.map(note => {
    // Relevance based on user's engaged features
    const { score: relevanceScore, reason } = calculateNoteRelevanceScore(
      note.category,
      userStats
    );

    // Recency score
    const updatedDate = note.updatedAt ? new Date(note.updatedAt) : new Date(note.createdAt);
    const daysSinceUpdate = (Date.now() - updatedDate.getTime()) / (1000 * 60 * 60 * 24);
    const recencyScore = Math.max(0, 100 - daysSinceUpdate * 2); // Decays over 50 days

    // Mark as suggested if high relevance
    const isSuggested = relevanceScore > 50;

    return {
      noteId: note.id,
      score: relevanceScore * 2 + recencyScore,
      isSuggested,
      relevanceReason: isSuggested ? reason : undefined,
    };
  });

  return ranked.sort((a, b) => b.score - a.score);
}
