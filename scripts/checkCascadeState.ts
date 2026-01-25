/**
 * Check cascade state for a shift
 * Usage: GOOGLE_APPLICATION_CREDENTIALS=path/to/serviceAccount.json npx tsx scripts/checkCascadeState.ts
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!serviceAccountPath) {
  console.error('Set GOOGLE_APPLICATION_CREDENTIALS to your service account key path');
  process.exit(1);
}

initializeApp({
  credential: cert(serviceAccountPath)
});

const db = getFirestore();

async function main() {
  console.log('=== Checking recent cascade shifts ===\n');

  // Get recent shifts with cascade assignmentMode
  const shiftsSnap = await db.collection('scheduledShifts')
    .where('assignmentMode', '==', 'cascade')
    .orderBy('createdAt', 'desc')
    .limit(5)
    .get();

  console.log(`Found ${shiftsSnap.size} cascade shifts:\n`);

  for (const doc of shiftsSnap.docs) {
    const shift = doc.data();
    console.log('-----------------------------------');
    console.log('Shift ID:', doc.id);
    console.log('Elder:', shift.elderName);
    console.log('Date:', shift.date?.toDate?.().toISOString().split('T')[0] || shift.date);
    console.log('Time:', shift.startTime, '-', shift.endTime);
    console.log('Status:', shift.status);
    console.log('Current Caregiver:', shift.caregiverName, '(', shift.caregiverId, ')');

    if (shift.cascadeState) {
      const cs = shift.cascadeState;
      console.log('\nCascade State:');
      console.log('  currentOfferIndex:', cs.currentOfferIndex);
      console.log('  currentOfferExpiresAt:', cs.currentOfferExpiresAt?.toDate?.()?.toISOString() || cs.currentOfferExpiresAt);
      console.log('  rankedCandidates:', cs.rankedCandidates?.length || 0, 'total');

      if (cs.rankedCandidates) {
        console.log('\n  Candidates (ranked):');
        cs.rankedCandidates.forEach((c: any, i: number) => {
          const marker = i === cs.currentOfferIndex ? ' <-- CURRENT' : '';
          console.log(`    [${i}] ${c.caregiverName} (${c.caregiverId}) - score: ${c.score}${marker}`);
        });
      }

      if (cs.offerHistory) {
        console.log('\n  Offer History:');
        cs.offerHistory.forEach((h: any, i: number) => {
          console.log(`    [${i}] ${h.caregiverId}: ${h.response}${h.respondedAt ? ' at ' + h.respondedAt.toDate?.().toISOString() : ''}`);
        });
      }
    }
    console.log('');
  }

  // Also check recent shift_offer notifications
  console.log('\n=== Recent shift_offer notifications ===\n');

  const notifsSnap = await db.collection('user_notifications')
    .where('type', '==', 'shift_offer')
    .orderBy('createdAt', 'desc')
    .limit(10)
    .get();

  console.log(`Found ${notifsSnap.size} shift_offer notifications:\n`);

  for (const doc of notifsSnap.docs) {
    const notif = doc.data();
    console.log('---');
    console.log('Notification ID:', doc.id);
    console.log('To User:', notif.userId);
    console.log('Title:', notif.title);
    console.log('Message:', notif.message);
    console.log('Created:', notif.createdAt?.toDate?.().toISOString());
    console.log('Read:', notif.read, '| Dismissed:', notif.dismissed);
    console.log('Shift ID:', notif.data?.shiftId);
  }
}

main().catch(console.error);
