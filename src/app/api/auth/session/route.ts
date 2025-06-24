import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, getUserData } from '@/lib/auth/firebase-auth';
import { ApiResponse } from '@/types';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/session
 * Get current user session from Firebase session cookie
 * 
 * Flow:
 * 1. Check for Firebase session cookie
 * 2. Verify session cookie with Firebase Admin
 * 3. Get user data from Firestore
 * 4. Return user session data
 */
export async function GET(request: NextRequest) {
  try {
    // Get current user from Firebase session cookie
    const decodedToken = await getCurrentUser();
    
    if (!decodedToken) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'No active session',
      }, { status: 401 });
    }
    
    console.log('[Session] Valid session found for user:', decodedToken.email);
    
    // Get user data from Firestore
    const userData = await getUserData(decodedToken.uid);
    
    if (!userData) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'User not found',
      }, { status: 404 });
    }
    
    // Return email exactly as stored
    const userEmail = decodedToken.email || userData.email;
    
    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        user: {
          id: decodedToken.uid,
          email: userEmail,
          name: userData.displayName || userData.name || '',
          emailVerified: decodedToken.email_verified !== false,
          disclaimerAccepted: userData.disclaimerAccepted || false,
          createdAt: userData.createdAt,
          updatedAt: userData.updatedAt,
        },
      },
    });
  } catch (error: any) {
    console.error('[Session] Error checking session:', error);
    
    // If session is expired or invalid, return 401
    if (error.code === 'auth/session-cookie-expired' || 
        error.code === 'auth/invalid-session-cookie') {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Session expired. Please sign in again.',
      }, { status: 401 });
    }
    
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Failed to check session',
    }, { status: 500 });
  }
}