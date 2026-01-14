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

    // Check if user has agency membership or multi-agency subscription
    // Caregivers don't have subscriptionTier but are part of an agency through agencies array
    const hasAgencyMembership = userData.agencies && userData.agencies.length > 0;
    const hasMultiAgencyTier = userData.subscriptionTier === 'multi_agency';

    if (!hasAgencyMembership && !hasMultiAgencyTier) {
      return NextResponse.json({ success: false, error: 'Multi-agency plan required' }, { status: 403 });
    }

    // Check if user is caregiver or super_admin in an agency
    const isAgencyCaregiver = userData.agencies?.some((a: any) =>
      a.role === 'caregiver' || a.role === 'caregiver_admin'
    );
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

      console.log('[shift-handoff] Scheduled shift query:', {
        elderId,
        targetCaregiverId,
        serverNow: now.toISOString(),
      });

      let query = db.collection('scheduledShifts')
        .where('elderId', '==', elderId)
        .where('status', '==', 'scheduled');

      // Apply caregiver filter
      if (targetCaregiverId) {
        query = query.where('caregiverId', '==', targetCaregiverId);
      }

      const shiftsSnap = await query.get();
      console.log('[shift-handoff] Found', shiftsSnap.size, 'shifts in Firestore');

      // Map shifts and convert Timestamps, filter for today's shifts only
      // Use UTC dates for consistent comparison (server runs in UTC)
      const todayStartUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

      console.log('[shift-handoff] Today start UTC:', todayStartUTC.toISOString());

      const scheduledShifts = shiftsSnap.docs
        .map(doc => {
          const data = doc.data();

          // Convert Firestore Timestamp to Date for the date field
          let shiftDate: Date | null = null;
          if (data.date) {
            if (typeof data.date === 'object' && 'seconds' in data.date) {
              shiftDate = new Date(data.date.seconds * 1000);
            } else if (data.date instanceof Date) {
              shiftDate = data.date;
            } else if (data.date.toDate) {
              shiftDate = data.date.toDate();
            }
          }

          console.log('[shift-handoff] Shift', doc.id, 'date:', shiftDate?.toISOString());

          return {
            id: doc.id,
            ...data,
            date: shiftDate, // Return as Date, not Timestamp
            startTime: data.startTime as string || '',
            endTime: data.endTime as string || '',
            createdAt: data.createdAt?.toDate?.() || null,
            updatedAt: data.updatedAt?.toDate?.() || null,
          };
        })
        .filter(shift => {
          // Filter for today's shifts only (date-based, not time-based)
          // Use UTC to avoid timezone issues - compare just the date portion
          if (!shift.date) return true; // Include shifts without date (legacy)
          const shiftDayUTC = new Date(Date.UTC(shift.date.getUTCFullYear(), shift.date.getUTCMonth(), shift.date.getUTCDate()));
          const matches = shiftDayUTC.getTime() === todayStartUTC.getTime();
          console.log('[shift-handoff] Shift date UTC:', shiftDayUTC.toISOString(), 'matches today:', matches);
          return matches;
        });

      // For super_admins, return all scheduled shifts for today
      if (isSuperAdmin && !targetCaregiverId) {
        return NextResponse.json({ success: true, scheduledShifts });
      }

      // Find the shift that matches current time window
      // Clock-in window: 10 minutes early to 30 minutes after start time
      // Also check if we're during or just after the shift
      const CLOCK_IN_EARLY_MINUTES = 10;
      const CLOCK_IN_LATE_MINUTES = 30;

      const findBestShift = () => {
        if (scheduledShifts.length === 0) return null;
        if (scheduledShifts.length === 1) return scheduledShifts[0];

        const nowMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();

        // Helper to parse time string "HH:MM" to minutes since midnight
        const parseTimeToMinutes = (timeStr: string): number => {
          const [hours, minutes] = timeStr.split(':').map(Number);
          return hours * 60 + minutes;
        };

        // Score shifts based on how relevant they are to current time
        // Lower score = better match
        const scoredShifts = scheduledShifts.map(shift => {
          const startMinutes = parseTimeToMinutes(shift.startTime || '00:00');
          const endMinutes = parseTimeToMinutes(shift.endTime || '23:59');

          // Calculate clock-in window
          const clockInStart = startMinutes - CLOCK_IN_EARLY_MINUTES;
          const clockInEnd = startMinutes + CLOCK_IN_LATE_MINUTES;

          let score = Infinity;

          // Highest priority: currently in clock-in window
          if (nowMinutes >= clockInStart && nowMinutes <= clockInEnd) {
            score = 0;
          }
          // Second priority: currently during shift
          else if (nowMinutes >= startMinutes && nowMinutes <= endMinutes) {
            score = 1;
          }
          // Third priority: shift hasn't started yet (upcoming)
          else if (nowMinutes < startMinutes) {
            score = 100 + (startMinutes - nowMinutes); // Closer = lower score
          }
          // Fourth priority: shift already ended (past)
          else {
            score = 1000 + (nowMinutes - endMinutes); // More recent = lower score
          }

          return { shift, score, startMinutes };
        });

        // Sort by score (best match first), then by start time
        scoredShifts.sort((a, b) => {
          if (a.score !== b.score) return a.score - b.score;
          return a.startMinutes - b.startMinutes;
        });

        console.log('[shift-handoff] Shift scoring:', scoredShifts.map(s => ({
          id: s.shift.id,
          startTime: s.shift.startTime,
          score: s.score
        })));

        return scoredShifts[0]?.shift || null;
      };

      const scheduledShift = findBestShift();
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
