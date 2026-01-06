/**
 * API Route: Symptom Checker History
 *
 * GET /api/symptom-checker/history
 *
 * Fetches symptom check history for the authenticated user.
 * Returns past queries with symptoms, urgency, and AI responses.
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { verifyAuthToken } from '@/lib/api/verifyAuth';
import { UrgencyLevel } from '@/types/symptomChecker';

interface SymptomHistoryItem {
  id: string;
  symptomsDescription: string;
  createdAt: string;
  urgencyLevel: UrgencyLevel | null;
  age: number;
  gender: string;
  assessmentHeadline?: string;
  isEmergency: boolean;
  elderId?: string;
  elderName?: string;
}

interface SymptomHistoryResponse {
  success: boolean;
  history: SymptomHistoryItem[];
  total: number;
}

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = authResult.userId;
    const { searchParams } = new URL(request.url);
    const limitParam = parseInt(searchParams.get('limit') || '20', 10);
    const queryLimit = Math.min(Math.max(limitParam, 1), 50); // Between 1 and 50

    const adminDb = getAdminDb();

    // Fetch user's symptom check history
    const queriesRef = adminDb.collection('symptomCheckerQueries');
    const snapshot = await queriesRef
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(queryLimit)
      .get();

    const history: SymptomHistoryItem[] = snapshot.docs.map(doc => {
      const data = doc.data();

      // Parse the refined response to get the assessment headline
      let assessmentHeadline: string | undefined;
      if (data.refinedResponse) {
        try {
          const parsed = JSON.parse(data.refinedResponse);
          assessmentHeadline = parsed.assessmentHeadline;
        } catch {
          // Ignore parse errors
        }
      }

      return {
        id: doc.id,
        symptomsDescription: data.symptomsDescription,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        urgencyLevel: data.urgencyLevel || null,
        age: data.age,
        gender: data.gender,
        assessmentHeadline,
        isEmergency: data.isEmergency || false,
        elderId: data.elderId || undefined,
        elderName: data.elderName || undefined,
      };
    });

    const response: SymptomHistoryResponse = {
      success: true,
      history,
      total: history.length,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Symptom History API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch symptom history' },
      { status: 500 }
    );
  }
}
