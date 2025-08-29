'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { supabase } from '@/lib/supabase';
import { findMatches, CaregiverMatch, MatchingCriteria } from '@/lib/beehive/matching';
import Link from 'next/link';

export default function PatientDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [matches, setMatches] = useState<CaregiverMatch[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<CaregiverMatch | null>(null);
  
  // Search filters
  const [languages, setLanguages] = useState<string[]>(['English']);
  const [careNeeds, setCareNeeds] = useState<string[]>([]);
  const [maxRate, setMaxRate] = useState<number>(50);
  const [radius, setRadius] = useState<number>(25);

  const languageOptions = [
    'English', 'Spanish', 'Mandarin', 'Hindi', 'Arabic', 'Bengali',
    'Portuguese', 'Russian', 'Japanese', 'French', 'German', 'Korean'
  ];

  const careNeedsOptions = [
    'Dementia Care', 'Alzheimer\'s Care', 'Parkinson\'s Care',
    'Stroke Recovery', 'Physical Therapy Support', 'Medication Management',
    'Mobility Assistance', 'Post-Surgery Care', 'Diabetes Management',
    'Heart Disease Care', 'Cancer Support', 'Hospice Care'
  ];

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setUser(user);
        // Check subscription status
        const { data } = await supabase
          .from('patient_profiles')
          .select('subscription_status')
          .eq('user_id', user.uid)
          .single();
        
        if (!data || data.subscription_status !== 'active') {
          // Redirect to subscription if not active
          router.push('/beehive/patient/subscription');
        }
        setLoading(false);
      } else {
        router.push('/beehive/login');
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleSearch = async () => {
    if (!user) return;
    
    setSearching(true);
    try {
      const criteria: MatchingCriteria = {
        patientId: user.uid,
        languages,
        careNeeds,
        maxHourlyRate: maxRate,
        location: {
          // For demo, using a default location (update with actual patient location)
          latitude: 40.7128,
          longitude: -74.0060,
          radiusMiles: radius,
        },
      };

      const results = await findMatches(criteria);
      setMatches(results);
      
      if (results.length === 0) {
        alert('No matches found. Try adjusting your search criteria.');
      }
    } catch (error) {
      console.error('Search error:', error);
      alert('Failed to search for caregivers. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const toggleLanguage = (lang: string) => {
    if (languages.includes(lang)) {
      setLanguages(languages.filter(l => l !== lang));
    } else {
      setLanguages([...languages, lang]);
    }
  };

  const toggleCareNeed = (need: string) => {
    if (careNeeds.includes(need)) {
      setCareNeeds(careNeeds.filter(n => n !== need));
    } else {
      setCareNeeds([...careNeeds, need]);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-elder-lg text-elder-text">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-elder-xl font-bold text-elder-text">
              Find Your Caregiver
            </h1>
            <div className="flex items-center space-x-4">
              <Link
                href="/beehive/patient/saved-matches"
                className="text-elder-base text-primary-600 hover:text-primary-700"
              >
                Saved Matches
              </Link>
              <Link
                href="/beehive/patient/bookings"
                className="text-elder-base text-primary-600 hover:text-primary-700"
              >
                My Bookings
              </Link>
              <button
                onClick={() => auth.signOut()}
                className="text-elder-base text-gray-600 hover:text-gray-800"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Search Filters */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-elder-lg shadow-elder p-6 border border-elder-border">
              <h2 className="text-elder-lg font-semibold text-elder-text mb-6">
                Search Criteria
              </h2>

              {/* Languages */}
              <div className="mb-6">
                <h3 className="text-elder-base font-medium text-elder-text mb-3">
                  Languages Required
                </h3>
                <div className="space-y-2">
                  {languageOptions.slice(0, 6).map((lang) => (
                    <label key={lang} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={languages.includes(lang)}
                        onChange={() => toggleLanguage(lang)}
                        className="h-4 w-4 text-primary-600 border-elder-border rounded"
                      />
                      <span className="ml-2 text-elder-base">{lang}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Care Needs */}
              <div className="mb-6">
                <h3 className="text-elder-base font-medium text-elder-text mb-3">
                  Care Needs
                </h3>
                <div className="space-y-2">
                  {careNeedsOptions.slice(0, 6).map((need) => (
                    <label key={need} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={careNeeds.includes(need)}
                        onChange={() => toggleCareNeed(need)}
                        className="h-4 w-4 text-primary-600 border-elder-border rounded"
                      />
                      <span className="ml-2 text-elder-base text-elder-text">{need}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Hourly Rate */}
              <div className="mb-6">
                <h3 className="text-elder-base font-medium text-elder-text mb-3">
                  Maximum Hourly Rate
                </h3>
                <div className="flex items-center space-x-2">
                  <span className="text-elder-base">$</span>
                  <input
                    type="range"
                    min="15"
                    max="100"
                    value={maxRate}
                    onChange={(e) => setMaxRate(Number(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-elder-base font-medium w-12">
                    ${maxRate}
                  </span>
                </div>
              </div>

              {/* Distance */}
              <div className="mb-6">
                <h3 className="text-elder-base font-medium text-elder-text mb-3">
                  Distance (miles)
                </h3>
                <div className="flex items-center space-x-2">
                  <input
                    type="range"
                    min="5"
                    max="50"
                    value={radius}
                    onChange={(e) => setRadius(Number(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-elder-base font-medium w-12">
                    {radius}mi
                  </span>
                </div>
              </div>

              <button
                onClick={handleSearch}
                disabled={searching}
                className="w-full py-3 bg-primary-600 text-white text-elder-base font-medium rounded-elder hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {searching ? 'Searching...' : 'Find Caregivers'}
              </button>
            </div>
          </div>

          {/* Search Results */}
          <div className="lg:col-span-3">
            {matches.length === 0 ? (
              <div className="bg-white rounded-elder-lg shadow-elder p-12 border border-elder-border text-center">
                <svg className="w-24 h-24 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <h3 className="text-elder-lg font-medium text-elder-text mb-2">
                  Start Your Search
                </h3>
                <p className="text-elder-base text-elder-text-secondary">
                  Select your criteria and click "Find Caregivers" to see matches
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-elder-lg font-semibold text-elder-text">
                    Found {matches.length} Matches
                  </h3>
                  <select className="px-4 py-2 border border-elder-border rounded-elder text-elder-base">
                    <option>Sort by: Best Match</option>
                    <option>Sort by: Closest</option>
                    <option>Sort by: Lowest Rate</option>
                    <option>Sort by: Highest Rating</option>
                  </select>
                </div>

                {matches.map((match) => (
                  <div
                    key={match.caregiverId}
                    className={`bg-white rounded-elder-lg shadow-elder p-6 border-2 transition-all cursor-pointer hover:shadow-lg ${
                      match.highlighted ? 'border-green-500' : 'border-elder-border'
                    }`}
                    onClick={() => setSelectedMatch(match)}
                  >
                    {match.highlighted && (
                      <div className="mb-2">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          ⭐ Top Match
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="text-elder-lg font-semibold text-elder-text">
                          {match.profile.first_name} {match.profile.verification_status === 'verified' && match.profile.background_check_status === 'clear' ? match.profile.last_name : 'Pending Verification'}
                        </h4>
                        <p className="text-elder-base text-elder-text-secondary">
                          {Math.round((match.profile.total_hours_worked || 0) / 2000)} years experience • {match.profile.average_rating ? `⭐ ${match.profile.average_rating.toFixed(1)}` : 'New'}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-elder-xl font-bold text-primary-600">
                          {match.matchScore}%
                        </div>
                        <p className="text-elder-sm text-elder-text-secondary">
                          Match Score
                        </p>
                      </div>
                    </div>

                    {/* Match Factors */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div>
                        <div className="text-elder-sm text-elder-text-secondary">
                          Language
                        </div>
                        <div className="flex items-center">
                          <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${match.matchFactors.languageMatch}%` }}
                            />
                          </div>
                          <span className="text-elder-sm font-medium">
                            {Math.round(match.matchFactors.languageMatch)}%
                          </span>
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-elder-sm text-elder-text-secondary">
                          Location
                        </div>
                        <div className="flex items-center">
                          <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                            <div
                              className="bg-green-600 h-2 rounded-full"
                              style={{ width: `${match.matchFactors.locationMatch}%` }}
                            />
                          </div>
                          <span className="text-elder-sm font-medium">
                            {match.distance ? `${match.distance.toFixed(1)}mi` : 'N/A'}
                          </span>
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-elder-sm text-elder-text-secondary">
                          Skills
                        </div>
                        <div className="flex items-center">
                          <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                            <div
                              className="bg-purple-600 h-2 rounded-full"
                              style={{ width: `${match.matchFactors.skillsMatch}%` }}
                            />
                          </div>
                          <span className="text-elder-sm font-medium">
                            {Math.round(match.matchFactors.skillsMatch)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="text-elder-base text-elder-text-secondary mb-4">
                      {match.explanation}
                    </p>

                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-4 text-elder-sm">
                        <span className="text-elder-text">
                          ${match.profile.hourly_rate}/hour
                        </span>
                        {match.profile.languages && (
                          <span className="text-elder-text-secondary">
                            Speaks: {match.profile.languages.slice(0, 2).join(', ')}
                          </span>
                        )}
                      </div>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/beehive/caregiver/${match.caregiverId}`);
                        }}
                        className="px-4 py-2 bg-primary-600 text-white text-elder-sm font-medium rounded-elder hover:bg-primary-700"
                      >
                        View Profile
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Match Modal */}
      {selectedMatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-elder-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-elder-xl font-bold text-elder-text">
                {selectedMatch.profile.first_name} {selectedMatch.profile.last_name}
              </h2>
              <button
                onClick={() => setSelectedMatch(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-elder-base text-elder-text">
                {selectedMatch.profile.bio}
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-elder-sm text-elder-text-secondary">Experience:</span>
                  <p className="text-elder-base font-medium">
                    {selectedMatch.profile.total_hours_worked ? 
                      `${Math.round(selectedMatch.profile.total_hours_worked / 2000)} years` : 
                      'New caregiver'}
                  </p>
                </div>
                <div>
                  <span className="text-elder-sm text-elder-text-secondary">Rate:</span>
                  <p className="text-elder-base font-medium">
                    ${selectedMatch.profile.hourly_rate}/hour
                  </p>
                </div>
                <div>
                  <span className="text-elder-sm text-elder-text-secondary">Languages:</span>
                  <p className="text-elder-base font-medium">
                    {selectedMatch.profile.languages?.join(', ')}
                  </p>
                </div>
                <div>
                  <span className="text-elder-sm text-elder-text-secondary">Availability:</span>
                  <p className="text-elder-base font-medium">
                    {selectedMatch.profile.availability?.slice(0, 2).join(', ')}
                  </p>
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => {
                    router.push(`/beehive/booking/${selectedMatch.caregiverId}`);
                  }}
                  className="flex-1 py-3 bg-primary-600 text-white text-elder-base font-medium rounded-elder hover:bg-primary-700"
                >
                  Book Now
                </button>
                <button
                  onClick={() => {
                    router.push(`/beehive/caregiver/${selectedMatch.caregiverId}`);
                  }}
                  className="flex-1 py-3 border-2 border-primary-600 text-primary-600 text-elder-base font-medium rounded-elder hover:bg-primary-50"
                >
                  View Full Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}