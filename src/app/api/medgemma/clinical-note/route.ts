/**
 * API Route: Generate Clinical Note with Medical AI
 *
 * POST /api/medgemma/clinical-note (legacy route - kept for compatibility)
 *
 * Generates a comprehensive clinical summary report using Google Gemini 3 Pro
 * including:
 * - Observational summary (factual data only)
 * - Discussion points (conversation starters for provider visits)
 * - Questions for provider (open-ended questions based on data patterns)
 */

export const dynamic = 'force-dynamic';

/*
 *
 * All outputs are validated to ensure NO medical advice is provided.
 *
 * AUTHENTICATION: Requires Firebase ID token in Authorization header
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateClinicalNote } from '@/lib/ai/medicalAIService';
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
    console.log('[Clinical Note] Fetching data for elder:', elderId, 'group:', groupId);

    const medications = await getMedicationsServer(groupId, elderId) as Medication[];
    console.log('[Clinical Note] Medications fetched:', medications.length);

    const complianceLogsRaw = await getMedicationLogsServer(groupId, elderId, startDate, endDate);
    console.log('[Clinical Note] Compliance logs fetched:', complianceLogsRaw.length);

    // Debug: Log raw scheduledTime values
    if (complianceLogsRaw.length > 0) {
      console.log('[Clinical Note] Sample log scheduledTime:', JSON.stringify(complianceLogsRaw[0]?.scheduledTime));
      console.log('[Clinical Note] Sample log scheduledTime type:', typeof complianceLogsRaw[0]?.scheduledTime);
    }

    const complianceLogs = complianceLogsRaw.map((log: any) => {
      // Ensure scheduledTime is a proper Date
      let scheduledTime = log.scheduledTime;
      if (scheduledTime && !(scheduledTime instanceof Date)) {
        if (scheduledTime.seconds !== undefined) {
          scheduledTime = new Date(scheduledTime.seconds * 1000);
        } else if (scheduledTime._seconds !== undefined) {
          scheduledTime = new Date(scheduledTime._seconds * 1000);
        } else if (typeof scheduledTime.toDate === 'function') {
          scheduledTime = scheduledTime.toDate();
        } else {
          scheduledTime = new Date(scheduledTime);
        }
      }

      return {
        medicationName: medications.find(m => m.id === log.medicationId)?.name || 'Unknown',
        scheduledTime,
        status: log.status as 'taken' | 'missed' | 'skipped',
        notes: log.notes,
      };
    });

    const dietEntriesRaw = await getDietEntriesServer(groupId, elderId, startDate, endDate, 50);
    console.log('[Clinical Note] Diet entries fetched:', dietEntriesRaw.length);

    const dietEntries = dietEntriesRaw.map((entry: any) => {
      // Ensure timestamp is a proper Date
      let timestamp = entry.timestamp;
      if (timestamp && !(timestamp instanceof Date)) {
        if (timestamp.seconds !== undefined) {
          timestamp = new Date(timestamp.seconds * 1000);
        } else if (timestamp._seconds !== undefined) {
          timestamp = new Date(timestamp._seconds * 1000);
        } else if (typeof timestamp.toDate === 'function') {
          timestamp = timestamp.toDate();
        } else {
          timestamp = new Date(timestamp);
        }
      }

      // Normalize items to always be an array
      let items = entry.items;
      if (!items) {
        items = [];
      } else if (typeof items === 'string') {
        // Split string into array (handles comma-separated items)
        items = items.split(',').map((i: string) => i.trim()).filter(Boolean);
      } else if (!Array.isArray(items)) {
        items = [String(items)];
      }

      return {
        meal: entry.meal,
        items,
        timestamp,
      };
    });

    // Debug: Log medication startDate
    if (medications.length > 0) {
      console.log('[Clinical Note] Sample medication startDate:', JSON.stringify(medications[0]?.startDate));
      console.log('[Clinical Note] Sample medication startDate type:', typeof medications[0]?.startDate);
    }

    const medgemmaData = {
      elder: { name: elderName, age: elderAge, medicalConditions, allergies },
      medications: medications.map(med => {
        // Ensure startDate is a proper Date
        let startDate = med.startDate;
        if (startDate && !(startDate instanceof Date)) {
          if ((startDate as any).seconds !== undefined) {
            startDate = new Date((startDate as any).seconds * 1000);
          } else if ((startDate as any)._seconds !== undefined) {
            startDate = new Date((startDate as any)._seconds * 1000);
          } else if (typeof (startDate as any).toDate === 'function') {
            startDate = (startDate as any).toDate();
          } else {
            startDate = new Date(startDate as any);
          }
        }

        return {
          name: med.name,
          dosage: med.dosage,
          frequency: Array.isArray(med.frequency?.times) ? med.frequency.times.length + 'x daily' : med.frequency?.type || 'as needed',
          startDate,
          prescribedBy: med.prescribedBy,
        };
      }),
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
        reportPeriod: {
          from: startDate.toISOString(),
          to: endDate.toISOString(),
        },
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
