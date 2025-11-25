import { NextRequest, NextResponse } from 'next/server';
import { processVoiceSearch } from '@/lib/ai/voiceSearch';

/**
 * Voice Search API Route
 * POST /api/voice-search
 *
 * Handles voice search queries using Gemini 3 Pro
 * Keeps API key secure on server side
 */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, userId, context } = body;

    if (!query) {
      return NextResponse.json(
        { error: 'Missing required field: query' },
        { status: 400 }
      );
    }

    // userId can be 'public' for unauthenticated users
    const isPublicUser = !userId || userId === 'public';

    // Process voice search
    const result = await processVoiceSearch({
      query,
      userId,
      context,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Voice search API error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
        answer: 'Sorry, I encountered an error processing your search. Please try again.',
        confidence: 'low',
        sources: [],
      },
      { status: 500 }
    );
  }
}
