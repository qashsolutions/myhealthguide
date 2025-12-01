import { NextRequest, NextResponse } from 'next/server';
import { detectMissedDoses, getMissedDosesSummary } from '@/lib/ai/missedDosesDetection';
import { checkUpcomingAppointments } from '@/lib/ai/appointmentReminders';
import { detectEmergencyPatterns } from '@/lib/ai/emergencyPatternDetection';
import { generateRefillAlerts } from '@/lib/ai/medicationRefillPrediction';
import { getUserAlertPreferences } from '@/lib/ai/userAlertPreferences';
import { verifyAuthToken, canAccessElderProfileServer } from '@/lib/api/verifyAuth';
import type { Alert } from '@/types';

/**
 * POST /api/alerts/check
 * Run all alert detection checks for a user/elder
 *
 * This endpoint should be called:
 * - On dashboard load (for immediate alerts)
 * - Periodically via cron job (for background alerts)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify Firebase ID token
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.userId) {
      return NextResponse.json(
        { success: false, error: authResult.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const authenticatedUserId = authResult.userId;

    const body = await request.json();
    const { groupId, elderId, elderName, userRole } = body;

    if (!groupId) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: groupId' },
        { status: 400 }
      );
    }

    // Verify user can access this elder's data
    if (elderId) {
      const canAccess = await canAccessElderProfileServer(authenticatedUserId, elderId, groupId);
      if (!canAccess) {
        return NextResponse.json(
          { success: false, error: 'Access denied to this elder' },
          { status: 403 }
        );
      }
    }

    // Get user alert preferences (use authenticated user ID)
    const preferences = await getUserAlertPreferences(authenticatedUserId, groupId);
    const allAlerts: Alert[] = [];

    // 1. Check for missed doses (medications, supplements, meals)
    if (elderId && elderName) {
      const missedDosesAlerts = await detectMissedDoses(
        groupId,
        elderId,
        elderName,
        authenticatedUserId,
        userRole || 'admin'
      );
      allAlerts.push(...missedDosesAlerts);
    }

    // 2. Check for upcoming appointments
    if (preferences.preferences.appointmentReminders.enabled && elderId && elderName) {
      const appointmentAlerts = await checkUpcomingAppointments(
        groupId,
        elderId,
        elderName,
        {
          advanceNoticeDays: preferences.preferences.appointmentReminders.advanceNoticeDays,
          autoGenerateVisitPrep: preferences.preferences.appointmentReminders.autoGenerateVisitPrep
        }
      );
      allAlerts.push(...appointmentAlerts);
    }

    // 3. Check for emergency patterns
    if (preferences.preferences.emergencyAlerts.enabled && elderId && elderName) {
      try {
        const emergencyPattern = await detectEmergencyPatterns(
          groupId,
          elderId,
          elderName,
          preferences.preferences.emergencyAlerts.sensitivity
        );

        if (emergencyPattern) {
          // Emergency pattern was detected and saved - the function creates the alert internally
          console.log(`Emergency pattern detected for elder ${elderId} with score ${emergencyPattern.riskScore}`);
        }
      } catch (error) {
        console.error('Error in emergency pattern detection:', error);
      }
    }

    // 4. Check for medication refill predictions
    if (preferences.preferences.medicationRefillAlerts.enabled && elderId && elderName) {
      try {
        const refillAlerts = await generateRefillAlerts(
          groupId,
          elderId,
          elderName
        );

        if (refillAlerts && refillAlerts.length > 0) {
          allAlerts.push(...refillAlerts);
          console.log(`Refill alerts generated for elder ${elderId}: ${refillAlerts.length}`);
        }
      } catch (error) {
        console.error('Error in medication refill prediction:', error);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        alertsGenerated: allAlerts.length,
        alerts: allAlerts.map(alert => ({
          id: alert.id,
          type: alert.type,
          severity: alert.severity,
          title: alert.title,
          message: alert.message
        }))
      }
    });

  } catch (error) {
    console.error('Error running alert checks:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to run alert checks' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/alerts/check
 * Get missed doses summary for dashboard display
 */
export async function GET(request: NextRequest) {
  try {
    // Verify Firebase ID token
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.userId) {
      return NextResponse.json(
        { success: false, error: authResult.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const authenticatedUserId = authResult.userId;

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');
    const elderId = searchParams.get('elderId');
    const userRole = searchParams.get('userRole') as 'admin' | 'caregiver' | 'member' | null;

    if (!groupId || !elderId) {
      return NextResponse.json(
        { success: false, error: 'Missing required params: groupId, elderId' },
        { status: 400 }
      );
    }

    // Verify user can access this elder's data
    const canAccess = await canAccessElderProfileServer(authenticatedUserId, elderId, groupId);
    if (!canAccess) {
      return NextResponse.json(
        { success: false, error: 'Access denied to this elder' },
        { status: 403 }
      );
    }

    const summary = await getMissedDosesSummary(
      groupId,
      elderId,
      authenticatedUserId,
      userRole || 'admin'
    );

    return NextResponse.json({
      success: true,
      data: summary
    });

  } catch (error) {
    console.error('Error getting missed doses summary:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get missed doses summary' },
      { status: 500 }
    );
  }
}
