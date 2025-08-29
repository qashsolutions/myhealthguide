'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { supabase } from '@/lib/supabase';
import { 
  acceptBooking, 
  startBookingSession, 
  completeBooking,
  cancelBooking,
  getBookingDetails 
} from '@/lib/beehive/booking';
import CaregiverAccessGate from '@/components/beehive/CaregiverAccessGate';
import Image from 'next/image';

interface Booking {
  id: string;
  patient_id: string;
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
  patient?: {
    first_name: string;
    last_name?: string;
    city?: string;
    state?: string;
    medical_conditions?: string[];
    phone?: string;
    address_line1?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
  };
}

export default function CaregiverBookingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'upcoming' | 'active' | 'past'>('pending');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

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

      // Fetch all bookings for this caregiver
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select(`
          *,
          patient:patient_profiles!bookings_patient_id_fkey(
            user_id,
            first_name,
            last_name,
            city,
            state,
            medical_conditions,
            phone,
            address_line1,
            address_line2,
            zip,
            emergency_contact_name,
            emergency_contact_phone
          )
        `)
        .eq('caregiver_id', userData.id)
        .order('service_date', { ascending: true });

      if (bookingsData) {
        // Apply privacy filtering based on booking status
        const filteredBookings = await Promise.all(
          bookingsData.map(async (booking) => {
            const details = await getBookingDetails(booking.id, userData.id, 'caregiver');
            return details || booking;
          })
        );
        setBookings(filteredBookings);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading bookings:', error);
      setError('Failed to load bookings');
      setLoading(false);
    }
  };

  const handleAcceptBooking = async (bookingId: string) => {
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

      const result = await acceptBooking(bookingId, userData.id);
      if (result.success) {
        await loadBookings();
        setShowDetails(false);
      } else {
        setError(result.error || 'Failed to accept booking');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to accept booking');
    } finally {
      setProcessing(false);
    }
  };

  const handleStartSession = async (bookingId: string) => {
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

      // Get current location if available
      let location = undefined;
      if (navigator.geolocation) {
        await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              location = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
              };
              resolve(null);
            },
            () => resolve(null)
          );
        });
      }

      const result = await startBookingSession(bookingId, userData.id, location);
      if (result.success) {
        await loadBookings();
      } else {
        setError(result.error || 'Failed to start session');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to start session');
    } finally {
      setProcessing(false);
    }
  };

  const handleCompleteSession = async (bookingId: string) => {
    const notes = prompt('Any completion notes? (optional)');
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

      const result = await completeBooking(bookingId, userData.id, notes || undefined);
      if (result.success) {
        await loadBookings();
      } else {
        setError(result.error || 'Failed to complete session');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to complete session');
    } finally {
      setProcessing(false);
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

      const result = await cancelBooking(bookingId, userData.id, 'caregiver', reason);
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

  // Filter bookings by status
  const filteredBookings = bookings.filter(booking => {
    switch (activeTab) {
      case 'pending':
        return booking.status === 'pending';
      case 'upcoming':
        return booking.status === 'confirmed';
      case 'active':
        return booking.status === 'in_progress';
      case 'past':
        return ['completed', 'cancelled', 'no_show'].includes(booking.status);
      default:
        return false;
    }
  });

  const formatDate = (date: string) => {
    return new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (time: string) => {
    const [hour, minute] = time.split(':');
    const hourNum = parseInt(hour);
    const ampm = hourNum >= 12 ? 'PM' : 'AM';
    const hour12 = hourNum % 12 || 12;
    return `${hour12}:${minute} ${ampm}`;
  };

  return (
    <CaregiverAccessGate requiredAccess="full">
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-[1400px] mx-auto px-4 py-6">
          <h1 className="text-elder-2xl font-bold text-elder-text mb-6">My Bookings</h1>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 bg-white rounded-elder-lg p-1 shadow-elder">
            {[
              { id: 'pending', label: 'Pending Requests' },
              { id: 'upcoming', label: 'Upcoming' },
              { id: 'active', label: 'Active' },
              { id: 'past', label: 'Past' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 px-4 py-3 text-elder-base font-medium rounded-elder transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary-600 text-white'
                    : 'text-elder-text hover:bg-gray-100'
                }`}
              >
                {tab.label}
                {tab.id === 'pending' && (
                  <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                    {bookings.filter(b => b.status === 'pending').length}
                  </span>
                )}
              </button>
            ))}
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
          ) : filteredBookings.length === 0 ? (
            <div className="bg-white rounded-elder-lg shadow-elder p-12 text-center">
              <p className="text-elder-lg text-elder-text-secondary">
                No {activeTab} bookings
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredBookings.map(booking => (
                <div key={booking.id} className="bg-white rounded-elder-lg shadow-elder p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-3">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          booking.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                          booking.status === 'in_progress' ? 'bg-green-100 text-green-800' :
                          booking.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {booking.status.replace('_', ' ').toUpperCase()}
                        </span>
                        <span className="text-elder-base font-semibold text-primary-600">
                          ${booking.total_cost}
                        </span>
                      </div>

                      <h3 className="text-elder-lg font-semibold text-elder-text mb-2">
                        {booking.patient?.first_name || 'Patient'} 
                        {booking.status !== 'pending' && booking.patient?.last_name ? 
                          ` ${booking.patient.last_name}` : ''}
                      </h3>

                      <div className="space-y-2 text-elder-base text-elder-text-secondary">
                        <p>
                          <span className="font-medium">Date:</span> {formatDate(booking.service_date)}
                        </p>
                        <p>
                          <span className="font-medium">Time:</span> {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                        </p>
                        <p>
                          <span className="font-medium">Duration:</span> {booking.duration_hours} hours
                        </p>
                        <p>
                          <span className="font-medium">Location:</span> {
                            booking.location_type === 'in_home' ? 'In-Home' :
                            booking.location_type === 'facility' ? 'Care Facility' :
                            'Virtual'
                          }
                          {booking.patient?.city && ` - ${booking.patient.city}, ${booking.patient.state}`}
                        </p>
                        {booking.care_needs.length > 0 && (
                          <p>
                            <span className="font-medium">Care Needs:</span> {booking.care_needs.join(', ')}
                          </p>
                        )}
                      </div>

                      {/* Privacy Notice for Pending Bookings */}
                      {booking.status === 'pending' && (
                        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-elder">
                          <p className="text-sm text-yellow-800">
                            <span className="font-medium">Privacy Protection:</span> Patient contact details 
                            will be revealed after you accept the booking.
                          </p>
                        </div>
                      )}

                      {/* Contact Info for Confirmed/Active Bookings */}
                      {['confirmed', 'in_progress'].includes(booking.status) && booking.patient?.phone && (
                        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-elder">
                          <p className="text-sm text-green-800 font-medium mb-1">Contact Information:</p>
                          <p className="text-sm text-green-700">Phone: {booking.patient.phone}</p>
                          {booking.status === 'in_progress' && booking.patient.address_line1 && (
                            <>
                              <p className="text-sm text-green-700">
                                Address: {booking.patient.address_line1}
                              </p>
                              {booking.patient.emergency_contact_name && (
                                <p className="text-sm text-green-700">
                                  Emergency: {booking.patient.emergency_contact_name} - {booking.patient.emergency_contact_phone}
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 ml-4">
                      {booking.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleAcceptBooking(booking.id)}
                            disabled={processing}
                            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-elder hover:bg-green-700 disabled:bg-gray-400"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleCancelBooking(booking.id)}
                            disabled={processing}
                            className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-elder hover:bg-red-700 disabled:bg-gray-400"
                          >
                            Decline
                          </button>
                        </>
                      )}
                      {booking.status === 'confirmed' && (
                        <>
                          <button
                            onClick={() => handleStartSession(booking.id)}
                            disabled={processing}
                            className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-elder hover:bg-primary-700 disabled:bg-gray-400"
                          >
                            Start Session
                          </button>
                          <button
                            onClick={() => handleCancelBooking(booking.id)}
                            disabled={processing}
                            className="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-elder hover:bg-gray-700 disabled:bg-gray-400"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                      {booking.status === 'in_progress' && (
                        <button
                          onClick={() => handleCompleteSession(booking.id)}
                          disabled={processing}
                          className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-elder hover:bg-green-700 disabled:bg-gray-400"
                        >
                          Complete Session
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setSelectedBooking(booking);
                          setShowDetails(true);
                        }}
                        className="px-4 py-2 bg-gray-200 text-elder-text text-sm font-medium rounded-elder hover:bg-gray-300"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
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
                  <h3 className="font-semibold text-elder-text mb-2">Service Information</h3>
                  <div className="bg-gray-50 p-4 rounded-elder space-y-2">
                    <p><span className="font-medium">Status:</span> {selectedBooking.status}</p>
                    <p><span className="font-medium">Date:</span> {formatDate(selectedBooking.service_date)}</p>
                    <p><span className="font-medium">Time:</span> {formatTime(selectedBooking.start_time)} - {formatTime(selectedBooking.end_time)}</p>
                    <p><span className="font-medium">Type:</span> {selectedBooking.service_type}</p>
                    <p><span className="font-medium">Total Cost:</span> ${selectedBooking.total_cost}</p>
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

                {selectedBooking.care_needs.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-elder-text mb-2">Care Needs</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedBooking.care_needs.map(need => (
                        <span key={need} className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm">
                          {need}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </CaregiverAccessGate>
  );
}