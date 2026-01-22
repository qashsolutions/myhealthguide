/**
 * Delete test user for re-testing invite flow
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

async function deleteTestUser() {
  const email = 'ramanac+am1@gmail.com';

  console.log(`Looking for user with email: ${email}`);

  // Find user by email
  const usersSnap = await db.collection('users')
    .where('email', '==', email)
    .limit(1)
    .get();

  if (usersSnap.empty) {
    console.log('User not found in Firestore');
  } else {
    const userDoc = usersSnap.docs[0];
    const userId = userDoc.id;
    console.log(`Found user in Firestore: ${userId}`);

    // Delete from Firestore
    await db.collection('users').doc(userId).delete();
    console.log('Deleted user from Firestore');

    // Delete from Firebase Auth
    try {
      await admin.auth().deleteUser(userId);
      console.log('Deleted user from Firebase Auth');
    } catch (authErr) {
      console.log('User not found in Firebase Auth (may already be deleted):', authErr.message);
    }
  }

  console.log('Done!');
}

deleteTestUser()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
