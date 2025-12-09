/**
 * Caregiver Notes API Route
 *
 * GET /api/notes - Get user's notes
 * POST /api/notes - Create new note
 *
 * AUTHENTICATION: Requires Firebase ID token in Authorization header
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken, getUserDataServer } from '@/lib/api/verifyAuth';
import * as NotesAdmin from '@/lib/firebase/caregiverNotesAdmin';
import { processNoteContent, cleanupVoiceTranscript } from '@/lib/ai/noteProcessingService';

/**
 * GET - Get user's caregiver notes
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.userId) {
      return NextResponse.json(
        { error: authResult.error || 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // Get user data for role
    const userData = await getUserDataServer(authResult.userId);
    const userRole = (userData?.groups?.[0]?.role as any) || 'member';
    const groupId = userData?.groups?.[0]?.groupId || '';

    const notes = await NotesAdmin.getNotesByUser(
      authResult.userId,
      userRole,
      groupId,
      limit
    );

    return NextResponse.json({
      success: true,
      notes,
      count: notes.length
    });
  } catch (error: any) {
    console.error('Error fetching notes:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch notes' },
      { status: 500 }
    );
  }
}

/**
 * POST - Create a new caregiver note
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.userId) {
      return NextResponse.json(
        { error: authResult.error || 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      content,
      title,
      userTags,
      source,
      inputMethod,
      voiceTranscript,
      groupId
    } = body;

    // Validation
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'content is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    if (!groupId) {
      return NextResponse.json(
        { error: 'groupId is required' },
        { status: 400 }
      );
    }

    // Get user data for role
    const userData = await getUserDataServer(authResult.userId);
    const userRole = (userData?.groups?.[0]?.role as any) || 'member';

    // Clean up voice transcript if provided
    let processedContent = content.trim();
    if (inputMethod === 'voice' && voiceTranscript) {
      processedContent = await cleanupVoiceTranscript(
        voiceTranscript,
        authResult.userId,
        userRole,
        groupId
      );
    }

    // Process content with AI to extract metadata
    const aiMetadata = await processNoteContent(
      processedContent,
      authResult.userId,
      userRole,
      groupId
    );

    // Create note
    const note = await NotesAdmin.createNote({
      userId: authResult.userId,
      groupId,
      title: title?.trim() || aiMetadata.generatedTitle,
      content: processedContent,
      userTags: Array.isArray(userTags) ? userTags : [],
      source: source || undefined,
      inputMethod: inputMethod || 'manual',
      voiceTranscript: voiceTranscript || undefined,
      aiMetadata,
      status: 'private',
      createdAt: new Date(),
      updatedAt: new Date()
    }, authResult.userId, userRole);

    return NextResponse.json({
      success: true,
      note
    });
  } catch (error: any) {
    console.error('Error creating note:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create note' },
      { status: 500 }
    );
  }
}
