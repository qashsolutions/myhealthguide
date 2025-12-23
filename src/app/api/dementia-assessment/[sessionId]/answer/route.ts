/**
 * Submit Answer API
 *
 * POST /api/dementia-assessment/[sessionId]/answer - Submit an answer
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken, canAccessElderProfileServer } from '@/lib/api/verifyAuth';
import {
  getSessionById,
  saveAnswer,
  getQuestionById,
  formatQuestionText,
} from '@/lib/medical/dementiaAssessment';
import type {
  SubmitAnswerRequest,
  SubmitAnswerResponse,
  BaselineQuestion,
  AdaptiveQuestion,
} from '@/types/dementiaAssessment';

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
    const body: SubmitAnswerRequest = await request.json();
    const { questionId, answer, answerLabel } = body;

    if (!questionId || !answer || !answerLabel) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: questionId, answer, answerLabel' },
        { status: 400 }
      );
    }

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

    // Get the question (could be baseline or adaptive from request body)
    let question: BaselineQuestion | AdaptiveQuestion | undefined;

    // First try to find in baseline questions
    question = getQuestionById(questionId);

    // If not found in baseline, check if it's an adaptive question from session context
    if (!question) {
      // Adaptive questions are passed in request body with full structure
      const adaptiveFromBody = body as any;
      if (adaptiveFromBody.question && adaptiveFromBody.question.id === questionId) {
        question = adaptiveFromBody.question as AdaptiveQuestion;
      }
    }

    if (!question) {
      return NextResponse.json(
        { success: false, error: 'Question not found' },
        { status: 404 }
      );
    }

    // Save answer
    const { session: updatedSession, shouldBranch } = await saveAnswer(
      sessionId,
      question,
      answer,
      answerLabel
    );

    const response: SubmitAnswerResponse = {
      success: true,
      session: updatedSession,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Answer API] Error submitting answer:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to submit answer' },
      { status: 500 }
    );
  }
}
