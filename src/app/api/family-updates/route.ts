/**
 * Family Updates API
 * Uses Admin SDK for family update reports
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { verifyAuthToken } from '@/lib/api/verifyAuth';

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.userId) {
      return NextResponse.json({ success: false, error: authResult.error || 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');
    const elderId = searchParams.get('elderId');

    if (!groupId || !elderId) {
      return NextResponse.json({ success: false, error: 'groupId and elderId are required' }, { status: 400 });
    }

    const db = getAdminDb();

    // Verify user has access to this group
    const groupDoc = await db.collection('groups').doc(groupId).get();
    if (!groupDoc.exists) {
      return NextResponse.json({ success: false, error: 'Group not found' }, { status: 404 });
    }

    const groupData = groupDoc.data();
    const isAdmin = groupData?.adminId === authResult.userId;
    const isMember = groupData?.memberIds?.includes(authResult.userId);

    if (!isAdmin && !isMember) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    // Get family update reports - query without orderBy, sort in memory
    const reportsSnap = await db.collection('familyUpdateReports')
      .where('groupId', '==', groupId)
      .where('elderId', '==', elderId)
      .get();

    const reports = reportsSnap.docs
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          weekEnding: data.weekEnding?.toDate(),
          dateRange: {
            start: data.dateRange?.start?.toDate(),
            end: data.dateRange?.end?.toDate()
          },
          generatedAt: data.generatedAt?.toDate(),
          sentAt: data.sentAt?.toDate()
        };
      })
      .sort((a, b) => {
        const dateA = a.weekEnding?.getTime() || 0;
        const dateB = b.weekEnding?.getTime() || 0;
        return dateB - dateA; // desc
      });

    return NextResponse.json({ success: true, reports });

  } catch (error) {
    console.error('Error in family updates API:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.userId) {
      return NextResponse.json({ success: false, error: authResult.error || 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { reportId, narrativeText, status, sentTo } = body;

    if (!reportId) {
      return NextResponse.json({ success: false, error: 'reportId is required' }, { status: 400 });
    }

    const db = getAdminDb();

    const updateData: any = {};
    if (narrativeText !== undefined) updateData.narrativeText = narrativeText;
    if (status !== undefined) {
      updateData.status = status;
      if (status === 'sent') {
        updateData.sentAt = new Date();
        updateData.sentTo = sentTo || [authResult.userId];
      }
    }

    await db.collection('familyUpdateReports').doc(reportId).update(updateData);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error updating family report:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
