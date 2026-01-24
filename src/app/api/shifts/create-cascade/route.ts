/**
 * POST /api/shifts/create-cascade
 * Creates a cascade shift (Auto-Assign mode) using Firebase Admin SDK.
 * Bypasses Firestore security rules to write notifications for other users.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/api/verifyAuth';
import { getAdminDb } from '@/lib/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { startOfWeek, endOfWeek, format } from 'date-fns';

interface CascadeCandidate {
  caregiverId: string;
  caregiverName: string;
  score: number;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Auth check
    const auth = await verifyAuthToken(request);
    if (!auth.success || !auth.userId) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      agencyId,
      groupId,
      elderId,
      elderName,
      date, // ISO string
      startTime,
      endTime,
      notes,
      preferredCaregiverId
    } = body;

    // Validate required fields
    if (!agencyId || !groupId || !elderId || !elderName || !date || !startTime || !endTime) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const adminDb = getAdminDb();

    // 2. Verify user is super_admin of this agency
    const agencyDoc = await adminDb.collection('agencies').doc(agencyId).get();
    if (!agencyDoc.exists) {
      return NextResponse.json({ error: 'Agency not found' }, { status: 404 });
    }

    const agencyData = agencyDoc.data();
    if (agencyData?.superAdminId !== auth.userId) {
      return NextResponse.json({ error: 'Only agency owners can create cascade shifts' }, { status: 403 });
    }

    const shiftDate = new Date(date);

    // Validate date is not in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (shiftDate < today) {
      return NextResponse.json({ error: 'Cannot create shifts in the past' }, { status: 400 });
    }

    // 3. Rank eligible caregivers
    const candidates = await rankCaregiversServer(
      adminDb,
      agencyId,
      elderId,
      shiftDate,
      startTime,
      endTime,
      preferredCaregiverId
    );

    const duration = parseTime(endTime) - parseTime(startTime);

    // 4. If no eligible caregivers, create as unfilled
    if (candidates.length === 0) {
      const shiftData: Record<string, any> = {
        agencyId,
        groupId,
        elderId,
        elderName,
        caregiverId: '',
        caregiverName: '',
        date: Timestamp.fromDate(shiftDate),
        startTime,
        endTime,
        duration,
        status: 'unfilled',
        assignmentMode: 'cascade',
        cascadeState: {
          rankedCandidates: [],
          currentOfferIndex: 0,
          offerHistory: []
        },
        isRecurring: false,
        createdBy: auth.userId,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      };

      if (notes) shiftData.notes = notes;
      if (preferredCaregiverId) {
        shiftData.cascadeState.preferredCaregiverId = preferredCaregiverId;
      }

      const shiftRef = await adminDb.collection('scheduledShifts').add(shiftData);

      // Notify owner about unfilled shift
      const dateStr = format(shiftDate, 'MMM d, yyyy');
      await adminDb.collection('user_notifications').add({
        userId: auth.userId,
        groupId,
        elderId,
        type: 'shift_unfilled',
        title: 'Shift Unfilled',
        message: `No caregiver is available for the shift with ${elderName} on ${dateStr} (${startTime}–${endTime}). Please assign manually.`,
        priority: 'high',
        actionUrl: '/dashboard/agency/schedule',
        sourceCollection: 'scheduledShifts',
        sourceId: shiftRef.id,
        data: {
          shiftId: shiftRef.id,
          elderName,
          date: dateStr,
          startTime,
          endTime
        },
        read: false,
        dismissed: false,
        actionRequired: true,
        expiresAt: null,
        createdAt: FieldValue.serverTimestamp()
      });

      return NextResponse.json({ success: true, shiftId: shiftRef.id, status: 'unfilled' });
    }

    // 5. Create shift with first candidate as tentative
    const firstCandidate = candidates[0];
    const offerExpiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min from now

    const shiftData: Record<string, any> = {
      agencyId,
      groupId,
      elderId,
      elderName,
      caregiverId: firstCandidate.caregiverId,
      caregiverName: firstCandidate.caregiverName,
      date: Timestamp.fromDate(shiftDate),
      startTime,
      endTime,
      duration,
      status: 'offered',
      assignmentMode: 'cascade',
      cascadeState: {
        rankedCandidates: candidates.map(c => ({
          caregiverId: c.caregiverId,
          caregiverName: c.caregiverName,
          score: c.score
        })),
        currentOfferIndex: 0,
        currentOfferExpiresAt: Timestamp.fromDate(offerExpiresAt),
        offerHistory: [{
          caregiverId: firstCandidate.caregiverId,
          response: 'pending'
        }]
      },
      isRecurring: false,
      createdBy: auth.userId,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    };

    if (notes) shiftData.notes = notes;
    if (preferredCaregiverId) {
      shiftData.cascadeState.preferredCaregiverId = preferredCaregiverId;
    }

    const shiftRef = await adminDb.collection('scheduledShifts').add(shiftData);

    // 6. Send shift_offer notification to first candidate
    const dateStr = format(shiftDate, 'MMM d, yyyy');
    await adminDb.collection('user_notifications').add({
      userId: firstCandidate.caregiverId,
      groupId,
      elderId,
      type: 'shift_offer',
      title: 'Shift Available',
      message: `A shift with ${elderName} on ${dateStr} (${startTime}–${endTime}) is available. Accept within 30 minutes.`,
      priority: 'high',
      actionUrl: '/dashboard/calendar',
      sourceCollection: 'scheduledShifts',
      sourceId: shiftRef.id,
      data: {
        shiftId: shiftRef.id,
        offerExpiresAt: offerExpiresAt.toISOString(),
        elderName,
        date: dateStr,
        startTime,
        endTime
      },
      read: false,
      dismissed: false,
      actionRequired: true,
      expiresAt: Timestamp.fromDate(offerExpiresAt),
      createdAt: FieldValue.serverTimestamp()
    });

    return NextResponse.json({
      success: true,
      shiftId: shiftRef.id,
      status: 'offered',
      offeredTo: firstCandidate.caregiverName,
      candidateCount: candidates.length
    });
  } catch (error: any) {
    console.error('Error creating cascade shift:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create cascade shift' },
      { status: 500 }
    );
  }
}

/**
 * Server-side caregiver ranking using Admin SDK
 */
async function rankCaregiversServer(
  adminDb: FirebaseFirestore.Firestore,
  agencyId: string,
  elderId: string,
  date: Date,
  startTime: string,
  endTime: string,
  preferredCaregiverId?: string
): Promise<CascadeCandidate[]> {
  // 1. Get active caregiver assignments for this agency
  const assignmentsSnap = await adminDb.collection('caregiver_assignments')
    .where('agencyId', '==', agencyId)
    .where('active', '==', true)
    .get();

  const assignments = assignmentsSnap.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as any[];

  // 2. Get elder data
  const elderDoc = await adminDb.collection('elders').doc(elderId).get();
  const elderData = elderDoc.exists ? elderDoc.data() : null;

  // 3. Collect unique active caregiver IDs
  const activeCaregiverIds = new Set<string>();
  assignments.forEach(a => {
    if (a.caregiverId) {
      activeCaregiverIds.add(a.caregiverId);
    }
  });

  if (activeCaregiverIds.size === 0) return [];

  // 4. Get caregiver names
  const caregiverNames = new Map<string, string>();
  const caregiverIdArray = Array.from(activeCaregiverIds);

  for (let i = 0; i < caregiverIdArray.length; i += 10) {
    const batch = caregiverIdArray.slice(i, i + 10);
    const promises = batch.map(async (id) => {
      const userDoc = await adminDb.collection('users').doc(id).get();
      if (userDoc.exists) {
        const data = userDoc.data();
        const name = data?.firstName && data?.lastName
          ? `${data.firstName} ${data.lastName}`
          : data?.firstName || data?.email || `Caregiver ${id.substring(0, 6)}`;
        caregiverNames.set(id, name);
      }
    });
    await Promise.all(promises);
  }

  // 5. Score each caregiver
  const candidates: CascadeCandidate[] = [];
  const shiftStartMin = parseTime(startTime);
  const shiftEndMin = parseTime(endTime);

  for (const caregiverId of activeCaregiverIds) {
    // Check scheduling conflict
    const hasConflict = await checkConflictServer(
      adminDb, caregiverId, date, shiftStartMin, shiftEndMin
    );
    if (hasConflict) continue;

    let score = 0;

    // +40: Primary caregiver for this elder
    if (elderData?.primaryCaregiverId === caregiverId) {
      score += 40;
    }

    // +15: Assigned to this elder
    const assignedToElder = assignments.some(
      a => a.caregiverId === caregiverId && a.elderIds?.includes(elderId)
    );
    if (assignedToElder) {
      score += 15;
    }

    // +10: Owner's preferred choice
    if (preferredCaregiverId && caregiverId === preferredCaregiverId) {
      score += 10;
    }

    // +1 per completed shift with this elder (max +25)
    const completedCount = await getCompletedCountServer(adminDb, caregiverId, elderId, agencyId);
    score += Math.min(completedCount, 25);

    // +10 max: Lower workload this week
    const weekWorkload = await getWeeklyCountServer(adminDb, caregiverId, agencyId, date);
    score += Math.max(0, 10 - weekWorkload * 2);

    const name = caregiverNames.get(caregiverId) || `Caregiver ${caregiverId.substring(0, 6)}`;
    candidates.push({ caregiverId, caregiverName: name, score });
  }

  // Sort by score descending
  candidates.sort((a, b) => b.score - a.score);
  return candidates;
}

/**
 * Check if caregiver has a scheduling conflict (server-side)
 */
async function checkConflictServer(
  adminDb: FirebaseFirestore.Firestore,
  caregiverId: string,
  date: Date,
  startMin: number,
  endMin: number
): Promise<boolean> {
  try {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const shiftsSnap = await adminDb.collection('scheduledShifts')
      .where('caregiverId', '==', caregiverId)
      .where('date', '>=', Timestamp.fromDate(dayStart))
      .where('date', '<=', Timestamp.fromDate(dayEnd))
      .get();

    for (const doc of shiftsSnap.docs) {
      const shift = doc.data();
      if (!['scheduled', 'confirmed', 'in_progress', 'offered'].includes(shift.status)) continue;

      const existingStart = parseTime(shift.startTime);
      const existingEnd = parseTime(shift.endTime);

      // Check overlap
      if (startMin < existingEnd && endMin > existingStart) {
        return true;
      }
    }

    return false;
  } catch (err) {
    console.error('Error checking conflicts:', err);
    return false;
  }
}

/**
 * Get completed shift count for a caregiver with a specific elder (server-side)
 */
async function getCompletedCountServer(
  adminDb: FirebaseFirestore.Firestore,
  caregiverId: string,
  elderId: string,
  agencyId: string
): Promise<number> {
  try {
    const snap = await adminDb.collection('scheduledShifts')
      .where('agencyId', '==', agencyId)
      .where('caregiverId', '==', caregiverId)
      .where('elderId', '==', elderId)
      .where('status', '==', 'completed')
      .get();
    return snap.size;
  } catch (err) {
    return 0;
  }
}

/**
 * Get weekly shift count for a caregiver (server-side)
 */
async function getWeeklyCountServer(
  adminDb: FirebaseFirestore.Firestore,
  caregiverId: string,
  agencyId: string,
  targetDate: Date
): Promise<number> {
  try {
    const weekStart = startOfWeek(targetDate, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(targetDate, { weekStartsOn: 0 });

    const snap = await adminDb.collection('scheduledShifts')
      .where('agencyId', '==', agencyId)
      .where('caregiverId', '==', caregiverId)
      .where('date', '>=', Timestamp.fromDate(weekStart))
      .where('date', '<=', Timestamp.fromDate(weekEnd))
      .get();

    // Filter by active statuses in memory
    return snap.docs.filter(doc => {
      const status = doc.data().status;
      return ['scheduled', 'confirmed', 'in_progress', 'offered'].includes(status);
    }).length;
  } catch (err) {
    return 0;
  }
}

/**
 * Parse "HH:MM" to minutes since midnight
 */
function parseTime(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}
