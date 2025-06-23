import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
// Using REST API instead of client SDK

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
    let email, password;
    try {
      const body = await request.json();
      email = body.email;
      password = body.password;
      steps.parseBody.data = { email: body.email, hasPassword: !!body.password };
      steps.parseBody.success = true;
    } catch (e: any) {
      steps.parseBody.error = e.message;
      throw e;
    }

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

    // Step 4: Check API key availability
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    steps.clientAuthState.initialized = !!apiKey;
    if (!apiKey) {
      steps.clientAuthState.error = 'Firebase API key not found';
    }

    // Step 5: Attempt sign in with REST API
    try {
      const verifyPasswordResponse = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            password,
            returnSecureToken: true,
          }),
        }
      );

      if (!verifyPasswordResponse.ok) {
        const errorData = await verifyPasswordResponse.json();
        steps.attemptSignIn.error = `${errorData.error?.code}: ${errorData.error?.message}`;
        
        return NextResponse.json({
          success: false,
          message: 'Login failed',
          error: errorData.error?.message,
          errorCode: errorData.error?.code,
          steps
        }, { status: 401 });
      }

      const authData = await verifyPasswordResponse.json();
      steps.attemptSignIn.success = true;
      
      return NextResponse.json({
        success: true,
        message: 'Login successful',
        steps,
        user: {
          uid: authData.localId,
          email: authData.email,
          idToken: authData.idToken
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