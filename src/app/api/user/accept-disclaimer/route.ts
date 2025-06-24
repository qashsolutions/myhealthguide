import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/firebase-auth';
import { adminDb } from '@/lib/firebase/admin';
import { ApiResponse } from '@/types';

// Force dynamic rendering - this route uses session cookies
export const dynamic = 'force-dynamic';

/**
 * POST /api/user/accept-disclaimer
 * Accept medical disclaimer
 * Requires authenticated session
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[API Disclaimer] Accept disclaimer request received');
    
    // Get current user from Firebase session
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      console.log('[API Disclaimer] No valid session found');
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Authentication required',
      }, { status: 401 });
    }
    
    // We no longer need to verify userId from body - trust the session
    // The session is the source of truth for the authenticated user
    
    const now = new Date();
    const userId = currentUser.uid;
    
    console.log('[API Disclaimer] Accepting disclaimer for user:', userId);
    
    // Update Firestore
    await adminDb()
      .collection('users')
      .doc(userId)
      .update({
        disclaimerAccepted: true,
        disclaimerAcceptedAt: now,
        updatedAt: now,
      });
    
    // Note: Session will be updated on next request since Firebase 
    // session cookies are managed by Firebase Admin SDK
    
    console.log('[API Disclaimer] Disclaimer accepted successfully');
    
    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Medical disclaimer accepted',
    });
  } catch (error) {
    console.error('[API Disclaimer] Error:', error);
    
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Failed to accept disclaimer',
    }, { status: 500 });
  }
}