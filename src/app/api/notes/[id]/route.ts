/**
 * Individual Note API Route
 *
 * GET /api/notes/[id] - Get note by ID
 * PUT /api/notes/[id] - Update note
 * DELETE /api/notes/[id] - Delete note
 *
 * AUTHENTICATION: Requires Firebase ID token in Authorization header
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken, getUserDataServer } from '@/lib/api/verifyAuth';
import * as NotesAdmin from '@/lib/firebase/caregiverNotesAdmin';
import { processNoteContent } from '@/lib/ai/noteProcessingService';

/**
 * GET - Get a single note by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.userId) {
      return NextResponse.json(
        { error: authResult.error || 'Authentication required' },
        { status: 401 }
      );
    }

    const userData = await getUserDataServer(authResult.userId);
    const userRole = (userData?.groups?.[0]?.role as any) || 'member';

    const note = await NotesAdmin.getNote(
      params.id,
      authResult.userId,
      userRole
    );

    if (!note) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      note
    });
  } catch (error: any) {
    console.error('Error fetching note:', error);

    if (error.message.includes('Access denied')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to fetch note' },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update a note
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.userId) {
      return NextResponse.json(
        { error: authResult.error || 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { title, content, userTags, source } = body;

    const userData = await getUserDataServer(authResult.userId);
    const userRole = (userData?.groups?.[0]?.role as any) || 'member';
    const groupId = userData?.groups?.[0]?.groupId || '';

    // Build update object (only include fields that were provided)
    const updates: Record<string, any> = {};

    if (title !== undefined) {
      updates.title = title;
    }

    if (content !== undefined) {
      updates.content = content;
      // Re-process content with AI if it changed
      const aiMetadata = await processNoteContent(
        content,
        authResult.userId,
        userRole,
        groupId
      );
      updates.aiMetadata = aiMetadata;
    }

    if (userTags !== undefined) {
      updates.userTags = userTags;
    }

    if (source !== undefined) {
      updates.source = source;
    }

    const updatedNote = await NotesAdmin.updateNote(
      params.id,
      updates,
      authResult.userId,
      userRole
    );

    return NextResponse.json({
      success: true,
      note: updatedNote
    });
  } catch (error: any) {
    console.error('Error updating note:', error);

    if (error.message.includes('Access denied') || error.message.includes('not found')) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message.includes('not found') ? 404 : 403 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to update note' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete a note
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.userId) {
      return NextResponse.json(
        { error: authResult.error || 'Authentication required' },
        { status: 401 }
      );
    }

    const userData = await getUserDataServer(authResult.userId);
    const userRole = (userData?.groups?.[0]?.role as any) || 'member';

    await NotesAdmin.deleteNote(
      params.id,
      authResult.userId,
      userRole
    );

    return NextResponse.json({
      success: true,
      message: 'Note deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting note:', error);

    if (error.message.includes('Access denied') || error.message.includes('not found')) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message.includes('not found') ? 404 : 403 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to delete note' },
      { status: 500 }
    );
  }
}
