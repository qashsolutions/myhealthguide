/**
 * Shift Handoff API
 * Uses Admin SDK for shift sessions and handoff notes
 *
 * Access Control:
 * - Multi-agency plan required
 * - Caregivers: can only access their own shift data
 * - Super admins: can access all caregiver data
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { verifyAuthToken, getUserDataServer } from '@/lib/api/verifyAuth';

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.userId) {
      return NextResponse.json({ success: false, error: authResult.error || 'Unauthorized' }, { status: 401 });
    }

    // Get user data to check subscription and role
    const userData = await getUserDataServer(authResult.userId);
    if (!userData) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Check multi-agency plan
    if (userData.subscriptionTier !== 'multi_agency') {
      return NextResponse.json({ success: false, error: 'Multi-agency plan required' }, { status: 403 });
    }

    // Check if user is caregiver or super_admin in an agency
    const isAgencyCaregiver = userData.agencies?.some((a: any) => a.role === 'caregiver');
    const isSuperAdmin = userData.agencies?.some((a: any) => a.role === 'super_admin');

    if (!isAgencyCaregiver && !isSuperAdmin) {
      return NextResponse.json({ success: false, error: 'Agency caregiver or admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const elderId = searchParams.get('elderId');
    const type = searchParams.get('type'); // 'active', 'handoffs', 'scheduled'
    const caregiverIdFilter = searchParams.get('caregiverId'); // For super_admin to view specific caregiver

    if (!elderId) {
      return NextResponse.json({ success: false, error: 'elderId is required' }, { status: 400 });
    }

    const db = getAdminDb();

    // Determine which caregiver's data to fetch
    // Caregivers can only see their own data
    // Super admins can see all or filter by caregiverId
    let targetCaregiverId = authResult.userId;
    if (isSuperAdmin && caregiverIdFilter) {
      targetCaregiverId = caregiverIdFilter;
    } else if (isSuperAdmin) {
      // Super admin without filter - will fetch all caregivers
      targetCaregiverId = ''; // Empty means all
    }

    if (type === 'active') {
      // Get active shift for this caregiver and elder
      // Caregivers: only their own | Super admins: all or filtered
      let query = db.collection('shiftSessions')
        .where('elderId', '==', elderId)
        .where('status', '==', 'active');

      // Apply caregiver filter (caregivers always filter to self, super_admins optionally)
      if (targetCaregiverId) {
        query = query.where('caregiverId', '==', targetCaregiverId);
      }

      const shiftsSnap = await query.get();

      if (shiftsSnap.empty) {
        return NextResponse.json({ success: true, activeShift: null, activeShifts: [] });
      }

      // Sort by startTime desc
      const shifts = shiftsSnap.docs
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            startTime: data.startTime?.toDate(),
            endTime: data.endTime?.toDate(),
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate()
          };
        })
        .sort((a, b) => {
          const dateA = a.startTime?.getTime() || 0;
          const dateB = b.startTime?.getTime() || 0;
          return dateB - dateA; // desc
        });

      // For caregivers, return single shift. For super_admins, return all active shifts
      if (isSuperAdmin && !targetCaregiverId) {
        return NextResponse.json({ success: true, activeShifts: shifts });
      }

      const activeShift = shifts[0] || null;
      return NextResponse.json({ success: true, activeShift });
    }

    if (type === 'handoffs') {
      // Get recent handoff notes
      // Caregivers: only their own | Super admins: all or filtered
      let query = db.collection('shiftHandoffNotes')
        .where('elderId', '==', elderId);

      // Apply caregiver filter
      if (targetCaregiverId) {
        query = query.where('caregiverId', '==', targetCaregiverId);
      }

      const handoffsSnap = await query.get();

      const handoffs = handoffsSnap.docs
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            generatedAt: data.generatedAt?.toDate(),
            shiftPeriod: {
              start: data.shiftPeriod?.start?.toDate(),
              end: data.shiftPeriod?.end?.toDate()
            }
          };
        })
        .sort((a, b) => {
          const dateA = a.generatedAt?.getTime() || 0;
          const dateB = b.generatedAt?.getTime() || 0;
          return dateB - dateA; // desc
        })
        .slice(0, isSuperAdmin ? 20 : 5); // Super admins see more history

      return NextResponse.json({ success: true, handoffs });
    }

    if (type === 'scheduled') {
      // Find scheduled shift for clock-in
      // Caregivers: only their own | Super admins: all or filtered
      const now = new Date();
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

      let query = db.collection('scheduledShifts')
        .where('elderId', '==', elderId)
        .where('status', '==', 'scheduled');

      // Apply caregiver filter
      if (targetCaregiverId) {
        query = query.where('caregiverId', '==', targetCaregiverId);
      }

      const shiftsSnap = await query.get();

      // Filter by time window in memory
      const scheduledShifts = shiftsSnap.docs
        .map(doc => {
          const data = doc.data();
          // Parse time string to today's date
          const [hours, minutes] = (data.startTime || '09:00').split(':').map(Number);
          const shiftStartTime = new Date();
          shiftStartTime.setHours(hours, minutes, 0, 0);

          return {
            id: doc.id,
            ...data,
            parsedStartTime: shiftStartTime
          };
        })
        .filter(shift => {
          return shift.parsedStartTime >= twoHoursAgo && shift.parsedStartTime <= twoHoursFromNow;
        });

      // For super_admins, return all scheduled shifts in window
      if (isSuperAdmin && !targetCaregiverId) {
        return NextResponse.json({ success: true, scheduledShifts });
      }

      const scheduledShift = scheduledShifts.length > 0 ? scheduledShifts[0] : null;
      return NextResponse.json({ success: true, scheduledShift });
    }

    return NextResponse.json({ success: false, error: 'Invalid type parameter' }, { status: 400 });

  } catch (error) {
    console.error('Error in shift handoff API:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
