/**
 * Check email delivery status
 * Usage: npx tsx scripts/checkEmailStatus.ts <docId>
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const docId = process.argv[2] || '7BL4pGSkcPkXb1Qfg8gq';

async function main() {
  const existingApps = getApps();
  let app;

  if (existingApps.length > 0) {
    app = existingApps[0];
  } else {
    const credPath = path.join(__dirname, 'serviceAccountKey.json');
    const credentials = JSON.parse(fs.readFileSync(credPath, 'utf8'));
    app = initializeApp({
      credential: cert(credentials),
      projectId: credentials.project_id,
    });
  }

  const db = getFirestore(app);

  const doc = await db.collection('mail').doc(docId).get();
  const data = doc.data();

  console.log('=== Email Delivery Status ===');
  console.log('Document ID:', docId);
  console.log('State:', data?.delivery?.state || 'No delivery field');

  if (data?.delivery?.state === 'SUCCESS') {
    console.log('✅ Email sent successfully!');
    console.log('Message ID:', data?.delivery?.info?.messageId);
    console.log('Accepted:', data?.delivery?.info?.accepted);
  } else if (data?.delivery?.state === 'ERROR') {
    console.log('❌ Error:', data?.delivery?.error);
  } else if (data?.delivery) {
    console.log('Full delivery:', JSON.stringify(data?.delivery, null, 2));
  }
}

main().catch(console.error);
