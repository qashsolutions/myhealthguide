import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/firebase-auth';
import { adminDb } from '@/lib/firebase/admin';
import { ApiResponse } from '@/types';

// Force dynamic rendering - this route uses session cookies
export const dynamic = 'force-dynamic';

/**
 * PATCH /api/user/profile
 * Update user profile information
 * Requires authenticated session
 */
export async function PATCH(request: NextRequest) {
  try {
    console.log('[API Profile] Profile update request received');
    
    // Get current user from Firebase session
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      console.log('[API Profile] No valid session found');
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Authentication required',
      }, { status: 401 });
    }
    
    // Parse request body
    const body = await request.json();
    const { updates } = body;
    
    // Use the authenticated user's ID from session
    const userId = currentUser.uid;
    
    // Validate updates
    const allowedFields = ['name', 'phoneNumber', 'preferences'];
    const filteredUpdates: any = {};
    
    for (const key in updates) {
      if (allowedFields.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    }
    
    if (Object.keys(filteredUpdates).length === 0) {
      console.log('[API Profile] No valid fields to update');
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'No valid fields to update',
      }, { status: 400 });
    }
    
    // Add timestamp
    filteredUpdates.updatedAt = new Date();
    
    console.log('[API Profile] Updating profile:', {
      userId,
      fields: Object.keys(filteredUpdates),
    });
    
    // Update Firestore
    await adminDb()
      .collection('users')
      .doc(userId)
      .update(filteredUpdates);
    
    console.log('[API Profile] Profile updated successfully');
    
    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    console.error('[API Profile] Error:', error);
    
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Failed to update profile',
    }, { status: 500 });
  }
}