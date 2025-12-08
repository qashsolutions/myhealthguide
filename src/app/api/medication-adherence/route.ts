/**
 * Medication Adherence Prediction API
 * Uses Admin SDK to fetch predictions and run analysis
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

    // Get adherence predictions - query without orderBy, sort in memory
    const predictionsSnap = await db.collection('medicationAdherencePredictions')
      .where('groupId', '==', groupId)
      .where('elderId', '==', elderId)
      .get();

    const predictions = predictionsSnap.docs
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          predictedAt: data.predictedAt?.toDate(),
          validUntil: data.validUntil?.toDate()
        };
      })
      .sort((a, b) => {
        const dateA = a.predictedAt?.getTime() || 0;
        const dateB = b.predictedAt?.getTime() || 0;
        return dateB - dateA; // desc
      });

    return NextResponse.json({ success: true, predictions });

  } catch (error) {
    console.error('Error in medication adherence API:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.userId) {
      return NextResponse.json({ success: false, error: authResult.error || 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { groupId, elderId } = body;

    if (!groupId || !elderId) {
      return NextResponse.json({ success: false, error: 'groupId and elderId are required' }, { status: 400 });
    }

    const db = getAdminDb();

    // Verify user has access
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

    // Get all active medications
    const medicationsSnap = await db.collection('medications')
      .where('groupId', '==', groupId)
      .where('elderId', '==', elderId)
      .get();

    const medications = medicationsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Get medication logs for the past 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const logsSnap = await db.collection('medication_logs')
      .where('groupId', '==', groupId)
      .where('elderId', '==', elderId)
      .where('scheduledTime', '>=', thirtyDaysAgo)
      .get();

    const logs = logsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      scheduledTime: doc.data().scheduledTime?.toDate(),
      actualTime: doc.data().actualTime?.toDate()
    }));

    // Calculate predictions for each medication
    const predictions = [];

    for (const med of medications) {
      const medLogs = logs.filter((log: any) => log.medicationId === med.id);

      if (medLogs.length < 7) continue; // Need at least 7 days of data

      const totalDoses = medLogs.length;
      const takenDoses = medLogs.filter((log: any) => log.status === 'taken').length;
      const missedDoses = medLogs.filter((log: any) => log.status === 'missed').length;
      const adherenceRate = Math.round((takenDoses / totalDoses) * 100);

      // Analyze patterns
      const riskFactors = [];
      let riskScore = 0;

      // Check for declining adherence
      const recentLogs = medLogs.slice(0, 14);
      const olderLogs = medLogs.slice(14);

      if (recentLogs.length > 0 && olderLogs.length > 0) {
        const recentRate = recentLogs.filter((l: any) => l.status === 'taken').length / recentLogs.length;
        const olderRate = olderLogs.filter((l: any) => l.status === 'taken').length / olderLogs.length;

        if (recentRate < olderRate - 0.1) {
          riskFactors.push({
            type: 'declining_adherence',
            description: 'Adherence has declined in the past 2 weeks',
            severity: 'moderate',
            points: 15
          });
          riskScore += 15;
        }
      }

      // Check for specific time patterns
      const missedByHour: Record<number, number> = {};
      medLogs.filter((l: any) => l.status === 'missed').forEach((log: any) => {
        const hour = log.scheduledTime?.getHours() || 0;
        missedByHour[hour] = (missedByHour[hour] || 0) + 1;
      });

      const highRiskTimes = Object.entries(missedByHour)
        .filter(([_, count]) => count >= 3)
        .map(([hour]) => `${hour}:00`);

      if (highRiskTimes.length > 0) {
        riskFactors.push({
          type: 'time_pattern',
          description: `Frequently missed at: ${highRiskTimes.join(', ')}`,
          severity: 'moderate',
          points: 10
        });
        riskScore += 10;
      }

      // Check for day patterns
      const missedByDay: Record<number, number> = {};
      medLogs.filter((l: any) => l.status === 'missed').forEach((log: any) => {
        const day = log.scheduledTime?.getDay() || 0;
        missedByDay[day] = (missedByDay[day] || 0) + 1;
      });

      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const highRiskDays = Object.entries(missedByDay)
        .filter(([_, count]) => count >= 2)
        .map(([day]) => dayNames[parseInt(day)]);

      // Determine risk level
      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'low';
      if (riskScore >= 40 || adherenceRate < 60) riskLevel = 'critical';
      else if (riskScore >= 25 || adherenceRate < 75) riskLevel = 'high';
      else if (riskScore >= 10 || adherenceRate < 85) riskLevel = 'moderate';

      // Calculate trend
      let trendDirection: 'improving' | 'stable' | 'declining' = 'stable';
      if (recentLogs.length > 0 && olderLogs.length > 0) {
        const recentRate = recentLogs.filter((l: any) => l.status === 'taken').length / recentLogs.length;
        const olderRate = olderLogs.filter((l: any) => l.status === 'taken').length / olderLogs.length;
        if (recentRate > olderRate + 0.05) trendDirection = 'improving';
        else if (recentRate < olderRate - 0.05) trendDirection = 'declining';
      }

      // Generate recommendations
      const recommendations = [];
      if (adherenceRate < 80) {
        recommendations.push('Consider setting up additional reminders');
      }
      if (highRiskTimes.length > 0) {
        recommendations.push(`Schedule extra support during ${highRiskTimes.join(', ')}`);
      }
      if (trendDirection === 'declining') {
        recommendations.push('Review recent changes that may affect medication routine');
      }
      recommendations.push('Discuss any side effects or concerns with healthcare provider');

      // Predict missed doses in next 7 days
      const predictedMissedDoses = Math.round((1 - adherenceRate / 100) * 7 * (med as any).frequency?.times?.length || 1);

      const prediction = {
        medicationId: med.id,
        medicationName: (med as any).name,
        groupId,
        elderId,
        currentAdherenceRate: adherenceRate,
        predictedMissedDoses,
        riskLevel,
        riskScore,
        riskFactors,
        trendDirection,
        highRiskTimes,
        highRiskDays,
        recommendedInterventions: recommendations,
        predictedAt: new Date(),
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      };

      // Save prediction
      const predRef = await db.collection('medicationAdherencePredictions').add(prediction);
      predictions.push({ id: predRef.id, ...prediction });
    }

    return NextResponse.json({ success: true, predictions });

  } catch (error) {
    console.error('Error running adherence analysis:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
