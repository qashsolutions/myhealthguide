/**
 * API Route: Generate Clinical Note with MedGemma
 *
 * POST /api/medgemma/clinical-note
 *
 * Generates a comprehensive clinical summary report using MedGemma AI
 * including:
 * - Observational summary (factual data only)
 * - Discussion points (conversation starters for provider visits)
 * - Questions for provider (open-ended questions based on data patterns)
 *
 * All outputs are validated to ensure NO medical advice is provided.
 *
 * AUTHENTICATION: Requires Firebase ID token in Authorization header
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateClinicalNote } from '@/lib/ai/medgemmaService';
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
import type { Medication } from '@/types';

interface RequestBody {
  groupId: string;
  elderId: string;
  elderName: string;
  elderAge: number;
  elderDateOfBirth?: string;
  medicalConditions?: string[];
  allergies?: string[];
  timeframeDays: 30 | 60 | 90;
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.userId) {
      return NextResponse.json(
        { error: authResult.error || 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = authResult.userId;
    const body: RequestBody = await request.json();

    const {
      groupId,
      elderId,
      elderName,
      elderAge,
      elderDateOfBirth,
      medicalConditions,
      allergies,
      timeframeDays,
    } = body;

    if (!groupId || !elderId || !elderName || !elderAge || !timeframeDays) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify user has access to this elder
    const hasAccess = await canAccessElderProfileServer(userId, elderId, groupId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'You do not have permission to access this elder\'s data' },
        { status: 403 }
      );
    }

    // Get user data for role
    const userData = await getUserDataServer(userId);
    const userRole: UserRole = userData?.role || 'member';

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeframeDays);

    // Fetch data using Admin SDK
    const medications = await getMedicationsServer(groupId, elderId) as Medication[];
    const complianceLogsRaw = await getMedicationLogsServer(groupId, elderId, startDate, endDate);

    const complianceLogs = complianceLogsRaw.map((log: any) => ({
      medicationName: medications.find(m => m.id === log.medicationId)?.name || 'Unknown',
      scheduledTime: log.scheduledTime,
      status: log.status as 'taken' | 'missed' | 'skipped',
      notes: log.notes,
    }));

    const dietEntriesRaw = await getDietEntriesServer(groupId, elderId, startDate, endDate, 50);
    const dietEntries = dietEntriesRaw.map((entry: any) => ({
      meal: entry.meal,
      items: entry.items || [],
      timestamp: entry.timestamp,
    }));

    const medgemmaData = {
      elder: { name: elderName, age: elderAge, medicalConditions, allergies },
      medications: medications.map(med => ({
        name: med.name,
        dosage: med.dosage,
        frequency: Array.isArray(med.frequency?.times) ? med.frequency.times.length + 'x daily' : med.frequency?.type || 'as needed',
        startDate: med.startDate,
        prescribedBy: med.prescribedBy,
      })),
      complianceLogs,
      dietEntries,
      caregiverNotes: undefined,
      timeframeDays,
    };

    const clinicalNote = await generateClinicalNote(medgemmaData, userId, userRole, groupId, elderId);

    const totalDoses = complianceLogs.length;
    const takenDoses = complianceLogs.filter(log => log.status === 'taken').length;
    const missedDoses = complianceLogs.filter(log => log.status === 'missed').length;
    const complianceRate = totalDoses > 0 ? ((takenDoses / totalDoses) * 100).toFixed(1) : '0';

    return NextResponse.json({
      success: true,
      data: {
        summary: clinicalNote.summary,
        medicationList: medications.map(med => {
          const medLogs = complianceLogs.filter(log => log.medicationName === med.name);
          const medTaken = medLogs.filter(log => log.status === 'taken').length;
          const medTotal = medLogs.length;
          const medCompliance = medTotal > 0 ? ((medTaken / medTotal) * 100).toFixed(1) : 'N/A';
          return {
            name: med.name,
            dosage: med.dosage,
            frequency: Array.isArray(med.frequency?.times) ? med.frequency.times.length + 'x daily' : med.frequency?.type || 'as needed',
            compliance: medCompliance,
          };
        }),
        complianceAnalysis: { overallRate: complianceRate, totalDoses, takenDoses, missedDoses },
        patientInfo: { name: elderName, age: elderAge, dateOfBirth: elderDateOfBirth, medicalConditions, allergies },
        timeframeDays,
        discussionPoints: clinicalNote.discussionPoints,
        questionsForProvider: clinicalNote.questionsForProvider,
        disclaimer: 'This is an observational summary of logged health data. It does not contain medical advice or recommendations. Discussion points and questions are conversation starters based on data patterns, not clinical guidance. Please discuss all health decisions with your healthcare provider.',
      },
    });
  } catch (error) {
    console.error('Clinical note generation error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to generate clinical note' },
      { status: 500 }
    );
  }
}
