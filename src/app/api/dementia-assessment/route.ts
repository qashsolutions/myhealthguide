/**
 * Dementia Assessment API
 *
 * POST /api/dementia-assessment - Start a new assessment session
 * GET /api/dementia-assessment - List sessions for an elder
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken, canAccessElderProfileServer, getUserDataServer } from '@/lib/api/verifyAuth';
import {
  createAssessmentSession,
  getActiveSession,
  getElderSessions,
  getNextQuestion,
  BASELINE_QUESTIONS,
  formatQuestionText,
} from '@/lib/medical/dementiaAssessment';
import { verifyAndLogAccess } from '@/lib/consent/unifiedConsentManagement';
import type { StartAssessmentRequest, StartAssessmentResponse } from '@/types/dementiaAssessment';

/**
 * POST - Start a new assessment session or resume existing one
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.userId) {
      return NextResponse.json(
        { success: false, error: authResult.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = authResult.userId;
    const body: StartAssessmentRequest = await request.json();
    const { groupId, elderId, elderName, elderAge, knownConditions } = body;

    // Validate required fields
    if (!groupId || !elderId || !elderName) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: groupId, elderId, elderName' },
        { status: 400 }
      );
    }

    // Verify access to elder
    const hasAccess = await canAccessElderProfileServer(userId, elderId, groupId);
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Access denied to this elder' },
        { status: 403 }
      );
    }

    // Verify unified consent
    const { allowed, reason } = await verifyAndLogAccess(
      userId,
      groupId,
      'dementia_screening',
      elderId
    );

    if (!allowed) {
      return NextResponse.json(
        { success: false, error: reason || 'Consent required for dementia assessment' },
        { status: 403 }
      );
    }

    // Get user data for caregiver name
    const userData = await getUserDataServer(userId);
    const caregiverName = userData?.firstName && userData?.lastName
      ? `${userData.firstName} ${userData.lastName}`
      : 'Caregiver';

    // Check for existing active session
    const existingSession = await getActiveSession(groupId, elderId, userId);
    if (existingSession) {
      // Resume existing session
      const nextQuestion = getNextQuestion(existingSession);
      const response: StartAssessmentResponse = {
        success: true,
        session: existingSession,
        firstQuestion: nextQuestion ? {
          ...nextQuestion,
          questionText: formatQuestionText(nextQuestion, elderName),
        } : undefined,
      };
      return NextResponse.json(response);
    }

    // Create new session
    const session = await createAssessmentSession(
      groupId,
      elderId,
      elderName,
      userId,
      caregiverName,
      elderAge,
      knownConditions
    );

    // Get first question
    const firstQuestion = BASELINE_QUESTIONS[0];
    const response: StartAssessmentResponse = {
      success: true,
      session,
      firstQuestion: firstQuestion ? {
        ...firstQuestion,
        questionText: formatQuestionText(firstQuestion, elderName),
      } : undefined,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Dementia Assessment API] Error starting session:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to start assessment session' },
      { status: 500 }
    );
  }
}

/**
 * GET - List assessment sessions for an elder
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.userId) {
      return NextResponse.json(
        { success: false, error: authResult.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = authResult.userId;
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');
    const elderId = searchParams.get('elderId');

    if (!groupId || !elderId) {
      return NextResponse.json(
        { success: false, error: 'Missing required query params: groupId, elderId' },
        { status: 400 }
      );
    }

    // Verify access to elder
    const hasAccess = await canAccessElderProfileServer(userId, elderId, groupId);
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Access denied to this elder' },
        { status: 403 }
      );
    }

    // Get sessions
    const sessions = await getElderSessions(groupId, elderId);

    return NextResponse.json({
      success: true,
      sessions,
    });
  } catch (error) {
    console.error('[Dementia Assessment API] Error listing sessions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to list sessions' },
      { status: 500 }
    );
  }
}
