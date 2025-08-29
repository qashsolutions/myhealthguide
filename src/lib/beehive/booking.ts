/**
 * Booking and Scheduling System for Beehive Platform
 * Manages booking lifecycle with privacy controls
 */

import { supabase } from '@/lib/supabase';
import { filterPatientInfo } from './privacy-filter';

export type BookingStatus = 
  | 'pending'      // Initial request from patient
  | 'confirmed'    // Accepted by caregiver (limited info visible)
  | 'in_progress'  // Care session active (full info visible)
  | 'completed'    // Session finished
  | 'cancelled'    // Cancelled by either party
  | 'no_show';     // Caregiver didn't show up

export interface BookingRequest {
  patient_id: string;
  caregiver_id: string;
  service_date: string;
  start_time: string;
  end_time: string;
  service_type: string;
  care_needs: string[];
  location_type: 'in_home' | 'facility' | 'virtual';
  location_details?: string;
  special_instructions?: string;
  recurring?: {
    frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
    end_date?: string;
  };
}

export interface TimeSlot {
  date: string;
  start_time: string;
  end_time: string;
  available: boolean;
}

/**
 * Check caregiver availability for a specific date range
 */
export async function getCaregiverAvailability(
  caregiverId: string,
  startDate: string,
  endDate: string
): Promise<TimeSlot[]> {
  try {
    // Get caregiver's schedule preferences
    const { data: schedule } = await supabase
      .from('caregiver_availability')
      .select('*')
      .eq('caregiver_id', caregiverId)
      .gte('date', startDate)
      .lte('date', endDate);

    // Get existing bookings
    const { data: bookings } = await supabase
      .from('bookings')
      .select('service_date, start_time, end_time')
      .eq('caregiver_id', caregiverId)
      .in('status', ['confirmed', 'in_progress'])
      .gte('service_date', startDate)
      .lte('service_date', endDate);

    // Generate available time slots
    const slots: TimeSlot[] = [];
    const dates = generateDateRange(startDate, endDate);

    for (const date of dates) {
      const daySchedule = schedule?.find(s => s.date === date);
      if (daySchedule && daySchedule.is_available) {
        // Generate hourly slots
        const startHour = parseInt(daySchedule.start_time.split(':')[0]);
        const endHour = parseInt(daySchedule.end_time.split(':')[0]);
        
        for (let hour = startHour; hour < endHour; hour++) {
          const slotStart = `${hour.toString().padStart(2, '0')}:00`;
          const slotEnd = `${(hour + 1).toString().padStart(2, '0')}:00`;
          
          // Check if slot conflicts with existing bookings
          const hasConflict = bookings?.some(booking => 
            booking.service_date === date &&
            timeOverlaps(slotStart, slotEnd, booking.start_time, booking.end_time)
          );

          slots.push({
            date,
            start_time: slotStart,
            end_time: slotEnd,
            available: !hasConflict,
          });
        }
      }
    }

    return slots;
  } catch (error) {
    console.error('Error checking availability:', error);
    return [];
  }
}

/**
 * Create a new booking request
 * Patient information is filtered based on privacy rules
 */
export async function createBookingRequest(
  request: BookingRequest,
  patientUserId: string
): Promise<{ success: boolean; booking?: any; error?: string }> {
  try {
    // Verify patient has active subscription
    const { data: patient } = await supabase
      .from('patient_profiles')
      .select('subscription_status')
      .eq('user_id', patientUserId)
      .single();

    if (patient?.subscription_status !== 'active') {
      return {
        success: false,
        error: 'Active subscription required to book services',
      };
    }

    // Verify caregiver is fully verified
    const { data: caregiver } = await supabase
      .from('caregiver_profiles')
      .select('verification_status, hourly_rate, background_check_status')
      .eq('user_id', request.caregiver_id)
      .single();

    if (caregiver?.verification_status !== 'verified' || 
        caregiver?.background_check_status !== 'clear') {
      return {
        success: false,
        error: 'Caregiver not available for bookings',
      };
    }

    // Check availability
    const availability = await getCaregiverAvailability(
      request.caregiver_id,
      request.service_date,
      request.service_date
    );

    const requestedSlot = availability.find(slot =>
      slot.date === request.service_date &&
      slot.start_time === request.start_time &&
      slot.available
    );

    if (!requestedSlot) {
      return {
        success: false,
        error: 'Requested time slot not available',
      };
    }

    // Calculate duration and cost
    const startHour = parseInt(request.start_time.split(':')[0]);
    const endHour = parseInt(request.end_time.split(':')[0]);
    const duration = endHour - startHour;
    const totalCost = duration * caregiver.hourly_rate;

    // Create booking
    const { data: booking, error } = await supabase
      .from('bookings')
      .insert({
        patient_id: patientUserId,
        caregiver_id: request.caregiver_id,
        service_date: request.service_date,
        start_time: request.start_time,
        end_time: request.end_time,
        service_type: request.service_type,
        care_needs: request.care_needs,
        location_type: request.location_type,
        location_details: request.location_details,
        special_instructions: request.special_instructions,
        duration_hours: duration,
        hourly_rate: caregiver.hourly_rate,
        total_cost: totalCost,
        status: 'pending',
        payment_status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;

    // Create notification for caregiver
    await supabase.from('notifications').insert({
      user_id: request.caregiver_id,
      type: 'booking_request',
      channel: 'in_app',
      subject: 'New Booking Request',
      content: `You have a new booking request for ${request.service_date}`,
      metadata: {
        booking_id: booking.id,
        patient_id: patientUserId,
        service_date: request.service_date,
      },
    });

    // Handle recurring bookings
    if (request.recurring) {
      await createRecurringBookings(booking, request.recurring);
    }

    return {
      success: true,
      booking,
    };
  } catch (error: any) {
    console.error('Booking creation error:', error);
    return {
      success: false,
      error: error.message || 'Failed to create booking',
    };
  }
}

/**
 * Accept a booking request (caregiver action)
 * Limited patient info becomes visible after acceptance
 */
export async function acceptBooking(
  bookingId: string,
  caregiverId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verify booking belongs to this caregiver
    const { data: booking } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .eq('caregiver_id', caregiverId)
      .eq('status', 'pending')
      .single();

    if (!booking) {
      return {
        success: false,
        error: 'Booking not found or already processed',
      };
    }

    // Update booking status
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
      })
      .eq('id', bookingId);

    if (updateError) throw updateError;

    // Create notification for patient
    await supabase.from('notifications').insert({
      user_id: booking.patient_id,
      type: 'booking_confirmed',
      channel: 'in_app',
      subject: 'Booking Confirmed',
      content: `Your booking for ${booking.service_date} has been confirmed`,
      metadata: {
        booking_id: bookingId,
        caregiver_id: caregiverId,
      },
    });

    // Log privacy event - caregiver now has limited access to patient info
    await supabase.from('audit_logs').insert({
      user_id: caregiverId,
      action: 'booking_accepted',
      entity_type: 'booking',
      entity_id: bookingId,
      metadata: {
        patient_id: booking.patient_id,
        privacy_level: 'limited_access',
      },
    });

    return { success: true };
  } catch (error: any) {
    console.error('Booking acceptance error:', error);
    return {
      success: false,
      error: error.message || 'Failed to accept booking',
    };
  }
}

/**
 * Start a booking session (marks as in_progress)
 * Full patient info becomes visible when session starts
 */
export async function startBookingSession(
  bookingId: string,
  caregiverId: string,
  locationVerification?: {
    lat: number;
    lng: number;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: booking } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .eq('caregiver_id', caregiverId)
      .eq('status', 'confirmed')
      .single();

    if (!booking) {
      return {
        success: false,
        error: 'Confirmed booking not found',
      };
    }

    // Verify it's within 15 minutes of start time
    const now = new Date();
    const startTime = new Date(`${booking.service_date}T${booking.start_time}`);
    const timeDiff = Math.abs(now.getTime() - startTime.getTime()) / (1000 * 60);
    
    if (timeDiff > 15) {
      return {
        success: false,
        error: 'Can only start session within 15 minutes of scheduled time',
      };
    }

    // Update booking status
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'in_progress',
        started_at: new Date().toISOString(),
        check_in_location: locationVerification ? 
          `${locationVerification.lat},${locationVerification.lng}` : null,
      })
      .eq('id', bookingId);

    if (updateError) throw updateError;

    // Start safety check timer (every 30 minutes)
    await scheduleSafetyChecks(bookingId);

    // Log privacy event - caregiver now has full access to patient info
    await supabase.from('audit_logs').insert({
      user_id: caregiverId,
      action: 'session_started',
      entity_type: 'booking',
      entity_id: bookingId,
      metadata: {
        patient_id: booking.patient_id,
        privacy_level: 'full_access',
        location: locationVerification,
      },
    });

    return { success: true };
  } catch (error: any) {
    console.error('Session start error:', error);
    return {
      success: false,
      error: error.message || 'Failed to start session',
    };
  }
}

/**
 * Complete a booking session
 */
export async function completeBooking(
  bookingId: string,
  caregiverId: string,
  completionNotes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: booking } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .eq('caregiver_id', caregiverId)
      .eq('status', 'in_progress')
      .single();

    if (!booking) {
      return {
        success: false,
        error: 'Active booking not found',
      };
    }

    // Update booking status
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        completion_notes: completionNotes,
        payment_status: 'pending', // Trigger payment processing
      })
      .eq('id', bookingId);

    if (updateError) throw updateError;

    // Create review requests for both parties
    await createReviewRequests(bookingId, booking.patient_id, booking.caregiver_id);

    // Process payment
    await processBookingPayment(bookingId);

    return { success: true };
  } catch (error: any) {
    console.error('Booking completion error:', error);
    return {
      success: false,
      error: error.message || 'Failed to complete booking',
    };
  }
}

/**
 * Cancel a booking
 */
export async function cancelBooking(
  bookingId: string,
  userId: string,
  userRole: 'patient' | 'caregiver',
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get booking details
    const { data: booking } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (!booking) {
      return {
        success: false,
        error: 'Booking not found',
      };
    }

    // Verify user is part of this booking
    const isAuthorized = 
      (userRole === 'patient' && booking.patient_id === userId) ||
      (userRole === 'caregiver' && booking.caregiver_id === userId);

    if (!isAuthorized) {
      return {
        success: false,
        error: 'Not authorized to cancel this booking',
      };
    }

    // Check cancellation policy (24 hours notice)
    const now = new Date();
    const serviceTime = new Date(`${booking.service_date}T${booking.start_time}`);
    const hoursUntilService = (serviceTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    let cancellationFee = 0;
    if (hoursUntilService < 24 && hoursUntilService > 0) {
      cancellationFee = booking.total_cost * 0.5; // 50% fee for late cancellation
    }

    // Update booking status
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: userId,
        cancellation_reason: reason,
        cancellation_fee: cancellationFee,
      })
      .eq('id', bookingId);

    if (updateError) throw updateError;

    // Send notifications
    const otherPartyId = userRole === 'patient' ? booking.caregiver_id : booking.patient_id;
    await supabase.from('notifications').insert({
      user_id: otherPartyId,
      type: 'booking_cancelled',
      channel: 'in_app',
      subject: 'Booking Cancelled',
      content: `Booking for ${booking.service_date} has been cancelled. Reason: ${reason}`,
      metadata: {
        booking_id: bookingId,
        cancelled_by: userRole,
        cancellation_fee: cancellationFee,
      },
    });

    return { success: true };
  } catch (error: any) {
    console.error('Booking cancellation error:', error);
    return {
      success: false,
      error: error.message || 'Failed to cancel booking',
    };
  }
}

/**
 * Get booking details with privacy filtering
 */
export async function getBookingDetails(
  bookingId: string,
  userId: string,
  userRole: 'patient' | 'caregiver'
): Promise<any> {
  try {
    const { data: booking } = await supabase
      .from('bookings')
      .select(`
        *,
        patient:patient_profiles!bookings_patient_id_fkey(
          user_id,
          first_name,
          last_name,
          email,
          phone,
          address_line1,
          address_line2,
          city,
          state,
          zip,
          date_of_birth,
          emergency_contact_name,
          emergency_contact_phone,
          medical_conditions,
          photo_url
        ),
        caregiver:caregiver_profiles!bookings_caregiver_id_fkey(
          user_id,
          first_name,
          last_name,
          photo_url,
          bio,
          languages,
          skills,
          certifications,
          average_rating,
          total_reviews
        )
      `)
      .eq('id', bookingId)
      .single();

    if (!booking) return null;

    // Verify user is part of this booking
    const isAuthorized = 
      (userRole === 'patient' && booking.patient_id === userId) ||
      (userRole === 'caregiver' && booking.caregiver_id === userId);

    if (!isAuthorized) return null;

    // Apply privacy filtering for caregivers viewing patient info
    if (userRole === 'caregiver' && booking.patient) {
      booking.patient = filterPatientInfo(
        booking.patient,
        {
          id: booking.id,
          status: booking.status,
          caregiver_id: booking.caregiver_id,
          patient_id: booking.patient_id,
        },
        'caregiver'
      );
    }

    return booking;
  } catch (error) {
    console.error('Error fetching booking details:', error);
    return null;
  }
}

// Helper functions

function generateDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  for (let date = start; date <= end; date.setDate(date.getDate() + 1)) {
    dates.push(date.toISOString().split('T')[0]);
  }
  
  return dates;
}

function timeOverlaps(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  return start1 < end2 && end1 > start2;
}

async function createRecurringBookings(
  originalBooking: any,
  recurring: BookingRequest['recurring']
) {
  // Implementation for creating recurring bookings
  // This would create multiple booking entries based on frequency
  console.log('Creating recurring bookings:', recurring);
}

async function scheduleSafetyChecks(bookingId: string) {
  // Implementation for scheduling safety check-ins
  // This would use a job scheduler to send periodic check-ins
  console.log('Scheduling safety checks for booking:', bookingId);
}

async function createReviewRequests(
  bookingId: string,
  patientId: string,
  caregiverId: string
) {
  // Create review request notifications
  await supabase.from('notifications').insert([
    {
      user_id: patientId,
      type: 'review_request',
      channel: 'in_app',
      subject: 'Rate Your Caregiver',
      content: 'How was your experience? Please leave a review.',
      metadata: { booking_id: bookingId, review_for: caregiverId },
    },
    {
      user_id: caregiverId,
      type: 'review_request',
      channel: 'in_app',
      subject: 'Rate Your Patient',
      content: 'Please provide feedback about your session.',
      metadata: { booking_id: bookingId, review_for: patientId },
    },
  ]);
}

async function processBookingPayment(bookingId: string) {
  // Implementation for processing payment through Stripe
  // This would charge the patient and schedule payout to caregiver
  console.log('Processing payment for booking:', bookingId);
}