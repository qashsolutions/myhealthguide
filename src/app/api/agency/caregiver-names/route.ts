import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';

export async function POST(request: NextRequest) {
  try {
    // Verify authorization
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await getAdminAuth().verifyIdToken(token);
    const requestingUserId = decodedToken.uid;

    // Get request body
    const { userIds, agencyId } = await request.json();

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'userIds array required' }, { status: 400 });
    }

    if (!agencyId) {
      return NextResponse.json({ error: 'agencyId required' }, { status: 400 });
    }

    // Verify requesting user is part of the agency
    const db = getAdminDb();
    const agencyDoc = await db.collection('agencies').doc(agencyId).get();

    if (!agencyDoc.exists) {
      return NextResponse.json({ error: 'Agency not found' }, { status: 404 });
    }

    const agencyData = agencyDoc.data();
    const isAgencyMember =
      agencyData?.superAdminId === requestingUserId ||
      agencyData?.caregiverIds?.includes(requestingUserId);

    if (!isAgencyMember) {
      return NextResponse.json({ error: 'Not authorized for this agency' }, { status: 403 });
    }

    // Fetch user names (limit to 50 at a time for safety)
    const limitedIds = userIds.slice(0, 50);
    const names: Record<string, string> = {};

    // Fetch users in batches
    const batchSize = 10;
    for (let i = 0; i < limitedIds.length; i += batchSize) {
      const batch = limitedIds.slice(i, i + batchSize);
      const promises = batch.map(async (userId: string) => {
        try {
          const userDoc = await db.collection('users').doc(userId).get();
          if (userDoc.exists) {
            const data = userDoc.data();
            const name = data?.firstName && data?.lastName
              ? `${data.firstName} ${data.lastName}`
              : data?.firstName || data?.lastName || data?.email || `User ${userId.substring(0, 6)}`;
            return { userId, name };
          }
          return { userId, name: `User ${userId.substring(0, 6)}` };
        } catch (err) {
          return { userId, name: `User ${userId.substring(0, 6)}` };
        }
      });

      const results = await Promise.all(promises);
      results.forEach(({ userId, name }) => {
        names[userId] = name;
      });
    }

    return NextResponse.json({ success: true, names });
  } catch (error: any) {
    console.error('Error fetching caregiver names:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch names' },
      { status: 500 }
    );
  }
}
