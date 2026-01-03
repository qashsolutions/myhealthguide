import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * Check for scheduling conflicts
 * - Checks caregiver availability (weekly schedule + date overrides)
 * - Checks for double-booking (existing shifts at same time)
 */
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
    const { caregiverId, agencyId, date, startTime, endTime, excludeShiftId } = await request.json();

    if (!caregiverId || !agencyId || !date || !startTime || !endTime) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const db = getAdminDb();

    // Verify requesting user is part of the agency
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

    const shiftDate = new Date(date);
    const dayOfWeek = shiftDate.getDay();

    // Helper to parse time to minutes
    const parseTime = (timeStr: string): number => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };

    // 1. Check caregiver availability
    const availabilitySnapshot = await db.collection('caregiverAvailability')
      .where('caregiverId', '==', caregiverId)
      .where('agencyId', '==', agencyId)
      .limit(1)
      .get();

    if (!availabilitySnapshot.empty) {
      const availability = availabilitySnapshot.docs[0].data();

      // Check date overrides first
      const dateOverrides = availability.dateOverrides || [];
      const dateOverride = dateOverrides.find((override: any) => {
        const overrideDate = override.date?.toDate?.() || new Date(override.date);
        return overrideDate.toDateString() === shiftDate.toDateString();
      });

      if (dateOverride) {
        if (!dateOverride.available) {
          return NextResponse.json({
            success: true,
            conflict: {
              type: 'caregiver_unavailable',
              message: `Caregiver is unavailable on this date${dateOverride.reason ? `: ${dateOverride.reason}` : ''}`
            }
          });
        }

        // Check time slots if specified
        if (dateOverride.timeSlots && dateOverride.timeSlots.length > 0) {
          const shiftStartMin = parseTime(startTime);
          const shiftEndMin = parseTime(endTime);
          const isInTimeSlot = dateOverride.timeSlots.some((slot: any) => {
            const slotStart = parseTime(slot.startTime);
            const slotEnd = parseTime(slot.endTime);
            return shiftStartMin >= slotStart && shiftEndMin <= slotEnd;
          });

          if (!isInTimeSlot) {
            return NextResponse.json({
              success: true,
              conflict: {
                type: 'caregiver_unavailable',
                message: "Shift time is outside caregiver's available time slots for this date"
              }
            });
          }
        }
      } else {
        // Check weekly availability
        const weeklyAvailability = availability.weeklyAvailability || [];
        const dayAvail = weeklyAvailability.find((a: any) => a.dayOfWeek === dayOfWeek);

        if (!dayAvail || !dayAvail.available) {
          return NextResponse.json({
            success: true,
            conflict: {
              type: 'caregiver_unavailable',
              message: 'Caregiver is not available on this day of the week'
            }
          });
        }

        // Check time slots
        if (dayAvail.timeSlots && dayAvail.timeSlots.length > 0) {
          const shiftStartMin = parseTime(startTime);
          const shiftEndMin = parseTime(endTime);
          const isInTimeSlot = dayAvail.timeSlots.some((slot: any) => {
            const slotStart = parseTime(slot.startTime);
            const slotEnd = parseTime(slot.endTime);
            return shiftStartMin >= slotStart && shiftEndMin <= slotEnd;
          });

          if (!isInTimeSlot) {
            return NextResponse.json({
              success: true,
              conflict: {
                type: 'caregiver_unavailable',
                message: "Shift time is outside caregiver's available time slots"
              }
            });
          }
        }
      }
    }

    // 2. Check for double-booking (existing shifts at same time)
    // Normalize date to start of day for query
    const startOfDay = new Date(shiftDate);
    startOfDay.setHours(0, 0, 0, 0);

    const shiftsSnapshot = await db.collection('scheduledShifts')
      .where('caregiverId', '==', caregiverId)
      .where('date', '==', Timestamp.fromDate(startOfDay))
      .get();

    const existingShifts = shiftsSnapshot.docs
      .filter(doc => {
        const data = doc.data();
        // Exclude the shift being edited
        if (excludeShiftId && doc.id === excludeShiftId) return false;
        // Only check active shifts
        return ['scheduled', 'confirmed', 'in_progress'].includes(data.status);
      })
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          startTime: data.startTime as string,
          endTime: data.endTime as string,
          elderName: data.elderName as string,
          status: data.status as string
        };
      });

    // Check for time overlap
    const newStart = parseTime(startTime);
    const newEnd = parseTime(endTime);

    for (const shift of existingShifts) {
      const existingStart = parseTime(shift.startTime);
      const existingEnd = parseTime(shift.endTime);

      // Check if times overlap
      if (newStart < existingEnd && existingStart < newEnd) {
        return NextResponse.json({
          success: true,
          conflict: {
            type: 'caregiver_double_booked',
            message: `Caregiver is already scheduled from ${shift.startTime} to ${shift.endTime} with ${shift.elderName}`,
            conflictingShift: {
              id: shift.id,
              startTime: shift.startTime,
              endTime: shift.endTime,
              elderName: shift.elderName
            }
          }
        });
      }
    }

    // No conflicts found
    return NextResponse.json({ success: true, conflict: null });
  } catch (error: any) {
    console.error('Error checking schedule conflicts:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check conflicts' },
      { status: 500 }
    );
  }
}
