import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { auth } from '@/lib/firebase/config';
import { signInWithEmailAndPassword } from 'firebase/auth';

/**
 * POST /api/test-login
 * Diagnostic endpoint to test login process
 */
export async function POST(request: NextRequest) {
  const steps = {
    parseBody: { success: false, error: null as string | null, data: null as any },
    getUserByEmail: { success: false, error: null as string | null, user: null as any },
    checkVerification: { success: false, verified: false },
    attemptSignIn: { success: false, error: null as string | null },
    clientAuthState: { initialized: false, error: null as string | null }
  };

  try {
    // Step 1: Parse body
    try {
      const body = await request.json();
      steps.parseBody.data = { email: body.email, hasPassword: !!body.password };
      steps.parseBody.success = true;
    } catch (e: any) {
      steps.parseBody.error = e.message;
      throw e;
    }

    const { email, password } = await request.json();

    // Step 2: Get user by email from Admin SDK
    try {
      const userRecord = await adminAuth().getUserByEmail(email);
      steps.getUserByEmail.success = true;
      steps.getUserByEmail.user = {
        uid: userRecord.uid,
        email: userRecord.email,
        emailVerified: userRecord.emailVerified,
        disabled: userRecord.disabled,
        metadata: {
          creationTime: userRecord.metadata.creationTime,
          lastSignInTime: userRecord.metadata.lastSignInTime
        }
      };
      
      // Step 3: Check verification
      steps.checkVerification.verified = userRecord.emailVerified;
      steps.checkVerification.success = true;
      
    } catch (e: any) {
      steps.getUserByEmail.error = `${e.code}: ${e.message}`;
      return NextResponse.json({ 
        success: false, 
        message: 'User not found',
        error: e.message,
        steps 
      }, { status: 404 });
    }

    // Step 4: Check client auth state
    try {
      steps.clientAuthState.initialized = !!auth;
      if (!auth) {
        steps.clientAuthState.error = 'Firebase client auth not initialized';
      }
    } catch (e: any) {
      steps.clientAuthState.error = e.message;
    }

    // Step 5: Attempt sign in with client SDK
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      steps.attemptSignIn.success = true;
      
      return NextResponse.json({
        success: true,
        message: 'Login successful',
        steps,
        user: {
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          emailVerified: userCredential.user.emailVerified
        }
      });
      
    } catch (e: any) {
      steps.attemptSignIn.error = `${e.code}: ${e.message}`;
      
      return NextResponse.json({
        success: false,
        message: 'Login failed',
        error: e.message,
        errorCode: e.code,
        steps
      }, { status: 401 });
    }

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      steps
    }, { status: 500 });
  }
}