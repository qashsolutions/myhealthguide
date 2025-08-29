'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { supabase } from '@/lib/supabase';
import { cancelBooking } from '@/lib/beehive/booking';
import Link from 'next/link';
import Image from 'next/image';

interface Booking {
  id: string;
  caregiver_id: string;
  service_date: string;
  start_time: string;
  end_time: string;
  service_type: string;
  care_needs: string[];
  location_type: string;
  special_instructions?: string;
  status: string;
  duration_hours: number;
  hourly_rate: number;
  total_cost: number;
  payment_status: string;
  caregiver?: {
    first_name: string;
    last_name: string;
    photo_url?: string;
    bio: string;
    languages: string[];
    skills: string[];
    average_rating: number;
    total_reviews: number;
  };
}

export default function PatientBookingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        router.push('/beehive/login');
        return;
      }

      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('firebase_uid', user.uid)
        .single();

      if (!userData) return;

      // Fetch all bookings for this patient
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select(`
          *,
          caregiver:caregiver_profiles!bookings_caregiver_id_fkey(
            user_id,
            first_name,
            last_name,
            photo_url,
            bio,
            languages,
            skills,
            average_rating,
            total_reviews
          )
        `)
        .eq('patient_id', userData.id)
        .order('service_date', { ascending: false });

      if (bookingsData) {
        setBookings(bookingsData);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading bookings:', error);
      setError('Failed to load bookings');
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    const reason = prompt('Please provide a cancellation reason:');
    if (!reason) return;

    setProcessing(true);
    setError('');

    try {
      const user = auth.currentUser;
      if (!user) return;

      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('firebase_uid', user.uid)
        .single();

      if (!userData) return;

      const result = await cancelBooking(bookingId, userData.id, 'patient', reason);
      if (result.success) {
        await loadBookings();
        setShowDetails(false);
      } else {
        setError(result.error || 'Failed to cancel booking');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to cancel booking');
    } finally {
      setProcessing(false);
    }
  };

  const handleMessageCaregiver = (caregiverId: string) => {
    router.push(`/beehive/patient/messages?caregiver=${caregiverId}`);
  };

  // Filter bookings by status
  const upcomingBookings = bookings.filter(booking => 
    ['pending', 'confirmed', 'in_progress'].includes(booking.status)
  );
  const pastBookings = bookings.filter(booking => 
    ['completed', 'cancelled', 'no_show'].includes(booking.status)
  );

  const displayBookings = activeTab === 'upcoming' ? upcomingBookings : pastBookings;

  const formatDate = (date: string) => {
    return new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (time: string) => {
    const [hour, minute] = time.split(':');
    const hourNum = parseInt(hour);
    const ampm = hourNum >= 12 ? 'PM' : 'AM';
    const hour12 = hourNum % 12 || 12;
    return `${hour12}:${minute} ${ampm}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
      case 'no_show':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-elder-2xl font-bold text-elder-text">My Bookings</h1>
          <Link
            href="/beehive/patient/search"
            className="px-4 py-2 bg-primary-600 text-white text-elder-base font-medium rounded-elder hover:bg-primary-700 transition-colors"
          >
            Book New Service
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-white rounded-elder-lg p-1 shadow-elder">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`flex-1 px-4 py-3 text-elder-base font-medium rounded-elder transition-colors ${
              activeTab === 'upcoming'
                ? 'bg-primary-600 text-white'
                : 'text-elder-text hover:bg-gray-100'
            }`}
          >
            Upcoming ({upcomingBookings.length})
          </button>
          <button
            onClick={() => setActiveTab('past')}
            className={`flex-1 px-4 py-3 text-elder-base font-medium rounded-elder transition-colors ${
              activeTab === 'past'
                ? 'bg-primary-600 text-white'
                : 'text-elder-text hover:bg-gray-100'
            }`}
          >
            Past ({pastBookings.length})
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 text-red-800 p-4 rounded-elder mb-4">
            {error}
          </div>
        )}

        {/* Bookings List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-elder-base text-elder-text-secondary">Loading bookings...</p>
          </div>
        ) : displayBookings.length === 0 ? (
          <div className="bg-white rounded-elder-lg shadow-elder p-12 text-center">
            <p className="text-elder-lg text-elder-text-secondary mb-4">
              No {activeTab} bookings
            </p>
            {activeTab === 'upcoming' && (
              <Link
                href="/beehive/patient/search"
                className="inline-flex items-center px-6 py-3 bg-primary-600 text-white text-elder-base font-medium rounded-elder hover:bg-primary-700 transition-colors"
              >
                Find a Caregiver
                <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {displayBookings.map(booking => (
              <div key={booking.id} className="bg-white rounded-elder-lg shadow-elder overflow-hidden">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-start gap-4">
                      {booking.caregiver?.photo_url ? (
                        <Image
                          src={booking.caregiver.photo_url}
                          alt={booking.caregiver.first_name}
                          width={64}
                          height={64}
                          className="rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-xl text-gray-500">
                            {booking.caregiver?.first_name.charAt(0)}
                          </span>
                        </div>
                      )}
                      <div>
                        <h3 className="text-elder-lg font-semibold text-elder-text">
                          {booking.caregiver?.first_name} {booking.caregiver?.last_name}
                        </h3>
                        {booking.caregiver?.average_rating && booking.caregiver.average_rating > 0 && (
                          <div className="flex items-center gap-1 mt-1">
                            <div className="flex">
                              {[...Array(5)].map((_, i) => (
                                <span
                                  key={i}
                                  className={`text-sm ${
                                    i < Math.round(booking.caregiver.average_rating)
                                      ? 'text-yellow-500'
                                      : 'text-gray-300'
                                  }`}
                                >
                                  ★
                                </span>
                              ))}
                            </div>
                            <span className="text-elder-sm text-elder-text-secondary">
                              ({booking.caregiver.total_reviews})
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(booking.status)}`}>
                      {booking.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4 text-elder-base">
                    <div>
                      <span className="text-elder-text-secondary">Date:</span>
                      <p className="font-medium text-elder-text">{formatDate(booking.service_date)}</p>
                    </div>
                    <div>
                      <span className="text-elder-text-secondary">Time:</span>
                      <p className="font-medium text-elder-text">
                        {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                      </p>
                    </div>
                    <div>
                      <span className="text-elder-text-secondary">Service Type:</span>
                      <p className="font-medium text-elder-text capitalize">
                        {booking.service_type.replace('_', ' ')}
                      </p>
                    </div>
                    <div>
                      <span className="text-elder-text-secondary">Total Cost:</span>
                      <p className="font-medium text-primary-600">${booking.total_cost}</p>
                    </div>
                  </div>

                  {booking.care_needs.length > 0 && (
                    <div className="mb-4">
                      <span className="text-elder-text-secondary text-elder-base">Care Needs:</span>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {booking.care_needs.map(need => (
                          <span key={need} className="px-3 py-1 bg-gray-100 text-elder-text rounded-full text-sm">
                            {need}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4 border-t border-gray-200">
                    {['pending', 'confirmed'].includes(booking.status) && (
                      <>
                        <button
                          onClick={() => handleMessageCaregiver(booking.caregiver_id)}
                          className="flex-1 px-4 py-2 bg-primary-600 text-white text-elder-base font-medium rounded-elder hover:bg-primary-700 transition-colors"
                        >
                          Message Caregiver
                        </button>
                        <button
                          onClick={() => handleCancelBooking(booking.id)}
                          disabled={processing}
                          className="flex-1 px-4 py-2 bg-gray-600 text-white text-elder-base font-medium rounded-elder hover:bg-gray-700 disabled:bg-gray-400 transition-colors"
                        >
                          Cancel Booking
                        </button>
                      </>
                    )}
                    {booking.status === 'in_progress' && (
                      <button
                        onClick={() => handleMessageCaregiver(booking.caregiver_id)}
                        className="flex-1 px-4 py-2 bg-primary-600 text-white text-elder-base font-medium rounded-elder hover:bg-primary-700 transition-colors"
                      >
                        Contact Caregiver
                      </button>
                    )}
                    {booking.status === 'completed' && (
                      <>
                        <button
                          onClick={() => router.push(`/beehive/patient/review?booking=${booking.id}`)}
                          className="flex-1 px-4 py-2 bg-primary-600 text-white text-elder-base font-medium rounded-elder hover:bg-primary-700 transition-colors"
                        >
                          Leave Review
                        </button>
                        <button
                          onClick={() => router.push(`/beehive/patient/booking?caregiver=${booking.caregiver_id}`)}
                          className="flex-1 px-4 py-2 bg-gray-600 text-white text-elder-base font-medium rounded-elder hover:bg-gray-700 transition-colors"
                        >
                          Book Again
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => {
                        setSelectedBooking(booking);
                        setShowDetails(true);
                      }}
                      className="px-4 py-2 bg-gray-200 text-elder-text text-elder-base font-medium rounded-elder hover:bg-gray-300 transition-colors"
                    >
                      Details
                    </button>
                  </div>
                </div>

                {/* Payment Status for completed bookings */}
                {booking.status === 'completed' && (
                  <div className={`px-6 py-3 ${
                    booking.payment_status === 'paid' ? 'bg-green-50' : 'bg-yellow-50'
                  }`}>
                    <p className={`text-sm font-medium ${
                      booking.payment_status === 'paid' ? 'text-green-800' : 'text-yellow-800'
                    }`}>
                      Payment Status: {booking.payment_status === 'paid' ? 'Paid' : 'Processing'}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Details Modal */}
      {showDetails && selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-elder-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-elder-xl font-bold text-elder-text">Booking Details</h2>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-elder-text mb-2">Caregiver Information</h3>
                <div className="bg-gray-50 p-4 rounded-elder">
                  <p className="text-elder-base mb-2">
                    <span className="font-medium">Name:</span> {selectedBooking.caregiver?.first_name} {selectedBooking.caregiver?.last_name}
                  </p>
                  {selectedBooking.caregiver?.bio && (
                    <p className="text-elder-base mb-2">
                      <span className="font-medium">Bio:</span> {selectedBooking.caregiver.bio}
                    </p>
                  )}
                  {selectedBooking.caregiver?.languages && (
                    <p className="text-elder-base mb-2">
                      <span className="font-medium">Languages:</span> {selectedBooking.caregiver.languages.join(', ')}
                    </p>
                  )}
                  {selectedBooking.caregiver?.skills && (
                    <p className="text-elder-base">
                      <span className="font-medium">Skills:</span> {selectedBooking.caregiver.skills.join(', ')}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-elder-text mb-2">Service Details</h3>
                <div className="bg-gray-50 p-4 rounded-elder space-y-2">
                  <p className="text-elder-base">
                    <span className="font-medium">Date:</span> {formatDate(selectedBooking.service_date)}
                  </p>
                  <p className="text-elder-base">
                    <span className="font-medium">Time:</span> {formatTime(selectedBooking.start_time)} - {formatTime(selectedBooking.end_time)}
                  </p>
                  <p className="text-elder-base">
                    <span className="font-medium">Duration:</span> {selectedBooking.duration_hours} hours
                  </p>
                  <p className="text-elder-base">
                    <span className="font-medium">Location:</span> {
                      selectedBooking.location_type === 'in_home' ? 'In-Home Care' :
                      selectedBooking.location_type === 'facility' ? 'Care Facility' :
                      'Virtual Visit'
                    }
                  </p>
                  <p className="text-elder-base">
                    <span className="font-medium">Total Cost:</span> ${selectedBooking.total_cost}
                  </p>
                </div>
              </div>

              {selectedBooking.special_instructions && (
                <div>
                  <h3 className="font-semibold text-elder-text mb-2">Special Instructions</h3>
                  <div className="bg-yellow-50 p-4 rounded-elder">
                    <p className="text-elder-base">{selectedBooking.special_instructions}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}