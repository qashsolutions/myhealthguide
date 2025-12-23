/**
 * Complete Assessment API
 *
 * POST /api/dementia-assessment/[sessionId]/complete - Complete assessment and generate results
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken, canAccessElderProfileServer, getUserDataServer } from '@/lib/api/verifyAuth';
import {
  getSessionById,
  completeSession,
  generateAssessmentResult,
} from '@/lib/medical/dementiaAssessment';
import type { UserRole } from '@/lib/medical/phiAuditLog';
import type { CompleteAssessmentResponse } from '@/types/dementiaAssessment';

export async function POST(
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

    // Check if session is already completed
    if (session.status === 'completed') {
      return NextResponse.json(
        { success: false, error: 'Session is already completed' },
        { status: 400 }
      );
    }

    // Check if we have enough answers
    if (session.answers.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot complete assessment with no answers' },
        { status: 400 }
      );
    }

    // Get user role
    const userData = await getUserDataServer(userId);
    const userRole: UserRole = userData?.role || 'member';

    // Complete the session
    const completedSession = await completeSession(sessionId);

    // Generate assessment result
    const result = await generateAssessmentResult(
      completedSession,
      userId,
      userRole
    );

    const response: CompleteAssessmentResponse = {
      success: true,
      result,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Complete Assessment API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to complete assessment' },
      { status: 500 }
    );
  }
}
