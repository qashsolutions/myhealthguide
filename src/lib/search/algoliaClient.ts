/**
 * Algolia Search Client for Published Tips
 *
 * Provides full-text search across public caregiver tips with:
 * - Typo tolerance
 * - Faceted filtering by category
 * - Ranking by engagement (likes, views)
 */

import { algoliasearch } from 'algoliasearch';
import type { SearchClient } from 'algoliasearch';
import { PublishedTip, CaregiverNoteCategory } from '@/types';

// Initialize Algolia client (only if credentials are available)
let searchClient: SearchClient | null = null;

function initializeAlgolia(): SearchClient | null {
  const appId = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID;
  const searchKey = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY;

  if (!appId || !searchKey) {
    console.warn('Algolia credentials not configured');
    return null;
  }

  if (!searchClient) {
    searchClient = algoliasearch(appId, searchKey);
  }

  return searchClient;
}

// Admin client for write operations (server-side only)
function getAdminClient(): SearchClient | null {
  const appId = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID;
  const adminKey = process.env.ALGOLIA_ADMIN_KEY;

  if (!appId || !adminKey) {
    console.warn('Algolia admin credentials not configured');
    return null;
  }

  return algoliasearch(appId, adminKey);
}

const INDEX_NAME = 'published_tips';

/**
 * Algolia index settings - run once during initial setup
 */
export const ALGOLIA_INDEX_SETTINGS = {
  searchableAttributes: [
    'title',
    'content',
    'summary',
    'keywords',
    'userTags',
    'category',
    'authorFirstName',
    'source.title',
    'source.author'
  ],
  attributesForFaceting: [
    'filterOnly(category)',
    'filterOnly(isAnonymous)',
    'searchable(keywords)',
    'searchable(userTags)'
  ],
  customRanking: [
    'desc(likeCount)',
    'desc(viewCount)',
    'desc(publishedAt)'
  ],
  typoTolerance: true,
  minWordSizefor1Typo: 3,
  minWordSizefor2Typos: 7,
  highlightPreTag: '<mark>',
  highlightPostTag: '</mark>'
};

/**
 * Sync a published tip to Algolia
 */
export async function syncTipToAlgolia(tip: PublishedTip): Promise<string | null> {
  const client = getAdminClient();

  if (!client) {
    console.warn('Algolia not configured, skipping sync');
    return null;
  }

  const algoliaObject = {
    objectID: tip.id,
    title: tip.title,
    content: tip.content,
    summary: tip.summary,
    category: tip.category,
    keywords: tip.keywords,
    userTags: tip.userTags,
    authorFirstName: tip.authorFirstName || 'Anonymous',
    isAnonymous: tip.isAnonymous,
    source: tip.source,
    viewCount: tip.viewCount,
    likeCount: tip.likeCount,
    publishedAt: tip.publishedAt.getTime()
  };

  try {
    const result = await client.saveObject({
      indexName: INDEX_NAME,
      body: algoliaObject
    });
    return result.objectID || tip.id || null;
  } catch (error) {
    console.error('Failed to sync tip to Algolia:', error);
    return null;
  }
}

/**
 * Remove a tip from Algolia index
 */
export async function removeTipFromAlgolia(tipId: string): Promise<void> {
  const client = getAdminClient();

  if (!client) {
    return;
  }

  try {
    await client.deleteObject({
      indexName: INDEX_NAME,
      objectID: tipId
    });
  } catch (error) {
    console.error('Failed to remove tip from Algolia:', error);
  }
}

/**
 * Search tips using Algolia
 */
export interface TipSearchResult {
  tips: PublishedTip[];
  totalHits: number;
  page: number;
  totalPages: number;
  query: string;
}

export async function searchTips(
  query: string,
  options: {
    page?: number;
    hitsPerPage?: number;
    category?: CaregiverNoteCategory;
  } = {}
): Promise<TipSearchResult | null> {
  const client = initializeAlgolia();

  if (!client) {
    return null;
  }

  const { page = 0, hitsPerPage = 20, category } = options;

  const filters: string[] = [];
  if (category) {
    filters.push(`category:${category}`);
  }

  try {
    const result = await client.searchSingleIndex({
      indexName: INDEX_NAME,
      searchParams: {
        query,
        page,
        hitsPerPage,
        filters: filters.length > 0 ? filters.join(' AND ') : undefined,
        attributesToRetrieve: [
          'objectID', 'title', 'content', 'summary', 'category',
          'keywords', 'userTags', 'authorFirstName', 'isAnonymous',
          'source', 'viewCount', 'likeCount', 'publishedAt'
        ],
        attributesToHighlight: ['title', 'summary', 'content']
      }
    });

    const tips: PublishedTip[] = result.hits.map((hit: any) => ({
      id: hit.objectID,
      sourceNoteId: '', // Not stored in Algolia for privacy
      sourceUserId: '', // Not stored in Algolia for privacy
      title: hit.title,
      content: hit.content,
      summary: hit.summary,
      category: hit.category,
      keywords: hit.keywords || [],
      userTags: hit.userTags || [],
      authorFirstName: hit.authorFirstName,
      isAnonymous: hit.isAnonymous,
      source: hit.source,
      viewCount: hit.viewCount || 0,
      likeCount: hit.likeCount || 0,
      safetyScore: 100, // Only published tips are in Algolia
      publishedAt: new Date(hit.publishedAt)
    }));

    return {
      tips,
      totalHits: result.nbHits || 0,
      page: result.page || 0,
      totalPages: result.nbPages || 0,
      query
    };
  } catch (error) {
    console.error('Algolia search error:', error);
    return null;
  }
}

/**
 * Update tip engagement counts in Algolia
 */
export async function updateTipEngagement(
  tipId: string,
  counts: { viewCount?: number; likeCount?: number }
): Promise<void> {
  const client = getAdminClient();

  if (!client) {
    return;
  }

  try {
    await client.partialUpdateObject({
      indexName: INDEX_NAME,
      objectID: tipId,
      attributesToUpdate: counts
    });
  } catch (error) {
    console.error('Failed to update tip engagement in Algolia:', error);
  }
}

/**
 * Configure Algolia index settings (run once during setup)
 */
export async function configureAlgoliaIndex(): Promise<boolean> {
  const client = getAdminClient();

  if (!client) {
    console.error('Algolia admin credentials not available');
    return false;
  }

  try {
    await client.setSettings({
      indexName: INDEX_NAME,
      indexSettings: ALGOLIA_INDEX_SETTINGS
    });
    console.log('Algolia index configured successfully');
    return true;
  } catch (error) {
    console.error('Failed to configure Algolia index:', error);
    return false;
  }
}

/**
 * Check if Algolia is configured
 */
export function isAlgoliaConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_ALGOLIA_APP_ID &&
    process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY
  );
}
