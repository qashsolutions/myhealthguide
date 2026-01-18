/**
 * Reset passwords for Family Plan A and B test accounts
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import * as path from 'path';
import * as fs from 'fs';

const DEFAULT_PASSWORD = 'AbcD12!@';

const FAMILY_ACCOUNTS = [
  'ramanac+a1@gmail.com',
  'ramanac+a2@gmail.com',
  'ramanac+b1@gmail.com',
  'ramanac+b2@gmail.com',
  'ramanac+b3@gmail.com',
  'ramanac+b4@gmail.com',
];

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

  const auth = getAuth(app);
  console.log('Resetting passwords for Family Plan accounts...\n');

  for (const email of FAMILY_ACCOUNTS) {
    try {
      const user = await auth.getUserByEmail(email);
      await auth.updateUser(user.uid, {
        password: DEFAULT_PASSWORD,
      });
      console.log(`✓ Reset password for ${email} (uid: ${user.uid})`);
    } catch (error: any) {
      console.error(`✗ Failed for ${email}:`, error.message);
    }
  }

  console.log('\nDone! Password for all accounts: AbcD12!@');
}

main();
