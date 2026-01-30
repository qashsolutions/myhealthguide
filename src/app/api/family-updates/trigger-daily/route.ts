/**
 * Trigger Daily Family Notes Email - Manual Test Endpoint
 * POST /api/family-updates/trigger-daily
 *
 * Calls the Cloud Function to send daily family notes immediately.
 * Used for testing - normally runs at 7 PM PST via scheduled Cloud Function.
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/api/verifyAuth';

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.userId) {
      return NextResponse.json({ success: false, error: authResult.error || 'Unauthorized' }, { status: 401 });
    }

    // Get the user's Firebase ID token to pass to the Cloud Function
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ success: false, error: 'No auth header' }, { status: 401 });
    }

    // Call the Cloud Function
    const functionUrl = 'https://us-central1-healthguide-bc3ba.cloudfunctions.net/triggerDailyFamilyNotes';

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ success: false, error: data.error || 'Cloud Function failed', status: response.status }, { status: response.status });
    }

    return NextResponse.json({ success: true, ...data });

  } catch (error) {
    console.error('Error triggering daily family notes:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
