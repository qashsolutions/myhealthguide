/**
 * Documents API
 * Uses Admin SDK for document metadata queries
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { verifyAuthToken } from '@/lib/api/verifyAuth';

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.userId) {
      return NextResponse.json({ success: false, error: authResult.error || 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const elderId = searchParams.get('elderId');

    const db = getAdminDb();

    // Check if user is over their storage quota (blocks access after downgrade)
    const userDoc = await db.collection('users').doc(authResult.userId).get();
    const userData = userDoc.data();
    const storageUsed = userData?.storageUsed || 0;
    const storageLimit = userData?.storageLimit || 0;
    const isOverQuota = storageLimit > 0 && storageUsed > storageLimit;

    // Get all files for this user - query without orderBy, sort in memory
    const filesSnap = await db.collection('storageMetadata')
      .where('userId', '==', authResult.userId)
      .get();

    let documents = filesSnap.docs
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          uploadedAt: data.uploadedAt?.toDate()
        };
      })
      .sort((a, b) => {
        const dateA = a.uploadedAt?.getTime() || 0;
        const dateB = b.uploadedAt?.getTime() || 0;
        return dateB - dateA; // desc
      }) as any[];

    // Filter by elder if specified
    if (elderId) {
      documents = documents.filter(doc => doc.filePath?.includes(elderId));
    }

    return NextResponse.json({
      success: true,
      documents,
      storageInfo: {
        used: storageUsed,
        limit: storageLimit,
        isOverQuota
      }
    });

  } catch (error) {
    console.error('Error in documents API:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
