import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Initialize Firebase Admin
if (getApps().length === 0) {
  const serviceAccount = require('./serviceAccountKey.json');
  initializeApp({ credential: cert(serviceAccount) });
}

const db = getFirestore();

async function checkInviteCodes() {
  console.log('=== Checking Invite Codes in Firestore ===\n');

  // Get all groups
  const groupsSnapshot = await db.collection('groups').get();

  console.log('Found ' + groupsSnapshot.size + ' groups\n');

  for (const doc of groupsSnapshot.docs) {
    const data = doc.data();
    console.log('Group ID: ' + doc.id);
    console.log('  Name: ' + (data.name || 'N/A'));
    console.log('  Plan: ' + (data.planType || data.plan || 'N/A'));
    console.log('  inviteCode field exists: ' + (data.inviteCode !== undefined));

    if (data.inviteCode !== undefined) {
      const code = data.inviteCode;
      console.log('  inviteCode type: ' + typeof code);
      console.log('  inviteCode length: ' + (code ? code.length : 0));
      console.log('  inviteCode value: "' + code + '"');

      // Check if it looks like base64 encrypted data
      if (code && typeof code === 'string') {
        const isBase64Pattern = /^[A-Za-z0-9+/]+=*$/.test(code);
        console.log('  Looks like base64: ' + isBase64Pattern);

        // Try to decode and check length
        try {
          const decoded = Buffer.from(code, 'base64');
          console.log('  Decoded byte length: ' + decoded.length);
          console.log('  Has enough bytes for IV (12): ' + (decoded.length >= 12));
          console.log('  Has encrypted data after IV: ' + (decoded.length > 12));
        } catch (e) {
          console.log('  Base64 decode failed: ' + e);
        }
      }
    }
    console.log('');
  }
}

checkInviteCodes().then(() => process.exit(0)).catch(console.error);
