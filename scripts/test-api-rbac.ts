/**
 * API RBAC Security Test Script
 *
 * Tests S1.14-S1.17: Verify API endpoints properly deny access to
 * elders that belong to other caregivers.
 *
 * Usage: npx ts-node --esm scripts/test-api-rbac.ts
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Test configuration
const C1_UID = 'pIBP8LZ1LIgt8oyvrhA1B4v2ABk1'; // C1's Firebase UID
const C2_ELDER_ID = 'XCynWmOt5KdCNp0jdgLo';
const C3_ELDER_ID = 'BAw6UYpkO6oCMgp1WG2N';
const C10_ELDER_ID = '9Kqy3BCBDwSkub9ywSDw';

const BASE_URL = 'https://www.myguide.health';

async function runTests() {
  // Initialize Firebase Admin
  if (getApps().length === 0) {
    const serviceAccount = require('./serviceAccountKey.json');
    initializeApp({ credential: cert(serviceAccount) });
  }

  const adminAuth = getAuth();

  console.log('=== API RBAC Security Tests ===\n');
  console.log('Testing as C1 (ramanac+c1@gmail.com)\n');

  // Create a custom token for C1 and exchange it for an ID token
  // Note: In production, we'd use the actual user's token
  // For testing, we'll create a custom token

  try {
    const customToken = await adminAuth.createCustomToken(C1_UID);

    // We need to exchange the custom token for an ID token using the Firebase Auth REST API
    const firebaseConfig = {
      apiKey: 'AIzaSyBQU8IlOr5dqYF02H5RJfOT3w36g8L71Bg' // Web API key (public)
    };

    const tokenResponse = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${firebaseConfig.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: customToken,
          returnSecureToken: true
        })
      }
    );

    const tokenData = await tokenResponse.json();

    if (!tokenData.idToken) {
      console.error('Failed to get ID token:', tokenData);
      return;
    }

    const idToken = tokenData.idToken;
    console.log('✓ Got ID token for C1\n');

    // Test S1.14: GET /api/elder-insights for C2's elder
    console.log('TEST S1.14: GET /api/elder-insights for C2\'s elder');
    const test14 = await testApiEndpoint(
      idToken,
      `${BASE_URL}/api/elder-insights?elderId=${C2_ELDER_ID}&groupId=any`,
      'GET'
    );
    console.log(`  Status: ${test14.status}`);
    console.log(`  Response: ${JSON.stringify(test14.body)}`);
    console.log(`  Result: ${test14.status === 403 ? '✅ PASS' : '❌ FAIL'}\n`);

    // Test S1.15: GET /api/elder-insights for C3's elder
    console.log('TEST S1.15: GET /api/elder-insights for C3\'s elder');
    const test15 = await testApiEndpoint(
      idToken,
      `${BASE_URL}/api/elder-insights?elderId=${C3_ELDER_ID}&groupId=any`,
      'GET'
    );
    console.log(`  Status: ${test15.status}`);
    console.log(`  Response: ${JSON.stringify(test15.body)}`);
    console.log(`  Result: ${test15.status === 403 ? '✅ PASS' : '❌ FAIL'}\n`);

    // Test S1.16: POST /api/elder-insights for C2's elder
    console.log('TEST S1.16: POST /api/elder-insights for C2\'s elder');
    const test16 = await testApiEndpoint(
      idToken,
      `${BASE_URL}/api/elder-insights`,
      'POST',
      { elderId: C2_ELDER_ID, groupId: 'any', days: 7 }
    );
    console.log(`  Status: ${test16.status}`);
    console.log(`  Response: ${JSON.stringify(test16.body)}`);
    console.log(`  Result: ${test16.status === 403 ? '✅ PASS' : '❌ FAIL'}\n`);

    // Test S1.17: GET /api/documents for C10's elder
    console.log('TEST S1.17: GET /api/documents for C10\'s elder');
    const test17 = await testApiEndpoint(
      idToken,
      `${BASE_URL}/api/documents?elderId=${C10_ELDER_ID}&groupId=any`,
      'GET'
    );
    console.log(`  Status: ${test17.status}`);
    console.log(`  Response: ${JSON.stringify(test17.body)}`);
    console.log(`  Result: ${test17.status === 403 ? '✅ PASS' : '❌ FAIL'}\n`);

    // Summary
    console.log('=== Summary ===');
    const results = [test14, test15, test16, test17];
    const passed = results.filter(r => r.status === 403).length;
    console.log(`Passed: ${passed}/${results.length}`);

  } catch (error) {
    console.error('Error running tests:', error);
  }
}

async function testApiEndpoint(
  idToken: string,
  url: string,
  method: string,
  body?: any
): Promise<{ status: number; body: any }> {
  try {
    const options: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const data = await response.json();

    return { status: response.status, body: data };
  } catch (error: any) {
    return { status: 0, body: { error: error.message } };
  }
}

runTests().then(() => process.exit(0)).catch(console.error);
