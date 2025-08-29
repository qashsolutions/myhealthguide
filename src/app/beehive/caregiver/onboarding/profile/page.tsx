'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function CaregiverProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  
  // Profile fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [languages, setLanguages] = useState<string[]>(['English']);
  const [education, setEducation] = useState('');
  const [yearsExperience, setYearsExperience] = useState('');
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [availability, setAvailability] = useState<string[]>([]);
  const [hourlyRate, setHourlyRate] = useState('');
  const [bio, setBio] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');

  const languageOptions = [
    'English', 'Spanish', 'Mandarin', 'Hindi', 'Arabic', 'Bengali',
    'Portuguese', 'Russian', 'Japanese', 'French', 'German', 'Korean'
  ];

  const specializationOptions = [
    'Dementia Care', 'Alzheimer\'s Care', 'Parkinson\'s Care',
    'Stroke Recovery', 'Physical Therapy Support', 'Medication Management',
    'Mobility Assistance', 'Post-Surgery Care', 'Diabetes Management',
    'Heart Disease Care', 'Cancer Support', 'Hospice Care'
  ];

  const availabilityOptions = [
    'Weekday Mornings', 'Weekday Afternoons', 'Weekday Evenings',
    'Weekday Nights', 'Weekend Mornings', 'Weekend Afternoons',
    'Weekend Evenings', 'Weekend Nights', 'Overnight Care', '24/7 Live-in'
  ];

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setUserId(user.uid);
        loadExistingProfile(user.uid);
      } else {
        router.push('/beehive/login');
      }
    });

    return () => unsubscribe();
  }, [router]);

  const loadExistingProfile = async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from('caregiver_profiles')
        .select('*')
        .eq('user_id', uid)
        .single();

      if (data && !error) {
        setFirstName(data.first_name || '');
        setLastName(data.last_name || '');
        setDateOfBirth(data.date_of_birth || '');
        setAddress(data.address || '');
        setCity(data.city || '');
        setState(data.state || '');
        setZipCode(data.zip_code || '');
        setLanguages(data.languages || ['English']);
        setEducation(data.education_level || '');
        setYearsExperience(data.years_experience?.toString() || '');
        setSpecializations(data.specializations || []);
        setAvailability(data.availability || []);
        setHourlyRate(data.hourly_rate?.toString() || '');
        setBio(data.bio || '');
        setEmergencyContact(data.emergency_contact_name || '');
        setEmergencyPhone(data.emergency_contact_phone || '');
      }
    } catch (err) {
      console.error('Error loading profile:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    setLoading(true);
    setError('');

    try {
      // Calculate age from date of birth
      const birthDate = new Date(dateOfBirth);
      const age = Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));

      if (age < 18) {
        setError('You must be at least 18 years old to become a caregiver');
        setLoading(false);
        return;
      }

      // Update or create caregiver profile
      const { error: profileError } = await supabase
        .from('caregiver_profiles')
        .upsert({
          user_id: userId,
          email: auth.currentUser?.email,
          first_name: firstName,
          last_name: lastName,
          date_of_birth: dateOfBirth,
          address,
          city,
          state,
          zip_code: zipCode,
          languages,
          education_level: education,
          years_experience: parseInt(yearsExperience) || 0,
          specializations,
          availability,
          hourly_rate: parseFloat(hourlyRate) || 25,
          bio,
          emergency_contact_name: emergencyContact,
          emergency_contact_phone: emergencyPhone,
          profile_complete: true,
          updated_at: new Date().toISOString()
        });

      if (profileError) throw profileError;

      // Navigate to references page
      router.push('/beehive/caregiver/onboarding/references');
    } catch (err: any) {
      setError(err.message || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  const toggleLanguage = (lang: string) => {
    if (languages.includes(lang)) {
      setLanguages(languages.filter(l => l !== lang));
    } else {
      setLanguages([...languages, lang]);
    }
  };

  const toggleSpecialization = (spec: string) => {
    if (specializations.includes(spec)) {
      setSpecializations(specializations.filter(s => s !== spec));
    } else {
      setSpecializations([...specializations, spec]);
    }
  };

  const toggleAvailability = (avail: string) => {
    if (availability.includes(avail)) {
      setAvailability(availability.filter(a => a !== avail));
    } else {
      setAvailability([...availability, avail]);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">
                ✓
              </div>
              <span className="ml-3 text-elder-base font-medium">Assessment</span>
            </div>
            <div className="flex-1 h-1 bg-gray-300 mx-4"></div>
            <div className="flex items-center">
              <div className="w-10 h-10 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold">
                2
              </div>
              <span className="ml-3 text-elder-base font-medium">Profile</span>
            </div>
            <div className="flex-1 h-1 bg-gray-300 mx-4"></div>
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center font-bold">
                3
              </div>
              <span className="ml-3 text-elder-base text-gray-500">References</span>
            </div>
            <div className="flex-1 h-1 bg-gray-300 mx-4"></div>
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center font-bold">
                4
              </div>
              <span className="ml-3 text-elder-base text-gray-500">Background Check</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-elder-lg shadow-elder p-8 border border-elder-border">
          <h1 className="text-elder-2xl font-bold text-elder-text mb-2">
            Complete Your Caregiver Profile
          </h1>
          <p className="text-elder-base text-elder-text-secondary mb-8">
            Help families understand your experience and qualifications
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-elder text-elder-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Personal Information */}
            <div>
              <h2 className="text-elder-lg font-semibold text-elder-text mb-4">
                Personal Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <div>
                  <label className="block text-elder-base font-medium text-elder-text mb-2">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    required
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="w-full px-4 py-3 text-elder-base border-2 border-elder-border rounded-elder focus:border-primary-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div>
              <h2 className="text-elder-lg font-semibold text-elder-text mb-4">
                Address
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-elder-base font-medium text-elder-text mb-2">
                    Street Address
                  </label>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-4 py-3 text-elder-base border-2 border-elder-border rounded-elder focus:border-primary-500 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-elder-base font-medium text-elder-text mb-2">
                      City
                    </label>
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-4 py-3 text-elder-base border-2 border-elder-border rounded-elder focus:border-primary-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-elder-base font-medium text-elder-text mb-2">
                      State
                    </label>
                    <input
                      type="text"
                      required
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-full px-4 py-3 text-elder-base border-2 border-elder-border rounded-elder focus:border-primary-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-elder-base font-medium text-elder-text mb-2">
                      ZIP Code
                    </label>
                    <input
                      type="text"
                      required
                      value={zipCode}
                      onChange={(e) => setZipCode(e.target.value)}
                      className="w-full px-4 py-3 text-elder-base border-2 border-elder-border rounded-elder focus:border-primary-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Languages */}
            <div>
              <h2 className="text-elder-lg font-semibold text-elder-text mb-4">
                Languages Spoken
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {languageOptions.map((lang) => (
                  <label key={lang} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={languages.includes(lang)}
                      onChange={() => toggleLanguage(lang)}
                      className="h-5 w-5 text-primary-600 border-2 border-elder-border rounded focus:ring-primary-500"
                    />
                    <span className="ml-2 text-elder-base">{lang}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Experience */}
            <div>
              <h2 className="text-elder-lg font-semibold text-elder-text mb-4">
                Experience & Education
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-elder-base font-medium text-elder-text mb-2">
                    Education Level
                  </label>
                  <select
                    required
                    value={education}
                    onChange={(e) => setEducation(e.target.value)}
                    className="w-full px-4 py-3 text-elder-base border-2 border-elder-border rounded-elder focus:border-primary-500 focus:outline-none"
                  >
                    <option value="">Select education level</option>
                    <option value="high_school">High School Diploma</option>
                    <option value="some_college">Some College</option>
                    <option value="associates">Associate's Degree</option>
                    <option value="bachelors">Bachelor's Degree</option>
                    <option value="masters">Master's Degree</option>
                    <option value="nursing">Nursing Degree (RN/LPN)</option>
                    <option value="cna">Certified Nursing Assistant</option>
                  </select>
                </div>
                <div>
                  <label className="block text-elder-base font-medium text-elder-text mb-2">
                    Years of Caregiving Experience
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={yearsExperience}
                    onChange={(e) => setYearsExperience(e.target.value)}
                    className="w-full px-4 py-3 text-elder-base border-2 border-elder-border rounded-elder focus:border-primary-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Specializations */}
            <div>
              <h2 className="text-elder-lg font-semibold text-elder-text mb-4">
                Care Specializations
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {specializationOptions.map((spec) => (
                  <label key={spec} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={specializations.includes(spec)}
                      onChange={() => toggleSpecialization(spec)}
                      className="h-5 w-5 text-primary-600 border-2 border-elder-border rounded focus:ring-primary-500"
                    />
                    <span className="ml-2 text-elder-base">{spec}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Availability */}
            <div>
              <h2 className="text-elder-lg font-semibold text-elder-text mb-4">
                Availability
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {availabilityOptions.map((avail) => (
                  <label key={avail} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={availability.includes(avail)}
                      onChange={() => toggleAvailability(avail)}
                      className="h-5 w-5 text-primary-600 border-2 border-elder-border rounded focus:ring-primary-500"
                    />
                    <span className="ml-2 text-elder-base">{avail}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Hourly Rate */}
            <div>
              <h2 className="text-elder-lg font-semibold text-elder-text mb-4">
                Hourly Rate
              </h2>
              <div className="max-w-xs">
                <label className="block text-elder-base font-medium text-elder-text mb-2">
                  Requested Hourly Rate ($)
                </label>
                <input
                  type="number"
                  required
                  min="15"
                  max="100"
                  step="0.50"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  className="w-full px-4 py-3 text-elder-base border-2 border-elder-border rounded-elder focus:border-primary-500 focus:outline-none"
                  placeholder="25.00"
                />
                <p className="mt-1 text-elder-sm text-elder-text-secondary">
                  Average in your area: $22-$35/hour
                </p>
              </div>
            </div>

            {/* Bio */}
            <div>
              <h2 className="text-elder-lg font-semibold text-elder-text mb-4">
                About You
              </h2>
              <label className="block text-elder-base font-medium text-elder-text mb-2">
                Tell families about yourself
              </label>
              <textarea
                required
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={5}
                className="w-full px-4 py-3 text-elder-base border-2 border-elder-border rounded-elder focus:border-primary-500 focus:outline-none"
                placeholder="Share your caregiving philosophy, experience, and what makes you a great caregiver..."
              />
            </div>

            {/* Emergency Contact */}
            <div>
              <h2 className="text-elder-lg font-semibold text-elder-text mb-4">
                Emergency Contact
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-elder-base font-medium text-elder-text mb-2">
                    Contact Name
                  </label>
                  <input
                    type="text"
                    required
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    className="w-full px-4 py-3 text-elder-base border-2 border-elder-border rounded-elder focus:border-primary-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-elder-base font-medium text-elder-text mb-2">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    required
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                    className="w-full px-4 py-3 text-elder-base border-2 border-elder-border rounded-elder focus:border-primary-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-between items-center pt-6 border-t border-gray-200">
              <Link
                href="/beehive/assessment"
                className="text-elder-base text-primary-600 hover:text-primary-700 font-medium"
              >
                ← Back to Assessment
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 bg-primary-600 text-white text-elder-base font-medium rounded-elder hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : 'Save Profile & Continue'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}