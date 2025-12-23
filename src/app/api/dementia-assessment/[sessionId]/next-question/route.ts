/**
 * Next Question API
 *
 * GET /api/dementia-assessment/[sessionId]/next-question - Get next question
 *
 * This endpoint handles both:
 * - Getting the next baseline question
 * - Generating adaptive follow-up questions when triggered
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken, canAccessElderProfileServer, getUserDataServer } from '@/lib/api/verifyAuth';
import {
  getSessionById,
  getNextQuestion,
  isAssessmentComplete,
  getDomainAnswers,
  getAdaptiveFollowUp,
  formatQuestionText,
  BRANCHING_CONFIG,
} from '@/lib/medical/dementiaAssessment';
import type { UserRole } from '@/lib/medical/phiAuditLog';
import type { AIBranchingRequest } from '@/types/dementiaAssessment';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const { searchParams } = new URL(request.url);
    const triggerBranching = searchParams.get('branch') === 'true';
    const triggeringQuestionId = searchParams.get('triggeringQuestionId');

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

    // Check if assessment is complete
    if (isAssessmentComplete(session)) {
      return NextResponse.json({
        success: true,
        assessmentComplete: true,
        session,
      });
    }

    // Handle adaptive branching if triggered
    if (triggerBranching && triggeringQuestionId) {
      const triggeringAnswer = session.answers.find(a => a.questionId === triggeringQuestionId);

      if (triggeringAnswer && (triggeringAnswer.concernLevel === 'concerning' || triggeringAnswer.concernLevel === 'moderate')) {
        // Get user role
        const userData = await getUserDataServer(userId);
        const userRole: UserRole = userData?.role || 'member';

        // Calculate current depth for this chain
        let currentDepth = 0;
        let parentId = triggeringQuestionId;
        while (parentId) {
          const parentAnswer = session.answers.find(a => a.questionId === parentId && a.isAdaptive);
          if (parentAnswer && parentAnswer.parentQuestionId) {
            currentDepth++;
            parentId = parentAnswer.parentQuestionId;
          } else {
            break;
          }
        }

        // Check if we should branch
        if (
          currentDepth < BRANCHING_CONFIG.maxDepthPerDomain &&
          session.adaptiveQuestionsAsked < BRANCHING_CONFIG.maxAdaptiveTotal
        ) {
          const branchingRequest: AIBranchingRequest = {
            sessionId,
            elderName: session.elderName,
            elderAge: session.elderAge,
            knownConditions: session.knownConditions,
            currentDomain: triggeringAnswer.domain,
            previousAnswers: getDomainAnswers(session, triggeringAnswer.domain),
            triggeringAnswer,
            currentDepth,
            maxDepth: BRANCHING_CONFIG.maxDepthPerDomain,
          };

          try {
            const branchingResponse = await getAdaptiveFollowUp(
              branchingRequest,
              userId,
              userRole,
              session.groupId,
              session.elderId
            );

            if (branchingResponse.shouldContinueBranching && branchingResponse.nextQuestion) {
              // Format question with elder name
              const formattedQuestion = {
                ...branchingResponse.nextQuestion,
                questionText: branchingResponse.nextQuestion.questionText.replace(
                  /{elderName}/g,
                  session.elderName
                ),
              };

              return NextResponse.json({
                success: true,
                nextQuestion: formattedQuestion,
                isAdaptiveQuestion: true,
                branchingReason: branchingResponse.branchingReason,
                assessmentComplete: false,
                session,
              });
            }
          } catch (error) {
            console.warn('[Next Question API] Branching failed, continuing with baseline:', error);
          }
        }
      }
    }

    // Get next baseline question
    const nextQuestion = getNextQuestion(session);

    if (!nextQuestion) {
      // No more questions - assessment complete
      return NextResponse.json({
        success: true,
        assessmentComplete: true,
        session,
      });
    }

    return NextResponse.json({
      success: true,
      nextQuestion: {
        ...nextQuestion,
        questionText: formatQuestionText(nextQuestion, session.elderName),
      },
      isAdaptiveQuestion: false,
      assessmentComplete: false,
      session,
    });
  } catch (error) {
    console.error('[Next Question API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get next question' },
      { status: 500 }
    );
  }
}
