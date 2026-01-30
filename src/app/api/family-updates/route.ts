/**
 * Family Updates API
 * Uses Admin SDK for family update reports
 */

export const dynamic = 'force-dynamic';

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

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.userId) {
      return NextResponse.json({ success: false, error: authResult.error || 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { groupId, elderId, elderName } = body;

    if (!groupId || !elderId || !elderName) {
      return NextResponse.json({ success: false, error: 'groupId, elderId, and elderName are required' }, { status: 400 });
    }

    const db = getAdminDb();

    // Verify user has access to this group
    const groupDoc = await db.collection('groups').doc(groupId).get();
    if (!groupDoc.exists) {
      return NextResponse.json({ success: false, error: 'Group not found' }, { status: 404 });
    }

    const groupData = groupDoc.data();
    const isAdmin = groupData?.adminId === authResult.userId;
    if (!isAdmin) {
      return NextResponse.json({ success: false, error: 'Only group admins can generate reports' }, { status: 403 });
    }

    // Calculate last 7 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    // Gather data using Admin SDK
    const [medLogsSnap, dietSnap, symptomSnap] = await Promise.all([
      db.collection('medicationLogs')
        .where('groupId', '==', groupId)
        .where('elderId', '==', elderId)
        .where('scheduledTime', '>=', startDate)
        .where('scheduledTime', '<=', endDate)
        .orderBy('scheduledTime', 'desc')
        .get(),
      db.collection('dietEntries')
        .where('groupId', '==', groupId)
        .where('elderId', '==', elderId)
        .where('timestamp', '>=', startDate)
        .where('timestamp', '<=', endDate)
        .orderBy('timestamp', 'desc')
        .get(),
      db.collection('symptomCheckerQueries')
        .where('elderId', '==', elderId)
        .where('includeInReport', '==', true)
        .where('createdAt', '>=', startDate)
        .where('createdAt', '<=', endDate)
        .orderBy('createdAt', 'desc')
        .get(),
    ]);

    const medicationLogs = medLogsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const dietEntries = dietSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const symptomQueries = symptomSnap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        symptomsDescription: data.symptomsDescription,
        initialResponse: data.initialResponse,
        refinedResponse: data.refinedResponse,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
      };
    });

    // Analyze data
    const medCompliance = analyzeMedCompliance(medicationLogs);
    const dietSummary = analyzeDiet(dietEntries);
    const symptomChecks = analyzeSymptoms(symptomQueries);
    const highlights = getHighlights(medicationLogs, dietEntries);
    const concerns = getConcerns(medicationLogs, dietEntries, medCompliance, symptomQueries);
    const overallTone = getTone(medCompliance, dietSummary, concerns);
    const headline = getHeadline(elderName, overallTone, medCompliance);
    const narrativeText = buildNarrative(elderName, medCompliance, dietSummary, highlights, concerns, overallTone, symptomChecks);

    const report = {
      groupId,
      elderId,
      elderName,
      weekEnding: endDate,
      dateRange: { start: startDate, end: endDate },
      summary: {
        headline,
        medicationCompliance: medCompliance,
        dietSummary,
        symptomChecks: symptomChecks.count > 0 ? symptomChecks : null,
        highlights,
        concerns,
        overallTone,
      },
      narrativeText,
      generatedAt: new Date(),
      sentAt: null,
      sentTo: [],
      status: 'draft',
    };

    const reportRef = await db.collection('familyUpdateReports').add(report);

    return NextResponse.json({
      success: true,
      report: {
        ...report,
        id: reportRef.id,
      },
    });

  } catch (error) {
    console.error('Error generating family update:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// --- Analysis helper functions (server-side) ---

function analyzeMedCompliance(logs: any[]) {
  const total = logs.length;
  const taken = logs.filter((l: any) => l.status === 'taken').length;
  const percentage = total > 0 ? Math.round((taken / total) * 100) : 0;

  let summary = '';
  if (percentage === 100) summary = 'Took all medications on time!';
  else if (percentage >= 90) summary = `Took ${percentage}% of medications - excellent compliance`;
  else if (percentage >= 75) summary = `Took ${percentage}% of medications`;
  else summary = `Took ${percentage}% of medications - below usual`;

  return { percentage, taken, total, summary };
}

function analyzeDiet(entries: any[]) {
  const mealsLogged = entries.length;
  const averagePerDay = mealsLogged / 7;

  let summary = '';
  if (averagePerDay >= 3) summary = 'Ate well throughout the week';
  else if (averagePerDay >= 2) summary = 'Eating regularly';
  else summary = 'Appetite lower than usual';

  return { mealsLogged, averagePerDay: Math.round(averagePerDay * 10) / 10, summary };
}

function analyzeSymptoms(queries: any[]) {
  const summaries = queries.map((q: any) => {
    let assessment = 'Assessment reviewed';
    try {
      const response = JSON.parse(q.refinedResponse || q.initialResponse);
      if (response.assessment) {
        const firstSentence = response.assessment.split('.')[0];
        assessment = firstSentence.length > 150 ? firstSentence.substring(0, 147) + '...' : firstSentence;
      }
    } catch { /* keep default */ }

    return {
      date: q.createdAt,
      symptoms: q.symptomsDescription?.length > 100 ? q.symptomsDescription.substring(0, 97) + '...' : q.symptomsDescription,
      assessment,
    };
  });

  return { count: queries.length, summaries };
}

function getHighlights(logs: any[], entries: any[]): string[] {
  const highlights: string[] = [];
  if (logs.length > 0 && logs.every((l: any) => l.status === 'taken')) highlights.push('Perfect medication compliance all week!');
  if (entries.length >= 18) highlights.push('Great appetite - ate 3+ meals most days');

  logs.forEach((log: any) => {
    if (log.notes) {
      const n = log.notes.toLowerCase();
      if (n.includes('walked') || n.includes('exercise')) highlights.push(`Stayed active: ${log.notes}`);
      if (n.includes('visited') || n.includes('call')) highlights.push(`Social connection: ${log.notes}`);
    }
  });

  return highlights.slice(0, 3);
}

function getConcerns(logs: any[], entries: any[], compliance: any, symptomQueries: any[]): string[] {
  const concerns: string[] = [];
  if (compliance.percentage < 75) {
    const missed = logs.filter((l: any) => l.status === 'missed').length;
    concerns.push(`Missed ${missed} medication doses this week`);
  }
  if (entries.length < 10) concerns.push('Lower appetite than usual');

  const symptomKeywords = ['pain', 'dizzy', 'nausea', 'tired'];
  logs.forEach((log: any) => {
    if (log.notes) {
      symptomKeywords.forEach(symptom => {
        if (log.notes.toLowerCase().includes(symptom)) {
          const dateStr = log.scheduledTime?.toDate ? log.scheduledTime.toDate().toLocaleDateString() : new Date(log.scheduledTime).toLocaleDateString();
          concerns.push(`Mentioned ${symptom} on ${dateStr}`);
        }
      });
    }
  });

  if (symptomQueries.length > 0) concerns.push(`${symptomQueries.length} symptom check${symptomQueries.length > 1 ? 's' : ''} this week - see details below`);

  return concerns.slice(0, 4);
}

function getTone(compliance: any, diet: any, concerns: string[]): 'positive' | 'neutral' | 'concerning' {
  if (concerns.length >= 2) return 'concerning';
  if (compliance.percentage >= 90 && diet.averagePerDay >= 2.5) return 'positive';
  return 'neutral';
}

function getHeadline(elderName: string, tone: string, compliance: any): string {
  if (tone === 'positive' && compliance.percentage === 100) return `Perfect week for ${elderName}!`;
  if (tone === 'positive') return `Great week for ${elderName}!`;
  if (tone === 'concerning') return `${elderName} had a challenging week`;
  return `Weekly update for ${elderName}`;
}

function buildNarrative(
  elderName: string, compliance: any, diet: any, highlights: string[],
  concerns: string[], tone: string,
  symptomChecks: { count: number; summaries: Array<{ date: Date; symptoms: string; assessment: string }> }
): string {
  let n = `Hi there,\n\nHere's your weekly update for ${elderName}.\n\n`;

  if (tone === 'positive') n += 'It was a great week! ';
  else if (tone === 'concerning') n += 'This week had a few challenges. ';
  else n += 'Overall, it was a good week. ';

  n += `${compliance.summary}. `;
  n += `${diet.summary}, with ${diet.mealsLogged} meals logged throughout the week. `;

  if (highlights.length > 0) {
    n += '\n\nSome highlights from the week:\n';
    highlights.forEach(h => { n += `• ${h}\n`; });
  }

  if (concerns.length > 0) {
    n += '\n\nA few things to keep an eye on:\n';
    concerns.forEach(c => { n += `• ${c}\n`; });
    n += '\nWe recommend discussing these with the doctor if they continue.\n';
  }

  if (symptomChecks && symptomChecks.count > 0) {
    n += `\n\n--- Symptom Checks This Week ---\n`;
    n += `${symptomChecks.count} symptom check${symptomChecks.count > 1 ? 's were' : ' was'} performed:\n\n`;
    symptomChecks.summaries.forEach((check, index) => {
      const dateStr = check.date instanceof Date
        ? check.date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
        : new Date(check.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
      n += `${index + 1}. ${dateStr}\n`;
      n += `   Symptoms: ${check.symptoms}\n`;
      n += `   Assessment: ${check.assessment}\n\n`;
    });
    n += 'Note: These AI assessments are for informational purposes only and do not replace professional medical advice. Please discuss any concerns with your healthcare provider.\n';
  }

  n += '\n\nAs always, please reach out if you have any questions or concerns.\n\nWarm regards,\nYour Care Team';
  return n;
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
