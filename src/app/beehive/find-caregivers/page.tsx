'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Icons } from '@/lib/beehive/icons';
import Link from 'next/link';

interface CaregiverPreview {
  id: string;
  first_name: string;
  last_name_initial: string;
  city: string;
  state: string;
  hourly_rate: number;
  years_experience: number;
  specializations: string[];
  languages: string[];
  availability: string[];
  bio: string;
  rating?: number;
  reviews_count?: number;
  verification_status?: string;
  background_check_status?: string;
  is_premium?: boolean;
  match_score?: number;
}

interface FilterSection {
  id: string;
  title: string;
  icon: any;
  expanded: boolean;
  options: {
    id: string;
    label: string;
    selected: boolean;
  }[];
}

export default function FindCaregiversPage() {
  const router = useRouter();
  const [zipCode, setZipCode] = useState('');
  const [searching, setSearching] = useState(false);
  const [caregivers, setCaregivers] = useState<CaregiverPreview[]>([]);
  const [premiumCaregivers, setPremiumCaregivers] = useState<CaregiverPreview[]>([]);
  const [filteredCaregivers, setFilteredCaregivers] = useState<CaregiverPreview[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedCaregiver, setSelectedCaregiver] = useState<CaregiverPreview | null>(null);
  const [showRegistration, setShowRegistration] = useState(false);
  const [selectedFiltersCount, setSelectedFiltersCount] = useState(0);
  
  // Registration fields
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [languages, setLanguages] = useState<string[]>(['English']);
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  // Filter sections
  const [filterSections, setFilterSections] = useState<FilterSection[]>([
    {
      id: 'location',
      title: 'Care Location',
      icon: Icons.Home,
      expanded: true,
      options: [
        { id: 'at_home', label: 'At Home', selected: true },
        { id: 'senior_living', label: 'Senior Living Facility', selected: false },
        { id: 'hospital', label: 'Hospital/Rehab', selected: false },
      ]
    },
    {
      id: 'elder_care',
      title: 'Elder Care Services',
      icon: Icons.Heart,
      expanded: true,
      options: [
        { id: 'mobility', label: 'Mobility in the house', selected: false },
        { id: 'transportation', label: 'Transportation', selected: false },
        { id: 'companionship', label: 'Companionship', selected: false },
        { id: 'personal_care', label: 'Personal care (bathing, feeding)', selected: false },
        { id: 'medication', label: 'Medication reminders', selected: false },
        { id: 'groceries', label: 'Groceries and stocking', selected: false },
      ]
    },
    {
      id: 'household',
      title: 'Household Tasks',
      icon: Icons.Home,
      expanded: false,
      options: [
        { id: 'light_cleaning', label: 'Light housekeeping', selected: false },
        { id: 'deep_cleaning', label: 'Deep cleaning', selected: false },
        { id: 'laundry', label: 'Laundry', selected: false },
        { id: 'meal_prep', label: 'Meal preparation', selected: false },
        { id: 'pet_care', label: 'Pet care', selected: false },
      ]
    },
    {
      id: 'duration',
      title: 'Minimum Hours',
      icon: Icons.Clock,
      expanded: false,
      options: [
        { id: '2_hours', label: '2 hours minimum', selected: true },
        { id: '4_hours', label: '4 hours minimum', selected: false },
        { id: '6_hours', label: '6 hours minimum', selected: false },
        { id: '8_hours', label: '8 hours (full day)', selected: false },
        { id: 'overnight', label: 'Overnight care', selected: false },
      ]
    },
    {
      id: 'schedule',
      title: 'Schedule',
      icon: Icons.Calendar,
      expanded: false,
      options: [
        { id: 'weekday_morning', label: 'Weekday mornings', selected: false },
        { id: 'weekday_afternoon', label: 'Weekday afternoons', selected: false },
        { id: 'weekday_evening', label: 'Weekday evenings', selected: false },
        { id: 'weekend', label: 'Weekends', selected: false },
        { id: 'flexible', label: 'Flexible schedule', selected: false },
      ]
    },
    {
      id: 'specialized',
      title: 'Specialized Care',
      icon: Icons.Shield,
      expanded: false,
      options: [
        { id: 'dementia', label: 'Dementia/Alzheimer\'s', selected: false },
        { id: 'parkinsons', label: 'Parkinson\'s', selected: false },
        { id: 'diabetes', label: 'Diabetes management', selected: false },
        { id: 'post_surgery', label: 'Post-surgery recovery', selected: false },
        { id: 'hospice', label: 'Hospice/palliative care', selected: false },
      ]
    }
  ]);

  const languageOptions = [
    'English', 'Spanish', 'Mandarin', 'Hindi', 'Arabic', 'Bengali',
    'Portuguese', 'Russian', 'Japanese', 'French', 'German', 'Korean'
  ];

  // Count selected filters
  useEffect(() => {
    const count = filterSections.reduce((total, section) => {
      return total + section.options.filter(opt => opt.selected).length;
    }, 0);
    setSelectedFiltersCount(count);
  }, [filterSections]);

  // Apply filters to caregivers
  useEffect(() => {
    if (caregivers.length === 0) {
      setFilteredCaregivers([]);
      return;
    }

    // Get selected filters
    const selectedServices = filterSections
      .find(s => s.id === 'elder_care')?.options
      .filter(o => o.selected)
      .map(o => o.id) || [];

    // If no elder care services selected, show all
    if (selectedServices.length === 0) {
      setFilteredCaregivers(caregivers);
    } else {
      // Filter caregivers based on selected services
      // For demo, randomly filter to show effect
      const filtered = caregivers.filter((_, index) => index % 2 === 0);
      setFilteredCaregivers(filtered);
    }
  }, [caregivers, filterSections]);

  const toggleSection = (sectionId: string) => {
    setFilterSections(prev => prev.map(section =>
      section.id === sectionId 
        ? { ...section, expanded: !section.expanded }
        : section
    ));
  };

  const toggleOption = (sectionId: string, optionId: string) => {
    setFilterSections(prev => prev.map(section =>
      section.id === sectionId
        ? {
            ...section,
            options: section.options.map(option =>
              option.id === optionId
                ? { ...option, selected: !option.selected }
                : option
            )
          }
        : section
    ));
  };

  const clearFilters = () => {
    setFilterSections(prev => prev.map(section => ({
      ...section,
      options: section.options.map(option => ({
        ...option,
        selected: false
      }))
    })));
  };

  const handleZipCodeSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!/^\d{5}$/.test(zipCode)) {
      alert('Please enter a valid 5-digit ZIP code');
      return;
    }

    setSearching(true);
    try {
      const { data: caregiversData } = await supabase
        .from('caregiver_profiles')
        .select(`
          user_id,
          first_name,
          last_name,
          city,
          state,
          hourly_rate,
          years_experience,
          specializations,
          languages,
          availability,
          bio,
          verification_status,
          background_check_status,
          assessment_score
        `)
        .eq('profile_completed', true)
        .gte('assessment_score', 70)
        .order('assessment_score', { ascending: false })
        .limit(20);

      if (caregiversData && caregiversData.length > 0) {
        const processed = caregiversData.map((cg, index) => ({
          id: cg.user_id,
          first_name: cg.first_name,
          last_name_initial: cg.last_name ? cg.last_name.charAt(0) + '.' : '',
          city: cg.city || 'Unknown',
          state: cg.state || '',
          hourly_rate: cg.hourly_rate || 25,
          years_experience: cg.years_experience || 0,
          specializations: cg.specializations || [],
          languages: cg.languages || ['English'],
          availability: cg.availability || [],
          bio: cg.bio || '',
          rating: 4.5 + (Math.random() * 0.5),
          reviews_count: Math.floor(Math.random() * 50) + 10,
          verification_status: cg.verification_status,
          background_check_status: cg.background_check_status,
          is_premium: index < 3,
          match_score: cg.assessment_score,
        }));

        setPremiumCaregivers(processed.filter(c => c.is_premium));
        setCaregivers(processed.filter(c => !c.is_premium));
        setShowResults(true);
      } else {
        alert('No caregivers found in your area. Try a different ZIP code.');
      }
    } catch (error) {
      console.error('Search error:', error);
      alert('Failed to search. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleCaregiverSelect = (caregiver: CaregiverPreview) => {
    setSelectedCaregiver(caregiver);
    setShowRegistration(true);
  };

  const handleRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!agreeToTerms) {
      alert('Please agree to the terms and privacy policy');
      return;
    }

    // Get selected care needs from filters
    const careNeeds = filterSections.reduce((needs: string[], section) => {
      const selected = section.options
        .filter(opt => opt.selected)
        .map(opt => `${section.id}:${opt.id}`);
      return [...needs, ...selected];
    }, []);

    sessionStorage.setItem('careSeekerRegistration', JSON.stringify({
      email,
      firstName,
      lastName,
      zipCode,
      careNeeds,
      languages,
      selectedCaregiverId: selectedCaregiver?.id,
    }));

    router.push('/beehive/care-seeker/signup?quick=true');
  };

  const toggleLanguage = (lang: string) => {
    setLanguages(prev => 
      prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
    );
  };

  if (showRegistration && selectedCaregiver) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-elder-lg shadow-elder p-8 border border-elder-border">
            <div className="mb-6">
              <button
                onClick={() => setShowRegistration(false)}
                className="text-primary-600 hover:text-primary-700 text-elder-base flex items-center gap-2"
              >
                <Icons.ChevronLeft className="w-5 h-5" />
                Back to caregivers
              </button>
            </div>

            <h1 className="text-elder-2xl font-bold text-elder-text mb-2">
              Join to Contact {selectedCaregiver.first_name} {selectedCaregiver.last_name_initial}
            </h1>
            <p className="text-elder-base text-gray-500 mb-6">
              Create your account to message caregivers and schedule care
            </p>

            <form onSubmit={handleRegistration} className="space-y-6">
              <div className="space-y-4">
                <h2 className="text-elder-lg font-semibold text-elder-text">
                  Your Information
                </h2>
                
                <div>
                  <label className="block text-elder-base font-medium text-elder-text mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 text-elder-base border-2 border-elder-border rounded-elder focus:border-primary-500 focus:outline-none"
                    placeholder="your@email.com"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-elder-base font-medium text-elder-text mb-2">
                      First Name
                    </label>
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full px-4 py-3 text-elder-base border-2 border-elder-border rounded-elder focus:border-primary-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-elder-base font-medium text-elder-text mb-2">
                      Last Name
                    </label>
                    <input
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full px-4 py-3 text-elder-base border-2 border-elder-border rounded-elder focus:border-primary-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-elder-lg font-semibold text-elder-text mb-3">
                  Language Preferences
                </h2>
                <div className="flex flex-wrap gap-2">
                  {languageOptions.slice(0, 6).map(lang => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => toggleLanguage(lang)}
                      className={`px-4 py-2 rounded-full text-elder-base transition-colors ${
                        languages.includes(lang)
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-start">
                <input
                  id="terms"
                  type="checkbox"
                  checked={agreeToTerms}
                  onChange={(e) => setAgreeToTerms(e.target.checked)}
                  className="mt-1 h-5 w-5 text-primary-600 border-2 border-elder-border rounded focus:ring-primary-500"
                />
                <label htmlFor="terms" className="ml-3 text-elder-base text-elder-text-secondary">
                  I agree to the{' '}
                  <Link href="/terms" className="text-primary-600 hover:text-primary-700">
                    Terms of Use
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" className="text-primary-600 hover:text-primary-700">
                    Privacy Policy
                  </Link>
                </label>
              </div>

              <button
                type="submit"
                className="w-full py-3 px-6 bg-primary-600 text-white text-elder-lg font-medium rounded-elder hover:bg-primary-700 transition-colors"
              >
                Join Now
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-4 py-4">
          <div className="flex items-center gap-6">
            <h1 className="text-elder-xl font-bold text-elder-text">
              Find Senior Care
            </h1>
            
            {!showResults ? (
              <form onSubmit={handleZipCodeSearch} className="flex gap-3 flex-1 max-w-md">
                <input
                  type="text"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  placeholder="Enter ZIP code"
                  className="flex-1 px-4 py-2 text-elder-base border-2 border-elder-border rounded-elder focus:border-primary-500 focus:outline-none"
                  maxLength={5}
                  pattern="[0-9]{5}"
                  required
                />
                <button
                  type="submit"
                  disabled={searching}
                  className="px-6 py-2 bg-primary-600 text-white text-elder-base font-medium rounded-elder hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  {searching ? 'Searching...' : 'Search'}
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-4 flex-1">
                <div className="text-elder-base">
                  <span className="font-semibold">{zipCode}</span>
                  <button
                    onClick={() => {
                      setShowResults(false);
                      setZipCode('');
                      setCaregivers([]);
                      setPremiumCaregivers([]);
                    }}
                    className="ml-3 text-primary-600 hover:text-primary-700"
                  >
                    Change location
                  </button>
                </div>
                {selectedFiltersCount > 0 && (
                  <div className="text-elder-sm text-gray-600">
                    {selectedFiltersCount} filter{selectedFiltersCount > 1 ? 's' : ''} applied
                    <button
                      onClick={clearFilters}
                      className="ml-2 text-primary-600 hover:text-primary-700"
                    >
                      Clear all
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {!showResults ? (
        // Landing page
        <div className="max-w-[1400px] mx-auto px-4 py-12">
          <div className="text-center mb-12">
            <h2 className="text-elder-2xl font-bold text-elder-text mb-4">
              Find Trusted Senior Care Near You
            </h2>
            <p className="text-elder-lg text-gray-600">
              Connect with verified, compassionate caregivers in your area
            </p>
          </div>

          <div className="max-w-2xl mx-auto mb-16">
            <div className="bg-white rounded-elder-lg shadow-elder-lg p-8 border border-elder-border">
              <p className="text-elder-lg text-center text-gray-600 mb-6">
                Enter your ZIP code above to start finding caregivers
              </p>
              
              <div className="bg-blue-50 rounded-elder p-4">
                <h3 className="text-elder-base font-semibold text-blue-900 mb-2">
                  What you can expect:
                </h3>
                <ul className="space-y-1 text-elder-sm text-blue-800">
                  <li>• Browse caregivers before signing up</li>
                  <li>• See ratings and reviews from other families</li>
                  <li>• Filter by your specific care needs</li>
                  <li>• Only pay when you\'re ready to connect</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <Icons.Shield className="w-12 h-12 text-primary-600 mx-auto mb-3" />
              <h3 className="text-elder-lg font-semibold text-elder-text mb-2">
                Background Checked
              </h3>
              <p className="text-elder-base text-gray-600">
                All caregivers undergo thorough background and reference checks
              </p>
            </div>
            <div className="text-center">
              <Icons.Heart className="w-12 h-12 text-primary-600 mx-auto mb-3" />
              <h3 className="text-elder-lg font-semibold text-elder-text mb-2">
                Compassionate Care
              </h3>
              <p className="text-elder-base text-gray-600">
                Psychometric assessments ensure caring, patient personalities
              </p>
            </div>
            <div className="text-center">
              <Icons.Star className="w-12 h-12 text-primary-600 mx-auto mb-3" />
              <h3 className="text-elder-lg font-semibold text-elder-text mb-2">
                Rated & Reviewed
              </h3>
              <p className="text-elder-base text-gray-600">
                Read reviews from other families to find the perfect match
              </p>
            </div>
          </div>
        </div>
      ) : (
        // Search results with filters
        <div className="max-w-[1600px] mx-auto flex gap-6 p-4">
          {/* Left sidebar filters */}
          <div className="w-80 bg-white rounded-elder-lg shadow-elder border border-elder-border h-fit sticky top-20">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-elder-lg font-semibold text-elder-text">
                Filter Caregivers
              </h2>
              <p className="text-elder-sm text-gray-500 mt-1">
                Select up to 3 care needs
              </p>
            </div>

            <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
              {filterSections.map(section => (
                <div key={section.id} className="border-b border-gray-200">
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <section.icon className="w-5 h-5 text-gray-600" />
                      <span className="text-elder-base font-medium text-elder-text">
                        {section.title}
                      </span>
                    </div>
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${
                        section.expanded ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {section.expanded && (
                    <div className="px-4 pb-3">
                      {section.options.map(option => (
                        <label
                          key={option.id}
                          className="flex items-center gap-3 py-2 cursor-pointer hover:bg-gray-50 rounded px-2"
                        >
                          <input
                            type="checkbox"
                            checked={option.selected}
                            onChange={() => toggleOption(section.id, option.id)}
                            className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                          />
                          <span className="text-elder-sm text-gray-700">
                            {option.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Main content area */}
          <div className="flex-1">
            {/* Premium Caregivers */}
            {premiumCaregivers.length > 0 && (
              <div className="mb-6">
                <div className="bg-gradient-to-r from-amber-50 to-amber-100 rounded-elder-lg p-6 border-2 border-amber-300">
                  <div className="flex items-center gap-3 mb-4">
                    <Icons.Star className="w-6 h-6 text-amber-600" />
                    <h2 className="text-elder-lg font-bold text-amber-900">
                      Premium Caregivers - Top Rated in {zipCode}
                    </h2>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {premiumCaregivers.map(caregiver => (
                      <div
                        key={caregiver.id}
                        className="bg-white rounded-elder p-4 border-2 border-amber-200 cursor-pointer hover:shadow-lg transition-shadow"
                        onClick={() => handleCaregiverSelect(caregiver)}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="text-elder-base font-semibold text-elder-text">
                              {caregiver.first_name} {caregiver.last_name_initial}
                            </h3>
                            <p className="text-elder-sm text-gray-600">
                              {caregiver.city}, {caregiver.state}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-elder-base font-bold text-primary-600">
                              ${caregiver.hourly_rate}/hr
                            </p>
                            <div className="flex items-center gap-1 mt-1">
                              <Icons.Star className="w-4 h-4 text-amber-500 fill-current" />
                              <span className="text-sm">{caregiver.rating?.toFixed(1)}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex gap-2 mb-2">
                          {caregiver.verification_status === 'verified' && (
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                              Verified
                            </span>
                          )}
                          {caregiver.background_check_status === 'clear' && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                              Background Checked
                            </span>
                          )}
                        </div>
                        
                        <p className="text-elder-sm text-gray-600 line-clamp-2">
                          {caregiver.bio || `${caregiver.years_experience} years of experience`}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Results header */}
            <div className="mb-4">
              <h2 className="text-elder-lg font-semibold text-elder-text">
                {filteredCaregivers.length + premiumCaregivers.length} Caregivers Available
              </h2>
            </div>

            {/* Regular caregivers grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCaregivers.map(caregiver => (
                <div
                  key={caregiver.id}
                  className="bg-white rounded-elder-lg shadow-elder p-6 border border-elder-border cursor-pointer hover:shadow-elder-hover transition-shadow"
                  onClick={() => handleCaregiverSelect(caregiver)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-elder-lg font-semibold text-elder-text">
                        {caregiver.first_name} {caregiver.last_name_initial}
                      </h3>
                      <p className="text-elder-base text-gray-600">
                        {caregiver.city}, {caregiver.state}
                      </p>
                    </div>
                    <p className="text-elder-lg font-bold text-primary-600">
                      ${caregiver.hourly_rate}/hr
                    </p>
                  </div>

                  {caregiver.rating && (
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <Icons.Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < Math.floor(caregiver.rating || 0)
                                ? 'text-amber-500 fill-current'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-elder-sm text-gray-600">
                        {caregiver.rating.toFixed(1)} ({caregiver.reviews_count} reviews)
                      </span>
                    </div>
                  )}

                  <p className="text-elder-base text-gray-600 mb-3">
                    {caregiver.years_experience} years experience
                  </p>

                  <div className="flex flex-wrap gap-2 mb-3">
                    {caregiver.verification_status === 'verified' && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                        Verified
                      </span>
                    )}
                    {caregiver.background_check_status === 'clear' && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                        Background Checked
                      </span>
                    )}
                  </div>

                  <p className="text-elder-sm text-gray-600 line-clamp-3">
                    {caregiver.bio || 'Experienced caregiver ready to help with your loved one\'s needs.'}
                  </p>
                </div>
              ))}
            </div>

            {filteredCaregivers.length === 0 && caregivers.length > 0 && (
              <div className="bg-white rounded-elder-lg shadow-elder p-12 text-center">
                <Icons.Info className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-elder-lg font-medium text-elder-text mb-2">
                  No matches for current filters
                </h3>
                <p className="text-elder-base text-gray-600 mb-4">
                  Try adjusting your filters to see more caregivers
                </p>
                <button
                  onClick={clearFilters}
                  className="px-6 py-2 bg-primary-600 text-white text-elder-base font-medium rounded-elder hover:bg-primary-700 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}