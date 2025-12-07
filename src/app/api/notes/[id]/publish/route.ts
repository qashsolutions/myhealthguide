/**
 * Publish Note API Route
 *
 * POST /api/notes/[id]/publish - Moderate and publish note as a public tip
 *
 * AUTHENTICATION: Requires Firebase ID token in Authorization header
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken, getUserDataServer } from '@/lib/api/verifyAuth';
import * as NotesAdmin from '@/lib/firebase/caregiverNotesAdmin';
import { moderateNoteForPublishing } from '@/lib/ai/noteProcessingService';
import { syncTipToAlgolia, isAlgoliaConfigured } from '@/lib/search/algoliaClient';

/**
 * POST - Moderate and publish a note as a public tip
 */
export async function POST(
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
    const { authorFirstName } = body; // Optional - null for anonymous

    const userData = await getUserDataServer(authResult.userId);
    const userRole = (userData?.groups?.[0]?.role as any) || 'member';

    // Get the note first to verify ownership and get content
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

    if (note.status === 'published') {
      return NextResponse.json(
        { error: 'Note is already published' },
        { status: 400 }
      );
    }

    // Run AI moderation
    const moderation = await moderateNoteForPublishing(
      note.title,
      note.content,
      authResult.userId,
      userRole,
      note.groupId
    );

    // If safety score is below threshold, reject
    if (!moderation.canAutoApprove) {
      return NextResponse.json({
        success: false,
        moderation: {
          safetyScore: moderation.safetyScore,
          flags: moderation.flags,
          canAutoApprove: false
        },
        message: 'Content did not pass safety moderation',
        reason: moderation.reason || 'Content contains potentially harmful material. Please review and remove any profanity, personal information, or unsafe advice.'
      }, { status: 400 });
    }

    // Publish the note as a tip
    const tip = await NotesAdmin.publishNote(
      params.id,
      authorFirstName?.trim() || null,
      moderation.safetyScore,
      authResult.userId,
      userRole
    );

    // Sync to Algolia if configured
    if (isAlgoliaConfigured()) {
      try {
        const algoliaId = await syncTipToAlgolia(tip);
        if (algoliaId) {
          await NotesAdmin.updateTipAlgoliaId(tip.id!, algoliaId);
        }
      } catch (algoliaError) {
        console.error('Failed to sync to Algolia:', algoliaError);
        // Don't fail the request if Algolia sync fails
      }
    }

    return NextResponse.json({
      success: true,
      tip,
      moderation: {
        safetyScore: moderation.safetyScore,
        flags: moderation.flags,
        canAutoApprove: true
      },
      message: 'Note published successfully as a public tip'
    });
  } catch (error: any) {
    console.error('Error publishing note:', error);

    if (error.message.includes('Access denied') || error.message.includes('not found')) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message.includes('not found') ? 404 : 403 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to publish note' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Unpublish a tip (revert to private note)
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

    await NotesAdmin.unpublishNote(
      params.id,
      authResult.userId,
      userRole
    );

    return NextResponse.json({
      success: true,
      message: 'Tip unpublished successfully'
    });
  } catch (error: any) {
    console.error('Error unpublishing note:', error);

    if (error.message.includes('Access denied') || error.message.includes('not found') || error.message.includes('not published')) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message.includes('not found') ? 404 : 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to unpublish note' },
      { status: 500 }
    );
  }
}
