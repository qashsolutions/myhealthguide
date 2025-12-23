/**
 * Assessment Results API
 *
 * GET /api/dementia-assessment/results - List assessment results for an elder
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken, canAccessElderProfileServer } from '@/lib/api/verifyAuth';
import { getElderResults } from '@/lib/medical/dementiaAssessment';

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

    // Get results
    const results = await getElderResults(groupId, elderId);

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error('[Results API] Error listing results:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to list results' },
      { status: 500 }
    );
  }
}
