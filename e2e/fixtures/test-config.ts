/**
 * E2E Test Configuration
 * Central configuration for all E2E tests
 */

export const TEST_CONFIG = {
  // Test accounts provided by user
  accounts: {
    primary: {
      email: 'ramanac@gmail.com',
      phone: '+14692039202',
    },
    secondary: {
      email: 'ramanac+a@gmail.com',
      phone: '+14696826010',
    },
    familyAdmin: {
      email: 'ramanac+b@gmail.com',
    },
    caregiver: {
      email: 'ramanac+c@gmail.com',
    },
    superAdmin: {
      email: 'ramanac+d@gmail.com',
    },
    expiredTrial: {
      email: 'ramanac+expired@gmail.com',
    },
    gracePeriod: {
      email: 'ramanac+grace@gmail.com',
    },
  },

  // Default test password (alphanumeric only - no special chars per app requirements)
  defaultPassword: 'TestPassword123',

  // Firebase emulator configuration
  emulators: {
    auth: {
      host: '127.0.0.1',
      port: 9099,
    },
    firestore: {
      host: '127.0.0.1',
      port: 8080,
    },
    storage: {
      host: '127.0.0.1',
      port: 9199,
    },
    functions: {
      host: '127.0.0.1',
      port: 5001,
    },
  },

  // Stripe test cards
  stripe: {
    success: '4242424242424242',
    decline: '4000000000000002',
    authFail: '4000000000009995',
    expiry: '12/30',
    cvc: '123',
    zip: '75001',
  },

  // Timeouts
  timeouts: {
    short: 5000,
    medium: 15000,
    long: 30000,
    auth: 10000,
  },

  // Trial configuration (must match app config)
  trial: {
    familyDays: 45,
    multiAgencyDays: 30,
    gracePeriodHours: 48,
  },
};

/**
 * Generate unique test email using timestamp
 */
export function generateTestEmail(prefix: string = 'test'): string {
  const timestamp = Date.now();
  return `ramanac+${prefix}${timestamp}@gmail.com`;
}

/**
 * Generate unique test user data
 */
export function generateTestUserData(overrides?: Partial<TestUserData>): TestUserData {
  const timestamp = Date.now();
  return {
    firstName: overrides?.firstName || 'Test',
    lastName: overrides?.lastName || `User${timestamp}`,
    email: overrides?.email || generateTestEmail(),
    phone: overrides?.phone || TEST_CONFIG.accounts.primary.phone,
    password: overrides?.password || TEST_CONFIG.defaultPassword,
  };
}

export interface TestUserData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
}
