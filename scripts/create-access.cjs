const admin = require('firebase-admin');

// Initialize with application default credentials
admin.initializeApp({
  projectId: 'healthguide-bc3ba'
});

const db = admin.firestore();

async function createElderAccess() {
  const caregiverId = 'NVh5w1PLW2fHbvxtbK6EhTS4xzC3';
  const elderId = 'BlHTFFwfAIHBcDsDhWWv';
  const agencyId = 'wP7okNVtVKlciShgvCAy';
  const groupId = 'OoxVLXoj3vDQNAgMVpvZ';

  const accessDocRef = db
    .collection('users')
    .doc(caregiverId)
    .collection('elder_access')
    .doc(elderId);

  try {
    await accessDocRef.set({
      elderId,
      agencyId,
      groupId,
      active: true,
      assignedAt: admin.firestore.Timestamp.now(),
      assignedBy: 'manual-migration',
    });

    console.log('✅ Created elder_access document:');
    console.log('   Path: users/' + caregiverId + '/elder_access/' + elderId);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  process.exit(0);
}

createElderAccess();
