/**
 * API Route: Generate Clinical Note with MedGemma
 *
 * POST /api/medgemma/clinical-note
 *
 * Generates a comprehensive clinical summary report using MedGemma AI
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateClinicalNote } from '@/lib/ai/medgemmaService';
import { UserRole } from '@/lib/medical/phiAuditLog';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { Medication } from '@/types';

interface RequestBody {
  userId: string;
  userRole: UserRole;
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
    const body: RequestBody = await request.json();

    const {
      userId,
      userRole,
      groupId,
      elderId,
      elderName,
      elderAge,
      elderDateOfBirth,
      medicalConditions,
      allergies,
      timeframeDays,
    } = body;

    if (!userId || !userRole || !groupId || !elderId || !elderName || !elderAge || !timeframeDays) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeframeDays);

    const medicationsQuery = query(
      collection(db, 'medications'),
      where('groupId', '==', groupId),
      where('elderId', '==', elderId)
    );
    const medicationsSnap = await getDocs(medicationsQuery);
    const medications = medicationsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      startDate: doc.data().startDate?.toDate?.() || new Date(doc.data().startDate),
    })) as Medication[];

    const complianceLogsQuery = query(
      collection(db, 'medicationLogs'),
      where('groupId', '==', groupId),
      where('elderId', '==', elderId),
      where('scheduledTime', '>=', startDate),
      where('scheduledTime', '<=', endDate),
      orderBy('scheduledTime', 'desc')
    );
    const complianceLogsSnap = await getDocs(complianceLogsQuery);
    const complianceLogs = complianceLogsSnap.docs.map(doc => {
      const data = doc.data();
      return {
        medicationName: medications.find(m => m.id === data.medicationId)?.name || 'Unknown',
        scheduledTime: data.scheduledTime?.toDate?.() || new Date(data.scheduledTime),
        status: data.status as 'taken' | 'missed' | 'skipped',
        notes: data.notes,
      };
    });

    const dietEntriesQuery = query(
      collection(db, 'dietEntries'),
      where('groupId', '==', groupId),
      where('elderId', '==', elderId),
      where('timestamp', '>=', startDate),
      where('timestamp', '<=', endDate),
      orderBy('timestamp', 'desc'),
      limit(50)
    );
    const dietEntriesSnap = await getDocs(dietEntriesQuery);
    const dietEntries = dietEntriesSnap.docs.map(doc => {
      const data = doc.data();
      return {
        meal: data.meal,
        items: data.items || [],
        timestamp: data.timestamp?.toDate?.() || new Date(data.timestamp),
      };
    });

    const medgemmaData = {
      elder: { name: elderName, age: elderAge, medicalConditions, allergies },
      medications: medications.map(med => ({
        name: med.name,
        dosage: med.dosage,
        frequency: Array.isArray(med.frequency.times) ? med.frequency.times.length + 'x daily' : med.frequency.type,
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
            frequency: Array.isArray(med.frequency.times) ? med.frequency.times.length + 'x daily' : med.frequency.type,
            compliance: medCompliance,
          };
        }),
        complianceAnalysis: { overallRate: complianceRate, totalDoses, takenDoses, missedDoses },
        recommendations: clinicalNote.recommendations,
        questionsForDoctor: clinicalNote.questionsForDoctor,
        patientInfo: { name: elderName, age: elderAge, dateOfBirth: elderDateOfBirth, medicalConditions, allergies },
        timeframeDays,
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
