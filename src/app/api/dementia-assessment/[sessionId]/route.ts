/**
 * Session Details API
 *
 * GET /api/dementia-assessment/[sessionId] - Get session details
 * DELETE /api/dementia-assessment/[sessionId] - Abandon session
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken, canAccessElderProfileServer } from '@/lib/api/verifyAuth';
import { getSessionById, abandonSession } from '@/lib/medical/dementiaAssessment';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    // Verify authentication
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.userId) {
      return NextResponse.json(
        { success: false, error: authResult.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = authResult.userId;

    // Get session
    const session = await getSessionById(sessionId);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    // Verify session belongs to user
    if (session.caregiverId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Access denied to this session' },
        { status: 403 }
      );
    }

    // Verify access to elder
    const hasAccess = await canAccessElderProfileServer(userId, session.elderId, session.groupId);
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Access denied to this elder' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      session,
    });
  } catch (error) {
    console.error('[Session API] Error getting session:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get session' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    // Verify authentication
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.userId) {
      return NextResponse.json(
        { success: false, error: authResult.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = authResult.userId;

    // Get session
    const session = await getSessionById(sessionId);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    // Verify session belongs to user
    if (session.caregiverId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Access denied to this session' },
        { status: 403 }
      );
    }

    // Abandon session
    await abandonSession(sessionId);

    return NextResponse.json({
      success: true,
      message: 'Session abandoned',
    });
  } catch (error) {
    console.error('[Session API] Error abandoning session:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to abandon session' },
      { status: 500 }
    );
  }
}
