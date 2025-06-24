import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/firebase-auth';
import { checkMedications } from '@/lib/vertex-ai/medgemma';
import { ApiResponse, MedicationCheckRequest, MedicationCheckResult } from '@/types';
import { VALIDATION_MESSAGES, ERROR_MESSAGES } from '@/lib/constants';
import { withRateLimit, rateLimiters } from '@/lib/middleware/rate-limit';
import { adminDb } from '@/lib/firebase/admin';

/**
 * POST /api/medication/check
 * Check medications for conflicts using Claude AI
 * Requires authentication
 */


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


export async function POST(request: NextRequest) {
  return withRateLimit(request, async () => {
    try {
      // Verify authentication using session
      const currentUser = await getCurrentUser();
      
      if (!currentUser) {
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: 'Authentication required',
            code: 'auth/unauthenticated',
          },
          { status: 401 }
        );
      }
      
      const userId = currentUser.uid;
    
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
    const userDoc = await adminDb()
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
    
    // Log the request for debugging
    console.log('[Medication Check] Request:', {
      userId,
      medications: checkRequest.medications.length,
      checkType: checkRequest.checkType,
    });

    // Call MedGemma to check medications
    const result = await checkMedications(checkRequest);
    
    console.log('[Medication Check] Result received:', {
      hasInteractions: result.interactions.length > 0,
      severity: result.overallRisk,
    });
    
    // Store check history (optional)
    try {
      await adminDb()
        .collection('users')
        .doc(userId)
        .collection('medicationChecks')
        .add({
          ...result,
          medications: checkRequest.medications,
          createdAt: new Date(),
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