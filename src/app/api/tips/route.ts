/**
 * Public Tips API Route
 *
 * GET /api/tips - Get published tips (public, no auth required)
 *
 * Query params:
 * - limit: number (default 100)
 * - sortBy: 'date' | 'author' (default 'date')
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import * as NotesAdmin from '@/lib/firebase/caregiverNotesAdmin';

/**
 * GET - Get all published tips (public endpoint)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const sortBy = (searchParams.get('sortBy') || 'date') as 'date' | 'author';

    // Validate sortBy parameter
    if (sortBy !== 'date' && sortBy !== 'author') {
      return NextResponse.json(
        { error: 'sortBy must be "date" or "author"' },
        { status: 400 }
      );
    }

    const tips = await NotesAdmin.getPublishedTips(limit, sortBy);

    return NextResponse.json({
      success: true,
      tips,
      count: tips.length
    });
  } catch (error: any) {
    console.error('Error fetching tips:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch tips' },
      { status: 500 }
    );
  }
}
