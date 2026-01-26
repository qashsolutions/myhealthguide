/**
 * Seed Weekly Shifts for Schedule Assignment Testing
 *
 * Creates shifts for all 30 elders across the current week with varying assignment states:
 * - Some fully assigned
 * - Some partially assigned
 * - Some completely unassigned (gaps)
 *
 * Run with: npx ts-node --project tsconfig.scripts.json .claude/skills/schedule-assignment/scripts/seedWeeklyShifts.ts
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import * as path from 'path';
import * as fs from 'fs';

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

async function seedWeeklyShifts() {
  console.log('🗓️  Seeding weekly shifts for schedule assignment testing...\n');

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
    // Don't filter by archived - field may not exist
    const elderSnap = await db.collection('elders')
      .where('groupId', '==', groupId)
      .get();

    elderSnap.docs.forEach(doc => {
      const data = doc.data();
      // Skip archived elders if the field exists and is true
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
  console.log(`Caregivers found: ${caregivers.length}\n`);

  // Calculate week dates
  const weekStart = getWeekStart(new Date());
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  console.log(`Week: ${weekStart.toDateString()} - ${addDays(weekStart, 6).toDateString()}\n`);

  // Clear existing shifts for this week
  // Query by agencyId only, filter by date in memory (avoids needing composite index)
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

  // Batch delete in chunks of 500
  for (let i = 0; i < shiftsToDelete.length; i += 500) {
    const batch = db.batch();
    const chunk = shiftsToDelete.slice(i, i + 500);
    chunk.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  }
  console.log(`Deleted ${shiftsToDelete.length} existing shifts\n`);

  // Create shifts with varying assignment states
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

    let dayAssigned = 0;
    let dayUnassigned = 0;

    for (let i = 0; i < elders.length; i++) {
      const elder = elders[i];

      // Determine if this shift should be assigned
      // Pattern:
      // - Mon/Tue: mostly assigned (80%)
      // - Wed: half assigned (50%)
      // - Thu/Fri: few assigned (30%)
      // - Sat: minimal (20%)
      let assignProbability: number;
      switch (dayIndex) {
        case 1: // Mon
        case 2: // Tue
          assignProbability = 0.8;
          break;
        case 3: // Wed
          assignProbability = 0.5;
          break;
        case 4: // Thu
        case 5: // Fri
          assignProbability = 0.3;
          break;
        case 6: // Sat
          assignProbability = 0.2;
          break;
        default:
          assignProbability = 0;
      }

      const shouldAssign = Math.random() < assignProbability;

      // Pick a caregiver (round-robin based on elder index)
      const caregiverIndex = i % caregivers.length;
      const caregiver = caregivers[caregiverIndex];

      const shiftData: any = {
        agencyId,
        groupId: elder.groupId,
        elderId: elder.id,
        elderName: elder.name,
        date: Timestamp.fromDate(day),
        startTime: '09:00',
        endTime: '17:00',
        duration: 480, // 8 hours
        isRecurring: false,
        createdBy: ownerUser.uid,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      if (shouldAssign) {
        shiftData.caregiverId = caregiver.id;
        shiftData.caregiverName = caregiver.name;
        shiftData.status = Math.random() < 0.7 ? 'confirmed' : 'scheduled';
        dayAssigned++;
        assignedCount++;
      } else {
        shiftData.caregiverId = '';
        shiftData.caregiverName = '';
        shiftData.status = 'unfilled';
        dayUnassigned++;
        unassignedCount++;
      }

      shifts.push(shiftData);
    }

    console.log(`${dayName} ${day.toDateString()}: ${dayAssigned} assigned, ${dayUnassigned} unassigned`);
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
  console.log('\nTest at: https://www.myguide.health/dashboard/agency?tab=scheduling');
}

seedWeeklyShifts().catch(console.error);
