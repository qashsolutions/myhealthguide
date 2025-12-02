/**
 * API Route: Process Natural Language Query with MedGemma
 *
 * POST /api/medgemma/query
 *
 * Processes natural language queries about health data using MedGemma AI.
 * All responses are OBSERVATIONAL ONLY - no medical advice or recommendations.
 *
 * AUTHENTICATION: Requires Firebase ID token in Authorization header
 */

import { NextRequest, NextResponse } from 'next/server';
import { processNaturalLanguageQuery } from '@/lib/ai/medgemmaService';
import { UserRole } from '@/lib/medical/phiAuditLog';
import {
  verifyAuthToken,
  canAccessElderProfileServer,
  getUserDataServer,
} from '@/lib/api/verifyAuth';
import {
  getMedicationsServer,
  getMedicationLogsServer,
  getDietEntriesServer,
  getSupplementsServer,
  getSupplementLogsServer,
} from '@/lib/api/firestoreAdmin';

// Standard disclaimer appended to all responses
const RESPONSE_DISCLAIMER = '\n\nThis is based on logged data only. Please discuss any concerns with your healthcare provider.';

/**
 * Check if query is asking for medical advice (which we cannot provide)
 */
function isMedicalAdviceQuery(query: string): boolean {
  const lowerQuery = query.toLowerCase();

  // Phrases that indicate user is asking for medical advice
  const advicePhrases = [
    'what should i take',
    'what should i do',
    'should i take',
    'should i stop',
    'should i change',
    'can i take',
    'is it safe to',
    'recommend',
    'suggest',
    'what medicine',
    'what drug',
    'what pill',
    'prescribe',
    'treatment for',
    'cure for',
    'remedy for',
    'how to treat',
    'how to cure',
    'best medicine',
    'best treatment',
    'what helps with',
    'what works for',
    'due to my',  // "what should I take due to my..."
    'because of my',
    'for my condition',
    'for my symptoms',
  ];

  return advicePhrases.some(phrase => lowerQuery.includes(phrase));
}

/**
 * Simple keyword-based query parsing fallback
 * Used when AI query parsing fails
 */
function parseQueryKeywords(query: string, elderName?: string) {
  const lowerQuery = query.toLowerCase();

  // Check if this is a medical advice query first
  if (isMedicalAdviceQuery(query)) {
    return {
      intent: 'medical_advice_request',
      parameters: {
        elderName,
        timeframe: 'last 7 days',
        metric: 'health',
      },
      needsData: [],
      responseTemplate: '',
    };
  }

  // Simple intent detection
  let intent = 'general_query';
  if (lowerQuery.includes('compliance') || lowerQuery.includes('adherence') || lowerQuery.includes('taken') || lowerQuery.includes('missed')) {
    intent = 'view_compliance';
  } else if (lowerQuery.includes('medication') || lowerQuery.includes('medicine') || lowerQuery.includes('pills') || lowerQuery.includes('drug')) {
    intent = 'check_medications';
  } else if (lowerQuery.includes('diet') || lowerQuery.includes('meal') || lowerQuery.includes('eat') || lowerQuery.includes('food')) {
    intent = 'analyze_diet';
  }

  // Extract timeframe
  let timeframe = 'last 7 days';
  if (lowerQuery.includes('yesterday')) timeframe = 'yesterday';
  if (lowerQuery.includes('today')) timeframe = 'today';
  if (lowerQuery.includes('week')) timeframe = 'last 7 days';
  if (lowerQuery.includes('month') || lowerQuery.includes('30 day')) timeframe = 'last 30 days';

  return {
    intent,
    parameters: {
      elderName,
      timeframe,
      metric: intent.replace('view_', '').replace('check_', '').replace('analyze_', ''),
    },
    needsData: intent === 'view_compliance' ? ['medications', 'compliance_logs'] :
                intent === 'check_medications' ? ['medications'] :
                intent === 'analyze_diet' ? ['diet_entries'] :
                ['medications', 'compliance_logs', 'diet_entries'],
    responseTemplate: `Based on the data, here's what I found about {metric}...`,
  };
}

interface RequestBody {
  groupId: string;
  elderId?: string;
  elderName?: string;
  query: string;
}

export async function POST(request: NextRequest) {
  console.log('[MedGemma Query API] Request received');

  try {
    // Verify authentication
    console.log('[MedGemma Query API] Verifying auth token...');
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.userId) {
      console.log('[MedGemma Query API] Auth failed:', authResult.error);
      return NextResponse.json(
        { error: authResult.error || 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = authResult.userId;
    console.log('[MedGemma Query API] Auth successful, userId:', userId);

    const body: RequestBody = await request.json();
    const { groupId, elderId, elderName, query: userQuery } = body;
    console.log('[MedGemma Query API] Request body:', { groupId, elderId, elderName, queryLength: userQuery?.length });

    if (!groupId || !userQuery) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // If elderId is provided, verify access
    if (elderId) {
      const hasAccess = await canAccessElderProfileServer(userId, elderId, groupId);
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'You do not have permission to access this elder\'s data' },
          { status: 403 }
        );
      }
    }

    // Get user data for role
    const userData = await getUserDataServer(userId);
    const userRole: UserRole = userData?.role || 'member';

    console.log('[MedGemma Query API] Calling processNaturalLanguageQuery...');
    console.log('[MedGemma Query API] Vertex AI config:', {
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      location: process.env.VERTEX_AI_LOCATION || 'global',
      hasCredentials: !!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
    });

    let queryIntent;
    try {
      queryIntent = await processNaturalLanguageQuery(
        userQuery,
        { elderName, availableData: ['medications', 'diet', 'compliance'] },
        userId,
        userRole,
        groupId,
        elderId
      );
      console.log('[MedGemma Query API] Query intent result:', queryIntent);
    } catch (queryError) {
      console.error('[MedGemma Query API] processNaturalLanguageQuery failed:', queryError);
      // Use simple keyword-based parsing as fallback
      queryIntent = parseQueryKeywords(userQuery, elderName);
      console.log('[MedGemma Query API] Using keyword fallback:', queryIntent);
    }

    const { intent, parameters, needsData } = queryIntent;
    const responseData: any = {};

    const timeframeDays = parameters.timeframe === 'last 30 days' || parameters.timeframe === 'month' ? 30 :
                           parameters.timeframe === 'yesterday' ? 1 :
                           parameters.timeframe === 'today' ? 1 : 7;

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeframeDays);

    if (needsData.includes('medications') && elderId) {
      const medications = await getMedicationsServer(groupId, elderId);
      responseData.medications = medications.map((med: any) => ({
        id: med.id,
        name: med.name,
        dosage: med.dosage,
        frequency: med.frequency,
      }));

      // Only get supplements if specifically requested or for compliance queries
      // Don't include supplements when user asks specifically about medications
      if (intent !== 'check_medications') {
        const supplements = await getSupplementsServer(groupId, elderId);
        responseData.supplements = supplements.map((supp: any) => ({
          id: supp.id,
          name: supp.name,
          dosage: supp.dosage,
          frequency: supp.frequency,
        }));
      }
    }

    if (needsData.includes('compliance_logs') && elderId) {
      // Get medication logs
      const medLogs = await getMedicationLogsServer(groupId, elderId, startDate, endDate);
      const medications = responseData.medications || await getMedicationsServer(groupId, elderId);

      // Get supplement logs
      const suppLogs = await getSupplementLogsServer(groupId, elderId, startDate, endDate);
      const supplements = responseData.supplements || await getSupplementsServer(groupId, elderId);

      // Calculate medication compliance
      const medTaken = medLogs.filter((l: any) => l.status === 'taken').length;
      const medMissed = medLogs.filter((l: any) => l.status === 'missed' || l.status === 'skipped').length;

      // Calculate supplement compliance
      const suppTaken = suppLogs.filter((l: any) => l.status === 'taken').length;
      const suppMissed = suppLogs.filter((l: any) => l.status === 'missed' || l.status === 'skipped').length;

      const totalDoses = medLogs.length + suppLogs.length;
      const takenDoses = medTaken + suppTaken;
      const missedDoses = medMissed + suppMissed;
      const complianceRate = totalDoses > 0 ? ((takenDoses / totalDoses) * 100).toFixed(1) : '0';

      // Build list of missed items with names
      const missedMedItems = medLogs
        .filter((l: any) => l.status === 'missed' || l.status === 'skipped')
        .map((l: any) => {
          const med = medications.find((m: any) => m.id === l.medicationId);
          return {
            type: 'medication',
            name: med?.name || 'Unknown medication',
            time: l.scheduledTime,
            status: l.status,
          };
        });

      const missedSuppItems = suppLogs
        .filter((l: any) => l.status === 'missed' || l.status === 'skipped')
        .map((l: any) => {
          const supp = supplements.find((s: any) => s.id === l.supplementId);
          return {
            type: 'supplement',
            name: supp?.name || 'Unknown supplement',
            time: l.scheduledTime,
            status: l.status,
          };
        });

      responseData.compliance = {
        totalDoses,
        takenDoses,
        missedDoses,
        complianceRate,
        medicationStats: { taken: medTaken, missed: medMissed, total: medLogs.length },
        supplementStats: { taken: suppTaken, missed: suppMissed, total: suppLogs.length },
        missedItems: [...missedMedItems, ...missedSuppItems],
        logs: medLogs.slice(0, 10).map((l: any) => ({
          medicationId: l.medicationId,
          status: l.status,
          scheduledTime: l.scheduledTime,
        })),
      };
    }

    if (needsData.includes('diet_entries') && elderId) {
      const dietEntries = await getDietEntriesServer(groupId, elderId, startDate, endDate, 20);
      responseData.dietEntries = dietEntries.map((entry: any) => ({
        meal: entry.meal,
        items: entry.items || [],
        timestamp: entry.timestamp,
      }));
    }

    // Build factual, observational response (NO advice or recommendations)
    let answer = '';

    // Handle medical advice requests with a friendly, helpful message
    if (intent === 'medical_advice_request') {
      return NextResponse.json({
        success: true,
        data: {
          query: userQuery,
          intent,
          parameters,
          answer: `I'm here to help you track and view your health records, but I'm not able to provide medical advice or recommendations about treatments or medications.\n\nFor questions about what to take or how to manage your health conditions, please speak with your doctor or healthcare provider - they know your medical history and can give you personalized guidance.\n\nHere's what I can help you with:\n• "What medications are logged?" - View your medication list\n• "Show my compliance this week" - See medication tracking data\n• "What meals were recorded today?" - Review diet entries`,
          chartData: {},
          sources: [],
          disclaimer: 'This assistant provides health record summaries only and cannot give medical advice.',
        },
      });
    }

    if (intent === 'view_compliance') {
      if (responseData.compliance && responseData.compliance.totalDoses > 0) {
        const { compliance } = responseData;
        const timeLabel = timeframeDays === 1 ? 'today' : `the last ${timeframeDays} days`;

        answer = `Based on the logged data for ${timeLabel}:\n\n`;
        answer += `**Overall Compliance: ${compliance.complianceRate}%**\n`;
        answer += `• ${compliance.takenDoses} doses taken\n`;
        answer += `• ${compliance.missedDoses} doses missed/skipped\n\n`;

        if (compliance.medicationStats?.total > 0) {
          answer += `**Medications:** ${compliance.medicationStats.taken} taken, ${compliance.medicationStats.missed} missed\n`;
        }
        if (compliance.supplementStats?.total > 0) {
          answer += `**Supplements:** ${compliance.supplementStats.taken} taken, ${compliance.supplementStats.missed} missed\n`;
        }

        // List specific missed items
        if (compliance.missedItems && compliance.missedItems.length > 0) {
          answer += `\n**Missed/Skipped Items:**\n`;
          compliance.missedItems.forEach((item: any) => {
            const time = item.time ? new Date(item.time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '';
            answer += `• ${item.name} (${item.type}) - ${item.status}${time ? ` at ${time}` : ''}\n`;
          });
        }
      } else {
        answer = `No compliance data has been recorded for ${timeframeDays === 1 ? 'today' : `the last ${timeframeDays} days`}. To track compliance, log when medications and supplements are taken or missed.`;
      }
    } else if (intent === 'check_medications') {
      // Only show medications (not supplements) when user asks about medications specifically
      if (responseData.medications && responseData.medications.length > 0) {
        answer = `**Medications (${responseData.medications.length}):**\n\n`;
        responseData.medications.forEach((m: any) => {
          answer += `• ${m.name}${m.dosage ? ` - ${m.dosage}` : ''}\n`;
        });
      } else {
        answer = `No medications are currently logged. Add medications to start tracking.`;
      }
    } else if (intent === 'analyze_diet') {
      if (responseData.dietEntries && responseData.dietEntries.length > 0) {
        const timeLabel = timeframeDays === 1 ? 'today' : `the last ${timeframeDays} days`;
        answer = `**${responseData.dietEntries.length} meals** were logged ${timeLabel}:\n\n`;
        responseData.dietEntries.slice(0, 5).forEach((entry: any) => {
          const time = entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '';
          const items = entry.items?.join(', ') || 'No items recorded';
          answer += `• **${entry.meal}**${time ? ` at ${time}` : ''}: ${items}\n`;
        });
        if (responseData.dietEntries.length > 5) {
          answer += `\n...and ${responseData.dietEntries.length - 5} more entries.`;
        }
      } else {
        answer = `No diet entries have been recorded for ${timeframeDays === 1 ? 'today' : `the last ${timeframeDays} days`}.`;
      }
    } else {
      // General query - provide helpful guidance
      answer = `I can help you with information about medications, compliance tracking, and diet entries. Try asking about specific topics like "What medications are logged?" or "Show compliance for last week".`;
    }

    // Always append disclaimer to remind users this is observational only
    answer += RESPONSE_DISCLAIMER;

    return NextResponse.json({
      success: true,
      data: {
        query: userQuery,
        intent,
        parameters,
        answer,
        chartData: responseData,
        sources: needsData,
        disclaimer: 'This response contains factual data summaries only. It does not provide medical advice, recommendations, or interpretations.',
      },
    });
  } catch (error) {
    console.error('[MedGemma Query API] ERROR:', error);
    console.error('[MedGemma Query API] Error name:', error instanceof Error ? error.name : 'Unknown');
    console.error('[MedGemma Query API] Error message:', error instanceof Error ? error.message : String(error));
    console.error('[MedGemma Query API] Error stack:', error instanceof Error ? error.stack : 'No stack');
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to process query' },
      { status: 500 }
    );
  }
}
