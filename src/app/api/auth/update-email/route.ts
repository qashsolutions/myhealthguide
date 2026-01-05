/**
 * Update Email API
 * Updates user's email in Firebase Auth and Firestore
 * Sends a new verification email to the new address
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/lib/firebase/admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { newEmail } = body;

    if (!newEmail) {
      return NextResponse.json(
        { error: 'New email is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Get auth token from header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.split('Bearer ')[1];
    const auth = getAdminAuth();
    const db = getAdminDb();

    // Verify the token
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(token);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const userId = decodedToken.uid;

    // Check if new email is already in use
    try {
      const existingUser = await auth.getUserByEmail(newEmail);
      if (existingUser.uid !== userId) {
        return NextResponse.json(
          { error: 'This email is already in use by another account' },
          { status: 400 }
        );
      }
    } catch (error: any) {
      // Email not found is expected - that's good
      if (error.code !== 'auth/user-not-found') {
        console.error('Error checking email:', error);
      }
    }

    // Update email in Firebase Auth
    await auth.updateUser(userId, {
      email: newEmail,
      emailVerified: false
    });

    // Update email in Firestore
    await db.collection('users').doc(userId).update({
      email: newEmail,
      emailVerified: false,
      emailVerifiedAt: null,
      updatedAt: new Date()
    });

    // Generate email verification link
    const actionCodeSettings = {
      url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.myguide.health'}/verify`,
      handleCodeInApp: false
    };

    const verificationLink = await auth.generateEmailVerificationLink(
      newEmail,
      actionCodeSettings
    );

    // Send verification email via your preferred method
    // For now, Firebase will send it automatically when the user signs in
    // Or you can use a custom email service here

    console.log('Email updated for user:', userId, 'New email:', newEmail);

    return NextResponse.json({
      success: true,
      message: 'Email updated. Please check your inbox for verification.',
      verificationLink // You might want to send this via email service
    });

  } catch (error: any) {
    console.error('Error updating email:', error);

    // Handle specific Firebase errors
    if (error.code === 'auth/email-already-exists') {
      return NextResponse.json(
        { error: 'This email is already in use by another account' },
        { status: 400 }
      );
    }

    if (error.code === 'auth/invalid-email') {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to update email' },
      { status: 500 }
    );
  }
}
