import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb, isFirebaseAdminInitialized } from '@/lib/firebase/admin';

/**
 * GET /api/test-firebase-admin
 * Diagnostic endpoint to test Firebase Admin SDK initialization
 */
export async function GET(request: NextRequest) {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    environment: {
      nodeEnv: process.env.NODE_ENV,
      isVercel: !!process.env.VERCEL,
      hasProjectId: !!process.env.FIREBASE_ADMIN_PROJECT_ID,
      hasClientEmail: !!process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      hasPrivateKey: !!process.env.FIREBASE_ADMIN_PRIVATE_KEY,
      privateKeyLength: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.length || 0,
      privateKeyPreview: process.env.FIREBASE_ADMIN_PRIVATE_KEY 
        ? `${process.env.FIREBASE_ADMIN_PRIVATE_KEY.substring(0, 50)}...` 
        : 'Not set',
    },
    initialization: {
      isInitialized: false,
      error: null as string | null,
    },
    tests: {
      authTest: { success: false, error: null as string | null },
      firestoreTest: { success: false, error: null as string | null },
    }
  };

  // Test 1: Check if already initialized
  diagnostics.initialization.isInitialized = isFirebaseAdminInitialized();

  // Test 2: Try to get auth instance
  try {
    const auth = adminAuth();
    diagnostics.tests.authTest.success = true;
    
    // Try to list one user to verify it works
    try {
      const listResult = await auth.listUsers(1);
      diagnostics.tests.authTest.success = true;
    } catch (listError: any) {
      diagnostics.tests.authTest.error = `Auth works but list failed: ${listError.message}`;
    }
  } catch (authError: any) {
    diagnostics.tests.authTest.error = authError.message;
    diagnostics.initialization.error = authError.message;
  }

  // Test 3: Try to get Firestore instance
  try {
    const db = adminDb();
    diagnostics.tests.firestoreTest.success = true;
    
    // Try to read a collection to verify it works
    try {
      const snapshot = await db.collection('test').limit(1).get();
      diagnostics.tests.firestoreTest.success = true;
    } catch (readError: any) {
      diagnostics.tests.firestoreTest.error = `Firestore works but read failed: ${readError.message}`;
    }
  } catch (dbError: any) {
    diagnostics.tests.firestoreTest.error = dbError.message;
  }

  // Return diagnostics
  const status = diagnostics.tests.authTest.success && diagnostics.tests.firestoreTest.success ? 200 : 500;
  
  return NextResponse.json(diagnostics, { status });
}