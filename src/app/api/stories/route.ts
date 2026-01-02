/**
 * Stories API Route
 *
 * GET /api/stories - Get stories from published tips (public, no auth required)
 *
 * Returns:
 * - Agentic stories derived from published caregiver tips
 * - Each story is summarized to 15-20 words
 * - Stories are cached for 8 hours
 */

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';

interface Story {
  id: string;
  text: string;
  author: string;
  type: 'family' | 'agency';
  source: 'agentic';
}

// Simple cache to store stories for 8 hours
let cachedStories: Story[] = [];
let cacheTimestamp = 0;
const CACHE_DURATION_MS = 8 * 60 * 60 * 1000; // 8 hours

/**
 * Check if content qualifies as a real story
 * Must have personal experience, not just book recommendations or test content
 */
function isValidStory(content: string, title: string): boolean {
  const text = `${title} ${content}`.toLowerCase();

  // Minimum length - must be substantial
  if (content.length < 100) {
    return false;
  }

  // Must contain personal pronouns indicating real experience
  const personalPronouns = ['i ', 'my ', 'we ', 'our ', 'me ', 'us '];
  const hasPersonalExperience = personalPronouns.some(pronoun => text.includes(pronoun));

  // Exclude book/resource recommendations without stories
  const recommendationPatterns = [
    'read the book',
    'read this book',
    'check out',
    'recommend reading',
    'great resource',
    'good book',
  ];
  const isJustRecommendation = recommendationPatterns.some(pattern => text.includes(pattern))
    && !hasPersonalExperience;

  // Exclude obvious test content
  const testPatterns = ['test', 'lorem ipsum', 'placeholder', 'example'];
  const isTestContent = testPatterns.some(pattern => text.includes(pattern));

  if (isTestContent || isJustRecommendation) {
    return false;
  }

  // Must have personal experience OR be substantial enough (200+ chars)
  return hasPersonalExperience || content.length >= 200;
}

/**
 * Convert a published tip content to a short story (15-20 words)
 */
function summarizeToStory(content: string, title: string): string {
  // Take the first sentence or up to 100 chars as base
  let summary = content.split('.')[0];

  // If too long, truncate intelligently
  if (summary.length > 120) {
    summary = summary.substring(0, 117) + '...';
  }

  // If too short, use title + first part of content
  if (summary.length < 30 && title) {
    summary = `${title}. ${summary}`;
  }

  // Clean up
  summary = summary.trim();
  if (!summary.endsWith('.') && !summary.endsWith('!') && !summary.endsWith('?')) {
    summary += '.';
  }

  return summary;
}

/**
 * Determine story type based on category and content
 */
function determineStoryType(category: string, content: string): 'family' | 'agency' {
  const agencyKeywords = ['agency', 'caregiver', 'shift', 'staff', 'team', 'client', 'professional'];
  const contentLower = content.toLowerCase();

  if (agencyKeywords.some(kw => contentLower.includes(kw))) {
    return 'agency';
  }

  // Default to family for self_care, communication, daily_care
  return 'family';
}

export async function GET() {
  try {
    const now = Date.now();

    // Return cached stories if still valid
    if (cachedStories.length > 0 && (now - cacheTimestamp) < CACHE_DURATION_MS) {
      return NextResponse.json({
        success: true,
        stories: cachedStories,
        count: cachedStories.length,
        cached: true,
        nextRefresh: new Date(cacheTimestamp + CACHE_DURATION_MS).toISOString(),
      });
    }

    // Fetch fresh stories from published tips
    const adminDb = getAdminDb();
    const tipsSnapshot = await adminDb
      .collection('publishedTips')
      .orderBy('publishedAt', 'desc')
      .limit(20)
      .get();

    const stories: Story[] = [];

    tipsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const content = data.content || '';
      const title = data.title || '';

      // Only include tips that qualify as real stories
      if (isValidStory(content, title)) {
        const storyText = summarizeToStory(content, title);
        const authorName = data.isAnonymous
          ? 'Anonymous caregiver'
          : data.authorFirstName
            ? `${data.authorFirstName}, caregiver`
            : 'Community caregiver';

        stories.push({
          id: doc.id,
          text: storyText,
          author: authorName,
          type: determineStoryType(data.category || '', content),
          source: 'agentic',
        });
      }
    });

    // Update cache
    cachedStories = stories;
    cacheTimestamp = now;

    return NextResponse.json({
      success: true,
      stories,
      count: stories.length,
      cached: false,
      nextRefresh: new Date(now + CACHE_DURATION_MS).toISOString(),
    });
  } catch (error: any) {
    console.error('Error fetching stories:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch stories',
        stories: [],
        count: 0,
      },
      { status: 500 }
    );
  }
}
