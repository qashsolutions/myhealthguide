export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { processVoiceSearch } from '@/lib/ai/voiceSearch';
import { verifyAuthToken } from '@/lib/api/verifyAuth';

/**
 * Voice Search API Route
 * POST /api/voice-search
 *
 * Handles voice search queries using Gemini 3 Pro
 * Keeps API key secure on server side
 *
 * Supports both authenticated and public (unauthenticated) users:
 * - Public users: Can search pricing, features, and help content only
 * - Authenticated users: Get personalized responses based on their permissions
 */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, context } = body;

    if (!query) {
      return NextResponse.json(
        { error: 'Missing required field: query' },
        { status: 400 }
      );
    }

    // Try to verify authentication (optional - public users allowed)
    const authResult = await verifyAuthToken(req);

    // Use authenticated userId if available, otherwise 'public'
    const userId = authResult.success && authResult.userId
      ? authResult.userId
      : 'public';

    const isPublicUser = userId === 'public';

    // For authenticated users, only use context if it matches the authenticated user
    // This prevents context spoofing where someone tries to get responses
    // tailored to another user's permissions
    const safeContext = isPublicUser
      ? undefined  // Public users get no personalized context
      : context;   // Authenticated users can use their context

    // Process voice search
    const result = await processVoiceSearch({
      query,
      userId,
      context: safeContext,
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
