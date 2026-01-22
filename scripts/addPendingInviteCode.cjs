/**
 * Add pendingInviteCode to existing user
 *
 * This is a one-time fix for users who signed up via invite
 * before the pendingInviteCode feature was implemented.
 */

const admin = require('firebase-admin');
const path = require('path');

const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
const serviceAccount = require(serviceAccountPath);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function addPendingInviteCode() {
  const email = 'ramanac+am1@gmail.com';
  const inviteCode = 'H5BZS3';

  console.log(`Looking for user with email: ${email}`);

  // Find user by email
  const usersSnap = await db.collection('users')
    .where('email', '==', email)
    .limit(1)
    .get();

  if (usersSnap.empty) {
    console.error('User not found!');
    process.exit(1);
  }

  const userDoc = usersSnap.docs[0];
  console.log(`Found user: ${userDoc.id}`);

  // Add pendingInviteCode
  await db.collection('users').doc(userDoc.id).update({
    pendingInviteCode: inviteCode
  });

  console.log(`Added pendingInviteCode: ${inviteCode} to user ${email}`);
  console.log('Done!');
}

addPendingInviteCode()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
