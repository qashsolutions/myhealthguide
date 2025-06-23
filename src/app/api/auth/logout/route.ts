import { NextRequest, NextResponse } from 'next/server';
import { clearSession } from '@/lib/auth/session';
import { ApiResponse } from '@/types';

/**
 * POST /api/auth/logout
 * Clear server-side session
 */
export async function POST(request: NextRequest) {
  try {
    // Clear the session cookie
    clearSession();
    
    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Failed to logout',
    }, { status: 500 });
  }
}