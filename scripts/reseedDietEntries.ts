/**
 * Reseed Diet Entries Script
 *
 * Deletes old diet entries with wrong field names and creates new ones
 * with correct field names (meal, timestamp, items)
 *
 * Run with: npx ts-node --project tsconfig.scripts.json scripts/reseedDietEntries.ts
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import * as path from 'path';
import * as fs from 'fs';

// Initialize Firebase
const scriptsCredPath = path.join(__dirname, 'serviceAccountKey.json');
const credentials = JSON.parse(fs.readFileSync(scriptsCredPath, 'utf8'));
const app = getApps().length > 0 ? getApps()[0] : initializeApp({
  credential: cert(credentials),
  projectId: credentials.project_id,
});
const db = getFirestore(app);

const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
const foods = [
  'Oatmeal with berries', 'Scrambled eggs', 'Toast with butter', 'Greek yogurt',
  'Grilled chicken salad', 'Vegetable soup', 'Turkey sandwich', 'Pasta with marinara',
  'Grilled salmon', 'Steamed vegetables', 'Rice and beans', 'Baked potato',
  'Apple slices', 'Cheese and crackers', 'Banana', 'Mixed nuts',
  'Orange juice', 'Green smoothie', 'Chicken stir-fry', 'Beef stew'
];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(daysBack: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * daysBack));
  return date;
}

async function main() {
  console.log('========================================');
  console.log('Reseed Diet Entries');
  console.log('========================================\n');

  // Get elder info
  const usersSnapshot = await db.collection('users')
    .where('email', '==', 'ramanac+b1@gmail.com')
    .get();

  if (usersSnapshot.empty) {
    console.error('User not found');
    process.exit(1);
  }

  const userData = usersSnapshot.docs[0].data();
  const userId = usersSnapshot.docs[0].id;
  const groupId = userData.groups[0].groupId;

  const groupDoc = await db.collection('groups').doc(groupId).get();
  const elderId = groupDoc.data()?.elders[0].id;

  console.log(`User: ${userId}`);
  console.log(`Group: ${groupId}`);
  console.log(`Elder: ${elderId}\n`);

  // Delete old diet entries for this elder
  console.log('Deleting old diet entries...');
  const oldEntries = await db.collection('diet_entries')
    .where('elderId', '==', elderId)
    .get();

  let deleted = 0;
  const batch = db.batch();
  for (const doc of oldEntries.docs) {
    batch.delete(doc.ref);
    deleted++;
  }
  if (deleted > 0) {
    await batch.commit();
  }
  console.log(`Deleted ${deleted} old entries\n`);

  // Create new entries with correct fields
  console.log('Creating 100 new diet entries with correct fields...');
  for (let i = 0; i < 100; i++) {
    const meal = mealTypes[i % mealTypes.length];
    const entryDate = randomDate(30);

    // DietEntry type expects items as string[] - plain food names
    await db.collection('diet_entries').add({
      groupId,
      elderId,
      meal,
      timestamp: Timestamp.fromDate(entryDate),
      items: [
        randomItem(foods),
        randomItem(foods),
      ],
      notes: `Test diet entry #${i + 1}`,
      loggedBy: userId,
      method: Math.random() > 0.3 ? 'manual' : 'voice',
      createdAt: Timestamp.fromDate(entryDate),
    });

    if ((i + 1) % 20 === 0) {
      console.log(`  Created ${i + 1}/100...`);
    }
  }

  console.log('\n========================================');
  console.log('Diet Entries Reseeded Successfully!');
  console.log('========================================');
  console.log('\nCreated 100 diet entries with correct fields:');
  console.log('  - meal (breakfast/lunch/dinner/snack)');
  console.log('  - timestamp (Firestore Timestamp)');
  console.log('  - items (array of food items)');
}

main().catch(console.error);
