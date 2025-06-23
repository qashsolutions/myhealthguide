import { NextRequest, NextResponse } from 'next/server';
import { getSession, updateSession } from '@/lib/auth/session';
import { adminDb } from '@/lib/firebase/admin';
import { ApiResponse } from '@/types';

/**
 * POST /api/user/accept-disclaimer
 * Accept medical disclaimer
 * Requires authenticated session
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[API Disclaimer] Accept disclaimer request received');
    
    // Get current session
    const session = await getSession();
    
    if (!session || !session.userId) {
      console.log('[API Disclaimer] No valid session found');
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Authentication required',
      }, { status: 401 });
    }
    
    // Parse request body
    const body = await request.json();
    const { userId } = body;
    
    // Verify user is accepting for their own account
    if (userId !== session.userId) {
      console.error('[API Disclaimer] User attempted to accept for another account:', {
        sessionUser: session.userId,
        targetUser: userId,
      });
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Unauthorized',
      }, { status: 403 });
    }
    
    const now = new Date();
    
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
    
    // Update session to reflect disclaimer acceptance
    await updateSession({
      disclaimerAccepted: true,
    });
    
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