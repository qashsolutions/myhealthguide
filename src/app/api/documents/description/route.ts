/**
 * Document Description API
 * Updates the description field for a document in storage_metadata
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { verifyAuthToken } from '@/lib/api/verifyAuth';

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.userId) {
      return NextResponse.json({ success: false, error: authResult.error || 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { documentId, description } = body;

    if (!documentId) {
      return NextResponse.json({ success: false, error: 'Document ID is required' }, { status: 400 });
    }

    const db = getAdminDb();

    // Verify the document belongs to this user
    const docRef = db.collection('storage_metadata').doc(documentId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }

    const docData = docSnap.data();
    if (docData?.userId !== authResult.userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    // Update the description
    await docRef.update({
      description: description || '',
      updatedAt: new Date()
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error updating document description:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
