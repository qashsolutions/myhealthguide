import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { z } from 'zod';
import admin from 'firebase-admin';
import { answerHealthQuestion } from '@/lib/vertex-ai/medgemma';
import { ApiResponse, HealthQuestion, HealthAnswer } from '@/types';
import { VALIDATION_MESSAGES, ERROR_MESSAGES } from '@/lib/constants';
import { withRateLimit, rateLimiters } from '@/lib/middleware/rate-limit';

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

// Verify auth token
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
      
      console.log('[Health QA API] Request received:', {
        userId: userId.substring(0, 8) + '***',
        questionLength: body.question?.length || 0
      });
      
      // Validate input
      const validationResult = healthQuestionSchema.safeParse(body);
      
      if (!validationResult.success) {
        const errors = validationResult.error.issues.map(issue => ({
          field: issue.path[0] as string,
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
      
      const questionData: HealthQuestion = validationResult.data;
      
      // Log the question (anonymized)
      await logQuestion(userId, questionData.question, questionData.category);
      
      // Get answer from Claude API (via medgemma.ts)
      try {
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
          return NextResponse.json<ApiResponse>(
            {
              success: false,
              error: 'Claude AI service is not configured. Please try again later.',
              code: 'ai/not-configured',
            },
            { status: 503 }
          );
        }
        
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: 'Failed to process your question. Please try again.',
            code: 'ai/processing-error',
            message: process.env.NODE_ENV === 'development' ? aiError.message : undefined,
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