/**
 * API Route: Decline Shift
 *
 * Allows caregivers to decline their shift assignment.
 * Notifies the owner to reassign.
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
    const { shiftId, reason } = body;

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

    // Verify caregiver is assigned to this shift
    if (shiftData?.caregiverId !== authResult.userId) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    // Check if shift can be declined
    const validStatuses = ['pending_confirmation', 'scheduled'];
    if (!validStatuses.includes(shiftData.status)) {
      return NextResponse.json({
        success: false,
        error: `Shift cannot be declined (current status: ${shiftData.status})`
      }, { status: 400 });
    }

    // Update shift status
    await shiftRef.update({
      status: 'declined',
      updatedAt: Timestamp.now(),
      'confirmation.respondedAt': Timestamp.now(),
      'confirmation.respondedVia': 'app',
      'confirmation.response': 'declined',
      'confirmation.declineReason': reason || null,
    });

    // Notify the owner
    if (shiftData.agencyId) {
      const agencyDoc = await db.collection('agencies').doc(shiftData.agencyId).get();
      const ownerId = agencyDoc.data()?.superAdminId;

      if (ownerId) {
        // Create high-priority in-app notification for owner
        await db.collection('user_notifications').add({
          userId: ownerId,
          groupId: shiftData.groupId || '',
          type: 'shift_declined',
          title: 'Shift Declined - Action Required',
          message: `${shiftData.caregiverName || 'Caregiver'} declined their shift on ${formatDate(shiftData.date)}${reason ? `: "${reason}"` : ''}. Please reassign.`,
          priority: 'high',
          actionUrl: '/dashboard/agency/schedule',
          read: false,
          dismissed: false,
          actionRequired: true,
          data: { shiftId, elderName: shiftData.elderName },
          createdAt: Timestamp.now(),
        });

        // Also queue email to owner
        const ownerDoc = await db.collection('users').doc(ownerId).get();
        const ownerEmail = ownerDoc.data()?.email;

        if (ownerEmail) {
          await db.collection('mail').add({
            to: ownerEmail,
            message: {
              subject: `Shift Declined - ${formatDate(shiftData.date)} (Action Required)`,
              html: generateDeclineEmailHtml(shiftData, reason),
            },
            createdAt: Timestamp.now(),
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Shift declined. Owner has been notified.',
    });

  } catch (error) {
    console.error('[decline-shift] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to decline shift' }, { status: 500 });
  }
}

function formatDate(date: any): string {
  if (!date) return 'unknown date';
  const d = date.toDate ? date.toDate() : new Date(date);
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function generateDeclineEmailHtml(shiftData: any, reason?: string): string {
  const shiftDate = formatDate(shiftData.date);
  const elderName = shiftData.elderName || 'Loved One';
  const caregiverName = shiftData.caregiverName || 'A caregiver';
  const startTime = shiftData.startTime || '9:00 AM';
  const endTime = shiftData.endTime || '5:00 PM';

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

  <div style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
    <h2 style="color: #DC2626; margin: 0 0 8px 0; font-size: 18px;">⚠️ Shift Declined - Action Required</h2>
    <p style="margin: 0; color: #7F1D1D;">${caregiverName} has declined their assigned shift.</p>
  </div>

  <div style="background: #F9FAFB; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
    <h3 style="margin: 0 0 12px 0; font-size: 16px;">Shift Details</h3>
    <p style="margin: 4px 0;"><strong>📅 Date:</strong> ${shiftDate}</p>
    <p style="margin: 4px 0;"><strong>⏰ Time:</strong> ${startTime} - ${endTime}</p>
    <p style="margin: 4px 0;"><strong>👤 Loved One:</strong> ${elderName}</p>
    ${reason ? `<p style="margin: 12px 0 0 0;"><strong>Reason:</strong> "${reason}"</p>` : ''}
  </div>

  <p style="margin-bottom: 24px;">Please reassign this shift to ensure coverage.</p>

  <div style="text-align: center; margin-bottom: 24px;">
    <a href="https://myguide.health/dashboard/agency/schedule" style="display: inline-block; background: #2563EB; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">View Schedule</a>
  </div>

  <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;">

  <p style="color: #6B7280; font-size: 12px; text-align: center;">
    This is an automated message from MyHealthGuide.<br>
    <a href="https://myguide.health/dashboard/settings" style="color: #6B7280;">Manage notification settings</a>
  </p>
</body>
</html>`;
}
