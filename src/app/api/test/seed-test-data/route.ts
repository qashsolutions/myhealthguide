/**
 * TEST ENDPOINT: Seed Complete Test Data
 *
 * Creates a full set of test data for an elder including:
 * - Medications with logs (taken/missed)
 * - Supplements with logs
 * - Diet entries (breakfast, lunch, dinner)
 * - Notes
 *
 * Usage: POST /api/test/seed-test-data
 * Body: { elderId, groupId, userId }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import { subDays, setHours, setMinutes, format } from 'date-fns';

// Helper to create random time variation
function randomTimeOffset(baseDate: Date, hour: number, minute: number, varianceMinutes: number = 30): Date {
  const date = setMinutes(setHours(baseDate, hour), minute);
  const variance = Math.floor(Math.random() * varianceMinutes * 2) - varianceMinutes;
  return new Date(date.getTime() + variance * 60 * 1000);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { elderId, groupId, userId } = body;

    if (!elderId || !groupId || !userId) {
      return NextResponse.json(
        { error: 'elderId, groupId, and userId are required' },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const now = new Date();
    const results = {
      medications: [] as string[],
      medicationLogs: [] as string[],
      supplements: [] as string[],
      supplementLogs: [] as string[],
      dietEntries: [] as string[],
      notes: [] as string[],
    };

    // ============ CREATE MEDICATIONS ============
    const medications = [
      {
        name: 'Lisinopril',
        dosage: '10mg',
        frequency: 'daily',
        times: ['08:00'],
        instructions: 'Take with water',
        purpose: 'Blood pressure control',
      },
      {
        name: 'Metformin',
        dosage: '500mg',
        frequency: 'twice daily',
        times: ['08:00', '20:00'],
        instructions: 'Take with meals',
        purpose: 'Blood sugar control',
      },
      {
        name: 'Vitamin D3',
        dosage: '2000 IU',
        frequency: 'daily',
        times: ['09:00'],
        instructions: 'Take with food',
        purpose: 'Bone health',
      },
    ];

    for (const med of medications) {
      const medRef = await db.collection('medications').add({
        ...med,
        elderId,
        groupId,
        isActive: true,
        startDate: Timestamp.fromDate(subDays(now, 60)),
        endDate: null,
        createdAt: Timestamp.fromDate(subDays(now, 60)),
        updatedAt: Timestamp.now(),
      });
      results.medications.push(medRef.id);

      // Create logs for each medication for past 30 days
      for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
        const date = subDays(now, dayOffset);

        for (const timeStr of med.times) {
          const [hour, minute] = timeStr.split(':').map(Number);
          const scheduledTime = randomTimeOffset(date, hour, minute);

          // Compliance: ~75% taken, ~15% missed, ~10% skipped
          const random = Math.random();
          let status: 'taken' | 'missed' | 'skipped';
          if (random < 0.75) {
            status = 'taken';
          } else if (random < 0.90) {
            status = 'missed';
          } else {
            status = 'skipped';
          }

          const logRef = await db.collection('medication_logs').add({
            medicationId: medRef.id,
            medicationName: med.name,
            elderId,
            groupId,
            status,
            scheduledTime: Timestamp.fromDate(scheduledTime),
            actualTime: status === 'taken' ? Timestamp.fromDate(scheduledTime) : null,
            createdAt: Timestamp.fromDate(scheduledTime),
            loggedBy: userId,
            notes: status === 'missed' ? 'Forgot to take' : '',
          });
          results.medicationLogs.push(logRef.id);
        }
      }
    }

    // ============ CREATE SUPPLEMENTS ============
    const supplements = [
      {
        name: 'Omega-3 Fish Oil',
        dosage: '1000mg',
        frequency: 'daily',
        times: ['09:00'],
        instructions: 'Take with breakfast',
      },
      {
        name: 'Calcium',
        dosage: '600mg',
        frequency: 'daily',
        times: ['20:00'],
        instructions: 'Take with dinner',
      },
    ];

    for (const supp of supplements) {
      const suppRef = await db.collection('supplements').add({
        ...supp,
        elderId,
        groupId,
        isActive: true,
        startDate: Timestamp.fromDate(subDays(now, 45)),
        createdAt: Timestamp.fromDate(subDays(now, 45)),
        updatedAt: Timestamp.now(),
      });
      results.supplements.push(suppRef.id);

      // Create logs for past 30 days
      for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
        const date = subDays(now, dayOffset);

        for (const timeStr of supp.times) {
          const [hour, minute] = timeStr.split(':').map(Number);
          const scheduledTime = randomTimeOffset(date, hour, minute);

          // Supplements: ~80% taken, ~15% missed, ~5% skipped
          const random = Math.random();
          let status: 'taken' | 'missed' | 'skipped';
          if (random < 0.80) {
            status = 'taken';
          } else if (random < 0.95) {
            status = 'missed';
          } else {
            status = 'skipped';
          }

          const logRef = await db.collection('supplement_logs').add({
            supplementId: suppRef.id,
            supplementName: supp.name,
            elderId,
            groupId,
            status,
            scheduledTime: Timestamp.fromDate(scheduledTime),
            actualTime: status === 'taken' ? Timestamp.fromDate(scheduledTime) : null,
            createdAt: Timestamp.fromDate(scheduledTime),
            loggedBy: userId,
          });
          results.supplementLogs.push(logRef.id);
        }
      }
    }

    // ============ CREATE DIET ENTRIES ============
    const mealTypes = [
      { meal: 'breakfast', hour: 8, items: ['Oatmeal with berries', 'Orange juice', 'Toast with butter'] },
      { meal: 'lunch', hour: 12, items: ['Grilled chicken salad', 'Whole wheat bread', 'Apple'] },
      { meal: 'dinner', hour: 18, items: ['Baked salmon', 'Steamed vegetables', 'Brown rice'] },
      { meal: 'snack', hour: 15, items: ['Greek yogurt', 'Almonds'] },
    ];

    for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
      const date = subDays(now, dayOffset);

      // ~90% chance of logging each meal
      for (const mealType of mealTypes) {
        if (Math.random() < 0.90) {
          const mealTime = randomTimeOffset(date, mealType.hour, 0, 45);

          // Vary the items slightly
          const items = mealType.items.slice(0, Math.floor(Math.random() * mealType.items.length) + 1);

          const dietRef = await db.collection('diet_entries').add({
            elderId,
            groupId,
            meal: mealType.meal,
            items: items.join(', '),
            timestamp: Timestamp.fromDate(mealTime),
            createdAt: Timestamp.fromDate(mealTime),
            loggedBy: userId,
            notes: Math.random() < 0.2 ? 'Good appetite today' : '',
          });
          results.dietEntries.push(dietRef.id);
        }
      }
    }

    // ============ CREATE NOTES ============
    const noteTemplates = [
      'Blood pressure reading: 125/82. Feeling good today.',
      'Mild headache in the morning, resolved after breakfast.',
      'Slept well last night, about 7 hours.',
      'Went for a 20-minute walk in the afternoon.',
      'Slight fatigue today, will rest more.',
      'Good day overall, enjoyed visiting with family.',
      'Physical therapy session completed. Exercises going well.',
      'Doctor appointment scheduled for next week.',
      'Appetite has been good this week.',
      'Blood sugar reading: 112 mg/dL before breakfast.',
    ];

    for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
      // ~60% chance of a note each day
      if (Math.random() < 0.60) {
        const date = subDays(now, dayOffset);
        const noteTime = randomTimeOffset(date, 14, 0, 180); // Afternoon, with 3-hour variance
        const noteContent = noteTemplates[Math.floor(Math.random() * noteTemplates.length)];

        const noteRef = await db.collection('notes').add({
          elderId,
          groupId,
          content: noteContent,
          type: 'observation',
          timestamp: Timestamp.fromDate(noteTime),
          createdAt: Timestamp.fromDate(noteTime),
          createdBy: userId,
          isPrivate: false,
        });
        results.notes.push(noteRef.id);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Test data created successfully',
      counts: {
        medications: results.medications.length,
        medicationLogs: results.medicationLogs.length,
        supplements: results.supplements.length,
        supplementLogs: results.supplementLogs.length,
        dietEntries: results.dietEntries.length,
        notes: results.notes.length,
      },
      dateRange: {
        from: subDays(now, 30).toISOString(),
        to: now.toISOString(),
      },
      note: 'Refresh the Insights page to see the new data',
    });

  } catch (error) {
    console.error('Error creating test data:', error);
    return NextResponse.json(
      { error: 'Failed to create test data', details: String(error) },
      { status: 500 }
    );
  }
}

// GET endpoint to check test user data
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const groupId = url.searchParams.get('groupId');
  const elderId = url.searchParams.get('elderId');

  if (!groupId || !elderId) {
    return NextResponse.json(
      { error: 'groupId and elderId are required' },
      { status: 400 }
    );
  }

  try {
    const db = getAdminDb();

    // Count documents in each collection
    const [medications, medicationLogs, supplements, supplementLogs, dietEntries, notes] = await Promise.all([
      db.collection('medications').where('groupId', '==', groupId).where('elderId', '==', elderId).get(),
      db.collection('medication_logs').where('groupId', '==', groupId).where('elderId', '==', elderId).get(),
      db.collection('supplements').where('groupId', '==', groupId).where('elderId', '==', elderId).get(),
      db.collection('supplement_logs').where('groupId', '==', groupId).where('elderId', '==', elderId).get(),
      db.collection('diet_entries').where('groupId', '==', groupId).where('elderId', '==', elderId).get(),
      db.collection('notes').where('groupId', '==', groupId).where('elderId', '==', elderId).get(),
    ]);

    // Get status breakdown for medication logs
    const medLogStatuses = medicationLogs.docs.reduce((acc, doc) => {
      const status = doc.data().status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      counts: {
        medications: medications.size,
        medicationLogs: medicationLogs.size,
        supplements: supplements.size,
        supplementLogs: supplementLogs.size,
        dietEntries: dietEntries.size,
        notes: notes.size,
      },
      medicationLogStatuses: medLogStatuses,
      sampleMedications: medications.docs.slice(0, 3).map(d => ({ id: d.id, name: d.data().name })),
    });

  } catch (error) {
    console.error('Error fetching test data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data', details: String(error) },
      { status: 500 }
    );
  }
}
