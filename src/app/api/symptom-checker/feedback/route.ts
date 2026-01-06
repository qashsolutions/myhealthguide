/**
 * API Route: Symptom Checker Feedback
 *
 * POST /api/symptom-checker/feedback
 *
 * Allows users to provide feedback on AI-generated symptom assessments.
 * Also saves to aiFeedback collection for the Smart Learning System.
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { verifyAuthToken } from '@/lib/api/verifyAuth';
import { FeedbackRating } from '@/types/symptomChecker';
import type { AIFeedback, FeedbackContext } from '@/types/feedback';

interface FeedbackRequest {
  queryId: string;
  rating: FeedbackRating;
  comment?: string;
}

export async function POST(request: NextRequest) {
  console.log('[Symptom Checker Feedback API] Request received');

  try {
    const body: FeedbackRequest = await request.json();

    // Validate request
    if (!body.queryId) {
      return NextResponse.json({ success: false, error: 'Query ID is required' }, { status: 400 });
    }

    if (!body.rating || !['helpful', 'not_helpful'].includes(body.rating)) {
      return NextResponse.json({ success: false, error: 'Invalid rating value' }, { status: 400 });
    }

    const adminDb = getAdminDb();
    const queryRef = adminDb.collection('symptomCheckerQueries').doc(body.queryId);
    const queryDoc = await queryRef.get();

    if (!queryDoc.exists) {
      return NextResponse.json({ success: false, error: 'Query not found' }, { status: 404 });
    }

    // Optional: verify user owns this query (for registered users)
    const authResult = await verifyAuthToken(request);
    const queryData = queryDoc.data();

    // For registered users, verify ownership
    if (queryData?.userId && authResult.success && authResult.userId !== queryData.userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    // Update the query with feedback
    await queryRef.update({
      feedbackRating: body.rating,
      feedbackComment: body.comment || null,
      feedbackTimestamp: new Date(),
    });

    // Also save to aiFeedback collection for the Smart Learning System
    // This enables the preference learner to analyze symptom checker feedback
    if (queryData?.userId) {
      const responseText = queryData.initialResponse || '';
      let responseLength = 0;
      try {
        const parsed = JSON.parse(responseText);
        responseLength = JSON.stringify(parsed).length;
      } catch {
        responseLength = responseText.length;
      }

      const contextSnapshot: FeedbackContext = {
        elderAge: queryData.age,
        elderConditions: queryData.knownConditions ? queryData.knownConditions.split(',').map((c: string) => c.trim()) : [],
        aiModelUsed: queryData.aiModelUsed,
        responseLength,
        responseType: 'symptom_assessment',
      };

      const aiFeedback: Omit<AIFeedback, 'id'> = {
        feedbackType: 'rating',
        targetType: 'symptom_checker',
        targetId: body.queryId,
        userId: queryData.userId,
        groupId: queryData.groupId || '',
        elderId: queryData.elderId || undefined,
        rating: body.rating,
        comment: body.comment || undefined,
        contextSnapshot,
        createdAt: new Date(),
        resolved: false,
      };

      await adminDb.collection('aiFeedback').add(aiFeedback);
      console.log('[Symptom Checker Feedback API] Also saved to aiFeedback for learning');
    }

    console.log('[Symptom Checker Feedback API] Feedback saved for query:', body.queryId);

    return NextResponse.json({
      success: true,
      message: 'Thank you for your feedback!',
    });
  } catch (error) {
    console.error('[Symptom Checker Feedback API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save feedback' },
      { status: 500 }
    );
  }
}
