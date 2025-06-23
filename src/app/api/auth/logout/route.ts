import { NextRequest, NextResponse } from 'next/server';
import { 
  getCurrentUser, 
  clearSessionCookie, 
  revokeUserTokens 
} from '@/lib/auth/firebase-auth';
import { ApiResponse } from '@/types';

/**
 * POST /api/auth/logout
 * Clear Firebase session and revoke tokens
 * 
 * Flow:
 * 1. Get current user session
 * 2. Clear session cookie
 * 3. Revoke refresh tokens (optional but recommended)
 * 4. Return success
 */
export async function POST(request: NextRequest) {
  try {
    // Get current user to revoke their tokens
    const user = await getCurrentUser();
    
    if (user) {
      // Revoke all refresh tokens for this user
      // This ensures they can't use existing tokens
      await revokeUserTokens(user.uid);
      console.log(`[Logout] Revoked tokens for user ${user.email}`);
    }
    
    // Clear the session cookie
    await clearSessionCookie();
    
    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error: any) {
    console.error('[Logout] Error:', error);
    
    // Even if token revocation fails, clear the cookie
    try {
      await clearSessionCookie();
    } catch (cookieError) {
      console.error('[Logout] Failed to clear cookie:', cookieError);
    }
    
    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Logged out successfully',
    });
  }
}