import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import crypto from 'crypto';

/**
 * POST /api/test-signup
 * Test endpoint to debug signup process
 */
export async function POST(request: NextRequest) {
  const steps = {
    parseBody: { success: false, error: null as string | null, data: null as any },
    checkExistingUser: { success: false, error: null as string | null, exists: false },
    createUser: { success: false, error: null as string | null, userId: null as string | null },
    createToken: { success: false, error: null as string | null, token: null as string | null },
    storeToken: { success: false, error: null as string | null },
    createProfile: { success: false, error: null as string | null },
  };

  try {
    // Step 1: Parse body
    try {
      const body = await request.json();
      steps.parseBody.data = body;
      steps.parseBody.success = true;
    } catch (e: any) {
      steps.parseBody.error = e.message;
      throw e;
    }

    const { email = 'test@example.com', password = 'Test123!', name = 'Test User' } = steps.parseBody.data;

    // Step 2: Check existing user
    try {
      const existingUser = await adminAuth().getUserByEmail(email);
      steps.checkExistingUser.exists = true;
      steps.checkExistingUser.success = true;
      
      // If user exists, return early
      return NextResponse.json({
        success: false,
        message: 'User already exists',
        steps
      });
    } catch (e: any) {
      if (e.code === 'auth/user-not-found') {
        steps.checkExistingUser.success = true;
        steps.checkExistingUser.exists = false;
      } else {
        steps.checkExistingUser.error = `${e.code}: ${e.message}`;
        throw e;
      }
    }

    // Step 3: Create user
    try {
      const userRecord = await adminAuth().createUser({
        email,
        password,
        displayName: name,
        emailVerified: false,
      });
      steps.createUser.success = true;
      steps.createUser.userId = userRecord.uid;
    } catch (e: any) {
      steps.createUser.error = `${e.code}: ${e.message}`;
      throw e;
    }

    // Step 4: Generate token
    try {
      const verificationToken = crypto.randomBytes(32).toString('hex');
      steps.createToken.success = true;
      steps.createToken.token = verificationToken;

      // Step 5: Store token in Firestore
      try {
        const expires = new Date();
        expires.setHours(expires.getHours() + 24);
        
        await adminDb().collection('emailVerifications').doc(verificationToken).set({
          userId: steps.createUser.userId,
          email,
          expires: expires,
          used: false,
          createdAt: new Date(),
          type: 'signup',
        });
        steps.storeToken.success = true;
      } catch (e: any) {
        steps.storeToken.error = e.message;
        throw e;
      }

      // Step 6: Create user profile
      try {
        await adminDb().collection('users').doc(steps.createUser.userId!).set({
          email,
          name,
          emailVerified: false,
          disclaimerAccepted: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          status: 'active',
        });
        steps.createProfile.success = true;
      } catch (e: any) {
        steps.createProfile.error = e.message;
        throw e;
      }

    } catch (e: any) {
      // Token generation shouldn't fail, but just in case
      if (!steps.createToken.success) {
        steps.createToken.error = e.message;
      }
      throw e;
    }

    // Success!
    return NextResponse.json({
      success: true,
      message: 'All signup steps completed successfully',
      steps,
      userId: steps.createUser.userId
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      errorCode: error.code,
      steps
    }, { status: 500 });
  }
}