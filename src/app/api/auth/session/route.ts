import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { adminDb } from '@/lib/firebase/admin';
import { ApiResponse } from '@/types';

/**
 * GET /api/auth/session
 * Get current user session from server-side cookies
 */
export async function GET(request: NextRequest) {
  try {
    // Get session from cookies
    const session = await getSession();
    
    if (!session || !session.userId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'No active session',
      }, { status: 401 });
    }
    
    // Get user data from Firestore
    const userDoc = await adminDb().collection('users').doc(session.userId).get();
    
    if (!userDoc.exists) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'User not found',
      }, { status: 404 });
    }
    
    const userData = userDoc.data();
    
    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        user: {
          id: session.userId,
          email: session.email,
          name: userData?.name || session.name,
          emailVerified: session.emailVerified,
          phoneNumber: userData?.phoneNumber,
          disclaimerAccepted: userData?.disclaimerAccepted || false,
          createdAt: userData?.createdAt?.toDate(),
          updatedAt: userData?.updatedAt?.toDate(),
        },
      },
    });
  } catch (error) {
    console.error('Session check error:', error);
    
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Failed to check session',
    }, { status: 500 });
  }
}