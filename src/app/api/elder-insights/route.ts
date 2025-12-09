/**
 * Elder Health Insights API Route
 *
 * POST /api/elder-insights
 * Generate health insights for an elder (observation-only)
 *
 * GET /api/elder-insights?elderId=xxx&groupId=xxx&limit=20&includeDismissed=false
 * Get existing insights for an elder
 *
 * AUTHENTICATION: Requires Firebase ID token in Authorization header
 */

export const dynamic = 'force-dynamic';

/*
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  verifyAuthToken,
  canAccessElderProfileServer,
  verifyAndLogAccessServer,
  getUserDataServer,
} from '@/lib/api/verifyAuth';
import { getElderHealthInsightsServer } from '@/lib/api/firestoreAdmin';
import {
  generateElderHealthInsights,
  generateAISummaryObservation,
} from '@/lib/ai/elderHealthInsights';

/**
 * GET - Retrieve existing insights for an elder
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[elder-insights GET] Starting request');

    // Verify authentication
    const authResult = await verifyAuthToken(request);
    console.log('[elder-insights GET] Auth result:', { success: authResult.success, userId: authResult.userId, error: authResult.error });

    if (!authResult.success || !authResult.userId) {
      return NextResponse.json(
        { error: authResult.error || 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const elderId = searchParams.get('elderId');
    const groupId = searchParams.get('groupId');
    const limitParam = searchParams.get('limit');
    const includeDismissed = searchParams.get('includeDismissed') === 'true';

    console.log('[elder-insights GET] Params:', { elderId, groupId, limitParam, includeDismissed });

    if (!elderId || !groupId) {
      return NextResponse.json(
        { error: 'elderId and groupId are required' },
        { status: 400 }
      );
    }

    // Verify user has access to this elder
    console.log('[elder-insights GET] Checking access for userId:', authResult.userId);
    const hasAccess = await canAccessElderProfileServer(authResult.userId, elderId, groupId);
    console.log('[elder-insights GET] hasAccess result:', hasAccess);

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'You do not have permission to access this elder\'s health profile' },
        { status: 403 }
      );
    }

    const limit = limitParam ? parseInt(limitParam, 10) : 20;
    const insights = await getElderHealthInsightsServer(elderId, groupId, includeDismissed, limit);

    return NextResponse.json({
      success: true,
      insights,
      count: insights.length,
    });
  } catch (error: any) {
    console.error('Error fetching elder insights:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch insights' },
      { status: 500 }
    );
  }
}

/**
 * POST - Generate new health insights for an elder
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[elder-insights POST] Starting request');

    // Verify authentication
    const authResult = await verifyAuthToken(request);
    console.log('[elder-insights POST] Auth result:', { success: authResult.success, userId: authResult.userId, error: authResult.error });

    if (!authResult.success || !authResult.userId) {
      return NextResponse.json(
        { error: authResult.error || 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = authResult.userId;
    const body = await request.json();
    const { elderId, groupId, days = 7, includeSummary = false } = body;

    console.log('[elder-insights POST] Body:', { elderId, groupId, days, includeSummary });

    // Validate required fields
    if (!elderId || !groupId) {
      return NextResponse.json(
        { error: 'Missing required fields: elderId, groupId' },
        { status: 400 }
      );
    }

    // Check if user can access this elder's profile
    console.log('[elder-insights POST] Checking access for userId:', userId);
    const hasAccess = await canAccessElderProfileServer(userId, elderId, groupId);
    console.log('[elder-insights POST] hasAccess result:', hasAccess);

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'You do not have permission to access this elder\'s health profile' },
        { status: 403 }
      );
    }

    // Check AI consent
    const consentCheck = await verifyAndLogAccessServer(
      userId,
      groupId,
      'health_change_detection',
      elderId
    );

    if (!consentCheck.allowed) {
      return NextResponse.json(
        {
          error: 'AI consent required',
          reason: consentCheck.reason,
          requiresConsent: true,
        },
        { status: 403 }
      );
    }

    // Get user role
    const userData = await getUserDataServer(userId);
    const userRole = userData?.role || 'member';

    // Generate insights
    const result = await generateElderHealthInsights(
      elderId,
      groupId,
      userId,
      userRole,
      days
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to generate insights' },
        { status: 500 }
      );
    }

    // Optionally generate AI summary
    let summary: string | undefined;
    if (includeSummary) {
      const summaryResult = await generateAISummaryObservation(
        elderId,
        groupId,
        userId,
        userRole,
        days
      );
      if (summaryResult.success) {
        summary = summaryResult.summary;
      }
    }

    return NextResponse.json({
      success: true,
      insights: result.insights,
      summary,
      count: result.insights.length,
      periodDays: days,
      disclaimer: 'These are factual observations from logged data only. This is not medical advice. Always consult your healthcare provider for medical decisions.',
    });
  } catch (error: any) {
    console.error('Elder insights generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate insights' },
      { status: 500 }
    );
  }
}
