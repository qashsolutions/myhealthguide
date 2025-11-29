import { NextRequest, NextResponse } from 'next/server';
import { generateWeeklySummary, getWeeklySummaries } from '@/lib/ai/weeklySummary';
import { verifyAndLogAccess } from '@/lib/consent/unifiedConsentManagement';

/**
 * GET /api/weekly-summary
 * Fetch past weekly summaries for an elder
 */
export async function GET(request: NextRequest) {
  try {
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

    const summaries = await getWeeklySummaries(groupId, elderId, limit);

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
    const body = await request.json();
    const { userId, groupId, elderId, elderName, userRole, weekOffset } = body;

    // Validate required fields
    if (!userId || !groupId || !elderId || !elderName) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: userId, groupId, elderId, elderName' },
        { status: 400 }
      );
    }

    // Verify consent
    const { allowed, reason } = await verifyAndLogAccess(
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

    // Generate summary
    const summary = await generateWeeklySummary(
      groupId,
      elderId,
      elderName,
      userId,
      userRole || 'admin',
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
