/**
 * TEST ENDPOINT: Add Test Medication Logs
 *
 * This endpoint is for testing/debugging the insights compliance calculation.
 * It creates medication logs with various statuses (taken, missed) for the past weeks.
 *
 * DELETE THIS FILE BEFORE PRODUCTION or restrict to development environment.
 *
 * Usage: POST /api/test/add-medication-logs
 * Body: { elderId, groupId, medicationId?, medicationName? }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import { subDays, setHours, setMinutes } from 'date-fns';

export async function POST(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'This endpoint is disabled in production' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { elderId, groupId, medicationId, medicationName } = body;

    if (!elderId || !groupId) {
      return NextResponse.json(
        { error: 'elderId and groupId are required' },
        { status: 400 }
      );
    }

    const logsCollection = getAdminDb().collection('medication_logs');
    const logsCreated: string[] = [];

    // Create test logs for the past 30 days
    // Mix of taken and missed to test compliance calculation
    const now = new Date();

    // Morning doses (8 AM) and evening doses (8 PM)
    const schedules = [
      { hour: 8, minute: 0 },
      { hour: 20, minute: 0 },
    ];

    for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
      const date = subDays(now, dayOffset);

      for (const schedule of schedules) {
        const scheduledTime = setMinutes(setHours(date, schedule.hour), schedule.minute);

        // 70% taken, 20% missed, 10% skipped for realistic compliance
        const random = Math.random();
        let status: 'taken' | 'missed' | 'skipped';
        if (random < 0.7) {
          status = 'taken';
        } else if (random < 0.9) {
          status = 'missed';
        } else {
          status = 'skipped';
        }

        const logData = {
          medicationId: medicationId || 'test-medication-id',
          medicationName: medicationName || 'Test Medication',
          elderId,
          groupId,
          status,
          scheduledTime: Timestamp.fromDate(scheduledTime),
          actualTime: status === 'taken' ? Timestamp.fromDate(scheduledTime) : null,
          createdAt: Timestamp.fromDate(scheduledTime),
          loggedBy: 'test-script',
          notes: `Test log created for debugging (${status})`,
        };

        const docRef = await logsCollection.add(logData);
        logsCreated.push(docRef.id);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Created ${logsCreated.length} test medication logs`,
      logsCreated: logsCreated.length,
      dateRange: {
        from: subDays(now, 30).toISOString(),
        to: now.toISOString(),
      },
      note: 'Refresh the Insights page and check browser console for debug logs'
    });

  } catch (error) {
    console.error('Error creating test medication logs:', error);
    return NextResponse.json(
      { error: 'Failed to create test logs', details: String(error) },
      { status: 500 }
    );
  }
}

// GET endpoint to check existing logs
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const groupId = url.searchParams.get('groupId');
  const elderId = url.searchParams.get('elderId');

  if (!groupId) {
    return NextResponse.json(
      { error: 'groupId is required' },
      { status: 400 }
    );
  }

  try {
    const logsCollection = getAdminDb().collection('medication_logs');
    let query = logsCollection.where('groupId', '==', groupId);

    if (elderId) {
      query = query.where('elderId', '==', elderId);
    }

    const snapshot = await query.limit(100).get();
    const logs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      scheduledTime: doc.data().scheduledTime?.toDate?.()?.toISOString(),
      actualTime: doc.data().actualTime?.toDate?.()?.toISOString(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString(),
    }));

    // Count by status
    const statusCounts = logs.reduce((acc, log) => {
      const status = (log as any).status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      totalLogs: logs.length,
      statusCounts,
      sampleLogs: logs.slice(0, 5),
    });

  } catch (error) {
    console.error('Error fetching medication logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch logs', details: String(error) },
      { status: 500 }
    );
  }
}
