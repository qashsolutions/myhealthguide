'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { supabase } from '@/lib/supabase';
import { createBookingRequest, getCaregiverAvailability } from '@/lib/beehive/booking';
import Image from 'next/image';
import Link from 'next/link';

interface CaregiverProfile {
  user_id: string;
  first_name: string;
  last_name: string;
  photo_url?: string;
  hourly_rate: number;
  bio: string;
  languages: string[];
  skills: string[];
  certifications: string[];
  average_rating: number;
  total_reviews: number;
}

interface TimeSlot {
  date: string;
  start_time: string;
  end_time: string;
  available: boolean;
}

export default function BookingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const caregiverId = searchParams.get('caregiver');
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [caregiver, setCaregiver] = useState<CaregiverProfile | null>(null);
  const [availability, setAvailability] = useState<TimeSlot[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [duration, setDuration] = useState(2); // Default 2 hours
  const [bookingData, setBookingData] = useState({
    service_type: 'companionship',
    care_needs: [] as string[],
    location_type: 'in_home' as 'in_home' | 'facility' | 'virtual',
    special_instructions: '',
    recurring: false,
    recurring_frequency: 'weekly' as 'daily' | 'weekly' | 'biweekly' | 'monthly',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!caregiverId) {
      router.push('/beehive/patient/search');
      return;
    }
    loadCaregiverAndAvailability();
  }, [caregiverId]);

  const loadCaregiverAndAvailability = async () => {
    try {
      // Load caregiver profile
      const { data: profile } = await supabase
        .from('caregiver_profiles')
        .select('*')
        .eq('user_id', caregiverId)
        .single();

      if (!profile) {
        setError('Caregiver not found');
        return;
      }

      setCaregiver(profile);

      // Load availability for next 14 days
      const today = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 14);

      const slots = await getCaregiverAvailability(
        caregiverId,
        today.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );

      setAvailability(slots);

      // Pre-select first available date
      const firstAvailable = slots.find(s => s.available);
      if (firstAvailable) {
        setSelectedDate(firstAvailable.date);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading caregiver:', error);
      setError('Failed to load caregiver information');
      setLoading(false);
    }
  };

  const handleCareNeedToggle = (need: string) => {
    setBookingData(prev => ({
      ...prev,
      care_needs: prev.care_needs.includes(need)
        ? prev.care_needs.filter(n => n !== need)
        : [...prev.care_needs, need],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedSlot) {
      setError('Please select a time slot');
      return;
    }

    if (bookingData.care_needs.length === 0) {
      setError('Please select at least one care need');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const user = auth.currentUser;
      if (!user) {
        router.push('/beehive/login');
        return;
      }

      // Get user ID from database
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('firebase_uid', user.uid)
        .single();

      if (!userData) {
        setError('User not found');
        return;
      }

      // Calculate end time based on duration
      const startHour = parseInt(selectedSlot.start_time.split(':')[0]);
      const endHour = Math.min(startHour + duration, 24);
      const endTime = `${endHour.toString().padStart(2, '0')}:00`;

      const result = await createBookingRequest(
        {
          patient_id: userData.id,
          caregiver_id: caregiverId!,
          service_date: selectedSlot.date,
          start_time: selectedSlot.start_time,
          end_time: endTime,
          service_type: bookingData.service_type,
          care_needs: bookingData.care_needs,
          location_type: bookingData.location_type,
          special_instructions: bookingData.special_instructions,
          recurring: bookingData.recurring ? {
            frequency: bookingData.recurring_frequency,
          } : undefined,
        },
        userData.id
      );

      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/beehive/patient/bookings');
        }, 2000);
      } else {
        setError(result.error || 'Failed to create booking');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to create booking');
    } finally {
      setSubmitting(false);
    }
  };

  const availableSlotsForDate = availability.filter(s => s.date === selectedDate && s.available);
  const totalCost = caregiver ? duration * caregiver.hourly_rate : 0;

  const careNeedOptions = [
    'Companionship',
    'Meal Preparation',
    'Medication Reminders',
    'Light Housekeeping',
    'Transportation',
    'Personal Care',
    'Mobility Assistance',
    'Exercise Support',
  ];

  const serviceTypes = [
    { value: 'companionship', label: 'Companionship & Social Support' },
    { value: 'personal_care', label: 'Personal Care Assistance' },
    { value: 'household', label: 'Household Help' },
    { value: 'medical_support', label: 'Medical Support' },
    { value: 'respite', label: 'Respite Care' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-elder-base text-elder-text">Loading caregiver information...</p>
        </div>
      </div>
    );
  }

  if (!caregiver) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 text-red-800 p-4 rounded-elder">
            <p className="text-elder-base">{error || 'Caregiver not found'}</p>
            <Link href="/beehive/patient/search" className="text-red-600 underline mt-2 block">
              Return to search
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link href="/beehive/patient/search" className="text-primary-600 hover:underline mb-6 block">
          ← Back to search
        </Link>

        <h1 className="text-elder-2xl font-bold text-elder-text mb-6">Book Care Service</h1>

        {/* Caregiver Summary */}
        <div className="bg-white rounded-elder-lg shadow-elder p-6 mb-6">
          <div className="flex items-start gap-4">
            {caregiver.photo_url ? (
              <Image
                src={caregiver.photo_url}
                alt={caregiver.first_name}
                width={80}
                height={80}
                className="rounded-full object-cover"
              />
            ) : (
              <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-2xl text-gray-500">
                  {caregiver.first_name.charAt(0)}
                </span>
              </div>
            )}
            <div className="flex-1">
              <h2 className="text-elder-xl font-semibold text-elder-text">
                {caregiver.first_name} {caregiver.last_name}
              </h2>
              <p className="text-elder-base text-primary-600 font-semibold">
                ${caregiver.hourly_rate}/hour
              </p>
              {caregiver.average_rating > 0 && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <span
                        key={i}
                        className={`text-xl ${
                          i < Math.round(caregiver.average_rating)
                            ? 'text-yellow-500'
                            : 'text-gray-300'
                        }`}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                  <span className="text-elder-sm text-elder-text-secondary">
                    ({caregiver.total_reviews} reviews)
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Service Type */}
          <div className="bg-white rounded-elder-lg shadow-elder p-6">
            <h3 className="text-elder-lg font-semibold text-elder-text mb-4">Service Type</h3>
            <select
              value={bookingData.service_type}
              onChange={(e) => setBookingData(prev => ({ ...prev, service_type: e.target.value }))}
              className="w-full px-4 py-3 text-elder-base border border-elder-border rounded-elder focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {serviceTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date Selection */}
          <div className="bg-white rounded-elder-lg shadow-elder p-6">
            <h3 className="text-elder-lg font-semibold text-elder-text mb-4">Select Date</h3>
            <div className="grid grid-cols-7 gap-2">
              {Array.from(new Set(availability.map(s => s.date))).map(date => {
                const dateObj = new Date(date + 'T00:00:00');
                const hasSlots = availability.some(s => s.date === date && s.available);
                return (
                  <button
                    key={date}
                    type="button"
                    onClick={() => hasSlots && setSelectedDate(date)}
                    disabled={!hasSlots}
                    className={`p-2 text-center rounded-elder transition-colors ${
                      selectedDate === date
                        ? 'bg-primary-600 text-white'
                        : hasSlots
                        ? 'bg-gray-100 hover:bg-gray-200 text-elder-text'
                        : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <div className="text-xs">{dateObj.toLocaleDateString('en', { weekday: 'short' })}</div>
                    <div className="text-lg font-semibold">{dateObj.getDate()}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time Slot Selection */}
          {selectedDate && (
            <div className="bg-white rounded-elder-lg shadow-elder p-6">
              <h3 className="text-elder-lg font-semibold text-elder-text mb-4">Select Time</h3>
              <div className="grid grid-cols-4 gap-3">
                {availableSlotsForDate.map(slot => (
                  <button
                    key={`${slot.date}-${slot.start_time}`}
                    type="button"
                    onClick={() => setSelectedSlot(slot)}
                    className={`p-3 rounded-elder border-2 transition-colors ${
                      selectedSlot?.start_time === slot.start_time
                        ? 'border-primary-600 bg-primary-50 text-primary-700'
                        : 'border-elder-border hover:border-primary-400'
                    }`}
                  >
                    {slot.start_time}
                  </button>
                ))}
              </div>
              {availableSlotsForDate.length === 0 && (
                <p className="text-elder-text-secondary">No available slots for this date</p>
              )}
            </div>
          )}

          {/* Duration */}
          {selectedSlot && (
            <div className="bg-white rounded-elder-lg shadow-elder p-6">
              <h3 className="text-elder-lg font-semibold text-elder-text mb-4">Duration</h3>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="1"
                  max="8"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value))}
                  className="flex-1"
                />
                <span className="text-elder-lg font-semibold w-24 text-center">
                  {duration} hour{duration > 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-elder-base text-primary-600 font-semibold mt-2">
                Total Cost: ${totalCost}
              </p>
            </div>
          )}

          {/* Care Needs */}
          <div className="bg-white rounded-elder-lg shadow-elder p-6">
            <h3 className="text-elder-lg font-semibold text-elder-text mb-4">Care Needs</h3>
            <div className="grid grid-cols-2 gap-3">
              {careNeedOptions.map(need => (
                <label
                  key={need}
                  className="flex items-center gap-3 p-3 rounded-elder border-2 cursor-pointer hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={bookingData.care_needs.includes(need)}
                    onChange={() => handleCareNeedToggle(need)}
                    className="w-5 h-5 text-primary-600 rounded"
                  />
                  <span className="text-elder-base">{need}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Location Type */}
          <div className="bg-white rounded-elder-lg shadow-elder p-6">
            <h3 className="text-elder-lg font-semibold text-elder-text mb-4">Location</h3>
            <div className="flex gap-4">
              {[
                { value: 'in_home', label: 'In-Home Care' },
                { value: 'facility', label: 'Care Facility' },
                { value: 'virtual', label: 'Virtual Visit' },
              ].map(loc => (
                <label key={loc.value} className="flex-1">
                  <input
                    type="radio"
                    name="location_type"
                    value={loc.value}
                    checked={bookingData.location_type === loc.value}
                    onChange={(e) => setBookingData(prev => ({ 
                      ...prev, 
                      location_type: e.target.value as any 
                    }))}
                    className="sr-only"
                  />
                  <div className={`p-4 rounded-elder border-2 cursor-pointer text-center transition-colors ${
                    bookingData.location_type === loc.value
                      ? 'border-primary-600 bg-primary-50'
                      : 'border-elder-border hover:border-primary-400'
                  }`}>
                    {loc.label}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Special Instructions */}
          <div className="bg-white rounded-elder-lg shadow-elder p-6">
            <h3 className="text-elder-lg font-semibold text-elder-text mb-4">
              Special Instructions (Optional)
            </h3>
            <textarea
              value={bookingData.special_instructions}
              onChange={(e) => setBookingData(prev => ({ 
                ...prev, 
                special_instructions: e.target.value 
              }))}
              rows={4}
              className="w-full px-4 py-3 text-elder-base border border-elder-border rounded-elder focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Any specific needs, medications, or preferences the caregiver should know about..."
            />
          </div>

          {/* Recurring Booking */}
          <div className="bg-white rounded-elder-lg shadow-elder p-6">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={bookingData.recurring}
                onChange={(e) => setBookingData(prev => ({ 
                  ...prev, 
                  recurring: e.target.checked 
                }))}
                className="w-5 h-5 text-primary-600 rounded"
              />
              <span className="text-elder-base font-medium">Make this a recurring booking</span>
            </label>
            {bookingData.recurring && (
              <select
                value={bookingData.recurring_frequency}
                onChange={(e) => setBookingData(prev => ({ 
                  ...prev, 
                  recurring_frequency: e.target.value as any 
                }))}
                className="mt-4 w-full px-4 py-3 text-elder-base border border-elder-border rounded-elder focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Bi-weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            )}
          </div>

          {/* Privacy Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-elder p-4">
            <div className="flex">
              <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div className="text-elder-sm text-blue-800">
                <p className="font-medium mb-1">Privacy Protection</p>
                <p>
                  Your contact information will remain private until you confirm the booking.
                  The caregiver will only see your first name and general location initially.
                </p>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 text-red-800 p-4 rounded-elder">
              {error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="bg-green-50 text-green-800 p-4 rounded-elder">
              Booking request sent successfully! Redirecting to your bookings...
            </div>
          )}

          {/* Submit Button */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={submitting || !selectedSlot || bookingData.care_needs.length === 0}
              className="flex-1 px-6 py-3 bg-primary-600 text-white text-elder-base font-medium rounded-elder hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Sending Request...' : 'Send Booking Request'}
            </button>
            <Link
              href="/beehive/patient/search"
              className="px-6 py-3 bg-gray-200 text-elder-text text-elder-base font-medium rounded-elder hover:bg-gray-300 transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}