/**
 * Script to reset a timesheet submission status for testing
 * Usage: npx ts-node scripts/reset-timesheet-for-testing.ts
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

async function resetTimesheetSubmission() {
  // Initialize Firebase Admin if not already initialized
  if (getApps().length === 0) {
    // Use the service account from environment or default credentials
    const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS ||
      './firebase-service-account.json';

    try {
      const serviceAccount = require(serviceAccountPath);
      initializeApp({
        credential: cert(serviceAccount)
      });
    } catch (e) {
      console.error('Could not load service account. Make sure GOOGLE_APPLICATION_CREDENTIALS is set or firebase-service-account.json exists.');
      process.exit(1);
    }
  }

  const db = getFirestore();

  // Find the most recent approved submission and reset it to 'submitted'
  const submissionsRef = db.collection('timesheetSubmissions');
  const approvedQuery = await submissionsRef
    .where('status', '==', 'approved')
    .orderBy('submittedAt', 'desc')
    .limit(1)
    .get();

  if (approvedQuery.empty) {
    console.log('No approved submissions found to reset.');
    return;
  }

  const doc = approvedQuery.docs[0];
  const data = doc.data();

  console.log('Found approved submission:');
  console.log(`  ID: ${doc.id}`);
  console.log(`  Caregiver: ${data.caregiverName}`);
  console.log(`  Week: ${data.weekStartDate?.toDate()?.toLocaleDateString()}`);
  console.log(`  Status: ${data.status}`);

  // Reset to 'submitted' status
  await submissionsRef.doc(doc.id).update({
    status: 'submitted',
    reviewedAt: null,
    reviewedBy: null,
    reviewerName: null,
    reviewNotes: null,
  });

  console.log(`\nReset submission ${doc.id} to 'submitted' status.`);
  console.log('You can now test the rejection flow.');
}

resetTimesheetSubmission()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
