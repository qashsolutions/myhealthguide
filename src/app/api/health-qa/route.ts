import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import admin from 'firebase-admin';
import { answerHealthQuestion } from '@/lib/vertex-ai/medgemma';
import { ApiResponse, HealthQuestion, HealthAnswer } from '@/types';
import { VALIDATION_MESSAGES, ERROR_MESSAGES } from '@/lib/constants';
import { withRateLimit, rateLimiters } from '@/lib/middleware/rate-limit';
// UPDATED: Import getCurrentUser to use session cookie authentication instead of Bearer tokens
import { getCurrentUser } from '@/lib/auth/firebase-auth';

/**
 * POST /api/health-qa
 * Answer health questions using Claude API (via updated medgemma.ts)
 * Requires authentication
 */

// Initialize Firebase Admin if needed
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
const healthQuestionSchema = z.object({
  question: z
    .string()
    .min(5, 'Question must be at least 5 characters')
    .max(500, 'Question must be less than 500 characters'),
  context: z.string().optional(),
  category: z.string().optional(),
});

// REMOVED: verifyAuthToken function - replaced with session cookie authentication
// This ensures consistency across all API routes and fixes the authentication issue
// where Bearer tokens were expected but the frontend only sends session cookies

// ADDED: Health-related question validation
// Ensures users only ask about health, medications, or supplements
const isHealthRelatedQuestion = (question: string): boolean => {
  const lowerQuestion = question.toLowerCase();
  
  // Health-related keywords that indicate a valid question
  const healthKeywords = [
    // Medical conditions
    'health', 'medical', 'doctor', 'symptom', 'disease', 'illness', 'condition',
    'pain', 'ache', 'fever', 'cold', 'flu', 'covid', 'diabetes', 'pressure',
    'heart', 'lung', 'kidney', 'liver', 'cancer', 'infection', 'allergy',
    
    // Medications
    'medication', 'medicine', 'drug', 'pill', 'tablet', 'dose', 'prescription',
    'aspirin', 'ibuprofen', 'acetaminophen', 'antibiotic', 'insulin', 'inhaler',
    
    // Supplements
    'supplement', 'vitamin', 'mineral', 'herb', 'omega', 'probiotic', 'calcium',
    'magnesium', 'zinc', 'iron', 'b12', 'd3', 'multivitamin',
    
    // Treatment
    'treatment', 'therapy', 'cure', 'remedy', 'relief', 'help', 'manage',
    
    // Body parts
    'head', 'chest', 'stomach', 'back', 'joint', 'muscle', 'bone', 'skin',
    
    // Symptoms
    'nausea', 'dizzy', 'tired', 'fatigue', 'sleep', 'appetite', 'weight'
  ];
  
  // Check if question contains health-related keywords
  return healthKeywords.some(keyword => lowerQuestion.includes(keyword));
};

// ADDED: Profanity filter
// Blocks inappropriate content to maintain professional healthcare environment
const containsProfanity = (text: string): boolean => {
  const lowerText = text.toLowerCase();
  
  // Common profanity patterns (keeping list minimal for professional context)
  const profanityPatterns = [
    /\bf+u+c+k+/i,
    /\bs+h+i+t+/i,
    /\ba+s+s+h+o+l+e+/i,
    /\bb+i+t+c+h+/i,
    /\bd+a+m+n+/i,
    /\bh+e+l+l+/i,
  ];
  
  return profanityPatterns.some(pattern => pattern.test(lowerText));
};

// Log question for analytics (anonymized)
const logQuestion = async (userId: string, question: string, category?: string) => {
  try {
    if (!admin.apps.length) return;

    const db = admin.firestore();
    await db.collection('health_qa_logs').add({
      userId: userId.substring(0, 8) + '***', // Partially anonymized
      questionLength: question.length,
      category: category || 'general',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error('Failed to log question:', error);
    // Don't fail the request if logging fails
  }
};

export async function POST(request: NextRequest) {
  return withRateLimit(request, async () => {
    try {
      // DEBUG: Check environment variables
      console.log('[Health QA API] Environment check:', {
        hasClaudeKey: !!process.env.CLAUDE_API_KEY,
        claudeKeyPrefix: process.env.CLAUDE_API_KEY?.substring(0, 10),
        nodeEnv: process.env.NODE_ENV
      });
      
      // UPDATED: Use session cookie authentication instead of Bearer token
      // This matches the authentication method used in other routes like /api/auth/session
      const decodedToken = await getCurrentUser();
      
      // Check if user is authenticated via session cookie
      if (!decodedToken) {
        console.log('[Health QA API] No valid session found - user needs to sign in');
        
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: 'Please sign in to ask health questions. Your session may have expired.',
            code: 'auth/unauthenticated',
            // Add helpful information for the frontend
            data: {
              requiresAuth: true,
              message: 'For your security, please sign in again to continue.'
            }
          },
          { status: 401 }
        );
      }
      
      // Extract userId from the decoded session token
      const userId = decodedToken.uid;
      const userEmail = decodedToken.email;
      
      // Additional security check: ensure email is verified
      if (!decodedToken.email_verified) {
        console.log('[Health QA API] User email not verified:', userEmail);
        
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: 'Please verify your email address before asking health questions.',
            code: 'auth/email-not-verified',
            data: {
              email: userEmail,
              requiresVerification: true
            }
          },
          { status: 403 }
        );
      }
      
      // Parse request body
      const body = await request.json();
      
      // UPDATED: Enhanced logging with user email for better debugging
      console.log('[Health QA API] Request received:', {
        userId: userId.substring(0, 8) + '***',
        userEmail: userEmail || 'unknown',
        questionLength: body.question?.length || 0,
        hasContext: !!body.context
      });
      
      // Validate input
      const validationResult = healthQuestionSchema.safeParse(body);
      
      if (!validationResult.success) {
        const errors = validationResult.error.issues.map(issue => ({
          field: issue.path[0] as string,
          message: issue.message,
        }));
        
        // UPDATED: More user-friendly validation error messages
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: 'Please check your question and try again.',
            errors,
            data: {
              hint: 'Questions should be between 5 and 500 characters long.'
            }
          },
          { status: 400 }
        );
      }
      
      const questionData: HealthQuestion = validationResult.data;
      
      // ADDED: Validate question is health-related
      if (!isHealthRelatedQuestion(questionData.question)) {
        console.log('[Health QA API] Non-health question blocked:', questionData.question);
        
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: 'Please ask questions about health, medications, or supplements only.',
            code: 'validation/non-health-topic',
            data: {
              message: 'I can help with health, medication, and supplement questions.',
              examples: [
                'What are the side effects of aspirin?',
                'Can I take vitamin D with calcium?',
                'What helps with high blood pressure?'
              ]
            }
          },
          { status: 400 }
        );
      }
      
      // ADDED: Profanity check
      if (containsProfanity(questionData.question)) {
        console.log('[Health QA API] Profanity detected in question');
        
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: 'Please keep your questions respectful and appropriate.',
            code: 'validation/inappropriate-content'
          },
          { status: 400 }
        );
      }
      
      // Log the question (anonymized)
      await logQuestion(userId, questionData.question, questionData.category);
      
      // Get answer from Claude API (via medgemma.ts)
      try {
        // UPDATED: Log successful authentication via session cookie
        console.log('[Health QA API] User authenticated successfully via session cookie:', userEmail);
        console.log('[Health QA API] Calling answerHealthQuestion...');
        const answer = await answerHealthQuestion(questionData);
        console.log('[Health QA API] Answer received:', {
          hasAnswer: !!answer.answer,
          answerLength: answer.answer?.length || 0,
          confidence: answer.confidence
        });
        
        return NextResponse.json<ApiResponse<HealthAnswer>>(
          {
            success: true,
            data: answer,
          },
          { status: 200 }
        );
      } catch (aiError: any) {
        console.error('[Health QA API] Claude API error:', {
          error: aiError.message,
          stack: aiError.stack
        });
        
        // Check if it's a configuration error
        if (aiError.message?.includes('configuration') || 
            aiError.message?.includes('credentials') ||
            aiError.message?.includes('CLAUDE_API_KEY')) {
          // UPDATED: More helpful error message for service unavailability
          return NextResponse.json<ApiResponse>(
            {
              success: false,
              error: 'Our health assistant is temporarily unavailable.',
              code: 'ai/not-configured',
              data: {
                message: 'Please try again in a few moments, or contact support if the issue persists.',
                supportEmail: 'support@myguide.health'
              }
            },
            { status: 503 }
          );
        }
        
        // UPDATED: More empathetic error message for processing failures
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: 'We couldn\'t process your health question at this time.',
            code: 'ai/processing-error',
            message: process.env.NODE_ENV === 'development' ? aiError.message : undefined,
            data: {
              suggestion: 'Please try rephrasing your question or ask something else.',
              alternativeAction: 'For urgent health concerns, please consult your healthcare provider directly.'
            }
          },
          { status: 500 }
        );
      }
      
    } catch (error) {
      console.error('[Health QA API] General error:', error);
      
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: ERROR_MESSAGES.GENERIC,
        },
        { status: 500 }
      );
    }
  }, rateLimiters.auth); // Using auth rate limiter (5 requests per 15 min)
}