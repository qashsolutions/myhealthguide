/**
 * Test Notification API
 * Sends a test push notification to verify FCM is working
 */

import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const db = getAdminDb();

    // Get user's FCM tokens
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    const fcmTokens = userData?.fcmTokens || [];

    if (fcmTokens.length === 0) {
      return NextResponse.json(
        { error: 'No FCM tokens found. Please enable notifications first.' },
        { status: 400 }
      );
    }

    // Create a notification document in the queue
    // This will be picked up by the Cloud Function
    const notificationRef = await db.collection('notification_queue').add({
      userId,
      type: 'test',
      title: 'Test Notification',
      body: 'Push notifications are working! You will receive medication reminders here.',
      data: {
        type: 'test',
        timestamp: new Date().toISOString()
      },
      status: 'pending',
      createdAt: FieldValue.serverTimestamp(),
      priority: 'high'
    });

    return NextResponse.json({
      success: true,
      message: 'Test notification queued',
      notificationId: notificationRef.id
    });

  } catch (error: any) {
    console.error('Error sending test notification:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send test notification' },
      { status: 500 }
    );
  }
}
