/**
 * Seed Weekly Shifts for Schedule Assignment Testing
 *
 * Creates realistic shifts for all 30 elders across the current week.
 *
 * CONSTRAINTS ENFORCED:
 * 1. Max 3 elders per caregiver per day
 * 2. Max 1 elder per 2-hour window (staggered shifts)
 *
 * SHIFT SLOTS (2.5 hours each):
 * - Slot 1: 9:00 AM - 11:30 AM
 * - Slot 2: 11:30 AM - 2:00 PM
 * - Slot 3: 2:00 PM - 4:30 PM
 *
 * Run with: npx ts-node --project tsconfig.scripts.json .claude/skills/schedule-assignment/scripts/seedWeeklyShifts.ts
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import * as path from 'path';
import * as fs from 'fs';

// Time slots for staggered shifts (2.5 hours each)
const TIME_SLOTS = [
  { startTime: '09:00', endTime: '11:30', duration: 150 }, // Slot 1: Morning
  { startTime: '11:30', endTime: '14:00', duration: 150 }, // Slot 2: Midday
  { startTime: '14:00', endTime: '16:30', duration: 150 }, // Slot 3: Afternoon
];

// Initialize Firebase Admin
function initFirebase() {
  const existingApps = getApps();
  if (existingApps.length > 0) {
    return {
      db: getFirestore(existingApps[0]),
      auth: getAuth(existingApps[0])
    };
  }

  const credPath = path.join(__dirname, '../../../../scripts/serviceAccountKey.json');
  if (!fs.existsSync(credPath)) {
    throw new Error('serviceAccountKey.json not found');
  }

  const credentials = JSON.parse(fs.readFileSync(credPath, 'utf8'));
  const app = initializeApp({
    credential: cert(credentials),
    projectId: credentials.project_id,
  });

  return {
    db: getFirestore(app),
    auth: getAuth(app)
  };
}

// Get start of week (Sunday)
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Add days to date
function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// Shuffle array (Fisher-Yates)
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

async function seedWeeklyShifts() {
  console.log('🗓️  Seeding weekly shifts with REALISTIC constraints...\n');
  console.log('CONSTRAINTS:');
  console.log('  • Max 3 elders per caregiver per day');
  console.log('  • Max 1 elder per 2-hour window (staggered shifts)');
  console.log('  • Time slots: 9:00-11:30, 11:30-14:00, 14:00-16:30\n');

  const { db, auth } = initFirebase();

  // Get agency owner to find agency
  const ownerEmail = 'ramanac+owner@gmail.com';
  const ownerUser = await auth.getUserByEmail(ownerEmail);
  const ownerDoc = await db.collection('users').doc(ownerUser.uid).get();
  const ownerData = ownerDoc.data();

  const agencyId = ownerData?.agencies?.[0]?.agencyId;
  if (!agencyId) {
    throw new Error('Agency not found for owner');
  }
  console.log(`Agency ID: ${agencyId}`);

  // Get agency to find groups
  const agencyDoc = await db.collection('agencies').doc(agencyId).get();
  const agencyData = agencyDoc.data();
  const groupIds = agencyData?.groupIds || [];
  console.log(`Groups: ${groupIds.length}`);

  // Get all elders from agency groups
  const elders: { id: string; name: string; groupId: string }[] = [];
  for (const groupId of groupIds) {
    const elderSnap = await db.collection('elders')
      .where('groupId', '==', groupId)
      .get();

    elderSnap.docs.forEach(doc => {
      const data = doc.data();
      if (data.archived === true) return;
      elders.push({
        id: doc.id,
        name: data.name || data.preferredName || 'Unknown',
        groupId
      });
    });
  }
  console.log(`Elders found: ${elders.length}`);

  // Get all caregivers
  const caregiverIds = agencyData?.caregiverIds || [];
  const caregivers: { id: string; name: string }[] = [];

  for (const cId of caregiverIds) {
    const userDoc = await db.collection('users').doc(cId).get();
    const userData = userDoc.data();
    caregivers.push({
      id: cId,
      name: userData?.displayName || userData?.name || `Caregiver ${caregivers.length + 1}`
    });
  }
  console.log(`Caregivers found: ${caregivers.length}`);

  // Validate we have enough caregivers for the elders
  const maxEldersPerDay = caregivers.length * 3; // 10 caregivers × 3 slots = 30 elders max
  console.log(`Max elders per day: ${maxEldersPerDay} (${caregivers.length} caregivers × 3 slots)\n`);

  // Calculate week dates
  const weekStart = getWeekStart(new Date());
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  console.log(`Week: ${weekStart.toDateString()} - ${addDays(weekStart, 6).toDateString()}\n`);

  // Clear existing shifts for this week
  console.log('Clearing existing shifts for this week...');

  const weekEnd = addDays(weekStart, 6);
  weekEnd.setHours(23, 59, 59, 999);

  const existingShifts = await db.collection('scheduledShifts')
    .where('agencyId', '==', agencyId)
    .get();

  const shiftsToDelete = existingShifts.docs.filter(doc => {
    const data = doc.data();
    const shiftDate = data.date?.toDate?.() || new Date(data.date);
    return shiftDate >= weekStart && shiftDate <= weekEnd;
  });

  for (let i = 0; i < shiftsToDelete.length; i += 500) {
    const batch = db.batch();
    const chunk = shiftsToDelete.slice(i, i + 500);
    chunk.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  }
  console.log(`Deleted ${shiftsToDelete.length} existing shifts\n`);

  // Create shifts with REALISTIC constraints
  const shifts: any[] = [];
  let assignedCount = 0;
  let unassignedCount = 0;

  for (const day of weekDays) {
    const dayIndex = day.getDay();
    const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayIndex];

    // Skip Sunday (day off)
    if (dayIndex === 0) {
      console.log(`${dayName} ${day.toDateString()}: SKIP (day off)`);
      continue;
    }

    // Determine assignment rate for the day
    // Mon/Tue: high coverage, Thu-Sat: more gaps
    let assignRate: number;
    switch (dayIndex) {
      case 1: // Mon
      case 2: // Tue
        assignRate = 0.9; // 90% assigned
        break;
      case 3: // Wed
        assignRate = 0.7; // 70% assigned
        break;
      case 4: // Thu
      case 5: // Fri
        assignRate = 0.5; // 50% assigned
        break;
      case 6: // Sat
        assignRate = 0.4; // 40% assigned
        break;
      default:
        assignRate = 0;
    }

    // Track caregiver assignments for this day
    // caregiverSlots[caregiverId] = [slotIndex1, slotIndex2, ...] (max 3)
    const caregiverSlots: Map<string, number[]> = new Map();
    caregivers.forEach(c => caregiverSlots.set(c.id, []));

    // Shuffle elders for random assignment order
    const shuffledElders = shuffleArray(elders);

    let dayAssigned = 0;
    let dayUnassigned = 0;

    for (const elder of shuffledElders) {
      // Decide if this elder should be assigned today
      const shouldAssign = Math.random() < assignRate;

      if (shouldAssign) {
        // Find an available caregiver with an open slot
        let assignedCaregiver: { id: string; name: string } | null = null;
        let assignedSlot: typeof TIME_SLOTS[0] | null = null;

        // Shuffle caregivers for random selection
        const shuffledCaregivers = shuffleArray(caregivers);

        for (const caregiver of shuffledCaregivers) {
          const usedSlots = caregiverSlots.get(caregiver.id) || [];

          // Check if caregiver has room (max 3 elders per day)
          if (usedSlots.length >= 3) continue;

          // Find first available slot for this caregiver
          for (let slotIdx = 0; slotIdx < TIME_SLOTS.length; slotIdx++) {
            if (!usedSlots.includes(slotIdx)) {
              assignedCaregiver = caregiver;
              assignedSlot = TIME_SLOTS[slotIdx];
              usedSlots.push(slotIdx);
              caregiverSlots.set(caregiver.id, usedSlots);
              break;
            }
          }

          if (assignedCaregiver) break;
        }

        if (assignedCaregiver && assignedSlot) {
          // Create assigned shift
          shifts.push({
            agencyId,
            groupId: elder.groupId,
            elderId: elder.id,
            elderName: elder.name,
            caregiverId: assignedCaregiver.id,
            caregiverName: assignedCaregiver.name,
            date: Timestamp.fromDate(day),
            startTime: assignedSlot.startTime,
            endTime: assignedSlot.endTime,
            duration: assignedSlot.duration,
            status: Math.random() < 0.8 ? 'confirmed' : 'scheduled',
            isRecurring: false,
            createdBy: ownerUser.uid,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
          });
          dayAssigned++;
          assignedCount++;
        } else {
          // No available caregiver slot - create unfilled shift
          // Pick a random time slot
          const slot = TIME_SLOTS[Math.floor(Math.random() * TIME_SLOTS.length)];
          shifts.push({
            agencyId,
            groupId: elder.groupId,
            elderId: elder.id,
            elderName: elder.name,
            caregiverId: '',
            caregiverName: '',
            date: Timestamp.fromDate(day),
            startTime: slot.startTime,
            endTime: slot.endTime,
            duration: slot.duration,
            status: 'unfilled',
            isRecurring: false,
            createdBy: ownerUser.uid,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
          });
          dayUnassigned++;
          unassignedCount++;
        }
      } else {
        // Create unfilled shift (gap)
        const slot = TIME_SLOTS[Math.floor(Math.random() * TIME_SLOTS.length)];
        shifts.push({
          agencyId,
          groupId: elder.groupId,
          elderId: elder.id,
          elderName: elder.name,
          caregiverId: '',
          caregiverName: '',
          date: Timestamp.fromDate(day),
          startTime: slot.startTime,
          endTime: slot.endTime,
          duration: slot.duration,
          status: 'unfilled',
          isRecurring: false,
          createdBy: ownerUser.uid,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
        dayUnassigned++;
        unassignedCount++;
      }
    }

    // Log caregiver load for verification
    let maxLoad = 0;
    caregiverSlots.forEach((slots, cId) => {
      if (slots.length > maxLoad) maxLoad = slots.length;
    });

    console.log(`${dayName} ${day.toDateString()}: ${dayAssigned} assigned, ${dayUnassigned} gaps (max caregiver load: ${maxLoad})`);
  }

  // Batch write all shifts
  console.log('\nWriting shifts to Firestore...');
  const batchSize = 500;
  for (let i = 0; i < shifts.length; i += batchSize) {
    const batch = db.batch();
    const chunk = shifts.slice(i, i + batchSize);

    for (const shift of chunk) {
      const ref = db.collection('scheduledShifts').doc();
      batch.set(ref, shift);
    }

    await batch.commit();
    console.log(`  Written ${Math.min(i + batchSize, shifts.length)}/${shifts.length} shifts`);
  }

  console.log('\n✅ Seeding complete!');
  console.log('=====================================');
  console.log(`Total shifts created: ${shifts.length}`);
  console.log(`  Assigned: ${assignedCount}`);
  console.log(`  Unassigned (gaps): ${unassignedCount}`);
  console.log(`  Elders: ${elders.length}`);
  console.log(`  Caregivers: ${caregivers.length}`);
  console.log('=====================================');
  console.log('\nCONSTRAINTS VERIFIED:');
  console.log('  ✓ Max 3 elders per caregiver per day');
  console.log('  ✓ Staggered 2.5-hour time slots (no overlap)');
  console.log('=====================================');
  console.log('\nTest at: https://www.myguide.health/dashboard/agency?tab=scheduling');
}

seedWeeklyShifts().catch(console.error);
