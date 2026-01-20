/**
 * Test Firebase Trigger Email Extension
 * Usage: npx tsx scripts/testTriggerEmail.ts
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  // Initialize Firebase Admin
  const existingApps = getApps();
  let app;

  if (existingApps.length > 0) {
    app = existingApps[0];
  } else {
    const credPath = path.join(__dirname, 'serviceAccountKey.json');
    if (!fs.existsSync(credPath)) {
      console.error('Service account key not found at:', credPath);
      process.exit(1);
    }
    const credentials = JSON.parse(fs.readFileSync(credPath, 'utf8'));
    app = initializeApp({
      credential: cert(credentials),
      projectId: credentials.project_id,
    });
  }

  const db = getFirestore(app);

  console.log('=== Testing Firebase Trigger Email Extension ===\n');

  // Create the test email document
  const mailData = {
    to: 'admin@myguide.health',
    message: {
      subject: 'Test Email from MyGuide Health',
      html: '<h1>It works!</h1><p>Your email integration is configured correctly.</p>',
    },
    createdAt: Timestamp.now(),
  };

  console.log('Creating test email document in "mail" collection...');
  console.log('To:', mailData.to);
  console.log('Subject:', mailData.message.subject);

  const docRef = await db.collection('mail').add(mailData);
  console.log(`\n✅ Document created with ID: ${docRef.id}`);

  // Wait 30 seconds for the extension to process
  console.log('\nWaiting 30 seconds for the extension to process...');

  for (let i = 30; i > 0; i--) {
    process.stdout.write(`\r${i} seconds remaining...`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  console.log('\n');

  // Read back the document
  console.log('Reading document to check delivery status...\n');
  const doc = await docRef.get();
  const data = doc.data();

  if (!data) {
    console.error('❌ Document not found!');
    process.exit(1);
  }

  console.log('=== Document Data ===');
  console.log('ID:', doc.id);
  console.log('To:', data.to);
  console.log('Subject:', data.message?.subject);

  if (data.delivery) {
    console.log('\n=== Delivery Status ===');
    console.log('State:', data.delivery.state);

    if (data.delivery.state === 'SUCCESS') {
      console.log('✅ EMAIL SENT SUCCESSFULLY!');
      console.log('Attempts:', data.delivery.attempts);
      console.log('End Time:', data.delivery.endTime?.toDate?.() || data.delivery.endTime);
      if (data.delivery.info) {
        console.log('Message ID:', data.delivery.info.messageId);
        console.log('Accepted:', data.delivery.info.accepted);
      }
    } else if (data.delivery.state === 'ERROR') {
      console.log('❌ EMAIL FAILED');
      console.log('Error:', data.delivery.error);
      console.log('Attempts:', data.delivery.attempts);
    } else if (data.delivery.state === 'PENDING') {
      console.log('⏳ EMAIL PENDING - Extension may still be processing');
    } else if (data.delivery.state === 'PROCESSING') {
      console.log('⏳ EMAIL PROCESSING - Still being sent');
    } else {
      console.log('Unknown state:', data.delivery.state);
      console.log('Full delivery object:', JSON.stringify(data.delivery, null, 2));
    }
  } else {
    console.log('\n⚠️  No "delivery" field found!');
    console.log('This could mean:');
    console.log('  1. Firebase Trigger Email extension is NOT installed');
    console.log('  2. Extension is installed but not configured for "mail" collection');
    console.log('  3. Extension is still processing (try waiting longer)');
    console.log('\nFull document data:', JSON.stringify(data, null, 2));
  }

  console.log('\n=== Test Complete ===');
}

main().catch(console.error);
