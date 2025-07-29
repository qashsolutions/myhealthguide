import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/firebase-auth';
import { checkMedications } from '@/lib/claude-ai/claude';
import { ApiResponse, MedicationCheckRequest, MedicationCheckResult } from '@/types';
import { VALIDATION_MESSAGES, ERROR_MESSAGES } from '@/lib/constants';
import { withRateLimit, rateLimiters } from '@/lib/middleware/rate-limit';
import { adminDb } from '@/lib/firebase/admin';

/**
 * POST /api/medication/check
 * Check medications for conflicts using Claude AI
 * Authentication optional - works for both authenticated and public users
 */

// ADDED: Validation helpers for medication names
const containsProfanity = (text: string): boolean => {
  const lowerText = text.toLowerCase();
  
  // Common profanity patterns
  const profanityPatterns = [
    /\bf+u+c+k+/i,
    /\bs+h+i+t+/i,
    /\ba+s+s+h+o+l+e+/i,
    /\bb+i+t+c+h+/i,
    /\bd+a+m+n+/i,
    /\bh+e+l+l+/i,
    /\bs+e+x+/i,
    /\bp+o+r+n+/i,
  ];
  
  return profanityPatterns.some(pattern => pattern.test(lowerText));
};

// ADDED: Check if text looks like a medication name
const isValidMedicationName = (name: string): boolean => {
  const cleaned = name.trim().toLowerCase();
  
  // IMPORTANT: Check for multiple medications in one entry
  // Count potential separators (commas, semicolons, "and", "+")
  const separatorCount = (cleaned.match(/[,;]|\band\b|\bor\b|\+|\//g) || []).length;
  if (separatorCount > 0) {
    return false; // Reject entries with multiple medications
  }
  
  // Check for profanity first
  if (containsProfanity(cleaned)) {
    return false;
  }
  
  // Check if it's too short or just numbers
  if (cleaned.length < 2 || /^\d+$/.test(cleaned)) {
    return false;
  }
  
  // Check if it's exactly a common invalid pattern (not as part of a word)
  const exactInvalidPatterns = ['abc', 'xyz', 'test', 'asdf', 'qwerty', 'aaa', 'bbb'];
  if (exactInvalidPatterns.includes(cleaned)) {
    return false;
  }
  
  // Check for excessive length (medications rarely exceed 30 characters)
  if (name.trim().length > 50) {
    return false;
  }
  
  // Check for repeated gibberish patterns (like "sdfsdf")
  const hasRepeatedGibberish = /(.{2,})\1{2,}/i.test(cleaned); // Detects patterns repeated 3+ times
  if (hasRepeatedGibberish) {
    return false;
  }
  
  // Check for excessive consonants in a row (indicates keyboard mashing)
  const tooManyConsonants = /[bcdfghjklmnpqrstvwxyz]{5,}/i.test(cleaned);
  if (tooManyConsonants) {
    return false;
  }
  
  // Check for random character patterns (like "wfewrwer")
  // If more than 60% of the string is consonants, likely keyboard mashing
  const consonantCount = (cleaned.match(/[bcdfghjklmnpqrstvwxyz]/gi) || []).length;
  const consonantRatio = consonantCount / cleaned.length;
  if (consonantRatio > 0.75 && cleaned.length > 4) {
    return false;
  }
  
  // Check for keyboard patterns anywhere in the string
  const keyboardPatterns = [
    /qwer/i,
    /asdf/i,
    /zxcv/i,
    /qaz/i,
    /wsx/i,
    /edc/i,
  ];
  
  const hasKeyboardPattern = keyboardPatterns.some(pattern => pattern.test(cleaned));
  if (hasKeyboardPattern) {
    return false;
  }
  
  return true;
};

// Validation schema
const medicationSchema = z.object({
  name: z.string()
    .min(1, VALIDATION_MESSAGES.MEDICATION_NAME)
    .refine(isValidMedicationName, {
      message: 'Please enter a valid medication name',
    }),
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
      // Check for authenticated user (optional)
      const currentUser = await getCurrentUser();
      const userId = currentUser?.uid || null;
    
    // Parse request body
    const body = await request.json();
    
    // Validate input
    const validationResult = checkRequestSchema.safeParse(body);
    
    if (!validationResult.success) {
      const errors = validationResult.error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      
      // ADDED: Check if any errors are about invalid medication names
      const hasInvalidMedicationName = errors.some(
        error => error.message === 'Please enter a valid medication name'
      );
      
      if (hasInvalidMedicationName) {
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: 'Invalid medication name detected',
            code: 'validation/invalid-medication',
            data: {
              message: 'Please enter valid medication names only',
              examples: [
                'Common medications: Aspirin, Ibuprofen, Acetaminophen',
                'Prescription drugs: Lisinopril, Metformin, Atorvastatin',
                'Supplements: Vitamin D, Calcium, Fish Oil'
              ]
            }
          },
          { status: 400 }
        );
      }
      
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
    
    // Only check disclaimer for authenticated users
    if (userId) {
      const userDoc = await adminDb()
        .collection('users')
        .doc(userId)
        .get();
      
      const userData = userDoc.data();
      if (!userData?.disclaimerAccepted) {
        // For authenticated users, still require disclaimer
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: 'Please accept the medical disclaimer before using this feature',
            code: 'disclaimer/not-accepted',
          },
          { status: 403 }
        );
      }
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
    
    // Store check history only for authenticated users
    if (userId) {
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