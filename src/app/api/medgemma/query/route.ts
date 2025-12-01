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
} from '@/lib/api/firestoreAdmin';

// Standard disclaimer appended to all responses
const RESPONSE_DISCLAIMER = '\n\nThis is based on logged data only. Please discuss any concerns with your healthcare provider.';

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

    const queryIntent = await processNaturalLanguageQuery(
      userQuery,
      { elderName, availableData: ['medications', 'diet', 'compliance'] },
      userId,
      userRole,
      groupId,
      elderId
    );
    console.log('[MedGemma Query API] Query intent result:', queryIntent);

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
    }

    if (needsData.includes('compliance_logs') && elderId) {
      const logs = await getMedicationLogsServer(groupId, elderId, startDate, endDate);

      const totalDoses = logs.length;
      const takenDoses = logs.filter((l: any) => l.status === 'taken').length;
      const complianceRate = totalDoses > 0 ? ((takenDoses / totalDoses) * 100).toFixed(1) : '0';

      responseData.compliance = {
        totalDoses,
        takenDoses,
        missedDoses: logs.filter((l: any) => l.status === 'missed').length,
        complianceRate,
        logs: logs.slice(0, 10).map((l: any) => ({
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
    if (intent === 'view_compliance' && responseData.compliance) {
      answer = `Based on the logged data from the last ${timeframeDays} days, the medication compliance rate is ${responseData.compliance.complianceRate}%. ` +
               `${responseData.compliance.takenDoses} doses were recorded as taken out of ${responseData.compliance.totalDoses} scheduled doses, ` +
               `with ${responseData.compliance.missedDoses} doses marked as missed.`;
    } else if (intent === 'check_medications' && responseData.medications) {
      answer = `The records show ${responseData.medications.length} medications currently logged: ` +
               responseData.medications.map((m: any) => m.name).join(', ') + '.';
    } else if (intent === 'analyze_diet' && responseData.dietEntries) {
      answer = `The log shows ${responseData.dietEntries.length} meals were recorded in the last ${timeframeDays} days.`;
    } else {
      answer = `Here is the information from the logged data about ${parameters.metric || 'health records'}.`;
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
