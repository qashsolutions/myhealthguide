import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { z } from 'zod';
import admin from 'firebase-admin';
import { checkMedications } from '@/lib/vertex-ai/medgemma';
import { ApiResponse, MedicationCheckRequest, MedicationCheckResult } from '@/types';
import { VALIDATION_MESSAGES, ERROR_MESSAGES } from '@/lib/constants';
import { withRateLimit, rateLimiters } from '@/lib/middleware/rate-limit';

/**
 * POST /api/medication/check
 * Check medications for conflicts using MedGemma AI
 * Requires authentication
 */

// Initialize Firebase Admin SDK
const initializeFirebaseAdmin = () => {
  if (!admin.apps.length) {
    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

    if (projectId && clientEmail && privateKey) {
      try {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey: privateKey.replace(/\\n/g, '\n'),
          }),
        });
      } catch (error) {
        console.error('Firebase admin initialization error:', error);
      }
    } else {
      console.warn('Firebase Admin SDK not initialized: Missing credentials');
    }
  }
};

initializeFirebaseAdmin();

// Validation schema
const medicationSchema = z.object({
  name: z.string().min(1, VALIDATION_MESSAGES.MEDICATION_NAME),
  dosage: z.string().optional(),
  frequency: z.string().optional(),
  prescribedFor: z.string().optional(),
  notes: z.string().optional(),
});

const checkRequestSchema = z.object({
  medications: z
    .array(medicationSchema)
    .min(1, 'At least one medication is required')
    .max(20, 'Maximum 20 medications allowed'),
  userAge: z.number().min(1).max(120).optional(),
  healthConditions: z.array(z.string()).optional(),
  checkType: z.enum(['quick', 'detailed']).optional().default('quick'),
});

// Verify Firebase auth token
const verifyAuthToken = async (authHeader: string | null): Promise<string | null> => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  // Skip token verification if Firebase Admin is not initialized
  if (!admin.apps.length) {
    console.warn('Firebase Admin not initialized, skipping token verification');
    return 'development-user'; // Return a dummy user ID for development
  }

  const token = authHeader.split('Bearer ')[1];
  
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    return decodedToken.uid;
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
};

export async function POST(request: NextRequest) {
  return withRateLimit(request, async () => {
    try {
      // Verify authentication
      const headersList = headers();
      const authHeader = headersList.get('authorization');
      const userId = await verifyAuthToken(authHeader);
    
    if (!userId) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'Authentication required',
          code: 'auth/unauthenticated',
        },
        { status: 401 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    
    // Validate input
    const validationResult = checkRequestSchema.safeParse(body);
    
    if (!validationResult.success) {
      const errors = validationResult.error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'Validation failed',
          errors,
        },
        { status: 400 }
      );
    }
    
    const checkRequest: MedicationCheckRequest = validationResult.data;
    
    // Check if user has accepted medical disclaimer
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(userId)
      .get();
    
    const userData = userDoc.data();
    if (!userData?.disclaimerAccepted) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'Please accept the medical disclaimer before using this feature',
          code: 'disclaimer/not-accepted',
        },
        { status: 403 }
      );
    }
    
    // Call MedGemma to check medications
    const result = await checkMedications(checkRequest);
    
    // Store check history (optional)
    try {
      await admin.firestore()
        .collection('users')
        .doc(userId)
        .collection('medicationChecks')
        .add({
          ...result,
          medications: checkRequest.medications,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    } catch (error) {
      console.error('Failed to store check history:', error);
      // Don't fail the request if history storage fails
    }
    
    // Return result
    return NextResponse.json<ApiResponse<MedicationCheckResult>>(
      {
        success: true,
        data: result,
      },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Medication check API error:', error);
    
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: ERROR_MESSAGES.MEDICATION_CHECK_FAILED,
      },
      { status: 500 }
    );
  }
  }, rateLimiters.medicationCheck);
}