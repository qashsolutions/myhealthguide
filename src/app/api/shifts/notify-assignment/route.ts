/**
 * API Route: Notify Shift Assignment
 *
 * Sends multi-channel notifications to caregiver when assigned a shift:
 * - Email (always)
 * - In-App notification (always)
 * - FCM push (if token available)
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { verifyAuthToken } from '@/lib/api/verifyAuth';
import { Timestamp } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { shiftId } = body;

    if (!shiftId) {
      return NextResponse.json({ success: false, error: 'Shift ID is required' }, { status: 400 });
    }

    const db = getAdminDb();
    const shiftRef = db.collection('scheduledShifts').doc(shiftId);
    const shiftDoc = await shiftRef.get();

    if (!shiftDoc.exists) {
      return NextResponse.json({ success: false, error: 'Shift not found' }, { status: 404 });
    }

    const shiftData = shiftDoc.data();

    // Verify user is agency owner
    if (shiftData?.agencyId) {
      const agencyDoc = await db.collection('agencies').doc(shiftData.agencyId).get();
      if (!agencyDoc.exists || agencyDoc.data()?.superAdminId !== authResult.userId) {
        return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
      }
    }

    if (!shiftData?.caregiverId) {
      return NextResponse.json({ success: false, error: 'Shift has no assigned caregiver' }, { status: 400 });
    }

    // Get caregiver info
    const caregiverDoc = await db.collection('users').doc(shiftData.caregiverId).get();
    if (!caregiverDoc.exists) {
      return NextResponse.json({ success: false, error: 'Caregiver not found' }, { status: 404 });
    }

    const caregiverData = caregiverDoc.data();
    const caregiverEmail = caregiverData?.email;
    const caregiverName = [caregiverData?.firstName, caregiverData?.lastName].filter(Boolean).join(' ') || 'Caregiver';
    const fcmTokens = caregiverData?.fcmTokens || [];

    const notifications = {
      email: { sent: false, sentAt: null as Timestamp | null, error: null as string | null },
      inApp: { sent: false, sentAt: null as Timestamp | null },
      fcm: { sent: false, sentAt: null as Timestamp | null, error: null as string | null },
    };

    // 1. Send Email (always)
    if (caregiverEmail) {
      try {
        await db.collection('mail').add({
          to: caregiverEmail,
          message: {
            subject: generateEmailSubject(shiftData),
            html: generateAssignmentEmailHtml(shiftData, caregiverName, shiftId),
          },
          createdAt: Timestamp.now(),
        });
        notifications.email.sent = true;
        notifications.email.sentAt = Timestamp.now();
      } catch (e: any) {
        notifications.email.error = e.message;
      }
    }

    // 2. Create In-App Notification (always)
    try {
      await db.collection('user_notifications').add({
        userId: shiftData.caregiverId,
        groupId: shiftData.groupId || '',
        elderId: shiftData.elderId || '',
        type: 'shift_assignment',
        title: 'New Shift Assignment',
        message: `You've been assigned to care for ${shiftData.elderName || 'a loved one'} on ${formatShortDate(shiftData.date)}, ${formatTime(shiftData.startTime)}-${formatTime(shiftData.endTime)}`,
        priority: 'high',
        actionUrl: '/dashboard/my-shifts',
        actionLabel: 'View & Confirm',
        read: false,
        dismissed: false,
        actionRequired: true,
        data: { shiftId, elderName: shiftData.elderName },
        createdAt: Timestamp.now(),
        expiresAt: shiftData.date, // Expires on shift date
      });
      notifications.inApp.sent = true;
      notifications.inApp.sentAt = Timestamp.now();
    } catch (e) {
      console.error('[notify-assignment] In-app notification error:', e);
    }

    // 3. Queue FCM Push (if tokens available)
    if (fcmTokens.length > 0) {
      try {
        await db.collection('fcm_notification_queue').add({
          userId: shiftData.caregiverId,
          tokens: fcmTokens,
          notification: {
            title: 'New Shift Assignment',
            body: `${formatShortDate(shiftData.date)}, ${formatTime(shiftData.startTime)}-${formatTime(shiftData.endTime)} caring for ${shiftData.elderName || 'Loved One'}. Tap to confirm.`,
          },
          data: {
            type: 'shift_assignment',
            shiftId,
            url: '/dashboard/my-shifts',
          },
          createdAt: Timestamp.now(),
          status: 'pending',
        });
        notifications.fcm.sent = true;
        notifications.fcm.sentAt = Timestamp.now();
      } catch (e: any) {
        notifications.fcm.error = e.message;
      }
    }

    // Update shift with confirmation tracking
    await shiftRef.update({
      status: 'pending_confirmation',
      updatedAt: Timestamp.now(),
      'confirmation.requestedAt': Timestamp.now(),
      'confirmation.requestedBy': authResult.userId,
      'confirmation.notifications': notifications,
      'confirmation.remindersSent': 0,
    });

    return NextResponse.json({
      success: true,
      message: 'Notifications sent successfully',
      notifications: {
        email: notifications.email.sent,
        inApp: notifications.inApp.sent,
        fcm: notifications.fcm.sent,
      },
    });

  } catch (error) {
    console.error('[notify-assignment] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to send notifications' }, { status: 500 });
  }
}

function formatShortDate(date: any): string {
  if (!date) return 'TBD';
  const d = date.toDate ? date.toDate() : new Date(date);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatLongDate(date: any): string {
  if (!date) return 'TBD';
  const d = date.toDate ? date.toDate() : new Date(date);
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function formatTime(time: string): string {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return m === 0 ? `${hour} ${ampm}` : `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function generateEmailSubject(shiftData: any): string {
  const date = formatShortDate(shiftData.date);
  return `Shift Assignment - ${date} (Action Required)`;
}

function generateAssignmentEmailHtml(shiftData: any, caregiverName: string, shiftId: string): string {
  const elderName = shiftData.elderName || 'Loved One';
  const date = formatLongDate(shiftData.date);
  const startTime = formatTime(shiftData.startTime || '09:00');
  const endTime = formatTime(shiftData.endTime || '17:00');
  const confirmUrl = `https://myguide.health/dashboard/my-shifts?action=confirm&shiftId=${shiftId}`;
  const declineUrl = `https://myguide.health/dashboard/my-shifts?action=decline&shiftId=${shiftId}`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 24px;">
    <img src="https://myguide.health/favicon-32x32.png" alt="MyHealthGuide" style="width: 32px; height: 32px;">
  </div>

  <h2 style="color: #1F2937; margin-bottom: 8px;">New Shift Assignment</h2>
  <p style="color: #6B7280; margin-bottom: 24px;">Hi ${caregiverName}, you've been assigned a new shift.</p>

  <div style="background: #F3F4F6; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
    <h3 style="margin: 0 0 16px 0; font-size: 16px; color: #374151;">Shift Details</h3>
    <p style="margin: 8px 0;"><strong>📅 Date:</strong> ${date}</p>
    <p style="margin: 8px 0;"><strong>⏰ Time:</strong> ${startTime} - ${endTime}</p>
    <p style="margin: 8px 0;"><strong>👤 Loved One:</strong> ${elderName}</p>
  </div>

  <p style="margin-bottom: 24px;">Please confirm your availability:</p>

  <div style="text-align: center; margin-bottom: 16px;">
    <a href="${confirmUrl}" style="display: inline-block; background: #059669; color: white; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 16px;">✓ Confirm Shift</a>
  </div>

  <div style="text-align: center; margin-bottom: 24px;">
    <a href="${declineUrl}" style="display: inline-block; background: #F3F4F6; color: #6B7280; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">Decline</a>
  </div>

  <div style="background: #FEF3C7; border: 1px solid #FCD34D; border-radius: 6px; padding: 12px; margin-bottom: 24px;">
    <p style="margin: 0; font-size: 14px; color: #92400E;">
      ⏰ Please respond within 24 hours. If you cannot work this shift, please decline so we can find coverage.
    </p>
  </div>

  <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;">

  <p style="color: #6B7280; font-size: 12px; text-align: center;">
    This is an automated message from MyHealthGuide.<br>
    <a href="https://myguide.health/dashboard/settings" style="color: #6B7280;">Manage notification settings</a>
  </p>
</body>
</html>`;
}
