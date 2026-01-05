/**
 * Test Data Factories
 * Generate realistic test data for E2E tests
 */

import { TEST_CONFIG } from './test-config';

// ============= USER FACTORY =============

export interface TestUser {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  subscriptionStatus: 'trial' | 'active' | 'expired' | 'canceled';
  subscriptionTier: 'family' | 'single_agency' | 'multi_agency' | null;
  trialDaysRemaining?: number;
}

let userCounter = 0;

export function createTestUser(overrides?: Partial<TestUser>): TestUser {
  userCounter++;
  const timestamp = Date.now();

  return {
    email: `ramanac+test${userCounter}${timestamp}@gmail.com`,
    password: TEST_CONFIG.defaultPassword,
    firstName: 'Test',
    lastName: `User${userCounter}`,
    phoneNumber: undefined,
    subscriptionStatus: 'trial',
    subscriptionTier: null,
    trialDaysRemaining: TEST_CONFIG.trial.familyDays,
    ...overrides,
  };
}

export function createTrialUser(overrides?: Partial<TestUser>): TestUser {
  return createTestUser({
    subscriptionStatus: 'trial',
    subscriptionTier: null,
    trialDaysRemaining: TEST_CONFIG.trial.familyDays,
    ...overrides,
  });
}

export function createActiveUser(tier: TestUser['subscriptionTier'] = 'family', overrides?: Partial<TestUser>): TestUser {
  return createTestUser({
    subscriptionStatus: 'active',
    subscriptionTier: tier,
    trialDaysRemaining: 0,
    ...overrides,
  });
}

export function createExpiredUser(overrides?: Partial<TestUser>): TestUser {
  return createTestUser({
    subscriptionStatus: 'expired',
    subscriptionTier: null,
    trialDaysRemaining: -1,
    ...overrides,
  });
}

export function createSuperAdmin(overrides?: Partial<TestUser>): TestUser {
  return createTestUser({
    subscriptionStatus: 'active',
    subscriptionTier: 'multi_agency',
    ...overrides,
  });
}

// ============= ELDER FACTORY =============

export interface TestElder {
  name: string;
  dateOfBirth: string; // ISO date string
  age: number;
  gender: 'male' | 'female' | 'other';
  conditions: string[];
  allergies: string[];
  bloodType?: string;
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  notes?: string;
}

let elderCounter = 0;

export function createTestElder(overrides?: Partial<TestElder>): TestElder {
  elderCounter++;
  const birthYear = 1940 + Math.floor(Math.random() * 20); // 1940-1960
  const age = new Date().getFullYear() - birthYear;

  return {
    name: `Elder ${elderCounter}`,
    dateOfBirth: `${birthYear}-05-15`,
    age,
    gender: ['male', 'female'][Math.floor(Math.random() * 2)] as 'male' | 'female',
    conditions: ['hypertension'],
    allergies: [],
    bloodType: 'O+',
    emergencyContact: {
      name: 'Emergency Contact',
      phone: TEST_CONFIG.accounts.primary.phone,
      relationship: 'child',
    },
    notes: '',
    ...overrides,
  };
}

export function createElderWithDiabetes(overrides?: Partial<TestElder>): TestElder {
  return createTestElder({
    conditions: ['type 2 diabetes', 'hypertension'],
    ...overrides,
  });
}

export function createElderWithDementia(overrides?: Partial<TestElder>): TestElder {
  return createTestElder({
    conditions: ['dementia', 'hypertension'],
    age: 80,
    ...overrides,
  });
}

export function createElderWithMultipleConditions(overrides?: Partial<TestElder>): TestElder {
  return createTestElder({
    conditions: ['type 2 diabetes', 'hypertension', 'arthritis', 'heart disease'],
    allergies: ['penicillin', 'sulfa drugs'],
    age: 78,
    ...overrides,
  });
}

// ============= MEDICATION FACTORY =============

export interface TestMedication {
  name: string;
  dosage: string;
  frequency: {
    type: 'daily' | 'twice_daily' | 'three_times_daily' | 'weekly' | 'as_needed';
    times: string[]; // ['08:00', '20:00']
    daysOfWeek?: number[]; // [0, 2, 4] for Sun, Tue, Thu
  };
  instructions: string;
  startDate: string;
  endDate?: string;
  prescribedBy?: string;
  pharmacy?: string;
  refillDate?: string;
  quantity?: number;
  pillsRemaining?: number;
  category: 'prescription' | 'otc' | 'supplement';
}

const COMMON_MEDICATIONS: Partial<TestMedication>[] = [
  {
    name: 'Lisinopril',
    dosage: '10mg',
    frequency: { type: 'daily', times: ['08:00'] },
    instructions: 'Take in the morning with water',
    category: 'prescription',
  },
  {
    name: 'Metformin',
    dosage: '500mg',
    frequency: { type: 'twice_daily', times: ['08:00', '18:00'] },
    instructions: 'Take with food',
    category: 'prescription',
  },
  {
    name: 'Aspirin',
    dosage: '81mg',
    frequency: { type: 'daily', times: ['08:00'] },
    instructions: 'Take with food to prevent stomach upset',
    category: 'otc',
  },
  {
    name: 'Atorvastatin',
    dosage: '20mg',
    frequency: { type: 'daily', times: ['20:00'] },
    instructions: 'Take at bedtime',
    category: 'prescription',
  },
  {
    name: 'Omeprazole',
    dosage: '20mg',
    frequency: { type: 'daily', times: ['07:00'] },
    instructions: 'Take 30 minutes before breakfast',
    category: 'prescription',
  },
];

let medicationCounter = 0;

export function createTestMedication(overrides?: Partial<TestMedication>): TestMedication {
  medicationCounter++;
  const base = COMMON_MEDICATIONS[medicationCounter % COMMON_MEDICATIONS.length];
  const today = new Date().toISOString().split('T')[0];

  return {
    name: `Medication ${medicationCounter}`,
    dosage: '10mg',
    frequency: { type: 'daily', times: ['08:00'] },
    instructions: 'Take as directed',
    startDate: today,
    prescribedBy: 'Dr. Smith',
    pharmacy: 'CVS Pharmacy',
    quantity: 30,
    pillsRemaining: 30,
    category: 'prescription',
    ...base,
    ...overrides,
  };
}

export function createDailyMedication(overrides?: Partial<TestMedication>): TestMedication {
  return createTestMedication({
    frequency: { type: 'daily', times: ['08:00'] },
    ...overrides,
  });
}

export function createTwiceDailyMedication(overrides?: Partial<TestMedication>): TestMedication {
  return createTestMedication({
    frequency: { type: 'twice_daily', times: ['08:00', '20:00'] },
    ...overrides,
  });
}

export function createAsNeededMedication(overrides?: Partial<TestMedication>): TestMedication {
  return createTestMedication({
    name: 'Ibuprofen',
    dosage: '200mg',
    frequency: { type: 'as_needed', times: [] },
    instructions: 'Take as needed for pain, max 4 times daily',
    category: 'otc',
    ...overrides,
  });
}

export function createWeeklyMedication(overrides?: Partial<TestMedication>): TestMedication {
  return createTestMedication({
    name: 'Vitamin D',
    dosage: '50000 IU',
    frequency: { type: 'weekly', times: ['09:00'], daysOfWeek: [0] }, // Sunday
    instructions: 'Take with a fatty meal',
    category: 'supplement',
    ...overrides,
  });
}

// ============= SUPPLEMENT FACTORY =============

export interface TestSupplement {
  name: string;
  dosage: string;
  frequency: {
    type: 'daily' | 'twice_daily' | 'weekly';
    times: string[];
  };
  instructions: string;
  brand?: string;
  purpose?: string;
}

const COMMON_SUPPLEMENTS: Partial<TestSupplement>[] = [
  {
    name: 'Vitamin D3',
    dosage: '2000 IU',
    frequency: { type: 'daily', times: ['08:00'] },
    instructions: 'Take with food',
    purpose: 'Bone health and immune support',
  },
  {
    name: 'Fish Oil',
    dosage: '1000mg',
    frequency: { type: 'daily', times: ['08:00'] },
    instructions: 'Take with food to reduce fishy aftertaste',
    purpose: 'Heart and brain health',
  },
  {
    name: 'Calcium',
    dosage: '600mg',
    frequency: { type: 'twice_daily', times: ['08:00', '20:00'] },
    instructions: 'Take with food, separate from other minerals',
    purpose: 'Bone health',
  },
  {
    name: 'B-Complex',
    dosage: '1 tablet',
    frequency: { type: 'daily', times: ['08:00'] },
    instructions: 'Take in the morning for energy',
    purpose: 'Energy and nervous system support',
  },
  {
    name: 'Magnesium',
    dosage: '400mg',
    frequency: { type: 'daily', times: ['20:00'] },
    instructions: 'Take at bedtime for better absorption',
    purpose: 'Muscle relaxation and sleep support',
  },
];

let supplementCounter = 0;

export function createTestSupplement(overrides?: Partial<TestSupplement>): TestSupplement {
  supplementCounter++;
  const base = COMMON_SUPPLEMENTS[supplementCounter % COMMON_SUPPLEMENTS.length];

  return {
    name: `Supplement ${supplementCounter}`,
    dosage: '1 tablet',
    frequency: { type: 'daily', times: ['08:00'] },
    instructions: 'Take as directed',
    ...base,
    ...overrides,
  };
}

// ============= DIET ENTRY FACTORY =============

export interface TestDietEntry {
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  items: string[];
  notes?: string;
  timestamp: string;
  calories?: number;
}

export function createTestDietEntry(overrides?: Partial<TestDietEntry>): TestDietEntry {
  const now = new Date();
  const hour = now.getHours();
  let mealType: TestDietEntry['mealType'] = 'snack';

  if (hour >= 6 && hour < 11) mealType = 'breakfast';
  else if (hour >= 11 && hour < 15) mealType = 'lunch';
  else if (hour >= 17 && hour < 21) mealType = 'dinner';

  const mealItems: Record<TestDietEntry['mealType'], string[]> = {
    breakfast: ['oatmeal', 'banana', 'coffee'],
    lunch: ['grilled chicken salad', 'whole wheat bread', 'water'],
    dinner: ['baked salmon', 'steamed vegetables', 'brown rice'],
    snack: ['apple slices', 'peanut butter'],
  };

  return {
    mealType,
    items: mealItems[mealType],
    timestamp: now.toISOString(),
    calories: mealType === 'snack' ? 200 : 500,
    ...overrides,
  };
}

export function createBreakfast(overrides?: Partial<TestDietEntry>): TestDietEntry {
  return createTestDietEntry({
    mealType: 'breakfast',
    items: ['scrambled eggs', 'whole wheat toast', 'orange juice'],
    calories: 450,
    ...overrides,
  });
}

export function createLunch(overrides?: Partial<TestDietEntry>): TestDietEntry {
  return createTestDietEntry({
    mealType: 'lunch',
    items: ['turkey sandwich', 'vegetable soup', 'iced tea'],
    calories: 600,
    ...overrides,
  });
}

export function createDinner(overrides?: Partial<TestDietEntry>): TestDietEntry {
  return createTestDietEntry({
    mealType: 'dinner',
    items: ['grilled chicken', 'mashed potatoes', 'green beans', 'water'],
    calories: 700,
    ...overrides,
  });
}

// ============= AGENCY FACTORY =============

export interface TestAgency {
  name: string;
  type: 'individual' | 'professional' | 'enterprise';
  maxCaregivers: number;
  maxEldersPerCaregiver: number;
}

let agencyCounter = 0;

export function createTestAgency(overrides?: Partial<TestAgency>): TestAgency {
  agencyCounter++;

  return {
    name: `Test Agency ${agencyCounter}`,
    type: 'professional',
    maxCaregivers: 10,
    maxEldersPerCaregiver: 3,
    ...overrides,
  };
}

// ============= CAREGIVER FACTORY =============

export interface TestCaregiver {
  email: string;
  firstName: string;
  lastName: string;
  role: 'caregiver' | 'caregiver_admin';
  specializations?: string[];
}

let caregiverCounter = 0;

export function createTestCaregiver(overrides?: Partial<TestCaregiver>): TestCaregiver {
  caregiverCounter++;
  const timestamp = Date.now();

  return {
    email: `ramanac+caregiver${caregiverCounter}${timestamp}@gmail.com`,
    firstName: 'Caregiver',
    lastName: `Test${caregiverCounter}`,
    role: 'caregiver',
    specializations: ['elderly care', 'medication management'],
    ...overrides,
  };
}

export function createCaregiverAdmin(overrides?: Partial<TestCaregiver>): TestCaregiver {
  return createTestCaregiver({
    role: 'caregiver_admin',
    ...overrides,
  });
}

// ============= RESET COUNTERS =============

export function resetAllCounters(): void {
  userCounter = 0;
  elderCounter = 0;
  medicationCounter = 0;
  supplementCounter = 0;
  agencyCounter = 0;
  caregiverCounter = 0;
}
