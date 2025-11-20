/**
 * API Route: Process Natural Language Query with MedGemma
 *
 * POST /api/medgemma/query
 *
 * Processes natural language queries about health data using MedGemma AI
 */

import { NextRequest, NextResponse } from 'next/server';
import { processNaturalLanguageQuery } from '@/lib/ai/medgemmaService';
import { UserRole } from '@/lib/medical/phiAuditLog';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { Medication, MedicationLog, DietEntry } from '@/types';

interface RequestBody {
  userId: string;
  userRole: UserRole;
  groupId: string;
  elderId?: string;
  elderName?: string;
  query: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();
    const { userId, userRole, groupId, elderId, elderName, query: userQuery } = body;

    if (!userId || !userRole || !groupId || !userQuery) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const queryIntent = await processNaturalLanguageQuery(
      userQuery,
      { elderName, availableData: ['medications', 'diet', 'compliance'] },
      userId,
      userRole,
      groupId,
      elderId
    );

    const { intent, parameters, needsData } = queryIntent;
    const responseData: any = {};

    const timeframeDays = parameters.timeframe === 'last 30 days' || parameters.timeframe === 'month' ? 30 :
                           parameters.timeframe === 'yesterday' ? 1 :
                           parameters.timeframe === 'today' ? 1 : 7;

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeframeDays);

    if (needsData.includes('medications') && elderId) {
      const medicationsQuery = query(
        collection(db, 'medications'),
        where('groupId', '==', groupId),
        where('elderId', '==', elderId)
      );
      const medicationsSnap = await getDocs(medicationsQuery);
      responseData.medications = medicationsSnap.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        dosage: doc.data().dosage,
        frequency: doc.data().frequency,
      }));
    }

    if (needsData.includes('compliance_logs') && elderId) {
      const logsQuery = query(
        collection(db, 'medicationLogs'),
        where('groupId', '==', groupId),
        where('elderId', '==', elderId),
        where('scheduledTime', '>=', startDate),
        where('scheduledTime', '<=', endDate),
        orderBy('scheduledTime', 'desc')
      );
      const logsSnap = await getDocs(logsQuery);
      const logs = logsSnap.docs.map(doc => ({
        medicationId: doc.data().medicationId,
        status: doc.data().status,
        scheduledTime: doc.data().scheduledTime?.toDate?.() || new Date(doc.data().scheduledTime),
      }));

      const totalDoses = logs.length;
      const takenDoses = logs.filter(l => l.status === 'taken').length;
      const complianceRate = totalDoses > 0 ? ((takenDoses / totalDoses) * 100).toFixed(1) : '0';

      responseData.compliance = {
        totalDoses,
        takenDoses,
        missedDoses: logs.filter(l => l.status === 'missed').length,
        complianceRate,
        logs: logs.slice(0, 10),
      };
    }

    if (needsData.includes('diet_entries') && elderId) {
      const dietQuery = query(
        collection(db, 'dietEntries'),
        where('groupId', '==', groupId),
        where('elderId', '==', elderId),
        where('timestamp', '>=', startDate),
        where('timestamp', '<=', endDate),
        orderBy('timestamp', 'desc'),
        limit(20)
      );
      const dietSnap = await getDocs(dietQuery);
      responseData.dietEntries = dietSnap.docs.map(doc => ({
        meal: doc.data().meal,
        items: doc.data().items || [],
        timestamp: doc.data().timestamp?.toDate?.() || new Date(doc.data().timestamp),
      }));
    }

    let answer = '';
    if (intent === 'view_compliance' && responseData.compliance) {
      answer = `Based on the last ${timeframeDays} days, the medication compliance rate is ${responseData.compliance.complianceRate}%. ` +
               `${responseData.compliance.takenDoses} doses were taken out of ${responseData.compliance.totalDoses} scheduled doses, ` +
               `with ${responseData.compliance.missedDoses} doses missed.`;
    } else if (intent === 'check_medications' && responseData.medications) {
      answer = `There are ${responseData.medications.length} medications currently prescribed: ` +
               responseData.medications.map((m: any) => m.name).join(', ') + '.';
    } else if (intent === 'analyze_diet' && responseData.dietEntries) {
      answer = `${responseData.dietEntries.length} meals were logged in the last ${timeframeDays} days.`;
    } else {
      answer = `I found information related to your query about ${parameters.metric || 'health data'}.`;
    }

    return NextResponse.json({
      success: true,
      data: {
        query: userQuery,
        intent,
        parameters,
        answer,
        chartData: responseData,
        sources: needsData,
      },
    });
  } catch (error) {
    console.error('Query processing error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to process query' },
      { status: 500 }
    );
  }
}
