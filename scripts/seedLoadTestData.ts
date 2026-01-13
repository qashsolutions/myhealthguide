/**
 * Firebase Load Test Seeding Script
 *
 * Creates 50+ test medications and notes for load testing
 *
 * Run with: npx ts-node --project tsconfig.scripts.json scripts/seedLoadTestData.ts
 */

import { initializeApp, cert, App, getApps } from 'firebase-admin/app';
import { getFirestore, Firestore, Timestamp } from 'firebase-admin/firestore';

// ============= Constants =============
const MEDICATION_NAMES = [
  'Lisinopril', 'Metformin', 'Atorvastatin', 'Amlodipine', 'Omeprazole',
  'Metoprolol', 'Losartan', 'Gabapentin', 'Hydrochlorothiazide', 'Sertraline',
  'Simvastatin', 'Levothyroxine', 'Furosemide', 'Pantoprazole', 'Escitalopram',
  'Montelukast', 'Carvedilol', 'Tramadol', 'Trazodone', 'Pravastatin',
  'Fluticasone', 'Tamsulosin', 'Prednisone', 'Albuterol', 'Duloxetine',
  'Clopidogrel', 'Venlafaxine', 'Meloxicam', 'Cyclobenzaprine', 'Alprazolam',
  'Warfarin', 'Clonazepam', 'Amitriptyline', 'Diazepam', 'Buspirone',
  'Risperidone', 'Quetiapine', 'Donepezil', 'Memantine', 'Rivastigmine',
  'Aspirin', 'Acetaminophen', 'Ibuprofen', 'Naproxen', 'Calcium',
  'Vitamin D', 'Vitamin B12', 'Fish Oil', 'Magnesium', 'Potassium',
  'Melatonin', 'Zinc', 'Iron', 'Folic Acid', 'CoQ10'
];

const DOSAGES = ['5mg', '10mg', '20mg', '25mg', '50mg', '100mg', '150mg', '200mg', '250mg', '500mg'];
const TIMES = [
  ['8:00 AM'],
  ['8:00 AM', '8:00 PM'],
  ['8:00 AM', '2:00 PM', '8:00 PM'],
  ['6:00 AM', '12:00 PM', '6:00 PM', '12:00 AM']
];

const INSTRUCTIONS = [
  'Take with food',
  'Take on empty stomach',
  'Take with plenty of water',
  'Do not crush or chew',
  'Take 30 minutes before meals',
  'Take at bedtime',
  'Avoid grapefruit juice',
  'Take with meals'
];

const NOTE_TITLES = [
  'Daily Health Observation',
  'Medication Side Effect',
  'Diet Changes',
  'Exercise Routine',
  'Sleep Pattern',
  'Mood Changes',
  'Pain Management',
  'Blood Pressure Reading',
  'Blood Sugar Level',
  'Weight Tracking',
  'Appetite Changes',
  'Hydration Notes',
  'Activity Level',
  'Memory Exercise',
  'Social Interaction',
  'Physical Therapy',
  'Doctor Visit Notes',
  'Lab Results Review',
  'Symptom Observation',
  'Care Coordination'
];

const NOTE_CONTENT_TEMPLATES = [
  'Today observed {subject}. Overall condition appears {condition}. Will continue monitoring.',
  'Noted {subject} during morning check. {action}. Follow up scheduled.',
  '{subject} reported by loved one. {condition}. Adjusted care plan accordingly.',
  'Regular check showed {subject}. All within normal range. Continue current routine.',
  'Caregiver notes: {subject}. {action}. No immediate concerns.',
];

// ============= Initialize Firebase Admin =============
let app: App;
let db: Firestore;

function initFirebase() {
  const path = require('path');
  const fs = require('fs');

  const existingApps = getApps();
  if (existingApps.length > 0) {
    app = existingApps[0];
  } else {
    // Try scripts/serviceAccountKey.json
    const scriptsCredPath = path.join(__dirname, 'serviceAccountKey.json');
    if (fs.existsSync(scriptsCredPath)) {
      const credentials = JSON.parse(fs.readFileSync(scriptsCredPath, 'utf8'));
      app = initializeApp({
        credential: cert(credentials),
        projectId: credentials.project_id,
      });
      console.log('Using scripts/serviceAccountKey.json');
    } else {
      throw new Error('No Firebase credentials found at scripts/serviceAccountKey.json');
    }
  }

  db = getFirestore(app);
  console.log('Firebase Admin initialized');
}

// ============= Helper Functions =============
function generateId(): string {
  return db.collection('_').doc().id;
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(daysBack: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * daysBack));
  return date;
}

// ============= Data Seeding Functions =============

async function getElderForTesting(): Promise<{ elderId: string; groupId: string; userId: string } | null> {
  // Get the Family B Admin's elder for load testing (ramanac+b1@gmail.com)
  console.log('Looking for Family B Admin elder...');

  // Query for users with email containing +b1
  const usersSnapshot = await db.collection('users')
    .where('email', '==', 'ramanac+b1@gmail.com')
    .get();

  if (usersSnapshot.empty) {
    console.log('Family B Admin user not found. Please run seedTestAccounts.ts first.');
    return null;
  }

  const userData = usersSnapshot.docs[0].data();
  const userId = usersSnapshot.docs[0].id;

  if (!userData.groups || userData.groups.length === 0) {
    console.log('User has no groups');
    return null;
  }

  const groupId = userData.groups[0].groupId;

  // Get elder from the group
  const groupDoc = await db.collection('groups').doc(groupId).get();
  if (!groupDoc.exists) {
    console.log('Group not found');
    return null;
  }

  const groupData = groupDoc.data();
  if (!groupData?.elders || groupData.elders.length === 0) {
    console.log('No elders in group');
    return null;
  }

  const elderId = groupData.elders[0].id;
  console.log(`Found elder: ${elderId} in group: ${groupId}`);

  return { elderId, groupId, userId };
}

async function seedMedications(elderId: string, groupId: string, userId: string, count: number = 55): Promise<void> {
  console.log(`\n=== Seeding ${count} Medications ===`);

  for (let i = 0; i < count; i++) {
    const medName = MEDICATION_NAMES[i % MEDICATION_NAMES.length];
    const uniqueName = i >= MEDICATION_NAMES.length ? `${medName} (${Math.floor(i / MEDICATION_NAMES.length) + 1})` : medName;

    const medicationData = {
      groupId,
      elderId,
      name: uniqueName,
      dosage: randomItem(DOSAGES),
      frequency: {
        type: 'daily',
        times: randomItem(TIMES),
      },
      instructions: randomItem(INSTRUCTIONS),
      prescribedBy: `Dr. Test ${(i % 10) + 1}`,
      startDate: Timestamp.fromDate(randomDate(365)),
      endDate: null,
      reminders: Math.random() > 0.3, // 70% have reminders
      createdBy: userId,
      createdAt: Timestamp.fromDate(randomDate(30)),
      updatedAt: Timestamp.fromDate(new Date()),
    };

    const docRef = await db.collection('medications').add(medicationData);

    if ((i + 1) % 10 === 0) {
      console.log(`  Created ${i + 1}/${count} medications...`);
    }
  }

  console.log(`Medication seeding complete: ${count} medications created`);
}

async function seedNotes(userId: string, count: number = 55): Promise<void> {
  console.log(`\n=== Seeding ${count} Notes ===`);

  const subjects = ['improved mobility', 'stable vitals', 'increased energy', 'normal appetite', 'good sleep'];
  const conditions = ['stable', 'improving', 'satisfactory', 'good', 'excellent'];
  const actions = ['Continue monitoring', 'Scheduled follow-up', 'Updated care plan', 'No changes needed', 'Noted for record'];

  for (let i = 0; i < count; i++) {
    const title = NOTE_TITLES[i % NOTE_TITLES.length];
    const uniqueTitle = i >= NOTE_TITLES.length ? `${title} #${Math.floor(i / NOTE_TITLES.length) + 1}` : title;

    const template = randomItem(NOTE_CONTENT_TEMPLATES);
    const content = template
      .replace('{subject}', randomItem(subjects))
      .replace('{condition}', randomItem(conditions))
      .replace('{action}', randomItem(actions));

    const noteData = {
      userId,
      title: uniqueTitle,
      content: content + ` This is test note #${i + 1} for load testing purposes. Created to verify system performance with large datasets.`,
      tags: ['test', 'load-test', `batch-${Math.floor(i / 10) + 1}`],
      category: 'Daily Care',
      isPrivate: true,
      isPublished: false,
      aiSummary: `Test note ${i + 1}: ${content.substring(0, 100)}`,
      aiKeywords: ['test', 'care', 'note', 'monitoring', 'health'],
      createdAt: Timestamp.fromDate(randomDate(90)),
      updatedAt: Timestamp.fromDate(new Date()),
    };

    const docRef = await db.collection('notes').add(noteData);

    if ((i + 1) % 10 === 0) {
      console.log(`  Created ${i + 1}/${count} notes...`);
    }
  }

  console.log(`Notes seeding complete: ${count} notes created`);
}

async function seedDietEntries(elderId: string, groupId: string, userId: string, count: number = 100): Promise<void> {
  console.log(`\n=== Seeding ${count} Diet Entries ===`);

  const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
  const foods = [
    'Oatmeal with berries', 'Scrambled eggs', 'Toast with butter', 'Greek yogurt',
    'Grilled chicken salad', 'Vegetable soup', 'Turkey sandwich', 'Pasta with marinara',
    'Grilled salmon', 'Steamed vegetables', 'Rice and beans', 'Baked potato',
    'Apple slices', 'Cheese and crackers', 'Banana', 'Mixed nuts',
    'Orange juice', 'Green smoothie', 'Chicken stir-fry', 'Beef stew',
    'Caesar salad', 'Fruit salad', 'Cottage cheese', 'Whole wheat bread',
    'Lentil soup', 'Tuna salad', 'Roasted vegetables', 'Quinoa bowl'
  ];

  for (let i = 0; i < count; i++) {
    const meal = mealTypes[i % mealTypes.length];
    const entryDate = randomDate(30);

    // Use correct field names matching DietEntry type (items: string[])
    const dietData = {
      groupId,
      elderId,
      meal,
      timestamp: Timestamp.fromDate(entryDate),
      items: [randomItem(foods), randomItem(foods)], // Plain string array
      notes: `Test diet entry #${i + 1}`,
      loggedBy: userId,
      method: Math.random() > 0.3 ? 'manual' : 'voice',
      createdAt: Timestamp.fromDate(entryDate),
    };

    await db.collection('diet_entries').add(dietData);

    if ((i + 1) % 20 === 0) {
      console.log(`  Created ${i + 1}/${count} diet entries...`);
    }
  }

  console.log(`Diet entries seeding complete: ${count} entries created`);
}

async function seedMedicationLogs(elderId: string, groupId: string, userId: string, count: number = 100): Promise<void> {
  console.log(`\n=== Seeding ${count} Medication Logs ===`);

  const statuses: ('taken' | 'missed' | 'skipped')[] = ['taken', 'taken', 'taken', 'taken', 'missed', 'skipped'];
  const methods: ('manual' | 'voice')[] = ['manual', 'manual', 'manual', 'voice'];

  // Get existing medications for this elder
  const medsSnapshot = await db.collection('medications')
    .where('elderId', '==', elderId)
    .limit(10)
    .get();

  const medicationIds = medsSnapshot.docs.map(doc => doc.id);

  if (medicationIds.length === 0) {
    console.log('No medications found. Skipping logs seeding.');
    return;
  }

  for (let i = 0; i < count; i++) {
    const scheduledTime = randomDate(30);
    const status = randomItem(statuses);

    const logData = {
      groupId,
      elderId,
      medicationId: randomItem(medicationIds),
      scheduledTime: Timestamp.fromDate(scheduledTime),
      actualTime: status === 'taken' ? Timestamp.fromDate(new Date(scheduledTime.getTime() + Math.random() * 3600000)) : null,
      status,
      loggedBy: userId,
      method: randomItem(methods),
      notes: status === 'missed' ? 'Forgot to take' : status === 'skipped' ? 'Skipped per doctor advice' : '',
      createdAt: Timestamp.fromDate(scheduledTime),
    };

    await db.collection('medication_logs').add(logData);

    if ((i + 1) % 20 === 0) {
      console.log(`  Created ${i + 1}/${count} medication logs...`);
    }
  }

  console.log(`Medication logs seeding complete: ${count} logs created`);
}

// ============= Main Entry Point =============
async function main(): Promise<void> {
  console.log('========================================');
  console.log('MyHealthGuide Load Test Data Seeding');
  console.log('========================================\n');

  try {
    initFirebase();

    // Get elder for testing
    const elderInfo = await getElderForTesting();

    if (!elderInfo) {
      console.error('\nERROR: Could not find elder for testing.');
      console.log('Please run: npx ts-node --project tsconfig.scripts.json scripts/seedTestAccounts.ts');
      process.exit(1);
    }

    const { elderId, groupId, userId } = elderInfo;

    // Seed test data - 100+ items each for proper load testing
    await seedMedications(elderId, groupId, userId, 100);
    await seedNotes(userId, 100);
    await seedMedicationLogs(elderId, groupId, userId, 200);
    await seedDietEntries(elderId, groupId, userId, 100);

    console.log('\n========================================');
    console.log('LOAD TEST DATA SEEDING COMPLETE');
    console.log('========================================');
    console.log('');
    console.log('Created:');
    console.log('  - 100 Medications');
    console.log('  - 100 Notes');
    console.log('  - 200 Medication Logs');
    console.log('  - 100 Diet Entries');
    console.log('');
    console.log('Total: 500 records');
    console.log('');
    console.log('Login as ramanac+b1@gmail.com to test load performance');

  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

main();
