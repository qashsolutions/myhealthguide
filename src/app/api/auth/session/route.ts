import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { adminDb } from '@/lib/firebase/admin';
import { ApiResponse } from '@/types';

// Force dynamic rendering for this route
// This prevents Next.js from trying to statically generate this endpoint
export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/session
 * Get current user session from server-side cookies
 * This endpoint is called by the client to check authentication status
 */
export async function GET(request: NextRequest) {
  try {
    // Log the incoming request details for debugging
    console.log('[API Session] Session check request:', {
      url: request.url,
      headers: {
        cookie: request.headers.get('cookie') ? 'present' : 'missing',
        origin: request.headers.get('origin'),
        referer: request.headers.get('referer'),
      },
    });
    
    // Get session from cookies
    // This reads the httpOnly session cookie that was set during login
    const session = await getSession();
    
    // Check if we have a valid session
    if (!session || !session.userId) {
      console.log('[API Session] No valid session found');
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'No active session',
      }, { status: 401 });
    }
    
    console.log('[API Session] Valid session found for user:', session.email);
    
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