/**
 * Tips Search API Route (Algolia)
 *
 * GET /api/tips/search - Search published tips using Algolia
 *
 * Query params:
 * - q: search query (required)
 * - page: page number (default 0)
 * - hitsPerPage: results per page (default 20)
 * - category: filter by category (optional)
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { searchTips, isAlgoliaConfigured } from '@/lib/search/algoliaClient';
import { CaregiverNotesService } from '@/lib/firebase/caregiverNotes';
import { CaregiverNoteCategory } from '@/types';

/**
 * GET - Search tips using Algolia (or fallback to Firestore)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const page = parseInt(searchParams.get('page') || '0', 10);
    const hitsPerPage = parseInt(searchParams.get('hitsPerPage') || '20', 10);
    const category = searchParams.get('category') as CaregiverNoteCategory | null;

    // Validate category if provided
    const validCategories: CaregiverNoteCategory[] = [
      'self_care', 'communication', 'medical_knowledge', 'daily_care'
    ];
    if (category && !validCategories.includes(category)) {
      return NextResponse.json(
        { error: 'Invalid category. Must be one of: self_care, communication, medical_knowledge, daily_care' },
        { status: 400 }
      );
    }

    // Try Algolia search if configured
    if (isAlgoliaConfigured() && query.trim()) {
      const result = await searchTips(query, {
        page,
        hitsPerPage,
        category: category || undefined
      });

      if (result) {
        return NextResponse.json({
          success: true,
          ...result,
          source: 'algolia'
        });
      }
    }

    // Fallback to Firestore (basic listing, no full-text search)
    const tips = await CaregiverNotesService.getPublishedTips(hitsPerPage, 'date');

    // Basic client-side filtering if query provided
    let filteredTips = tips;

    if (query.trim()) {
      const lowerQuery = query.toLowerCase();
      filteredTips = tips.filter(tip =>
        tip.title.toLowerCase().includes(lowerQuery) ||
        tip.content.toLowerCase().includes(lowerQuery) ||
        tip.keywords.some(k => k.toLowerCase().includes(lowerQuery)) ||
        tip.userTags.some(t => t.toLowerCase().includes(lowerQuery))
      );
    }

    if (category) {
      filteredTips = filteredTips.filter(tip => tip.category === category);
    }

    return NextResponse.json({
      success: true,
      tips: filteredTips,
      totalHits: filteredTips.length,
      page: 0,
      totalPages: 1,
      query,
      source: 'firestore'
    });
  } catch (error: any) {
    console.error('Error searching tips:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to search tips' },
      { status: 500 }
    );
  }
}
