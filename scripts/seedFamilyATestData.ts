/**
 * Seed Test Data for Family Plan A (ramanac+a1@gmail.com)
 *
 * Creates comprehensive test data for testing the Insights page:
 * - 6 medications with 7 days of logs
 * - 5 supplements with 7 days of logs
 * - Diet entries (breakfast, lunch, dinner, snacks) for 7 days
 * - Detailed observation notes for each of the 7 days
 *
 * Run with: npx ts-node --project tsconfig.scripts.json scripts/seedFamilyATestData.ts
 */

import { initializeApp, cert, App, getApps } from 'firebase-admin/app';
import { getFirestore, Firestore, Timestamp } from 'firebase-admin/firestore';
import * as path from 'path';
import * as fs from 'fs';

// ============= Initialize Firebase Admin =============
let app: App;
let db: Firestore;

function initFirebase() {
  const existingApps = getApps();
  if (existingApps.length > 0) {
    app = existingApps[0];
  } else {
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

// ============= Test Data Definitions =============

const MEDICATIONS = [
  {
    name: 'Lisinopril',
    dosage: '10mg',
    frequency: 'once daily',
    times: ['08:00'],
    instructions: 'Take in the morning with water. Avoid potassium supplements.',
    purpose: 'Blood pressure control (ACE inhibitor)',
    category: 'Cardiovascular',
  },
  {
    name: 'Metformin',
    dosage: '500mg',
    frequency: 'twice daily',
    times: ['08:00', '18:00'],
    instructions: 'Take with meals to reduce stomach upset.',
    purpose: 'Blood sugar management (Type 2 diabetes)',
    category: 'Diabetes',
  },
  {
    name: 'Atorvastatin',
    dosage: '20mg',
    frequency: 'once daily',
    times: ['21:00'],
    instructions: 'Take in the evening. Avoid grapefruit juice.',
    purpose: 'Cholesterol management (statin)',
    category: 'Cardiovascular',
  },
  {
    name: 'Amlodipine',
    dosage: '5mg',
    frequency: 'once daily',
    times: ['08:00'],
    instructions: 'Take at the same time each day. May cause ankle swelling.',
    purpose: 'Blood pressure control (calcium channel blocker)',
    category: 'Cardiovascular',
  },
  {
    name: 'Omeprazole',
    dosage: '20mg',
    frequency: 'once daily',
    times: ['07:30'],
    instructions: 'Take 30 minutes before breakfast on empty stomach.',
    purpose: 'Acid reflux and stomach protection (PPI)',
    category: 'Gastrointestinal',
  },
  {
    name: 'Levothyroxine',
    dosage: '50mcg',
    frequency: 'once daily',
    times: ['06:30'],
    instructions: 'Take on empty stomach, 1 hour before breakfast. Avoid calcium and iron supplements within 4 hours.',
    purpose: 'Thyroid hormone replacement',
    category: 'Endocrine',
  },
];

const SUPPLEMENTS = [
  {
    name: 'Vitamin D3',
    dosage: '2000 IU',
    frequency: 'once daily',
    times: ['08:00'],
    instructions: 'Take with fatty meal for better absorption.',
  },
  {
    name: 'Omega-3 Fish Oil',
    dosage: '1000mg',
    frequency: 'twice daily',
    times: ['08:00', '18:00'],
    instructions: 'Take with meals to reduce fishy aftertaste.',
  },
  {
    name: 'Calcium + Vitamin D',
    dosage: '600mg/400IU',
    frequency: 'once daily',
    times: ['12:00'],
    instructions: 'Take with lunch. Do not take with thyroid medication.',
  },
  {
    name: 'Magnesium Citrate',
    dosage: '400mg',
    frequency: 'once daily',
    times: ['21:00'],
    instructions: 'Take before bed. May help with sleep and muscle relaxation.',
  },
  {
    name: 'CoQ10',
    dosage: '100mg',
    frequency: 'once daily',
    times: ['08:00'],
    instructions: 'Take with breakfast. Important for those on statins.',
  },
];

// 7 days of detailed diet entries
const DIET_ENTRIES = [
  // Day 1
  [
    { meal: 'breakfast', items: 'Oatmeal with fresh blueberries and sliced banana, 1 cup green tea, 2 scrambled eggs', notes: 'Good appetite this morning' },
    { meal: 'lunch', items: 'Grilled chicken breast salad with mixed greens, tomatoes, cucumbers, olive oil dressing, whole wheat roll', notes: 'Ate most of the meal' },
    { meal: 'snack', items: 'Greek yogurt with honey, handful of almonds', notes: '' },
    { meal: 'dinner', items: 'Baked salmon (4oz), steamed broccoli, brown rice, glass of water with lemon', notes: 'Enjoyed the salmon' },
  ],
  // Day 2
  [
    { meal: 'breakfast', items: 'Whole grain toast with avocado, 1 poached egg, orange juice', notes: 'Smaller appetite today' },
    { meal: 'lunch', items: 'Turkey and cheese sandwich on whole wheat, apple slices, carrot sticks with hummus', notes: '' },
    { meal: 'snack', items: 'Banana with peanut butter', notes: '' },
    { meal: 'dinner', items: 'Grilled chicken thigh, roasted sweet potato, green beans, iced tea', notes: 'Ate about 75% of meal' },
  ],
  // Day 3
  [
    { meal: 'breakfast', items: 'Greek yogurt parfait with granola and mixed berries, coffee with milk', notes: 'Good energy after breakfast' },
    { meal: 'lunch', items: 'Vegetable soup (homemade), tuna salad on crackers, small side salad', notes: '' },
    { meal: 'snack', items: 'Cheese and whole grain crackers', notes: '' },
    { meal: 'dinner', items: 'Lean beef stir-fry with bell peppers, broccoli, snap peas over quinoa', notes: 'Enjoyed the variety of vegetables' },
  ],
  // Day 4
  [
    { meal: 'breakfast', items: 'Smoothie (spinach, banana, strawberries, almond milk, protein powder), whole grain English muffin', notes: 'Smoothie was a hit' },
    { meal: 'lunch', items: 'Chicken noodle soup, half a grilled cheese sandwich, sliced pears', notes: 'Comfort food day' },
    { meal: 'snack', items: 'Trail mix (nuts, dried cranberries, dark chocolate chips)', notes: '' },
    { meal: 'dinner', items: 'Baked cod with lemon herb sauce, roasted asparagus, mashed potatoes (made with olive oil)', notes: 'Fish was very tender' },
  ],
  // Day 5
  [
    { meal: 'breakfast', items: 'Scrambled eggs with spinach and feta cheese, whole wheat toast, herbal tea', notes: 'Strong appetite this morning' },
    { meal: 'lunch', items: 'Mediterranean bowl: chickpeas, cucumber, tomatoes, olives, feta, pita bread', notes: 'New recipe - enjoyed it' },
    { meal: 'snack', items: 'Apple slices with almond butter', notes: '' },
    { meal: 'dinner', items: 'Herb-roasted chicken breast, wild rice pilaf, steamed zucchini and yellow squash', notes: '' },
  ],
  // Day 6
  [
    { meal: 'breakfast', items: 'Steel-cut oats with walnuts, dried apricots, and cinnamon, glass of milk', notes: 'Warm breakfast was comforting' },
    { meal: 'lunch', items: 'Egg salad sandwich on rye bread, cucumber salad, fresh fruit cup', notes: '' },
    { meal: 'snack', items: 'Cottage cheese with pineapple chunks', notes: '' },
    { meal: 'dinner', items: 'Turkey meatballs in marinara sauce, whole wheat spaghetti, side Caesar salad', notes: 'Finished entire meal' },
  ],
  // Day 7
  [
    { meal: 'breakfast', items: 'Whole grain pancakes (2) with fresh strawberries, turkey bacon (2 strips), orange juice', notes: 'Special Sunday breakfast' },
    { meal: 'lunch', items: 'Minestrone soup, garlic bread, mixed green salad with balsamic vinaigrette', notes: '' },
    { meal: 'snack', items: 'Hummus with carrot and celery sticks', notes: '' },
    { meal: 'dinner', items: 'Pork tenderloin with apple glaze, roasted Brussels sprouts, couscous', notes: 'Good family dinner' },
  ],
];

// 7 days of detailed observation notes
const DAILY_NOTES = [
  {
    title: 'Morning Vitals and Observations',
    content: `Morning check-in at 8:15 AM:

Blood Pressure: 128/82 mmHg (within target range)
Heart Rate: 72 bpm, regular rhythm
Weight: 165 lbs (stable from yesterday)
Blood Sugar (fasting): 108 mg/dL

Overall mood appears good this morning. Slept approximately 7 hours last night with one bathroom break around 3 AM. No complaints of dizziness or shortness of breath. Appetite is normal. Completed all morning medications on time.

Activity plan for today: Light stretching exercises and a 15-minute walk in the garden if weather permits.`
  },
  {
    title: 'Daily Health Summary',
    content: `Afternoon observations at 2:30 PM:

Energy level: Moderate - had a brief rest after lunch
Pain level: 2/10 (mild knee discomfort, typical)
Mobility: Good, walking independently with steady gait
Hydration: Consumed approximately 4 glasses of water so far

Noticed slight swelling in ankles, likely related to amlodipine. Elevated feet for 20 minutes which helped. Mood remains positive. Enjoyed video call with daughter this morning.

Reminder: Schedule follow-up with Dr. Johnson for quarterly check next week.`
  },
  {
    title: 'Health Observations and Activities',
    content: `Evening summary at 7:00 PM:

Physical Therapy exercises completed: Yes
- 10 minutes of seated stretches
- 5 minutes of hand grip exercises
- Short walk around the house (approx. 500 steps)

Blood Pressure (evening): 122/78 mmHg
Blood Sugar (post-dinner): 142 mg/dL

Appetite was good today. All meals consumed without difficulty. Some mild indigestion after dinner - took omeprazole as scheduled. Planning early bedtime tonight as felt slightly more tired than usual.`
  },
  {
    title: 'Caregiver Daily Report',
    content: `Comprehensive daily summary:

Sleep Quality: Good (7.5 hours, woke once)
Mood: Positive, engaged in activities
Cognitive function: Alert, participated in word puzzle game

Medications: All taken on schedule
- Morning medications ✓
- Afternoon supplements ✓
- Evening medications ✓

Skin check: No new concerns, existing dry patch on shin healing well
Bathroom habits: Normal frequency and consistency

Social interaction: Had lunch with neighbor, watched favorite TV show in afternoon. Good spirits throughout the day.`
  },
  {
    title: 'Weekly Progress Notes',
    content: `Mid-week assessment:

Blood Pressure Trend (7-day average): 126/80 mmHg - GOOD
Blood Sugar Trend: Fasting levels 105-115 mg/dL - STABLE
Weight: Maintained at 165 lbs ± 1 lb

Positive observations:
- Medication compliance has been excellent
- Appetite consistent and healthy
- Sleep quality improved since adding magnesium supplement
- No falls or near-falls this week

Areas to monitor:
- Ankle swelling in evenings (discussed with doctor)
- Mild constipation - increased fiber and water intake
- Occasional memory lapses with names (normal for age)

Goal progress: Walking duration increased from 10 to 15 minutes - great improvement!`
  },
  {
    title: 'Health Monitoring Update',
    content: `Saturday health check:

Morning Vitals:
- BP: 130/84 mmHg (slightly elevated, will recheck)
- HR: 68 bpm
- Temp: 98.2°F
- Weight: 166 lbs

Notable observations:
- Mild sinus congestion noted this morning
- Appetite slightly reduced at breakfast
- Energy level lower than usual
- No fever or chills

Actions taken:
- Encouraged extra fluids
- Warm tea with honey provided
- Monitoring for any worsening symptoms
- Will contact doctor if symptoms persist beyond 48 hours

Evening recheck: BP improved to 125/80 after rest. Congestion slightly better.`
  },
  {
    title: 'Weekend Summary and Planning',
    content: `Sunday comprehensive review:

Overall Health Status: STABLE
Weekly Medication Compliance: 95% (missed one evening supplement dose on Wednesday)
Vital Signs Trend: Within normal limits

Accomplishments this week:
✓ All doctor-recommended exercises completed
✓ Healthy meal plan followed
✓ Social engagement maintained
✓ Good hydration habits

Plans for next week:
- Doctor appointment on Tuesday at 2:00 PM (quarterly review)
- Pharmacy pickup needed for Metformin refill
- Schedule eye exam (annual)

Family notes: Son visiting on Wednesday for dinner. Daughter calling tomorrow evening.

Overall assessment: Good week with stable health metrics. Continue current care plan.`
  },
];

// ============= Helper Functions =============

function subDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
}

function setTime(date: Date, timeStr: string): Date {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

function randomVariation(minutes: number): number {
  return Math.floor(Math.random() * minutes * 2) - minutes;
}

// ============= Main Seeding Function =============

async function seedTestData() {
  initFirebase();

  // Find Family A Admin user
  console.log('\n📍 Looking for Family A Admin (ramanac+a1@gmail.com)...');
  const usersSnapshot = await db.collection('users')
    .where('email', '==', 'ramanac+a1@gmail.com')
    .get();

  if (usersSnapshot.empty) {
    console.error('❌ Family A Admin user not found. Please ensure the test account exists.');
    process.exit(1);
  }

  const userDoc = usersSnapshot.docs[0];
  const userData = userDoc.data();
  const userId = userDoc.id;

  console.log(`✅ Found user: ${userData.email} (${userId})`);

  if (!userData.groups || userData.groups.length === 0) {
    console.error('❌ User has no groups');
    process.exit(1);
  }

  const groupId = userData.groups[0].groupId;
  console.log(`✅ Group ID: ${groupId}`);

  // Get elder from group
  const groupDoc = await db.collection('groups').doc(groupId).get();
  if (!groupDoc.exists) {
    console.error('❌ Group not found');
    process.exit(1);
  }

  const groupData = groupDoc.data();
  if (!groupData?.elderIds || groupData.elderIds.length === 0) {
    console.error('❌ No elders in group');
    process.exit(1);
  }

  const elderId = groupData.elderIds[0];
  console.log(`✅ Elder ID: ${elderId}`);

  // Get elder name
  const elderDoc = await db.collection('elders').doc(elderId).get();
  const elderName = elderDoc.data()?.name || 'Loved One';
  console.log(`✅ Elder Name: ${elderName}`);

  const now = new Date();
  const results = {
    medications: 0,
    medicationLogs: 0,
    supplements: 0,
    supplementLogs: 0,
    dietEntries: 0,
    notes: 0,
  };

  // ============= Create Medications =============
  console.log('\n💊 Creating medications...');
  const medicationIds: string[] = [];

  for (const med of MEDICATIONS) {
    const medRef = await db.collection('medications').add({
      name: med.name,
      dosage: med.dosage,
      frequency: med.frequency,
      times: med.times,
      instructions: med.instructions,
      purpose: med.purpose,
      elderId,
      groupId,
      isActive: true,
      startDate: Timestamp.fromDate(subDays(now, 30)),
      endDate: null,
      createdAt: Timestamp.fromDate(subDays(now, 30)),
      updatedAt: Timestamp.now(),
    });
    medicationIds.push(medRef.id);
    results.medications++;
    console.log(`  ✓ Created: ${med.name} (${med.dosage})`);
  }

  // ============= Create Medication Logs (7 days) =============
  console.log('\n📝 Creating medication logs for 7 days...');
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const date = subDays(now, dayOffset);

    for (let i = 0; i < MEDICATIONS.length; i++) {
      const med = MEDICATIONS[i];
      const medId = medicationIds[i];

      for (const timeStr of med.times) {
        const scheduledTime = setTime(date, timeStr);
        // Add random variation of ±15 minutes
        scheduledTime.setMinutes(scheduledTime.getMinutes() + randomVariation(15));

        // Compliance: ~85% taken, ~10% missed, ~5% skipped
        const random = Math.random();
        let status: 'taken' | 'missed' | 'skipped';
        if (random < 0.85) {
          status = 'taken';
        } else if (random < 0.95) {
          status = 'missed';
        } else {
          status = 'skipped';
        }

        await db.collection('medication_logs').add({
          medicationId: medId,
          medicationName: med.name,
          elderId,
          groupId,
          status,
          scheduledTime: Timestamp.fromDate(scheduledTime),
          actualTime: status === 'taken' ? Timestamp.fromDate(scheduledTime) : null,
          createdAt: Timestamp.fromDate(scheduledTime),
          loggedBy: userId,
          notes: status === 'missed' ? 'Forgot - was busy with visitor' : '',
        });
        results.medicationLogs++;
      }
    }
    console.log(`  ✓ Day ${7 - dayOffset}: Created ${MEDICATIONS.reduce((sum, m) => sum + m.times.length, 0)} medication logs`);
  }

  // ============= Create Supplements =============
  console.log('\n💚 Creating supplements...');
  const supplementIds: string[] = [];

  for (const supp of SUPPLEMENTS) {
    const suppRef = await db.collection('supplements').add({
      name: supp.name,
      dosage: supp.dosage,
      frequency: supp.frequency,
      times: supp.times,
      instructions: supp.instructions,
      elderId,
      groupId,
      isActive: true,
      startDate: Timestamp.fromDate(subDays(now, 30)),
      createdAt: Timestamp.fromDate(subDays(now, 30)),
      updatedAt: Timestamp.now(),
    });
    supplementIds.push(suppRef.id);
    results.supplements++;
    console.log(`  ✓ Created: ${supp.name} (${supp.dosage})`);
  }

  // ============= Create Supplement Logs (7 days) =============
  console.log('\n📝 Creating supplement logs for 7 days...');
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const date = subDays(now, dayOffset);

    for (let i = 0; i < SUPPLEMENTS.length; i++) {
      const supp = SUPPLEMENTS[i];
      const suppId = supplementIds[i];

      for (const timeStr of supp.times) {
        const scheduledTime = setTime(date, timeStr);
        scheduledTime.setMinutes(scheduledTime.getMinutes() + randomVariation(15));

        // Supplements: ~90% taken, ~8% missed, ~2% skipped
        const random = Math.random();
        let status: 'taken' | 'missed' | 'skipped';
        if (random < 0.90) {
          status = 'taken';
        } else if (random < 0.98) {
          status = 'missed';
        } else {
          status = 'skipped';
        }

        await db.collection('supplement_logs').add({
          supplementId: suppId,
          supplementName: supp.name,
          elderId,
          groupId,
          status,
          scheduledTime: Timestamp.fromDate(scheduledTime),
          actualTime: status === 'taken' ? Timestamp.fromDate(scheduledTime) : null,
          createdAt: Timestamp.fromDate(scheduledTime),
          loggedBy: userId,
        });
        results.supplementLogs++;
      }
    }
    console.log(`  ✓ Day ${7 - dayOffset}: Created ${SUPPLEMENTS.reduce((sum, s) => sum + s.times.length, 0)} supplement logs`);
  }

  // ============= Create Diet Entries (7 days) =============
  console.log('\n🍽️ Creating diet entries for 7 days...');
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const date = subDays(now, dayOffset);
    const dayMeals = DIET_ENTRIES[dayOffset];

    for (const mealEntry of dayMeals) {
      const mealHour = mealEntry.meal === 'breakfast' ? 8 : mealEntry.meal === 'lunch' ? 12 : mealEntry.meal === 'snack' ? 15 : 18;
      const mealTime = setTime(date, `${mealHour}:00`);
      mealTime.setMinutes(mealTime.getMinutes() + randomVariation(30));

      await db.collection('diet_entries').add({
        elderId,
        groupId,
        meal: mealEntry.meal,
        items: mealEntry.items,
        timestamp: Timestamp.fromDate(mealTime),
        createdAt: Timestamp.fromDate(mealTime),
        loggedBy: userId,
        notes: mealEntry.notes,
      });
      results.dietEntries++;
    }
    console.log(`  ✓ Day ${7 - dayOffset}: Created ${dayMeals.length} meal entries`);
  }

  // ============= Create Notes (7 days) =============
  console.log('\n📋 Creating detailed notes for 7 days...');
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const date = subDays(now, dayOffset);
    const noteData = DAILY_NOTES[dayOffset];

    // Create note at different times each day
    const noteHour = 10 + Math.floor(Math.random() * 8); // Between 10 AM and 6 PM
    const noteTime = setTime(date, `${noteHour}:00`);

    await db.collection('notes').add({
      elderId,
      groupId,
      title: noteData.title,
      content: noteData.content,
      type: 'observation',
      timestamp: Timestamp.fromDate(noteTime),
      createdAt: Timestamp.fromDate(noteTime),
      createdBy: userId,
      isPrivate: false,
    });
    results.notes++;
    console.log(`  ✓ Day ${7 - dayOffset}: "${noteData.title}"`);
  }

  // ============= Summary =============
  console.log('\n' + '='.repeat(50));
  console.log('✅ TEST DATA SEEDING COMPLETE');
  console.log('='.repeat(50));
  console.log(`Elder: ${elderName} (${elderId})`);
  console.log(`Group: ${groupId}`);
  console.log(`User: ${userData.email} (${userId})`);
  console.log('\nCreated:');
  console.log(`  💊 ${results.medications} medications`);
  console.log(`  📝 ${results.medicationLogs} medication logs`);
  console.log(`  💚 ${results.supplements} supplements`);
  console.log(`  📝 ${results.supplementLogs} supplement logs`);
  console.log(`  🍽️ ${results.dietEntries} diet entries`);
  console.log(`  📋 ${results.notes} observation notes`);
  console.log('\nDate range: Last 7 days');
  console.log('\n👉 Refresh the Insights page to see the data!');
}

// Run the script
seedTestData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
