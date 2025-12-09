/**
 * Weekly Summary API Route
 *
 * GET /api/weekly-summary?groupId=xxx&elderId=xxx&limit=4
 * Fetch past weekly summaries for an elder
 *
 * POST /api/weekly-summary
 * Generate a new weekly summary for an elder
 *
 * AUTHENTICATION: Requires Firebase ID token in Authorization header
 */

export const dynamic = 'force-dynamic';

/*
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateWeeklySummary } from '@/lib/ai/weeklySummary';
import {
  verifyAuthToken,
  canAccessElderProfileServer,
  verifyAndLogAccessServer,
  getUserDataServer,
} from '@/lib/api/verifyAuth';
import { getWeeklySummariesServer } from '@/lib/api/firestoreAdmin';

/**
 * GET /api/weekly-summary
 * Fetch past weekly summaries for an elder
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.userId) {
      return NextResponse.json(
        { success: false, error: authResult.error || 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');
    const elderId = searchParams.get('elderId');
    const limit = parseInt(searchParams.get('limit') || '4', 10);

    if (!groupId || !elderId) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters: groupId, elderId' },
        { status: 400 }
      );
    }

    // Verify user has access to this elder
    const hasAccess = await canAccessElderProfileServer(authResult.userId, elderId, groupId);
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to access this elder\'s data' },
        { status: 403 }
      );
    }

    const summaries = await getWeeklySummariesServer(groupId, elderId, limit);

    return NextResponse.json({
      success: true,
      data: summaries
    });

  } catch (error) {
    console.error('Error fetching weekly summaries:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch weekly summaries' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/weekly-summary
 * Generate a new weekly summary for an elder
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.userId) {
      return NextResponse.json(
        { success: false, error: authResult.error || 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = authResult.userId;
    const body = await request.json();
    const { groupId, elderId, elderName, weekOffset } = body;

    // Validate required fields
    if (!groupId || !elderId || !elderName) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: groupId, elderId, elderName' },
        { status: 400 }
      );
    }

    // Verify user has access to this elder
    const hasAccess = await canAccessElderProfileServer(userId, elderId, groupId);
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to access this elder\'s data' },
        { status: 403 }
      );
    }

    // Verify consent
    const { allowed, reason } = await verifyAndLogAccessServer(
      userId,
      groupId,
      'weekly_summary',
      elderId
    );

    if (!allowed) {
      return NextResponse.json(
        { success: false, error: reason || 'Consent required for AI features' },
        { status: 403 }
      );
    }

    // Get user role
    const userData = await getUserDataServer(userId);
    const userRole = userData?.role || 'admin';

    // Generate summary
    const summary = await generateWeeklySummary(
      groupId,
      elderId,
      elderName,
      userId,
      userRole,
      weekOffset || 0
    );

    if (!summary) {
      return NextResponse.json(
        { success: false, error: 'Weekly summary feature is disabled or no data available' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: summary
    });

  } catch (error) {
    console.error('Error generating weekly summary:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate weekly summary' },
      { status: 500 }
    );
  }
}
