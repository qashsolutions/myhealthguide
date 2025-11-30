/**
 * Elder Health Insights API Route
 *
 * POST /api/elder-insights
 * Generate health insights for an elder (observation-only)
 *
 * GET /api/elder-insights?elderId=xxx&limit=20&includeDismissed=false
 * Get existing insights for an elder
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  generateElderHealthInsights,
  generateAISummaryObservation,
} from '@/lib/ai/elderHealthInsights';
import {
  getElderHealthInsights,
  canAccessElderProfile,
} from '@/lib/firebase/elderHealthProfile';
import { verifyAndLogAccess } from '@/lib/consent/unifiedConsentManagement';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

/**
 * GET - Retrieve existing insights for an elder
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const elderId = searchParams.get('elderId');
    const groupId = searchParams.get('groupId');
    const limitParam = searchParams.get('limit');
    const includeDismissed = searchParams.get('includeDismissed') === 'true';

    if (!elderId || !groupId) {
      return NextResponse.json(
        { error: 'elderId and groupId are required' },
        { status: 400 }
      );
    }

    const limit = limitParam ? parseInt(limitParam, 10) : 20;
    const insights = await getElderHealthInsights(elderId, groupId, includeDismissed, limit);

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
    const body = await request.json();
    const { elderId, groupId, userId, days = 7, includeSummary = false } = body;

    // Validate required fields
    if (!elderId || !groupId || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: elderId, groupId, userId' },
        { status: 400 }
      );
    }

    // Check if user can access this elder's profile
    const hasAccess = await canAccessElderProfile(userId, elderId, groupId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'You do not have permission to access this elder\'s health profile' },
        { status: 403 }
      );
    }

    // Check AI consent (health insights use AI for data aggregation)
    const consentCheck = await verifyAndLogAccess(
      userId,
      groupId,
      'health_change_detection', // Using existing feature type
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
    const userDoc = await getDoc(doc(db, 'users', userId));
    const userData = userDoc.data();
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
